/**
 * Reloj de partida. `performance.now()` y nunca `Date.now()`: es monótono y no
 * salta con el NTP del sistema.
 *
 * El anfitrión fija el `t0` y su reloj ES la verdad. El invitado estima el
 * offset con un filtro de RTT MÍNIMO sobre las últimas 10 muestras de
 * ping/pong: la muestra más rápida es la menos contaminada por la cola de red.
 */

const MAX_MUESTRAS = 10
const MAX_JITTER = 40
const RETRASO_MIN = 80
const RETRASO_MAX = 250

let esAnfitrion = false
let t0 = 0
let offset = 0
let muestras: { rtt: number; off: number }[] = []
let jitters: number[] = []
let intervaloEnvio = 200

/** ms de partida. */
export function ahora(): number {
  return esAnfitrion ? performance.now() - t0 : performance.now() + offset
}

/** Solo el anfitrión: fija `t0` y deja `ahora()` = performance.now() - t0. */
export function arrancarComoAnfitrion(): void {
  esAnfitrion = true
  t0 = performance.now()
  offset = 0
  muestras = []
  jitters = []
}

/** Muestra de ping/pong: se queda con la de RTT MÍNIMO de las últimas 10. */
export function muestra(rtt: number, tAnfitrion: number): void {
  if (esAnfitrion) return
  // El `pong` salió del anfitrión hace ~rtt/2.
  muestras.push({ rtt, off: tAnfitrion + rtt / 2 - performance.now() })
  if (muestras.length > MAX_MUESTRAS) muestras.shift()
  let mejor = muestras[0]
  for (const m of muestras) if (m.rtt < mejor.rtt) mejor = m
  offset = mejor.off
}

/** RTT mínimo medido (ms); 0 mientras no haya muestra. */
export function rtt(): number {
  let min = 0
  for (const m of muestras) if (min === 0 || m.rtt < min) min = m.rtt
  return min
}

/**
 * Desviación de llegada de una pose respecto a lo que decía su `t`: la mide la
 * sala al recibir y alimenta el retraso de interpolación.
 */
export function anotarJitter(ms: number): void {
  jitters.push(Math.abs(ms))
  if (jitters.length > MAX_JITTER) jitters.shift()
}

/** p95 del jitter de llegada (ms). */
export function jitterP95(): number {
  if (jitters.length === 0) return 0
  const orden = [...jitters].sort((a, b) => a - b)
  return orden[Math.min(orden.length - 1, Math.floor(orden.length * 0.95))]
}

/** Periodo de emisión de pose vigente: entra en el retraso de interpolación. */
export function fijarIntervaloEnvio(ms: number): void {
  intervaloEnvio = ms
}

/** Periodo de emisión vigente: lo necesita el retraso POR jugador de `sala.ts`. */
export function intervaloPose(): number {
  return intervaloEnvio
}

/** Retraso de interpolación adaptativo: clamp(80, p95(jitter)*2 + intervalo, 250). */
export function retraso(): number {
  return Math.min(RETRASO_MAX, Math.max(RETRASO_MIN, jitterP95() * 2 + intervaloEnvio))
}

/**
 * `visibilitychange` o cambio de sala: el WebView puede haber suspendido el
 * reloj, así que se remide desde cero. Quien llama vacía además los búferes de
 * interpolación y emite `resync`.
 */
export function reiniciar(): void {
  muestras = []
  jitters = []
  // El anfitrión NO reinicia su `t0`: su reloj es la verdad del mundo y saltaría
  // hacia atrás para todos.
  if (!esAnfitrion) offset = 0
}
