import { create } from 'zustand'
import { useCam } from './cameraStore'
import { useHouse } from './houseStore'
import { useLayout } from './layoutStore'
import { playerPos, playerForward } from './playerPosition'
import { posAsistentes } from './posAsistentes'
import { getAsistente } from './asistentesStore'
import { setCuartoAbierto, hayCuartoAbierto } from '../house/movement'
import { SPACING } from '../house/walls'

/**
 * Modo diálogo cara a cara con un asistente (estilo RPG): el NPC se planta
 * frente al jugador, la cámara pasa a "sobre el hombro" (vista 'dialogo' de
 * cameraStore) y el teclado de movimiento se congela. Mismo patrón que el
 * modo grafiti: `vistaAnterior` + setCuartoAbierto, restaurados al salir.
 */

/** Leído por Character/Asistente3D cada frame, sin re-render (patrón parqueFrame). */
export const dialogoFrame = { activo: false, npcX: 0, npcZ: 0 }

/** Altura base del grupo del NPC (ALTURA_FLOTE de Asistente3D). */
const ALTURA_NPC = 1.0

let vistaAnterior: ReturnType<typeof useCam.getState>['vista'] = 'iso'

interface DialogoState {
  /** Asistente con el que se conversa cara a cara (null = modo apagado). */
  asistenteId: string | null
  /** Punto (x,z) donde se planta el NPC durante el diálogo. */
  punto: { x: number; z: number } | null
  entrar: (asistenteId: string) => void
  salir: () => void
}

export const useDialogo = create<DialogoState>((set, get) => ({
  asistenteId: null,
  punto: null,

  entrar: (asistenteId) => {
    if (get().asistenteId === asistenteId) return
    // Con otro modo a pantalla completa activo (grafiti, infraestructura, cuarto), no entrar.
    if (get().asistenteId == null && hayCuartoAbierto()) return
    // Solo la primera entrada guarda la vista a restaurar (cambiar de NPC no).
    if (get().asistenteId == null) vistaAnterior = useCam.getState().vista

    const L = useLayout.getState()
    const halfW = (L.gridCols * SPACING) / 2 - 1.0
    const halfH = (L.gridRows * SPACING) / 2 - 1.0

    // El NPC se planta a 2.4u del jugador, en la dirección donde ya estaba
    // (o hacia donde mira el jugador si aún no se conoce su posición).
    const pa = posAsistentes[asistenteId]
    let dx = pa ? pa.x - playerPos.x : playerForward.x
    let dz = pa ? pa.z - playerPos.z : playerForward.z
    const len = Math.hypot(dx, dz)
    if (len < 0.01) {
      dx = 0
      dz = 1
    } else {
      dx /= len
      dz /= len
    }
    const punto = {
      x: Math.max(-halfW, Math.min(halfW, playerPos.x + dx * 2.4)),
      z: Math.max(-halfH, Math.min(halfH, playerPos.z + dz * 2.4)),
    }

    dialogoFrame.activo = true
    dialogoFrame.npcX = punto.x
    dialogoFrame.npcZ = punto.z
    set({ asistenteId, punto })

    const escala = getAsistente(asistenteId).escala ?? 1
    useCam.getState().enfocarDialogo({ npc: [punto.x, ALTURA_NPC + 1.05 * escala, punto.z] })
    setCuartoAbierto(true)
    // El clic sobre el NPC también pudo fijar un destino de caminata: cancelarlo.
    useHouse.getState().target.set(playerPos.x, 0, playerPos.z)
  },

  salir: () => {
    if (!get().asistenteId) return
    dialogoFrame.activo = false
    set({ asistenteId: null, punto: null })
    // El gate del teclado se libera solo si el diálogo sigue siendo su dueño
    // (si ya se abrió un cuarto encima, ese overlay lo administra ahora).
    if (!useHouse.getState().activeRoom) setCuartoAbierto(false)
    // Y la vista solo se restaura si nadie más la cambió ya (cubo, editor…).
    if (useCam.getState().vista === 'dialogo') useCam.getState().setVista(vistaAnterior)
  },
}))

// Guardianes: el diálogo nunca debe sobrevivir escondido (dejaría al jugador
// congelado). Si algo más toma la pantalla o la cámara, el modo se cierra.
useHouse.subscribe((s, prev) => {
  if (s.activeRoom && !prev.activeRoom) useDialogo.getState().salir()
})
useLayout.subscribe((s, prev) => {
  if (s.editMode && !prev.editMode) useDialogo.getState().salir()
})
useCam.subscribe((s, prev) => {
  if (prev.vista === 'dialogo' && s.vista !== 'dialogo') useDialogo.getState().salir()
})

if (import.meta.env.DEV) {
  ;(window as unknown as { useDialogo: typeof useDialogo }).useDialogo = useDialogo
}
