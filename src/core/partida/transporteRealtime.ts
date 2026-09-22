/**
 * Transporte de partida sobre Realtime de Supabase: un canal privado por cada
 * dirección de `transporte.ts`.
 *
 *   bajada  `partida:<id>`    la policy de insert solo deja publicar al ANFITRIÓN
 *   subida  `partida:<id>:u`  la policy de insert deja publicar a cualquier miembro
 *
 * `setAuth()` antes de abrir el canal, igual que `buzon/motor.ts:147-149`: sin
 * el token de la sesión un canal privado se cae y el error de Realtime es mudo.
 * Por lo mismo, `puedePublicar === false` (el invitado en la bajada) ni siquiera
 * lo intenta: la policy lo rechazaría en silencio.
 */
import { obtenerSupabase } from '../cuenta/supabase'
import type { Evento } from './protocolo'
import type { Transporte } from './transporte'

export async function transporteRealtime(
  partidaId: string,
  direccion: 'bajada' | 'subida',
  puedePublicar: boolean,
): Promise<Transporte> {
  return transporteRealtimeTopic<Evento>(
    direccion === 'bajada' ? `partida:${partidaId}` : `partida:${partidaId}:u`,
    puedePublicar,
  )
}

/**
 * Un canal privado de Realtime con la forma de `Transporte`, sea cual sea el
 * topic y el alfabeto de eventos: lo comparten las partidas y los espacios
 * compartidos (`espacio:<id>`).
 */
export async function transporteRealtimeTopic<E extends string>(
  topic: string,
  puedePublicar: boolean,
): Promise<Transporte<E>> {
  const oyentes = new Map<E, Set<(p: unknown) => void>>()
  const alSuscribir = new Set<() => void>()
  const sb = await obtenerSupabase()
  let unido = false

  if (!sb) {
    // Sin backend esta ventana no ve a nadie; no es motivo para tumbar la escena
    // (mismo criterio que `transporteLocal` sin BroadcastChannel).
    return {
      enviar() {},
      on(ev, cb) {
        let cbs = oyentes.get(ev)
        if (!cbs) {
          cbs = new Set()
          oyentes.set(ev, cbs)
        }
        cbs.add(cb)
      },
      alSuscribir(cb) {
        alSuscribir.add(cb)
      },
      cerrar() {
        oyentes.clear()
        alSuscribir.clear()
      },
    }
  }

  await sb.realtime.setAuth() // token de la sesión para el canal privado
  const canal = sb
    .channel(topic, { config: { private: true } })
    // UN solo binding con comodín: el reparto por evento lo hace el mapa de
    // oyentes, que `sala.ts` llena DESPUÉS de que esta promesa resuelva (un
    // canal de Realtime no admite `.on()` nuevos una vez suscrito).
    .on('broadcast', { event: '*' }, (m: { event?: string; payload?: unknown }) => {
      const cbs = typeof m.event === 'string' ? oyentes.get(m.event as E) : undefined
      if (!cbs) return
      for (const cb of cbs) cb(m.payload)
    })
    .subscribe((estado) => {
      unido = estado === 'SUBSCRIBED'
      if (!unido) return
      // Cada (re)SUBSCRIBED se pone al día: lo emitido con el canal caído no se
      // repite (patrón de re-pull de `buzon/motor.ts:157-163`).
      for (const cb of alSuscribir) cb()
    })

  return {
    enviar(ev, payload) {
      // Con el canal aún sin unir, `send` se iría por el endpoint HTTP de
      // broadcast: a 10 Hz eso es una petición por pose. Mejor tirar el mensaje.
      if (!puedePublicar || !unido) return
      void canal.send({ type: 'broadcast', event: ev, payload })
    },
    on(ev, cb) {
      let cbs = oyentes.get(ev)
      if (!cbs) {
        cbs = new Set()
        oyentes.set(ev, cbs)
      }
      cbs.add(cb)
    },
    alSuscribir(cb) {
      alSuscribir.add(cb)
    },
    cerrar() {
      oyentes.clear()
      alSuscribir.clear()
      unido = false
      void sb.removeChannel(canal)
    },
  }
}
