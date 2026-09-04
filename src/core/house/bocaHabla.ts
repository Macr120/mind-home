/**
 * Estado de la boca hablante de un rostro dibujado (Studio de video): puro, sin
 * three. Lo escribe quien anima (el renderizador del video, con su propio reloj)
 * y lo aplica `Rostro` en su `useFrame`. Separar el suavizado del frame permite
 * varios renders por tick con el mismo `t` y seeks sin overshoot.
 */
export interface BocaHabla {
  /** Apertura suavizada 0–1. */
  nivel: number
  /** Con histéresis: la boca abierta gana a la estática mientras habla. */
  hablando: boolean
}

export const nuevaBocaHabla = (): BocaHabla => ({ nivel: 0, hablando: false })

/** Suavizado exponencial independiente del framerate (misma fórmula que la máscara AR). */
export function amortiguar(actual: number, objetivo: number, dt: number, tau: number): number {
  return actual + (objetivo - actual) * (1 - Math.exp(-dt / tau))
}

/**
 * Un paso de la boca hacia `objetivo` (amplitud cruda 0–1). `dt` fuera de
 * (0, 0.25] se acota: tras un seek o con dos renders en el mismo tick no hay
 * que saltar. Histéresis 0.12/0.06 para que no titile entre sílabas.
 */
export function avanzarBoca(b: BocaHabla, objetivo: number, dt: number): void {
  const d = dt > 0 ? Math.min(dt, 0.25) : 1 / 30
  b.nivel = amortiguar(b.nivel, Math.max(0, Math.min(1, objetivo)), d, 0.05)
  if (b.nivel >= 0.12) b.hablando = true
  else if (b.nivel <= 0.06) b.hablando = false
}
