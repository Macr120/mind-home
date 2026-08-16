/**
 * Heurística de gama del dispositivo, para los DEFAULTS de rendimiento (nunca
 * pisa un ajuste ya persistido por el usuario): en un teléfono de pocos
 * recursos los efectos de postprocesado arrancan apagados y el render baja a
 * dpr 1. `deviceMemory` solo existe en Chrome/Android — justo el parque que
 * importa; en su ausencia decide el número de núcleos.
 */
export function esGamaBaja(): boolean {
  const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory
  const nucleos = navigator.hardwareConcurrency ?? 4
  return (mem !== undefined && mem <= 4) || nucleos <= 4
}
