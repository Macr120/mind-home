import { transcribirConTiempos } from '../../core/audio/dictado'
import type { ImagenAdjunta } from '../../core/chat/ia'
import { ErrorIA } from '../../core/cuenta/api'
import type { ClipPrincipal, MedioVideo } from '../../core/data/db'
import { asegurarBlob } from '../../core/data/repository'
import { fin, redondear, tiempoMedio, velocidadDe } from './modelo'

/**
 * Lo que la IA «ve» y «oye» de un video antes de editarlo o de buscarle los
 * mejores momentos, todo sobre la línea de tiempo del proyecto:
 *
 * - **Audio**: se decodifica en local (16 kHz mono) y se mide la energía; el
 *   video se parte en tramos de 25 s y cada tramo con voz se transcribe con
 *   `transcribir()` —una op «voz» por tramo— y su texto se reparte entre los
 *   trozos con voz por duración. Los silencios salen gratis de la misma medida.
 * - **Imagen**: una hoja de contactos (cuadros con su segundo rotulado) en UNA
 *   imagen, para una sola llamada de visión.
 *
 * Tarifa: 1 crédito por cada 25 s de video (los tramos sin voz no se cobran).
 * Lo escuchado se guarda en memoria: volver a editar o clipear el mismo video
 * (o un trozo suyo) en la sesión no se cobra dos veces.
 */

/** Frase con tiempo (segundos del medio o de la línea, según quién la devuelva). */
export interface FraseVideo {
  inicio: number
  fin: number
  texto: string
}

/** Una palabra con su tiempo exacto (Whisper): subtítulos karaoke y cortes al milímetro. */
export interface PalabraVideo {
  p: string
  i: number
  f: number
}

export interface AnalisisLinea {
  duracion: number
  /** Transcripción, en segundos de la línea de tiempo. */
  frases: FraseVideo[]
  /** La misma transcripción por tramo de 25 s (un texto por tramo con voz): lo que se traduce y se dobla. */
  bloques: FraseVideo[]
  /** Cada palabra con su tiempo (línea); vacío si el proveedor no los dio (las frases van entonces a ojo). */
  palabras: PalabraVideo[]
  /** Cambios de plano (cortes de cámara) en segundos de la línea: medidos en local, sin IA. */
  planos: number[]
  /** Energía del audio por segundo de la línea (0–1). */
  energia: number[]
  /** Pausas largas ENTRE frases (solo donde hubo voz), ya con margen: candidatas a recortar. */
  silencios: [number, number][]
  /** Hoja de contactos; null si no se pudo capturar ningún cuadro. */
  hoja: ImagenAdjunta | null
  /** Segundos (de la línea) de cada cuadro de la hoja, en orden. */
  cuadros: number[]
  /** Tramos de 25 s que se escucharon en ESTA pasada (los mudos y los ya escuchados no cuentan): lo que se usó del paquete. */
  escuchados: number
}

export type FaseAnalisis = 'audio' | 'video' | 'ia'
export type AlProgreso = (fase: FaseAnalisis, hecho: number, total: number) => void

const SR = 16000
const VENTANA = 0.05
/**
 * LA TARIFA: 1 crédito por cada 25 s de video escuchado. Cada tramo de 25 s es
 * UNA llamada al proxy de dictado (su tope es ~30 s; los bordes se corren hasta
 * 2 s al punto más callado para no partir palabras).
 */
export const SEG_POR_CREDITO = 25
const RADIO_BORDE = 2
/** Transcripciones a la vez: el proxy admite 30 por minuto y por usuario. */
const EN_PARALELO = 2
/** Pausa entre tramos que todavía cuenta como la misma frase. */
const PAUSA_FRASE = 0.5
/** Una pausa más larga que esto entre frases es «silencio» recortable. */
const PAUSA_RECORTABLE = 0.8
const MARGEN_SILENCIO = 0.2
const MAX_CUADROS = 36

/** Tramos de 25 s (= créditos) que tiene un trozo de `segundos`. */
export const tramosDe = (segundos: number) => (segundos < 0.3 ? 0 : Math.ceil(segundos / SEG_POR_CREDITO - 1e-6))

type ClipVideoReal = ClipPrincipal & { fuente: { tipo: 'video'; medioId: number } }

