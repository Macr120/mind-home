import { create } from 'zustand'
import { leerInvitacion } from './api'
import { registrarVistaBots, registrarVistaSala, salaViva, type CuerpoBotSala } from './sala'
import type { CodigoErrorPartida, InvitacionRecibida, Sala } from './tipos'

/**
 * Estado de INTERFAZ de la partida (el motor vive en `sala.ts`). Nunca se lee
 * por frame: los cuerpos remotos se mueven desde `remotosFrame`, no desde aquí.
 */
interface PartidaState {
  sala: Sala | null
  /** Bots del anfitrión: cuerpos del mundo que el invitado dibuja como remotos. */
  cuerposBot: CuerpoBotSala[]
  conectando: boolean
  error: CodigoErrorPartida | null
  /** Invitación recibida (modal global). Clon del par `compartirPendiente`/`compartirN`. */
  invitacionPendiente: InvitacionRecibida | null
  invitacionN: number
  abrirInvitacion: (i: InvitacionRecibida) => void
  cerrarInvitacion: () => void
}

export const usePartida = create<PartidaState>((set) => ({
  sala: null,
  cuerposBot: [],
  conectando: false,
  error: null,
  invitacionPendiente: null,
  invitacionN: 0,
  abrirInvitacion: (i) => set((s) => ({ invitacionPendiente: i, invitacionN: s.invitacionN + 1 })),
  cerrarInvitacion: () => set({ invitacionPendiente: null }),
}))

/**
 * Timbre de invitación del canal `buzon:<uid>` (`buzon/motor.ts`). Valida el
 * payload antes de abrir el modal: llega por el mismo WebSocket que todo lo
 * demás, así que se lee igual de defensivo que el protocolo.
 */
export function recibirInvitacion(bruto: unknown): void {
  const i = leerInvitacion(bruto)
  if (i && !recienVista(i.partidaId)) usePartida.getState().abrirInvitacion(i)
}

/** Cuándo se enseñó por última vez la invitación de cada sala. */
const vistas = new Map<string, number>()
/** El timbre y su respaldo pueden llegar los dos: la segunda vez no reabre el modal. */
const VENTANA_VISTA = 60_000

function recienVista(partidaId: string): boolean {
  const antes = vistas.get(partidaId)
  vistas.set(partidaId, Date.now())
  return antes !== undefined && Date.now() - antes < VENTANA_VISTA
}

/**
 * Respaldo del timbre: el aviso del servidor solo viaja en vivo y se pierde si
 * el canal del invitado se estaba (re)conectando. El mensaje «¿Jugamos…?» del
 * buzón sí llega siempre (por el pull), así que con él también se abre el modal.
 */
export function invitacionDesdeMensaje(i: InvitacionRecibida): void {
  // El timbre llegó antes y no sabe el juego: el mensaje se lo completa, y así
  // «Aceptar» lleva directo al juego (y no al catálogo con la banda).
  const abierta = usePartida.getState().invitacionPendiente
  if (abierta?.partidaId === i.partidaId && !abierta.juegoInvitable && i.juegoInvitable) {
    usePartida.setState({ invitacionPendiente: { ...abierta, juegoInvitable: i.juegoInvitable } })
    return
  }
  if (salaViva()?.partidaId === i.partidaId || recienVista(i.partidaId)) return
  usePartida.getState().abrirInvitacion(i)
}

// El motor no puede importar el store (el store es quien lo importa): le deja
// aquí por dónde publicar, como hace `registrarEjecutorColocar` en el modo película.
registrarVistaSala((s) => usePartida.setState({ sala: s, conectando: false }))
registrarVistaBots((b) => usePartida.setState({ cuerposBot: b }))

/** ¿Hay partida viva? Lo consultan los gates de `cancelar()`. Lectura sin suscripción. */
export function hayPartida(): boolean {
  return salaViva() !== null
}

export function soyAnfitrionPartida(): boolean {
  return salaViva()?.soyAnfitrion === true
}

if (import.meta.env.DEV) {
  ;(window as unknown as { usePartida: typeof usePartida }).usePartida = usePartida
}
