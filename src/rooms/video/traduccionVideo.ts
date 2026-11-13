import { hayVozIA } from '../../core/audio/vozIA'
import { conversarIA, extraerJSON } from '../../core/chat/ia'
import { ErrorIA } from '../../core/cuenta/api'
import type { ClipPrincipal, ClipTexto, ClipVideo, ClipVoz, EstiloTexto, ProyectoVideo } from '../../core/data/db'
import type { DatosIdioma } from '../../core/i18n/idiomas'
import { tramosDeClips, type AnalisisLinea, type FraseVideo } from './analisis'
import { MIN_CLIP, nuevoClipId } from './constantes'
import { fin, normalizar, redondear } from './modelo'
import { mediosVideoRepo } from '../../core/data/repository'
import { generarAudioNarracion } from './narracion'
import type { OpPaquete } from './paqueteVideo'
import { ID_TRANSCRIPCION, SUBTITULO_TRANSCRIPCION, subtitulosDeFrases } from './subtitulos'
import { usaDispositivo } from './voces'

/**
 * «Traducir video»: lo que se DICE en el video (o en un clip) pasa a otro
 * idioma, con su voz (doblaje) y sus subtítulos. Se apoya en la escucha del
 * análisis (un texto por tramo de 25 s), traduce por lotes y, con doblaje,
 * genera una voz por tramo que empieza donde empezaba la original.
 *
 * Las voces del doblaje llevan el id con el sufijo `-dob` y los subtítulos el
 * `deClipId` de la transcripción: volver a traducir (a otro idioma) los
 * sustituye en vez de apilarlos.
 */

export const SUFIJO_DOBLAJE = '-dob'
const esDoblaje = (c: ClipVideo) => c.pista === 'voz' && c.id.endsWith(SUFIJO_DOBLAJE)
const esSubtituloTranscripcion = (c: ClipVideo): c is ClipTexto => c.pista === 'texto' && c.origen === 'narracion' && c.deClipId === ID_TRANSCRIPCION

/** Un lote de traducción: cabe holgado en 1500 tokens de salida incluso en japonés o hindi. */
const MAX_LETRAS_LOTE = 1800
const MAX_UNIDADES_LOTE = 12
/** La voz nueva se acelera (una vez) si no cabe en su hueco por más de este margen; nunca pasa de `VELOCIDAD_MAX`. */
const MARGEN_HUECO = 1.12
const VELOCIDAD_MAX = 1.5

/**
 * Oraciones para doblar: se juntan las frases seguidas (pausa corta, sin punto
 * final) hasta ~10 s. Cada oración tiene su voz, que empieza donde empezaba la
 * original: así se respetan las pausas largas del original.
 */
function oraciones(frases: FraseVideo[]): FraseVideo[] {
  const salida: FraseVideo[] = []
  for (const f of frases) {
    const u = salida[salida.length - 1]
    if (u && f.inicio - u.fin < 0.6 && !/[.!?…]$/.test(u.texto) && f.fin - u.inicio <= 10) {
      salida[salida.length - 1] = { inicio: u.inicio, fin: f.fin, texto: `${u.texto} ${f.texto}` }
    } else salida.push({ ...f })
  }
  return salida
}

/** Lotes de traducción por letras y cantidad (índices de `textos`). */
function lotesPorLetras(textos: string[]): number[][] {
  const lotes: number[][] = []
  let actual: number[] = []
  let letras = 0
  textos.forEach((x, i) => {
    if (actual.length && (actual.length >= MAX_UNIDADES_LOTE || letras + x.length > MAX_LETRAS_LOTE)) {
      lotes.push(actual)
      actual = []
      letras = 0
    }
    actual.push(i)
    letras += x.length
  })
  if (actual.length) lotes.push(actual)
  return lotes
}
const EN_PARALELO = 2

export interface OpcionesTraduccion {
  idioma: DatosIdioma
  /** Voz del doblaje; null = sin doblaje (solo subtítulos y títulos). */
  voz: string | null
  subtitulos: boolean
  /** Volumen del audio original con doblaje: 0 = quitarlo; 0.15 = bajito de fondo. */
  fondo: number
}

/** Tramos de 25 s que se traducen (los de los clips de video del alcance). */
export const tramosTraduccion = (alcance: ClipPrincipal[]) => tramosDeClips(alcance)