function videosDe(principal: ClipPrincipal[], medios: MedioVideo[]): ClipVideoReal[] {
  const conMedio = new Set(medios.filter((m) => m.id != null).map((m) => m.id!))
  return principal.filter((c): c is ClipVideoReal => c.fuente.tipo === 'video' && conMedio.has(c.fuente.medioId))
}

// ─── Audio ──────────────────────────────────────────────────────────────────

interface AudioMedio {
  /** RMS por ventana de `VENTANA` s. */
  rms: Float32Array
  /** 16 bits (la mitad de memoria que float: un video de 1 h son ~115 MB). */
  pcm: Int16Array
  /** RMS por encima del cual hay voz (relativo al propio audio). */
  umbral: number
}

const audioCache = new Map<number, Promise<AudioMedio | null>>()
/** Lo ya escuchado en esta sesión, por medio (segundos del MEDIO): reescucharlo no se cobra. */
interface Escuchado {
  frases: FraseVideo[]
  bloques: FraseVideo[]
  palabras: PalabraVideo[]
}
const escuchado = new Map<number, (Escuchado & { desde: number; hasta: number })[]>()

function yaEscuchado(medioId: number, desde: number, hasta: number): Escuchado | null {
  const e = escuchado.get(medioId)?.find((x) => x.desde <= desde + 0.05 && x.hasta >= hasta - 0.05)
  const dentro = (f: FraseVideo) => f.fin > desde && f.inicio < hasta
  return e ? { frases: e.frases.filter(dentro), bloques: e.bloques.filter(dentro), palabras: e.palabras.filter((w) => w.f > desde && w.i < hasta) } : null
}

/**
 * Créditos MÁXIMOS por escuchar la pista principal: 1 por cada 25 s de video,
 * sin contar lo ya escuchado en esta sesión. Los tramos sin voz no se cobran,
 * así que el cobro real puede quedar por debajo, nunca por encima.
 */
export function creditosEscucha(principal: ClipPrincipal[], medios: MedioVideo[]): number {
  return videosDe(principal, medios).reduce((s, c) => {
    const desde = c.desde ?? 0
    // Se escucha el tramo DEL MEDIO (con velocidad, más o menos que lo que dura en la línea).
    const span = c.duracion * velocidadDe(c)
    return yaEscuchado(c.fuente.medioId, desde, desde + span) ? s : s + tramosDe(span)
  }, 0)
}

async function blobDe(medioId: number): Promise<Blob | null> {
  return asegurarBlob('mediosVideo', medioId)
}

function percentil(valores: Float32Array, p: number): number {
  const orden = Float32Array.from(valores).sort()
  return orden[Math.min(orden.length - 1, Math.floor(orden.length * p))] ?? 0
}

/** Decodifica el audio del medio a 16 kHz mono; null si no tiene pista de audio o el navegador no la entiende. */
function audioDe(medioId: number): Promise<AudioMedio | null> {
  let p = audioCache.get(medioId)
  if (!p) {
    p = (async () => {
      const blob = await blobDe(medioId)
      if (!blob) return null
      try {
        const Ctx = window.OfflineAudioContext ?? (window as unknown as { webkitOfflineAudioContext: typeof OfflineAudioContext }).webkitOfflineAudioContext
        const ctx = new Ctx(1, SR, SR)
        const buf = await ctx.decodeAudioData(await blob.arrayBuffer())
        const n = buf.length
        const canales = Array.from({ length: buf.numberOfChannels }, (_, c) => buf.getChannelData(c))
        const pcm = new Int16Array(n)
        for (let i = 0; i < n; i++) {
          let s = 0
          for (const d of canales) s += d[i]
          s = Math.max(-1, Math.min(1, s / canales.length))
          pcm[i] = s < 0 ? s * 0x8000 : s * 0x7fff
        }
        const paso = Math.round(SR * VENTANA)
        const rms = new Float32Array(Math.ceil(n / paso))
        for (let w = 0; w < rms.length; w++) {
          let s = 0
          const a = w * paso
          const b = Math.min(n, a + paso)
          for (let i = a; i < b; i++) s += (pcm[i] / 32768) ** 2
          rms[w] = Math.sqrt(s / Math.max(1, b - a))
        }
        const umbral = Math.max(0.006, percentil(rms, 0.15) * 3, percentil(rms, 0.98) * 0.12)
        return { rms, pcm, umbral }
      } catch {
        return null
      }
    })()
    audioCache.set(medioId, p)
  }
  return p
}

