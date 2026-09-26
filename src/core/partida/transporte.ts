/**
 * Transporte de una partida: dos direcciones con la misma forma, para que la
 * máquina de estados de la sala sea idéntica con red simulada y con Realtime.
 *
 *   bajada  `partida:<id>`    publica SOLO el anfitrión (veredictos, mundo, fin)
 *   subida  `partida:<id>:u`  publican los miembros (pose, disparo, salir)
 *
 * En local las dos direcciones son dos BroadcastChannel, incluido el detalle de
 * que «el anfitrión no ve su propia bajada» (BroadcastChannel no entrega al
 * emisor, igual que el canal de `sync/ventanas.ts`).
 */
import type { Evento } from './protocolo'
import { transporteLocal } from './transporteLocal'

/**
 * El parámetro `E` es el alfabeto de eventos del canal. Por defecto es el de
 * las partidas, así que `Transporte` a secas sigue significando lo mismo; los
 * espacios compartidos lo instancian con el suyo (ver `core/espacios/transporte`).
 */
export interface Transporte<E extends string = Evento> {
  enviar(ev: E, payload: object): void
  on(ev: E, cb: (p: unknown) => void): void
  /** Aviso de (re)conexión del canal. Solo lo trae Realtime: en local no se cae nada. */
  alSuscribir?(cb: () => void): void
  cerrar(): void
}

/** Red simulada: retardo base, jitter (±) y probabilidad de pérdida (0-1). */
export type PerfilRed = { lag: number; jitter: number; perdida: number }

const LS_PARTIDA_LOCAL = 'mh.partidaLocal'

// Congelado a la carga, como `esDemo`/`esProbar`: el modo de una pestaña no
// cambia a media sesión. El parámetro de URL NO se persiste, para que una
// prueba no deje el modo pegado al perfil real.
const codigoLocal = (() => {
  if (typeof window === 'undefined') return null
  const enUrl = new URLSearchParams(window.location.search).get('partidaLocal')
  if (enUrl) return enUrl
  try {
    return localStorage.getItem(LS_PARTIDA_LOCAL)
  } catch {
    return null
  }
})()

/** Código de la sala LOCAL de pruebas (dos ventanas sin backend), o null. */
export function partidaLocal(): string | null {
  return codigoLocal
}

/**
 * Abre las dos direcciones de la sala. `soyAnfitrion` decide si esta ventana
 * puede publicar en la bajada: el invitado ni lo intenta, porque la policy lo
 * rechazaría y el error de Realtime es mudo.
 */
export async function abrirTransporte(
  partidaId: string,
  soyAnfitrion: boolean,
  miRanura: string,
): Promise<{ bajada: Transporte; subida: Transporte; poses: Transporte[] }> {
  if (codigoLocal === null) {
    // Perezoso: fuera de partida el chunk de Realtime no entra en el arranque.
    const { transporteRealtime, transporteRealtimeTopic } = await import('./transporteRealtime')
    // Poses de los invitados: una por topic `partida:<id>:p:<ranura>` que solo
    // escucha el anfitrión. En la subida compartida cada pose le llegaba además
    // a todos los demás invitados (4 jugadores a 10 Hz ≈ 160 mensajes/s
    // entregados contra ~60): ahora la ven por el `s` fundido del anfitrión.
    const topicPose = (r: string) => `partida:${partidaId}:p:${r}`
    const [bajada, subida, ...poses] = await Promise.all([
      transporteRealtime(partidaId, 'bajada', soyAnfitrion),
      transporteRealtime(partidaId, 'subida', true),
      ...(soyAnfitrion
        ? ['j1', 'j2', 'j3'].map((r) => transporteRealtimeTopic<Evento>(topicPose(r), false))
        : [transporteRealtimeTopic<Evento>(topicPose(miRanura), true)]),
    ])
    return { bajada, subida, poses }
  }
  // En local las poses siguen por la subida: no hay mensajes que ahorrar.
  return {
    bajada: transporteLocal(`mph.partida.${partidaId}`, soyAnfitrion),
    subida: transporteLocal(`mph.partida.${partidaId}.u`, true),
    poses: [],
  }
}
