import { create } from 'zustand'
import { db, type DestinoChat } from '../data/db'
import { MASCOTA_DEFAULT } from '../chat/mascotas'

/** roomId sentinela donde se persiste la mascota elegida (igual que __tema__). */
const MASCOTA_ROW = '__mascota__'

/**
 * Mascota/asistente del arquitecto.
 * - `mascota` se persiste en una fila sentinela de disenoRooms (sin migración).
 * - El resto es estado EFÍMERO del personaje en el mundo 3D: qué dice ahora y
 *   si está saludando (levanta la mano). Su burbuja (`AsistenteBurbuja`) se
 *   ancla siempre encima del chat, no a su posición 3D.
 */
interface MascotaState {
  /** Id del asistente activo (integrado o 'custom-<n>'). */
  mascota: string
  setMascota: (id: string) => Promise<void>
  /** Texto que el asistente dice ahora mismo (null = callado). */
  mensaje: string | null
  /**
   * false en las frases espontáneas (`persistir:false`: corazón, saludo de
   * diálogo…): esas NUNCA quedan en el hilo, así que su burbuja flotante no
   * se calla aunque el panel esté a la vista (no hay dónde más leerlas).
   */
  mensajePersistido: boolean
  /** Quién dice el mensaje actual (null = el activo). Permite hablar a los compañeros. */
  hablanteId: string | null
  /** true durante el saludo (el personaje levanta la mano). */
  saludando: boolean
  /**
   * A dónde se dirige el asistente en el mundo (x,z): el último lugar desde el
   * que le pediste algo. null = sin encargo, pasea libre por el mapa.
   */
  destino: { x: number; z: number } | null
  /** Lo manda a (x,z): se usa al enviar un mensaje desde el chat. */
  irA: (x: number, z: number) => void
  /** El asistente llegó al destino pedido: queda libre para pasear. */
  llegoADestino: () => void
  /** Hace hablar a un asistente (por defecto el activo) y disparar el saludo. */
  decir: (
    texto: string,
    opts?: {
      asistenteId?: string
      persistir?: boolean
      mapaId?: number
      destino?: DestinoChat
      imagen?: Blob
    },
  ) => void
  /** Reprograma el ocultado de la burbuja (lo usa la voz para no cortar el habla). */
  programarOcultar: (ms: number) => void
  /** true mientras la IA prepara la respuesta (burbuja "pensando…"). */
  pensando: boolean
  setPensando: (v: boolean, asistenteId?: string) => void
  /** Conversación tipo chat abierta (id del asistente, o null = cerrada). */
  conversacion: string | null
  abrirConversacion: (id: string) => void
  cerrarConversacion: () => void
  /**
   * El hilo con el asistente está apartado (por la ✕, o porque la app recién
   * arranca: nace en `true`, nunca se abre solo). Vive aquí y no en `ChatBox`
   * porque ese componente se desmonta y remonta al entrar/salir del editor
   * (son excluyentes): en `useState` local, cada ciclo de editor perdía el
   * "cerrado" y el hilo reaparecía solo.
   */
  hiloOculto: boolean
  setHiloOculto: (v: boolean) => void
  /**
   * Id del hilo que el panel persistente (`ChatConversacion`, siempre encima
   * del chat) tiene a la vista ahora mismo; null si el panel no se ve (chat
   * plegado, u otro panel del chat abierto). Lo publica `ChatBox` en cada
   * cambio; lo lee `AsistenteBurbuja` para no duplicar el mismo mensaje.
   */
  panelHiloId: string | null
  setPanelHiloId: (id: string | null) => void
}

// Timeouts del diálogo (módulo, no estado).
let tSaludo: ReturnType<typeof setTimeout> | null = null
let tMensaje: ReturnType<typeof setTimeout> | null = null

export const useMascota = create<MascotaState>((set, get) => ({
  mascota: MASCOTA_DEFAULT,
  mensaje: null,
  mensajePersistido: false,
  hablanteId: null,
  saludando: false,
  destino: null,
  conversacion: null,
  panelHiloId: null,
  hiloOculto: true,
  irA: (x, z) => set({ destino: { x, z } }),
  llegoADestino: () => set({ destino: null }),
  abrirConversacion: (id) => set({ conversacion: id }),
  cerrarConversacion: () => set({ conversacion: null }),
  setHiloOculto: (hiloOculto) => set({ hiloOculto }),
  setPanelHiloId: (panelHiloId) => set((s) => (s.panelHiloId === panelHiloId ? s : { panelHiloId })),
  setMascota: async (id) => {
    set({ mascota: id })
    const existing = await db.disenoRooms.where('roomId').equals(MASCOTA_ROW).first()
    if (existing?.id) await db.disenoRooms.update(existing.id, { nombre: id })
    else await db.disenoRooms.add({ roomId: MASCOTA_ROW, color: '', nombre: id })
  },
  pensando: false,
  // `asistenteId` ancla la burbuja "pensando…" al asistente que va a responder.
  setPensando: (v, asistenteId) =>
    set(asistenteId ? { pensando: v, hablanteId: asistenteId } : { pensando: v }),
  decir: (texto, opts) => {
    const asistenteId = opts?.asistenteId ?? get().mascota
    const persistido = opts?.persistir !== false
    set({
      mensaje: texto,
      mensajePersistido: persistido,
      saludando: true,
      pensando: false,
      hablanteId: asistenteId,
    })
    // Lo que dice queda en su hilo persistente (salvo frases espontáneas con persistir:false).
    if (persistido) {
      db.mensajesChat
        .add({
          asistenteId,
          rol: 'asistente',
          texto,
          creado: new Date().toISOString(),
          ...(opts?.mapaId != null ? { mapaId: opts.mapaId } : {}),
          ...(opts?.destino ? { destino: opts.destino } : {}),
          ...(opts?.imagen ? { imagen: opts.imagen } : {}),
        })
        .catch(() => {})
    }
    if (tSaludo) clearTimeout(tSaludo)
    tSaludo = setTimeout(() => set({ saludando: false }), 1100)
    // Burbuja visible en proporción al largo del texto (leer toma tiempo).
    get().programarOcultar(Math.min(14000, Math.max(5200, 3000 + texto.length * 45)))
  },
  programarOcultar: (ms) => {
    if (tMensaje) clearTimeout(tMensaje)
    tMensaje = setTimeout(() => set({ mensaje: null, hablanteId: null }), ms)
  },
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
