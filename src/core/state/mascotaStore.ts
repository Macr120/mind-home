import { create } from 'zustand'
import { db } from '../data/db'
import { MASCOTA_DEFAULT } from '../chat/mascotas'

/** roomId sentinela donde se persiste la mascota elegida (igual que __tema__). */
const MASCOTA_ROW = '__mascota__'

/**
 * Mascota/asistente del arquitecto.
 * - `mascota` se persiste en una fila sentinela de disenoRooms (sin migración).
 * - El resto es estado EFÍMERO del personaje en el mundo 3D: qué dice ahora,
 *   si está saludando (levanta la mano) y dónde proyecta su burbuja en pantalla.
 */
interface MascotaState {
  /** Id del asistente activo (integrado o 'custom-<n>'). */
  mascota: string
  setMascota: (id: string) => Promise<void>
  /** Texto que el asistente dice ahora mismo (null = callado). */
  mensaje: string | null
  /** true durante el saludo (el personaje levanta la mano). */
  saludando: boolean
  /** Posición de la burbuja en pantalla (proyectada desde la escena 3D). */
  screenX: number
  screenY: number
  /** El personaje está dentro del frame de la cámara. */
  visible: boolean
  /**
   * A dónde se dirige el asistente en el mundo (x,z). Ya no sigue al avatar:
   * se reubica al último lugar donde le pediste algo. null = aún sin destino
   * (el componente 3D le asigna uno aleatorio al abrir el mapa).
   */
  destino: { x: number; z: number } | null
  /** Lo manda a (x,z): se usa al enviar un mensaje desde el chat. */
  irA: (x: number, z: number) => void
  /** Hace hablar al asistente y disparar el saludo. */
  decir: (texto: string) => void
  /** true mientras la IA prepara la respuesta (burbuja "pensando…"). */
  pensando: boolean
  setPensando: (v: boolean) => void
  setScreen: (x: number, y: number, visible: boolean) => void
  /** Conversación tipo chat abierta (id del asistente, o null = cerrada). */
  conversacion: string | null
  abrirConversacion: (id: string) => void
  cerrarConversacion: () => void
}

// Timeouts del diálogo (módulo, no estado).
let tSaludo: ReturnType<typeof setTimeout> | null = null
let tMensaje: ReturnType<typeof setTimeout> | null = null

export const useMascota = create<MascotaState>((set, get) => ({
  mascota: MASCOTA_DEFAULT,
  mensaje: null,
  saludando: false,
  screenX: 0,
  screenY: 0,
  visible: false,
  destino: null,
  conversacion: null,
  irA: (x, z) => set({ destino: { x, z } }),
  abrirConversacion: (id) => set({ conversacion: id }),
  cerrarConversacion: () => set({ conversacion: null }),
  setMascota: async (id) => {
    set({ mascota: id })
    const existing = await db.disenoRooms.where('roomId').equals(MASCOTA_ROW).first()
    if (existing?.id) await db.disenoRooms.update(existing.id, { nombre: id })
    else await db.disenoRooms.add({ roomId: MASCOTA_ROW, color: '', nombre: id })
  },
  pensando: false,
  setPensando: (v) => set({ pensando: v }),
  decir: (texto) => {
    set({ mensaje: texto, saludando: true, pensando: false })
    // Todo lo que dice queda en su hilo de conversación persistente.
    db.mensajesChat
      .add({ asistenteId: get().mascota, rol: 'asistente', texto, creado: new Date().toISOString() })
      .catch(() => {})
    if (tSaludo) clearTimeout(tSaludo)
    if (tMensaje) clearTimeout(tMensaje)
    tSaludo = setTimeout(() => set({ saludando: false }), 1100)
    tMensaje = setTimeout(() => set({ mensaje: null }), 5200)
  },
  setScreen: (screenX, screenY, visible) => set({ screenX, screenY, visible }),
}))

/** Carga la mascota guardada al arrancar. */
db.disenoRooms
  .where('roomId')
  .equals(MASCOTA_ROW)
  .first()
  .then((row) => {
    if (row?.nombre) useMascota.setState({ mascota: row.nombre })
  })

if (import.meta.env.DEV) {
  ;(window as unknown as { useMascota: typeof useMascota }).useMascota = useMascota
}