/** Tramos con voz (segundos del medio) dentro de [desde, hasta]. */
function tramosVoz(a: AudioMedio, desde: number, hasta: number): [number, number][] {
  const w0 = Math.floor(desde / VENTANA)
  const w1 = Math.min(a.rms.length, Math.ceil(hasta / VENTANA))
  const tramos: [number, number][] = []
  let ini = -1
  for (let w = w0; w <= w1; w++) {
    const voz = w < w1 && a.rms[w] > a.umbral
    if (voz && ini < 0) ini = w
    if (!voz && ini >= 0) {
      const t0 = ini * VENTANA
      const t1 = w * VENTANA
      const prev = tramos[tramos.length - 1]
      if (prev && t0 - prev[1] < PAUSA_FRASE) prev[1] = t1
      else tramos.push([t0, t1])
      ini = -1
    }
  }
  return tramos
    .filter(([a0, a1]) => a1 - a0 >= 0.25)
    .map(([a0, a1]) => [Math.max(desde, a0 - 0.15), Math.min(hasta, a1 + 0.15)] as [number, number])
}

/** El punto más callado a ±`RADIO_BORDE` s de `t` (ahí se parte sin cortar palabras). */
function puntoCallado(a: AudioMedio, t: number): number {
  let mejor = t
  let minimo = Infinity
  const w0 = Math.max(0, Math.floor((t - RADIO_BORDE) / VENTANA))
  const w1 = Math.min(a.rms.length, Math.ceil((t + RADIO_BORDE) / VENTANA))
  for (let w = w0; w < w1; w++) {
    if (a.rms[w] < minimo) {
      minimo = a.rms[w]
      mejor = w * VENTANA
    }
  }
  return mejor
}

/** WAV PCM 16 bits mono del trozo [t0, t1]. */
function wav(pcm: Int16Array, t0: number, t1: number): Blob {
  const a = Math.max(0, Math.floor(t0 * SR))
  const b = Math.min(pcm.length, Math.ceil(t1 * SR))
  const n = Math.max(0, b - a)
  const buf = new ArrayBuffer(44 + n * 2)
  const v = new DataView(buf)
  const str = (o: number, s: string) => {
    for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i))
  }
  str(0, 'RIFF')
  v.setUint32(4, 36 + n * 2, true)
  str(8, 'WAVE')
  str(12, 'fmt ')
  v.setUint32(16, 16, true)
  v.setUint16(20, 1, true)
  v.setUint16(22, 1, true)
  v.setUint32(24, SR, true)
  v.setUint32(28, SR * 2, true)
  v.setUint16(32, 2, true)
  v.setUint16(34, 16, true)
  str(36, 'data')
  v.setUint32(40, n * 2, true)
  new Int16Array(buf, 44, n).set(pcm.subarray(a, b))
  return new Blob([buf], { type: 'audio/wav' })
}

/** Reparte las palabras de un tramo entre sus trozos con voz según lo que dura cada uno. */
function repartirPalabras(texto: string, tramos: [number, number][]): FraseVideo[] {
  const palabras = texto.replace(/\s+/g, ' ').trim().split(' ').filter(Boolean)
  if (palabras.length === 0) return []
  const total = tramos.reduce((s, [a, b]) => s + (b - a), 0)
  const salida: FraseVideo[] = []
  let usadas = 0
  let acumulado = 0
  tramos.forEach(([a, b], i) => {
    acumulado += b - a
    const hasta = i === tramos.length - 1 ? palabras.length : Math.round((palabras.length * acumulado) / total)
    const trozo = palabras.slice(usadas, hasta)
    usadas = Math.max(usadas, hasta)
    if (trozo.length) salida.push({ inicio: a, fin: b, texto: trozo.join(' ') })
  })
  return salida
}

/** Un tramo de la tarifa (≤ 25 s ± bordes) con sus trozos de voz; sin voz no existe (no se cobra). */
interface Tramo {
  inicio: number
  fin: number
  voz: [number, number][]
}

/** Parte [desde, hasta] en `tramosDe(...)` tramos iguales, con los bordes en silencio; descarta los mudos. */
function tramosCobro(a: AudioMedio, desde: number, hasta: number): Tramo[] {
  const n = tramosDe(hasta - desde)
  if (n === 0) return []
  const largo = (hasta - desde) / n
  const bordes = [desde]
  for (let k = 1; k < n; k++) bordes.push(puntoCallado(a, desde + k * largo))
  bordes.push(hasta)
  const salida: Tramo[] = []
  for (let k = 0; k < n; k++) {
    const voz = tramosVoz(a, bordes[k], bordes[k + 1])
    if (voz.length) salida.push({ inicio: voz[0][0], fin: voz[voz.length - 1][1], voz })
  }
  return salida
}

