/**
 * Las órdenes del hilo con una persona («jugar ajedrez», «enviar receta Tacos»,
 * «colaborar documento Capítulo 1») corren por aquí, se escriban en la barra o
 * se elijan en los paneles de Jugar / Enviar / Colaborar. La orden y la
 * respuesta quedan como notas del hilo (solo en este dispositivo): así se ve
 * qué pasó y cómo se pide la próxima vez.
 */
import { ordenJugar } from '../chat/ordenJugar'
import type { TFunc } from '../i18n/useT'
import { mensajeErrorPartida } from '../partida/api'
import { useMascota } from '../state/mascotaStore'
import { invitarAJugar } from '../visita/anfitrion'
import { mensajeErrorBuzon } from './api'
import { contactoDeHilo, guardarNotaSistema } from './cache'
import { ordenHilo } from './ordenesHilo'
import { ErrorBuzon } from './tipos'

/** ¿Es una orden del hilo? (sin ejecutarla) */
export function esComandoHilo(texto: string): boolean {
  if (ordenHilo(texto)) return true
  const o = ordenJugar(texto, { requiereVerbo: true })
  return !!o && !o.alias
}

/**
 * Ejecuta la orden si lo es. null = no es una orden (o el hilo no tiene
 * contacto): el texto sale como mensaje normal. `alEmpezar` da el acuse
 * (sonido, vaciar la barra) en cuanto se sabe que es una orden.
 */
export async function ejecutarComandoHilo(
  hiloId: string,
  texto: string,
  t: TFunc,
  alEmpezar?: () => void,
): Promise<{ abrirSelector?: boolean } | null> {
  const ordenH = ordenHilo(texto)
  const jugar = ordenH ? null : ordenJugar(texto, { requiereVerbo: true })
  if (!ordenH && (!jugar || jugar.alias)) return null
  const contacto = await contactoDeHilo(hiloId)
  if (!contacto) return null
  alEmpezar?.()
  void guardarNotaSistema(hiloId, texto, true)
  let respuesta: string
  let abrirSelector = false
  try {
    if (ordenH) {
      const ej = await import('./ordenesHiloEjecutar')
      try {
        const r = await ej.ejecutarOrdenHilo(ordenH, contacto, t)
        respuesta = r.respuesta
        abrirSelector = !!r.abrirSelector
      } catch (e) {
        console.error('[buzon] orden', e)
        respuesta = e instanceof ErrorBuzon ? mensajeErrorBuzon(e, t) : ej.mensajeErrorEspacio(e, t)
      }
    } else {
      respuesta = await invitarAJugar(jugar!.juego, contacto, t)
    }
  } catch (e) {
    console.error('[partida] jugar', e)
    respuesta = e instanceof ErrorBuzon ? mensajeErrorBuzon(e, t) : mensajeErrorPartida(e, t)
  }
  void guardarNotaSistema(hiloId, respuesta, false)
  useMascota.getState().decir(respuesta, { sistema: true })
  return { abrirSelector }
}
