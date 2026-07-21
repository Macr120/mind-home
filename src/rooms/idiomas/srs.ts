import { CAJA_DOMINADA, CAJA_MAX, INTERVALOS_DIAS } from './constantes'
import { hoyISO, sumarDias } from './stats'

/**
 * Repaso espaciado tipo Leitner: acierto sube una caja (intervalo más largo),
 * fallo baja DOS (castigo proporcional sin resetear tarjetas maduras). La caja
 * 0 tiene intervalo 0: una tarjeta nueva o recién fallada entra hoy mismo.
 */
export function programarRepaso(
  caja: number,
  acierto: boolean,
  hoy = hoyISO(),
): { caja: number; proximaISO: string; ultimaISO: string } {
  const nueva = acierto ? Math.min(caja + 1, CAJA_MAX) : Math.max(caja - 2, 0)
  return { caja: nueva, proximaISO: sumarDias(hoy, INTERVALOS_DIAS[nueva]), ultimaISO: hoy }
}

export const esDominada = (caja: number) => caja >= CAJA_DOMINADA

/** Vencidas hoy (proximaISO <= hoy), más atrasadas primero. */
export function tarjetasVencidas<T extends { proximaISO: string }>(tarjetas: T[], hoy = hoyISO()): T[] {
  return tarjetas
    .filter((t) => t.proximaISO <= hoy)
    .sort((a, b) => a.proximaISO.localeCompare(b.proximaISO))
}