/** El paquete: con voz IA, 3 créditos por tramo; sin doblaje o con la voz del dispositivo, 1. */
export const opTraduccion = (voz: string | null): OpPaquete =>
  voz && !usaDispositivo(voz) && hayVozIA() ? 'video.traducir.voz' : 'video.traducir'

/** Traduce un lote (mismo orden y cantidad); reintenta UNA vez si el formato no cuadra. */
export async function traducirLote(textos: string[], idioma: DatosIdioma): Promise<string[]> {
  const sys = [
    `Eres traductor y adaptador de doblaje. Traduce cada texto al ${idioma.nombreIA}: natural, hablado, con el mismo tono y aproximadamente la misma duración al decirlo (para que encaje en el mismo tiempo).`,
    'Responde ÚNICAMENTE con JSON: {"textos":["<texto 1>","<texto 2>",...]} en el MISMO orden y cantidad; un texto vacío se devuelve vacío.',
  ].join('\n')
  const cuerpo = textos.map((x, i) => `${i + 1}. ${x}`).join('\n')
  let ultimo: unknown = null
  for (let intento = 0; intento < 2; intento++) {
    const respuesta = await conversarIA(sys, [{ rol: 'usuario', texto: cuerpo }], 1500)
    try {
      const salida = extraerJSON(respuesta).textos
      if (Array.isArray(salida) && salida.length === textos.length && salida.every((x) => typeof x === 'string')) return (salida as string[]).map((x) => x.trim())
      throw new Error('La IA no devolvió la traducción completa')
    } catch (e) {
      ultimo = e
    }
  }
  throw ultimo instanceof Error ? ultimo : new Error('La IA no devolvió la traducción completa')
}

const esperar = (ms: number) => new Promise((r) => window.setTimeout(r, ms))

/** Ejecuta `tareas` de `EN_PARALELO` en paralelo; ante «vas muy rápido» espera y reintenta. Corta si falta crédito o sesión. */
async function enParalelo<T>(tareas: (() => Promise<T>)[], alHecho: (n: number) => void): Promise<(T | null)[]> {
  const salida: (T | null)[] = tareas.map(() => null)
  let siguiente = 0
  let hechos = 0
  let corte: unknown = null
  const trabajador = async () => {
    while (corte == null && siguiente < tareas.length) {
      const i = siguiente++
      for (let intento = 0; ; intento++) {
        try {
          salida[i] = await tareas[i]()
          break
        } catch (e) {
          if (e instanceof ErrorIA && e.codigo === 'limite' && intento < 8) {
            await esperar(10_000)
            continue
          }
          if (e instanceof ErrorIA) corte = e
          else console.warn('[video] tramo sin traducir/doblar:', e)
          break
        }
      }
      alHecho(++hechos)
    }
  }
  await Promise.all(Array.from({ length: Math.min(EN_PARALELO, tareas.length) }, trabajador))
  if (corte) throw corte
  return salida
}

export type FaseTraduccion = 'texto' | 'voz'

export interface ResultadoTraduccion {
  clips: ClipVideo[]
  tramos: number
  voces: number
  subtitulos: number
}

