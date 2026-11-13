import { comprarPaqueteIA, devolverPaqueteIA, usarPaseIA, type PaqueteIA } from '../../core/cuenta/api'
import { hayCreditos } from '../../core/cuenta/costos'

/**
 * La tarifa del Studio de video: «1 crédito por cada 25 s de video», TODO
 * incluido (escuchar, decidir, traducir); 3 si el doblaje lleva voz IA. Se paga
 * de una vez con un paquete (`ia-paquete`) y lo no usado (tramos sin voz) se
 * devuelve al terminar. Con claves propias (sin créditos) no hay paquete.
 */
export type OpPaquete = 'video.editar' | 'video.clipear' | 'video.traducir' | 'video.traducir.voz'

export const TARIFA_PAQUETE: Record<OpPaquete, number> = {
  'video.editar': 1,
  'video.clipear': 1,
  'video.traducir': 1,
  'video.traducir.voz': 3,
}

/** Créditos que se anuncian (y se cobran por adelantado) por `tramos` de 25 s. */
export const creditosPaquete = (op: OpPaquete, tramos: number) => Math.max(1, tramos) * TARIFA_PAQUETE[op]

/**
 * Corre `trabajo` dentro de un paquete: compra `tramos`, pone el pase mientras
 * dura y, pase lo que pase, devuelve lo que no se usó. `trabajo` dice cuántos
 * tramos usó de verdad (su resultado → `usados`).
 */
export async function conPaquete<T>(op: OpPaquete, tramos: number, trabajo: () => Promise<T>, usados: (r: T) => number): Promise<T> {
  if (!hayCreditos()) return trabajo()
  const paquete: PaqueteIA = await comprarPaqueteIA(op, Math.max(1, tramos))
  usarPaseIA(paquete.pase)
  let usadosFinal = 0
  try {
    const r = await trabajo()
    usadosFinal = usados(r)
    return r
  } finally {
    usarPaseIA(null)
    // Si el trabajo falló, se devuelve todo lo que el servidor no vio usar.
    void devolverPaqueteIA(paquete, usadosFinal).catch((e) => console.warn('[video] no se pudo devolver lo no usado del paquete:', e))
  }
}
