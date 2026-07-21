import { create } from 'zustand'
import { db, type CaminoCelda } from '../data/db'
import { useLayout } from './layoutStore'
import { useHouse } from './houseStore'
import { useCam, type Vista } from './cameraStore'
import { playerPos } from './playerPosition'
import { setCuartoAbierto } from '../house/movement'
import { usePistaLibreEditor } from './pistaLibreStore'

export type TipoCamino = CaminoCelda['tipo']
export type HerramientaCamino = 'pintar' | 'borrar' | 'subir' | 'bajar' | 'meta'

/** Nivel máximo de altura de la montaña rusa (cada nivel = ALTURA_NIVEL unidades). */
export const ALTURA_MAX_COASTER = 6
/** Metros de mundo que sube cada nivel de altura del riel. */
export const ALTURA_NIVEL = 0.6

/**
 * Borra tramos del mapa (lo pide el chat: «borra la pista»). Sin `tipo` borra
 * todos los caminos. Devuelve cuántos tramos quitó.
 */
export async function borrarCaminos(tipo?: TipoCamino): Promise<number> {
  const filas = await db.caminos.toArray()
  const objetivo = tipo ? filas.filter((f) => f.tipo === tipo) : filas
  await db.caminos.bulkDelete(objetivo.map((f) => f.id).filter((id): id is number => id != null))
  return objetivo.length
}

interface CaminosState {
  /** El editor de caminos está abierto (pintando sobre el mapa). */
  activo: boolean
  tipo: TipoCamino
  herramienta: HerramientaCamino
  iniciar: () => void
  salir: () => void
  setTipo: (t: TipoCamino) => void
  setHerramienta: (h: HerramientaCamino) => void
  /** Aplica la herramienta activa sobre una celda del mapa (escribe a db.caminos). */
  aplicarEnCelda: (col: number, row: number) => Promise<void>
}

// Vista de juego a restaurar al salir del editor (solo iso/tercera/primera).
let vistaAnterior: Vista = 'iso'

export const useCaminos = create<CaminosState>((set, get) => ({
  activo: false,
  tipo: 'pista',
  herramienta: 'pintar',

  iniciar: () => {
    const layout = useLayout.getState()
    if (get().activo || layout.editMode) return
    // El editor de cuarto puede estar solo OCULTO (menú abierto): salir de él para
    // que al cerrarse el menú no se restaure encima de este editor.
    if (layout.editingRoomId) layout.editRoom(null)
    const casa = useHouse.getState()
    if (casa.activeRoom) casa.closeRoom()
    const v = useCam.getState().vista
    vistaAnterior = v === 'tercera' || v === 'primera' ? v : 'iso'
    useCam.getState().setVista('iso')
    set({ activo: true, herramienta: 'pintar' })
    setCuartoAbierto(true)
    // El clic que abrió el editor pudo fijar un destino de caminata: cancelarlo.
    casa.target.set(playerPos.x, 0, playerPos.z)
  },

  salir: () => {
    if (!get().activo) return
    // Cerrar el editor también cierra el sub-modo de trazo libre.
    usePistaLibreEditor.getState().salir()
    set({ activo: false })
    setCuartoAbierto(false)
    useCam.getState().setVista(vistaAnterior)
  },

  setTipo: (tipo) => set({ tipo, herramienta: 'pintar' }),
  setHerramienta: (herramienta) => set({ herramienta }),

  aplicarEnCelda: async (col, row) => {
    const { tipo, herramienta } = get()
    const previa = await db.caminos.where('[col+row]').equals([col, row]).first()
    if (herramienta === 'borrar') {
      if (previa?.id != null) await db.caminos.delete(previa.id)
      return
    }
    if (herramienta === 'subir' || herramienta === 'bajar') {
      // La altura aplica a los 3 tipos: coaster, y pista/riel elevados con rampas.
      if (previa?.id == null) return
      const delta = herramienta === 'subir' ? 1 : -1
      const altura = Math.min(ALTURA_MAX_COASTER, Math.max(0, (previa.altura ?? 0) + delta))
      await db.caminos.update(previa.id, { altura })
      return
    }
    if (herramienta === 'meta') {
      // Marca/desmarca la línea de meta sobre una celda de pista (una sola global).
      if (previa?.id == null || previa.tipo !== 'pista') return
      const id = previa.id
      if (previa.meta) {
        await db.caminos.update(id, { meta: undefined })
      } else {
        await db.transaction('rw', db.caminos, async () => {
          await db.caminos.toCollection().modify((c) => {
            if (c.meta) delete c.meta
          })
          await db.caminos.update(id, { meta: true })
        })
      }
      return
    }
    // Pintar: coloca el tramo, o reemplaza el tipo si la celda ya tenía otro.
    if (previa?.id != null) {
      if (previa.tipo !== tipo) {
        // La altura se conserva al cambiar de tipo (los 3 la usan).
        await db.caminos.update(previa.id, {
          tipo,
          // La línea de meta solo vive sobre pista.
          ...(tipo !== 'pista' && previa.meta ? { meta: undefined } : {}),
        })
      }
    } else {
      await db.caminos.add({ col, row, tipo, ...(tipo === 'coaster' ? { altura: 0 } : {}) })
    }
  },
}))