/** Traduce (y dobla) lo que se dice en los clips de `alcance`. No toca nada fuera de su tramo de la línea. */
export async function traducirVideo(
  p: ProyectoVideo & { clips: ClipVideo[] },
  alcance: ClipPrincipal[],
  analisis: AnalisisLinea,
  o: OpcionesTraduccion,
  alProgreso: (fase: FaseTraduccion, hecho: number, total: number) => void,
): Promise<ResultadoTraduccion> {
  const enAlcance = (inicio: number, final: number) => alcance.some((a) => inicio < fin(a) && final > a.inicio)
  const bloques = analisis.bloques.filter((b) => b.texto.trim() && enAlcance(b.inicio, b.fin))
  if (bloques.length === 0) throw new Error('No se oye a nadie hablar en el video')

  // Unidades: oraciones si hay tiempos por palabra (frase por frase); si no, los tramos de 25 s.
  const frasesAlcance = analisis.frases.filter((f) => f.texto.trim() && enAlcance(f.inicio, f.fin))
  const unidades = analisis.palabras.length && frasesAlcance.length ? oraciones(frasesAlcance) : bloques

  // 1) Traducir por lotes de letras.
  const traducidos: string[] = unidades.map(() => '')
  const lotes = lotesPorLetras(unidades.map((u) => u.texto))
  alProgreso('texto', 0, lotes.length)
  const salidas = await enParalelo(
    lotes.map((l) => () => traducirLote(l.map((i) => unidades[i].texto), o.idioma)),
    (n) => alProgreso('texto', n, lotes.length),
  )
  salidas.forEach((s, k) => s?.forEach((x, j) => (traducidos[lotes[k][j]] = x)))

  // 2) Doblaje: una voz por unidad, donde empezaba la original. Si no cabe en su hueco (hasta la
  //    siguiente), se rehace UNA vez más rápida (voz IA; la del dispositivo no tiene velocidad).
  const voces: ClipVoz[] = []
  if (o.voz) {
    const voz = o.voz
    const ajustable = !usaDispositivo(voz)
    const pendientes = unidades
      .map((u, i) => ({ u, texto: traducidos[i], hueco: (unidades[i + 1]?.inicio ?? u.fin + 0.8) - u.inicio }))
      .filter((x) => x.texto)
    alProgreso('voz', 0, pendientes.length)
    const audios = await enParalelo(
      pendientes.map((x) => async () => {
        const a = await generarAudioNarracion(x.texto, voz, { lang: o.idioma.locale })
        if (!ajustable || x.hueco < 0.6 || a.duracion <= x.hueco * MARGEN_HUECO) return a
        const velocidad = Math.min(VELOCIDAD_MAX, (a.duracion / x.hueco) * 1.03)
        const rapida = await generarAudioNarracion(x.texto, voz, { lang: o.idioma.locale, velocidad })
        void mediosVideoRepo.remove(a.medioId) // la toma lenta ya no se usa
        return rapida
      }),
      (n) => alProgreso('voz', n, pendientes.length),
    )
    let libre = 0
    pendientes.forEach((x, i) => {
      const a = audios[i]
      if (!a) return
      const inicio = redondear(Math.max(x.u.inicio, libre))
      const duracion = redondear(Math.max(MIN_CLIP, a.duracion || x.u.fin - x.u.inicio))
      libre = inicio + duracion + 0.05
      voces.push({ id: `${nuevoClipId()}${SUFIJO_DOBLAJE}`, pista: 'voz', inicio, duracion, medioId: a.medioId, desde: 0, texto: x.texto, voz, volumen: 1 })
    })
  }

  // 3) Subtítulos traducidos: con doblaje siguen a la voz nueva; sin él, al tramo original.
  const previos = p.clips.filter((c) => esSubtituloTranscripcion(c) && enAlcance(c.inicio, fin(c))) as ClipTexto[]
  const estilo: EstiloTexto = previos[0]
    ? { ...previos[0].texto, contenido: '' }
    : { ...SUBTITULO_TRANSCRIPCION, posicion: p.aspecto === '9:16' ? 'centro' : 'abajo' }
  const frasesSub: FraseVideo[] = o.voz
    ? voces.map((v) => ({ inicio: v.inicio, fin: v.inicio + v.duracion, texto: v.texto ?? '' }))
    : unidades.map((u, i) => ({ inicio: u.inicio, fin: u.fin, texto: traducidos[i] })).filter((f) => f.texto)
  const subs = o.subtitulos ? subtitulosDeFrases(frasesSub, estilo) : []

  // 4) Montaje: fuera el doblaje y los subtítulos anteriores del tramo; el audio original, bajito o fuera.
  const idsAlcance = new Set(alcance.map((c) => c.id))
  const quitar = (c: ClipVideo) => (o.voz && esDoblaje(c) && enAlcance(c.inicio, fin(c))) || (o.subtitulos && esSubtituloTranscripcion(c) && enAlcance(c.inicio, fin(c)))
  const clips = p.clips
    .filter((c) => !quitar(c))
    .map((c) => {
      if (c.pista === 'video' && o.voz && idsAlcance.has(c.id)) return { ...c, volumen: o.fondo }
      return c
    })
  return {
    clips: normalizar([...clips, ...voces, ...subs]),
    tramos: bloques.length,
    voces: voces.length,
    subtitulos: subs.length,
  }
}
