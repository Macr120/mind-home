import { create } from 'zustand'
import { useLayout } from './layoutStore'
import { useHouse } from './houseStore'
import { useCam, type Vista } from './cameraStore'
import { playerPos } from './playerPosition'
import { setCuartoAbierto } from '../house/movement'
import { factorCelda } from '../house/walls'
import { useDiseño, MAPA_ROOM } from './disenoStore'

export type ClaseCancha = 'futbol' | 'tenis' | 'basket' | 'beisbol'

/** Prefijo del `tipo` del objeto de mapa que representa una cancha. */
export const TIPO_CANCHA_PREFIJO = 'cancha:'

export const esCancha = (tipo: string) => tipo.startsWith(TIPO_CANCHA_PREFIJO)

export const claseDeCancha = (tipo: string): ClaseCancha =>
  tipo.slice(TIPO_CANCHA_PREFIJO.length) as ClaseCancha

/**
 * Catálogo de canchas: dimensiones en metros de mundo (1 u ≈ 1 m; el avatar mide
 * ~1.72) y color base del piso. Compactas jugables: futsal, tenis completa,
 * media cancha de básquet (un solo aro) y campo corto de béisbol (solo bateo).
 */
export const CANCHAS: Record<
  ClaseCancha,
  { nombre: string; corto: string; icon: string; largo: number; ancho: number; color: string }
> = {
  futbol: { nombre: 'Cancha de fútbol', corto: 'Fútbol', icon: '⚽', largo: 25, ancho: 15, color: '#16a34a' },
  tenis: { nombre: 'Cancha de tenis', corto: 'Tenis', icon: '🎾', largo: 24, ancho: 11, color: '#2563eb' },
  basket: { nombre: 'Cancha de básquet', corto: 'Básquet', icon: '🏀', largo: 15, ancho: 14, color: '#b45309' },
  beisbol: { nombre: 'Campo de béisbol', corto: 'Béisbol', icon: '⚾', largo: 24, ancho: 28, color: '#15803d' },
}

/**
 * Portería de fútbol (metros, medida arcade más generosa que el real 3×2 para que
 * apuntar con el frente del avatar sea divertido). Fuente ÚNICA compartida por el
 * render (`Porteria` en canchas.tsx) y la física del gol (`tickFutbol` en minijuegos.tsx).
 */
export const PORTERIA = { ancho: 5.2, alto: 2.4, poste: 0.06, redProf: 0.9 }

/**
 * Campo de béisbol (coordenadas locales SIN escalar, en metros): un ABANICO con
 * el vértice en el home (extremo −x), el montículo enfrente y la barda jonronera
 * en arco. Proporciones de campo compacto (tipo liga infantil): el montículo al
 * 23 % del radio y las bases al 30 %, para que el diamante se lea sin ocupar
 * medio mapa. Fuente ÚNICA compartida por el render (canchas.tsx) y la física
 * del bateo (`tickBeisbol` en minijuegos.tsx).
 */
export const BEISBOL = {
  /** Vértice del abanico (x local): centrado para que el área del plato no se salga. */
  home: -9.3,
  /** Placa de pitcheo. */
  monticulo: -4.5,
  /** Distancia entre bases (el diamante gira 45° respecto al eje del campo). */
  base: 6.3,
  /** Radio del campo por el CENTRO (del home a la barda). */
  radio: 21,
  /** Semiapertura de las LÍNEAS de foul (±45°): decide foul contra bola buena. */
  apertura: Math.PI / 4,
  /**
   * Semiapertura del TERRENO: se abre más que las líneas porque un campo real
   * tiene territorio de foul: sin ese margen, 1ª y 3ª base caen en el filo.
   */
  aperturaCampo: Math.PI / 4 + 0.15,
  /** La barda se acerca hacia las líneas de foul (como los 325' vs 400' reales). */
  recorteLinea: 0.19,
  cercaAlto: 1.6,
  /** Ancho de la franja de tierra pegada a la barda (warning track). */
  pista: 1.2,
  /**
   * Radio del área del plato: redondea el vértice del abanico y da suelo a las
   * cajas de bateo, que en un campo real quedan por FUERA de las líneas de foul.
   */
  plato: 2.2,
}

/**
 * Radio del campo para un ángulo medido desde el eje central (0 = jardín
 * central, ±apertura = línea de foul). Lo usan la forma del piso, la barda y la
 * resolución del batazo: así el cuadrangular cae justo donde se ve la barda.
 */
export const radioBeisbol = (ang: number) =>
  BEISBOL.radio * (1 - BEISBOL.recorteLinea * Math.min(1, Math.abs(ang) / BEISBOL.apertura))

/**
 * Escala EFECTIVA de una cancha: la que eligió el usuario × el factor de la celda del mapa,
 * para que ocupe siempre la misma porción de la rejilla. Fuente ÚNICA del render (el `scale`
 * del grupo en House.tsx), del hit-test del editor y de la física de los minijuegos.
 */
export const escalaCancha = (escala?: number) => (escala ?? 1) * factorCelda()

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
