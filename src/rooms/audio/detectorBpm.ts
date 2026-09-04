/**
 * Detector de BPM para la música importada al mezclador (el SYNC lo necesita).
 * Clásico y barato: energía por ventanas → flujo de onsets (solo subidas) →
 * autocorrelación en el rango 60–180 BPM, con un sesgo suave hacia tempos
 * comunes para desempatar octavas (60↔120, 90↔180) e interpolación parabólica
 * del pico. Sin percusión clara (baladas) la estimación es aproximada.
 */

const HOP = 512
const MAX_SEG_ANALISIS = 30

export function detectarBpm(buffer: AudioBuffer): number {
  const sr = buffer.sampleRate
  const datos = buffer.getChannelData(0)
  // Tramo desde el 25 % de la canción (salta la intro); 30 s bastan.
  const desde = Math.floor(datos.length * 0.25)
  const hasta = Math.min(datos.length, desde + Math.floor(MAX_SEG_ANALISIS * sr))
  const nVentanas = Math.floor((hasta - desde) / HOP)
  if (nVentanas < 200) return 120 // menos de ~2.4 s de material: sin señal que medir

  const energia = new Float32Array(nVentanas)
  for (let v = 0; v < nVentanas; v++) {
    let s = 0
    const base = desde + v * HOP
    for (let i = 0; i < HOP; i++) s += datos[base + i] * datos[base + i]
    energia[v] = s
  }
  const flujo = new Float32Array(nVentanas)
  for (let v = 1; v < nVentanas; v++) flujo[v] = Math.max(0, energia[v] - energia[v - 1])
  let media = 0
  for (const x of flujo) media += x
  media /= nVentanas
  for (let v = 0; v < nVentanas; v++) flujo[v] -= media

  const lagMin = Math.floor(((60 / 180) * sr) / HOP)
  const lagMax = Math.ceil(((60 / 60) * sr) / HOP)
  const acf = new Float32Array(lagMax + 2)
  let mejorLag = lagMin
  let mejor = -Infinity
  for (let lag = lagMin; lag <= lagMax; lag++) {
    let s = 0
    for (let v = 0; v + lag < nVentanas; v++) s += flujo[v] * flujo[v + lag]
    acf[lag] = s
    const bpm = (60 * sr) / (HOP * lag)
    const peso = Math.exp(-0.5 * (Math.log2(bpm / 115) / 0.6) ** 2)
    const score = s <= 0 ? s : s * (0.7 + 0.3 * peso)
    if (score > mejor) {
      mejor = score
      mejorLag = lag
    }
  }
  // Corrección de octava: si el medio-lag (tempo doble) también correlaciona
  // fuerte, el tempo real suele ser el doble — el compás entero correlaciona
  // más que el beat y el detector cae a mitad de tempo (visto con house real).
  const mitad = Math.round(mejorLag / 2)
  if (mitad >= lagMin && acf[mitad] > 0.4 * acf[mejorLag]) mejorLag = mitad

  const y0 = acf[mejorLag - 1]
  const y1 = acf[mejorLag]
  const y2 = acf[mejorLag + 1]
  const den = y0 - 2 * y1 + y2
  const ajuste = den !== 0 ? Math.max(-0.5, Math.min(0.5, (0.5 * (y0 - y2)) / den)) : 0
  const bpm = (60 * sr) / (HOP * (mejorLag + ajuste))
  return Math.max(60, Math.min(180, Math.round(bpm)))
}