const esperar = (ms: number) => new Promise((r) => window.setTimeout(r, ms))

/** Frases a partir de palabras con tiempo: se corta en las pausas, en el punto final o al pasar de ~42 letras. */
function frasesDePalabras(palabras: PalabraVideo[]): FraseVideo[] {
  const frases: FraseVideo[] = []
  let actual: PalabraVideo[] = []
  const cerrar = () => {
    if (actual.length) frases.push({ inicio: actual[0].i, fin: actual[actual.length - 1].f, texto: actual.map((w) => w.p).join(' ') })
    actual = []
  }
  for (const w of palabras) {
    const previa = actual[actual.length - 1]
    if (previa && (w.i - previa.f > 0.35 || /[.!?…]$/.test(previa.p) || actual.map((x) => x.p).join(' ').length + w.p.length > 42)) cerrar()
    actual.push(w)
  }
  cerrar()
  return frases
}

interface Oido {
  texto: string
  /** En segundos del MEDIO. */
  palabras?: PalabraVideo[]
}

/** Transcribe un tramo; si el proxy pide calma («vas muy rápido»), espera y reintenta. */
async function transcribirTramo(a: AudioMedio, tr: Tramo): Promise<Oido> {
  for (let intento = 0; ; intento++) {
    try {
      const r = await transcribirConTiempos(wav(a.pcm, tr.inicio, tr.fin), undefined, tr.fin - tr.inicio)
      const palabras = r.palabras?.filter((w) => w.p).map((w) => ({ p: w.p, i: redondear(tr.inicio + w.i), f: redondear(tr.inicio + w.f) }))
      return { texto: r.texto.trim(), palabras: palabras?.length ? palabras : undefined }
    } catch (e) {
      if (e instanceof ErrorIA && e.codigo === 'limite' && intento < 8) {
        await esperar(10_000)
        continue
      }
      throw e
    }
  }
}

// ─── Imagen ─────────────────────────────────────────────────────────────────

/** Un `<video>` oculto listo para saltar a cualquier segundo. */
export async function abrirVideo(medioId: number): Promise<{ v: HTMLVideoElement; cerrar: () => void } | null> {
  const blob = await blobDe(medioId)
  if (!blob) return null
  const url = URL.createObjectURL(blob)
  const v = document.createElement('video')
  v.muted = true
  v.playsInline = true
  v.preload = 'auto'
  v.src = url
  const cerrar = () => {
    v.removeAttribute('src')
    v.load()
    URL.revokeObjectURL(url)
  }
  const ok = await new Promise<boolean>((res) => {
    const t = window.setTimeout(() => res(false), 15000)
    v.onloadeddata = () => {
      window.clearTimeout(t)
      res(true)
    }
    v.onerror = () => {
      window.clearTimeout(t)
      res(false)
    }
  })
  if (!ok) {
    cerrar()
    return null
  }
  return { v, cerrar }
}

export function irA(v: HTMLVideoElement, t: number): Promise<void> {
  return new Promise((res) => {
    const listo = () => {
      window.clearTimeout(tope)
      v.removeEventListener('seeked', listo)
      res()
    }
    const tope = window.setTimeout(listo, 4000)
    v.addEventListener('seeked', listo)
    v.currentTime = Math.max(0, Math.min(t, (v.duration || t) - 0.05))
  })
}

