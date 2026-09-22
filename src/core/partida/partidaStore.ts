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
  if (i) usePartida.getState().abrirInvitacion(i)
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
