// Jev en los juegos de la sala: un modelo de DECISIONES (sí/no con
// probabilidad), no de texto. Va por `ia-chat` sin gastar créditos.
import { ErrorIA, jevJuego, jevJuegoLote } from '../../../core/cuenta/api'
import { hayBackend } from '../../../core/cuenta/supabase'
import { haySesionProbable } from '../../../core/cuenta/sesionStore'

/** Por qué Jev no contestó: sin sesión, cuenta fuera del piloto o fallo de red. */
export type FaltaJev = 'sin-sesion' | 'sin-jev' | 'error'

export type RespuestaJev<T> = { ok: true; valor: T } | { ok: false; falta: FaltaJev }

async function conJev<T>(llamada: () => Promise<T>): Promise<RespuestaJev<T>> {
  if (!hayBackend() || !haySesionProbable()) return { ok: false, falta: 'sin-sesion' }
  try {
    return { ok: true, valor: await llamada() }
  } catch (e) {
    if (e instanceof ErrorIA && (e.codigo === 'sin-sesion' || e.codigo === 'sin-jev')) {
      return { ok: false, falta: e.codigo }
    }
    return { ok: false, falta: 'error' }
  }
}

/** Una decisión: probabilidad del «sí» de cada pregunta. Nunca lanza. */
export function preguntarJev(estado: Record<string, unknown>, preguntas: Record<string, string>) {
  return conJev(() => jevJuego(estado, preguntas))
}

/** Una decisión por estado (≤ 25 por lote). Nunca lanza. */
export function preguntarJevLote(lote: Record<string, unknown>[], preguntas: Record<string, string>) {
  return conJev(() => jevJuegoLote(lote, preguntas))
}