const etiquetaSeg = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`

/** Dibuja el cuadro actual «contain» dentro de la caja. */
function dibujar(ctx: CanvasRenderingContext2D, v: HTMLVideoElement, x: number, y: number, w: number, h: number) {
  ctx.fillStyle = '#000'
  ctx.fillRect(x, y, w, h)
  const vw = v.videoWidth || w
  const vh = v.videoHeight || h
  const k = Math.min(w / vw, h / vh)
  ctx.drawImage(v, x + (w - vw * k) / 2, y + (h - vh * k) / 2, vw * k, vh * k)
}

/** Cuadros sueltos (data URL JPEG) de un video: miniaturas de los momentos. */
export async function fotogramas(medioId: number, tiempos: number[], ancho = 320): Promise<(string | null)[]> {
  const abierto = await abrirVideo(medioId)
  if (!abierto) return tiempos.map(() => null)
  const { v, cerrar } = abierto
  try {
    const alto = Math.round((ancho * (v.videoHeight || 9)) / (v.videoWidth || 16))
    const lienzo = document.createElement('canvas')
    lienzo.width = ancho
    lienzo.height = alto
    const ctx = lienzo.getContext('2d')!
    const salida: (string | null)[] = []
    for (const t of tiempos) {
      await irA(v, t)
      dibujar(ctx, v, 0, 0, ancho, alto)
      salida.push(lienzo.toDataURL('image/jpeg', 0.7))
    }
    return salida
  } finally {
    cerrar()
  }
}

/** Hoja de contactos: cada muestra en su casilla con el segundo de la línea rotulado. */
async function hojaContactos(
  muestras: { medioId: number; t: number; seg: number }[],
  vertical: boolean,
  alProgreso: AlProgreso,
): Promise<ImagenAdjunta | null> {
  if (muestras.length === 0) return null
  const [cw, ch] = vertical ? [135, 240] : [240, 135]
  const cols = vertical ? 8 : 6
  const filas = Math.ceil(muestras.length / cols)
  const lienzo = document.createElement('canvas')
  lienzo.width = cw * cols
  lienzo.height = ch * filas
  const ctx = lienzo.getContext('2d')!
  ctx.fillStyle = '#111'
  ctx.fillRect(0, 0, lienzo.width, lienzo.height)
  ctx.font = 'bold 18px sans-serif'
  ctx.textBaseline = 'top'
  let dibujados = 0
  const porMedio = new Map<number, number[]>()
  muestras.forEach((m, i) => porMedio.set(m.medioId, [...(porMedio.get(m.medioId) ?? []), i]))
  for (const [medioId, indices] of porMedio) {
    const abierto = await abrirVideo(medioId)
    for (const i of indices) {
      const x = (i % cols) * cw
      const y = Math.floor(i / cols) * ch
      if (abierto) {
        await irA(abierto.v, muestras[i].t)
        dibujar(ctx, abierto.v, x, y, cw, ch)
        dibujados++
      }
      const rotulo = etiquetaSeg(muestras[i].seg)
      ctx.fillStyle = 'rgba(0,0,0,0.75)'
      ctx.fillRect(x, y, ctx.measureText(rotulo).width + 10, 24)
      ctx.fillStyle = '#ffeb3b'
      ctx.fillText(rotulo, x + 5, y + 3)
      ctx.strokeStyle = '#333'
      ctx.strokeRect(x, y, cw, ch)
      alProgreso('video', i + 1, muestras.length)
    }
    abierto?.cerrar()
  }
  if (dibujados === 0) return null
  const dataUrl = lienzo.toDataURL('image/jpeg', 0.72)
  return { base64: dataUrl.slice(dataUrl.indexOf(',') + 1), mediaType: 'image/jpeg' }
}

// ─── Cambios de plano ───────────────────────────────────────────────────────

const PASO_PLANOS = 0.5
const MAX_MUESTRAS_PLANOS = 900
const planosCache = new Map<string, number[]>()

/**
 * Cortes de cámara en [desde, hasta] (segundos del medio): cuadros pequeños
 * cada medio segundo y un salto de diferencia muy por encima de lo normal del
 * propio video (mediana ×3 o + 8 desviaciones medianas, mínimo 12 %). Local y gratis.
 */
async function cambiosDePlano(medioId: number, desde: number, hasta: number, alProgreso?: (hecho: number, total: number) => void): Promise<number[]> {
  const clave = `${medioId}:${desde.toFixed(2)}:${hasta.toFixed(2)}`
  const previo = planosCache.get(clave)
  if (previo) return previo
  const abierto = await abrirVideo(medioId)
  if (!abierto) return []
  const { v, cerrar } = abierto
  try {
    const paso = Math.max(PASO_PLANOS, (hasta - desde) / MAX_MUESTRAS_PLANOS)
    const n = Math.floor((hasta - desde) / paso) + 1
    const lienzo = document.createElement('canvas')
    lienzo.width = 32
    lienzo.height = 18
    const ctx = lienzo.getContext('2d', { willReadFrequently: true })!
    let previoCuadro: Uint8ClampedArray | null = null
    const difs: { t: number; d: number }[] = []
    for (let i = 0; i < n; i++) {
      const t = desde + i * paso
      await irA(v, t)
      ctx.drawImage(v, 0, 0, 32, 18)
      const cuadro = ctx.getImageData(0, 0, 32, 18).data
      if (previoCuadro) {
        let suma = 0
        for (let k = 0; k < cuadro.length; k += 4) suma += Math.abs(cuadro[k] - previoCuadro[k]) + Math.abs(cuadro[k + 1] - previoCuadro[k + 1]) + Math.abs(cuadro[k + 2] - previoCuadro[k + 2])
        difs.push({ t: t - paso / 2, d: suma / ((cuadro.length / 4) * 3 * 255) })
      }
      previoCuadro = cuadro
      alProgreso?.(i + 1, n)
    }
    if (difs.length < 3) return []
    // Umbral ROBUSTO (mediana y desviación mediana): con media y desviación, los propios cortes
    // inflan la desviación y en un video corto ninguno pasa el umbral.
    const orden = difs.map((x) => x.d).sort((x, y) => x - y)
    const mediana = orden[Math.floor(orden.length / 2)]
    const mad = difs.map((x) => Math.abs(x.d - mediana)).sort((x, y) => x - y)[Math.floor(difs.length / 2)]
    const umbral = Math.max(0.12, mediana * 3, mediana + 8 * mad)
    const aproximados: number[] = []
    difs.forEach((x, i) => {
      // Un pico (no la ladera de una transición lenta) y a más de 1 s del anterior.
      const pico = x.d >= umbral && x.d >= (difs[i - 1]?.d ?? 0) && x.d >= (difs[i + 1]?.d ?? 0)
      if (pico && (aproximados.length === 0 || x.t - aproximados[aproximados.length - 1] > 1)) aproximados.push(x.t)
    })
    // Afinado: el corte está entre dos muestras; 3 bisecciones lo dejan a ~6 centésimas.
    const cuadroEn = async (t: number) => {
      await irA(v, t)
      ctx.drawImage(v, 0, 0, 32, 18)
      return ctx.getImageData(0, 0, 32, 18).data
    }
    const dif = (x: Uint8ClampedArray, y: Uint8ClampedArray) => {
      let suma = 0
      for (let k = 0; k < x.length; k += 4) suma += Math.abs(x[k] - y[k]) + Math.abs(x[k + 1] - y[k + 1]) + Math.abs(x[k + 2] - y[k + 2])
      return suma
    }
    const cortes: number[] = []
    for (const t of aproximados) {
      let a0 = t - paso / 2
      let b0 = t + paso / 2
      const fa = await cuadroEn(a0)
      const fb = await cuadroEn(b0)
      for (let k = 0; k < 3; k++) {
        const m = (a0 + b0) / 2
        const fm = await cuadroEn(m)
        // El corte queda del lado donde el cuadro de en medio todavía se parece al otro extremo.
        if (dif(fa, fm) > dif(fm, fb)) b0 = m
        else a0 = m
      }
      cortes.push(redondear((a0 + b0) / 2))
    }
    planosCache.set(clave, cortes)
    return cortes
  } finally {
    cerrar()
  }
}

// ─── Línea de tiempo ────────────────────────────────────────────────────────

/**
 * Analiza la pista principal: los clips de video aportan audio y cuadros; las
 * imágenes y los colores no se miran. Sin tope de duración: cobra 1 crédito por
 * cada 25 s con voz que aún no se haya escuchado en la sesión.
 * `transcribirVoz: false` no gasta créditos (solo energía y silencios).
 */
export async function analizarLinea(
  principal: ClipPrincipal[],
  medios: MedioVideo[],
  opciones: { vertical: boolean; transcribirVoz?: boolean; sinHoja?: boolean; alProgreso: AlProgreso },
): Promise<AnalisisLinea> {
  const { alProgreso } = opciones
  const duracion = principal.reduce((m, c) => Math.max(m, fin(c)), 0)
  const videos = videosDe(principal, medios)

  // 1) Audio: energía y tramos de cobro por clip (lo ya escuchado no se vuelve a pedir).
  const energia = new Array<number>(Math.ceil(duracion)).fill(0)
  const trabajos: {
    clip: ClipVideoReal
    audio: AudioMedio
    desde: number
    hasta: number
    previas: Escuchado | null
    tramos: Tramo[]
  }[] = []
  for (const clip of videos) {
    const audio = await audioDe(clip.fuente.medioId)
    if (!audio) continue
    const desde = clip.desde ?? 0
    const vel = velocidadDe(clip)
    const hasta = desde + clip.duracion * vel
    for (let s = Math.floor(clip.inicio); s < Math.min(energia.length, Math.ceil(fin(clip))); s++) {
      const w0 = Math.floor(tiempoMedio(clip, s - clip.inicio) / VENTANA)
      let m = 0
      for (let w = w0; w < w0 + 1 / VENTANA && w < audio.rms.length; w++) m = Math.max(m, audio.rms[w])
      energia[s] = Math.max(energia[s], m)
    }
    const previas = yaEscuchado(clip.fuente.medioId, desde, hasta)
    const tramos = previas || opciones.transcribirVoz === false ? [] : tramosCobro(audio, desde, hasta)
    trabajos.push({ clip, audio, desde, hasta, previas, tramos })
  }
  let pico = 0.0001
  for (const e of energia) pico = Math.max(pico, e)
  for (let s = 0; s < energia.length; s++) energia[s] = Math.round((energia[s] / pico) * 100) / 100

  // 2) Transcripción, de dos en dos (el proxy limita a 30 por minuto).
  const tareas = trabajos.flatMap((tb) => tb.tramos.map((tr) => ({ tb, tr })))
  const textos = new Map<Tramo, Oido>()
  let hechos = 0
  let fallos = 0
  let primerError: unknown = null
  let corte: unknown = null
  if (tareas.length) alProgreso('audio', 0, tareas.length)
  let siguiente = 0
  const trabajador = async () => {
    while (corte == null && siguiente < tareas.length) {
      const { tb, tr } = tareas[siguiente++]
      try {
        textos.set(tr, await transcribirTramo(tb.audio, tr))
      } catch (e) {
        // Sin créditos o sin sesión: no se sigue gastando.
        if (e instanceof ErrorIA) corte = e
        else {
          fallos++
          primerError ??= e
        }
      }
      hechos++
      alProgreso('audio', hechos, tareas.length)
    }
  }
  await Promise.all(Array.from({ length: Math.min(EN_PARALELO, tareas.length) }, trabajador))
  if (corte) throw corte
  if (tareas.length > 0 && fallos === tareas.length && primerError) throw primerError

  const frases: FraseVideo[] = []
  const bloques: FraseVideo[] = []
  const palabras: PalabraVideo[] = []
  const silencios: [number, number][] = []
  for (const tb of trabajos) {
    let delMedio = tb.previas
    if (!delMedio) {
      // Con tiempos por palabra, las frases salen exactas; si no (respaldo sin ellos), a ojo por duración.
      const oir = (tr: Tramo) => textos.get(tr)
      delMedio = {
        frases: tb.tramos.flatMap((tr) => {
          const o = oir(tr)
          return o?.palabras ? frasesDePalabras(o.palabras) : repartirPalabras(o?.texto ?? '', tr.voz)
        }),
        bloques: tb.tramos.filter((tr) => oir(tr)?.texto).map((tr) => ({ inicio: tr.inicio, fin: tr.fin, texto: oir(tr)!.texto })),
        palabras: tb.tramos.flatMap((tr) => oir(tr)?.palabras ?? []),
      }
      // Solo se recuerda lo escuchado entero (un tramo fallido se reintenta la próxima vez).
      if (opciones.transcribirVoz !== false && tb.tramos.every((tr) => textos.has(tr))) {
        const lista = escuchado.get(tb.clip.fuente.medioId) ?? []
        lista.push({ desde: tb.desde, hasta: tb.hasta, ...delMedio })
        escuchado.set(tb.clip.fuente.medioId, lista)
      }
    }
    const aLinea = (t: number) => redondear(tb.clip.inicio + (t - tb.desde) / velocidadDe(tb.clip))
    const enLinea = (f: FraseVideo) => ({ inicio: aLinea(Math.max(f.inicio, tb.desde)), fin: aLinea(Math.min(f.fin, tb.hasta)), texto: f.texto })
    bloques.push(...delMedio.bloques.map(enLinea))
    palabras.push(
      ...delMedio.palabras.filter((w) => w.f > tb.desde && w.i < tb.hasta).map((w) => ({ p: w.p, i: aLinea(Math.max(w.i, tb.desde)), f: aLinea(Math.min(w.f, tb.hasta)) })),
    )
    const propias = delMedio.frases.map(enLinea)
    // Silencios recortables: solo entre frases de verdad (un video sin voz no se toca).
    for (let i = 1; i < propias.length; i++) {
      const a = propias[i - 1].fin + MARGEN_SILENCIO
      const b = propias[i].inicio - MARGEN_SILENCIO
      if (b - a >= PAUSA_RECORTABLE - 2 * MARGEN_SILENCIO) silencios.push([redondear(a), redondear(b)])
    }
    frases.push(...propias)
  }

  // 3) Hoja de contactos repartida por toda la línea.
  const n = Math.max(6, Math.min(MAX_CUADROS, Math.ceil(duracion / 5)))
  const muestras: { medioId: number; t: number; seg: number }[] = []
  for (let i = 0; i < n; i++) {
    const seg = redondear(((i + 0.5) * duracion) / n)
    const c = videos.find((x) => seg >= x.inicio && seg < fin(x))
    if (c) muestras.push({ medioId: c.fuente.medioId, t: tiempoMedio(c, seg - c.inicio), seg })
  }
  const hoja = opciones.sinHoja ? null : await hojaContactos(muestras, opciones.vertical, alProgreso)

  // 4) Cambios de plano (no hacen falta para traducir: va con `sinHoja`).
  const planos: number[] = []
  if (!opciones.sinHoja) {
    for (const c of videos) {
      const a0 = c.desde ?? 0
      const b0 = tiempoMedio(c, c.duracion)
      const enMedio = await cambiosDePlano(c.fuente.medioId, a0, b0, (n, tot) => alProgreso('video', n, tot))
      for (const t of enMedio) planos.push(redondear(c.inicio + (t - a0) / velocidadDe(c)))
    }
  }

  frases.sort((a, b) => a.inicio - b.inicio)
  bloques.sort((a, b) => a.inicio - b.inicio)
  return {
    duracion,
    frases,
    bloques,
    palabras: palabras.sort((a, b) => a.i - b.i),
    planos: planos.sort((a, b) => a - b),
    energia,
    silencios,
    hoja,
    cuadros: opciones.sinHoja ? [] : muestras.map((m) => m.seg),
    escuchados: textos.size,
  }
}

/** Junta frases seguidas en bloques de hasta `seg` s (videos largos: el prompt no crece sin medida). */
function compactar(frases: FraseVideo[], seg: number): FraseVideo[] {
  const salida: FraseVideo[] = []
  for (const f of frases) {
    const u = salida[salida.length - 1]
    if (u && f.fin - u.inicio <= seg) salida[salida.length - 1] = { inicio: u.inicio, fin: f.fin, texto: `${u.texto} ${f.texto}` }
    else salida.push({ ...f })
  }
  return salida
}

/** Texto compacto del análisis para el prompt: transcripción con tiempos y perfil de energía. */
export function describirAnalisis(a: AnalisisLinea): string {
  const lineas = [`Duración: ${a.duracion.toFixed(1)} s.`]
  if (a.frases.length) {
    lineas.push('Transcripción (segundos de inicio–fin):')
    // Hasta ~250 líneas: en videos largos las frases se juntan en bloques más largos.
    const bloque = a.duracion / 250
    for (const f of bloque > 6 ? compactar(a.frases, bloque) : a.frases) lineas.push(`[${f.inicio.toFixed(1)}–${f.fin.toFixed(1)}] ${f.texto}`)
  } else lineas.push('Transcripción: no hay voz reconocible.')
  // Un dígito 0–9 por segundo (o por bloque si es largo), en grupos de 10.
  const paso = Math.max(1, Math.ceil(a.energia.length / 300))
  const digitos: string[] = []
  for (let i = 0; i < a.energia.length; i += paso) {
    const m = Math.max(...a.energia.slice(i, i + paso))
    digitos.push(String(Math.min(9, Math.round(m * 9))))
  }
  const grupos: string[] = []
  for (let i = 0; i < digitos.length; i += 10) grupos.push(digitos.slice(i, i + 10).join(''))
  lineas.push(`Volumen del audio (0–9, un dígito cada ${paso} s, grupos de 10): ${grupos.join(' ')}`)
  if (a.planos.length) lineas.push(`Cambios de plano (cortes de cámara) en los segundos: ${a.planos.slice(0, 120).map((t) => t.toFixed(1)).join(', ')}.`)
  if (a.hoja) lineas.push(`La imagen adjunta es una hoja de contactos: ${a.cuadros.length} cuadros en orden, cada uno rotulado con su minuto:segundo.`)
  return lineas.join('\n')
}
