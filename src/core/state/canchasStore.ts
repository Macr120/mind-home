import { create } from 'zustand'
import { useLayout } from './layoutStore'
import { useHouse } from './houseStore'
import { useCam, type Vista } from './cameraStore'
import { playerPos } from './playerPosition'
import { setCuartoAbierto } from '../house/movement'
import { useDiseño, MAPA_ROOM } from './disenoStore'

export type ClaseCancha = 'futbol' | 'tenis' | 'basket'

/** Prefijo del `tipo` del objeto de mapa que representa una cancha. */
export const TIPO_CANCHA_PREFIJO = 'cancha:'

export const esCancha = (tipo: string) => tipo.startsWith(TIPO_CANCHA_PREFIJO)

export const claseDeCancha = (tipo: string): ClaseCancha =>
  tipo.slice(TIPO_CANCHA_PREFIJO.length) as ClaseCancha

/**
 * Catálogo de canchas: dimensiones en metros de mundo (1 u ≈ 1 m; el avatar mide
 * ~1.72) y color base del piso. Compactas jugables: futsal, tenis completa y
 * media cancha de básquet (un solo aro).
 */
export const CANCHAS: Record<
  ClaseCancha,
  { nombre: string; corto: string; icon: string; largo: number; ancho: number; color: string }
> = {
  futbol: { nombre: 'Cancha de fútbol', corto: 'Fútbol', icon: '⚽', largo: 25, ancho: 15, color: '#16a34a' },
  tenis: { nombre: 'Cancha de tenis', corto: 'Tenis', icon: '🎾', largo: 24, ancho: 11, color: '#2563eb' },
  basket: { nombre: 'Cancha de básquet', corto: 'Básquet', icon: '🏀', largo: 15, ancho: 14, color: '#b45309' },
}

/**
 * Portería de fútbol (metros, medida arcade más generosa que el real 3×2 para que
 * apuntar con el frente del avatar sea divertido). Fuente ÚNICA compartida por el
 * render (`Porteria` en canchas.tsx) y la física del gol (`tickFutbol` en minijuegos.tsx).
 */
export const PORTERIA = { ancho: 5.2, alto: 2.4, poste: 0.06, redProf: 0.9 }

interface CanchasState {
  /** El editor de canchas está abierto (colocando sobre el mapa). */
  activo: boolean
  /** Clase elegida = fantasma activo siguiendo el cursor (null = modo Editar). */
  clase: ClaseCancha | null
  rot: 0 | 90
  /** Color del piso para la PRÓXIMA cancha (null = el default de la clase). */
  color: string | null
  /** Escala de la próxima cancha (0.5–2). */
  escala: number
  /** Cancha seleccionada en modo Editar (id de su ObjetoCuarto). */
  sel: number | null
  iniciar: () => void
  salir: () => void
  setClase: (c: ClaseCancha | null) => void
  rotar: () => void
  setColor: (c: string | null) => void
  setEscala: (e: number) => void
  seleccionar: (id: number | null) => void
  /** Coloca una cancha de la clase activa en coordenadas de mundo. */
  colocar: (x: number, z: number) => Promise<void>
}

// Vista de juego a restaurar al salir del editor (solo iso/tercera/primera).
let vistaAnterior: Vista = 'iso'

export const useCanchas = create<CanchasState>((set, get) => ({
  activo: false,
  clase: 'futbol',
  rot: 0,
  color: null,
  escala: 1,
  sel: null,

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
    set({ activo: true, clase: 'futbol', rot: 0, color: null, escala: 1, sel: null })
    setCuartoAbierto(true)
    casa.target.set(playerPos.x, 0, playerPos.z)
  },

  salir: () => {
    if (!get().activo) return
    set({ activo: false, sel: null })
    setCuartoAbierto(false)
    useCam.getState().setVista(vistaAnterior)
  },

  // Cambiar de clase vuelve al color default de la nueva y deselecciona (conserva la escala).
  setClase: (clase) => set({ clase, color: null, sel: null }),
  rotar: () => set((s) => ({ rot: s.rot === 0 ? 90 : 0 })),
  setColor: (color) => set({ color }),
  setEscala: (escala) => set({ escala }),
  seleccionar: (sel) => set({ sel }),

  colocar: async (x, z) => {
    const { clase, rot, color, escala } = get()
    if (!clase) return
    const def = CANCHAS[clase]
    const d = useDiseño.getState()
    const id = await d.addObjeto(MAPA_ROOM, TIPO_CANCHA_PREFIJO + clase, color ?? def.color, undefined, { x, z })
    if (rot === 90) await d.setObjetoRotacion(id, 90)
    if (escala !== 1) await d.setObjetoEscala(id, escala)
    await d.setObjetoNombre(id, def.nombre)
  },
}))
