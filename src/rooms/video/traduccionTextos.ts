import type { ClipVideo, MedioVideo } from '../../core/data/db'
import type { DatosIdioma } from '../../core/i18n/idiomas'
import { normalizar } from './modelo'
import { SUFIJO_DOBLAJE, traducirLote } from './traduccionVideo'

/**
 * «Traducir textos»: lo ESCRITO del proyecto (títulos y rótulos, guiones de
 * narración y líneas de los avatares) a otro idioma, sin tocar el audio del
 * video. Tarifa: 1 crédito por cada 20 textos (un lote = una llamada «texto»).
 * Las narraciones con voz IA pueden rehacerse en el idioma nuevo (3 créditos
 * por línea, la tarifa de siempre de la voz IA).
 */

export type GrupoTextos = 'titulos' | 'narraciones' | 'avatares'
export const GRUPOS_TEXTOS: GrupoTextos[] = ['titulos', 'narraciones', 'avatares']
export const TEXTOS_POR_CREDITO = 20
/** Tope de letras por lote: la respuesta cabe en 1500 tokens también en japonés o hindi. */
const MAX_LETRAS_LOTE = 2500

interface Pieza {
  clipId: string
  campo: 'contenido' | 'subtitulo' | 'texto'
  texto: string
}

/** Los textos traducibles de cada grupo (los subtítulos generados no: se rehacen desde su narración o su audio). */
export function piezasDe(clips: ClipVideo[], grupos: Set<GrupoTextos>): Pieza[] {
  const piezas: Pieza[] = []
  for (const c of clips) {
    if (c.pista === 'texto' && c.origen !== 'narracion' && grupos.has('titulos')) {
      if (c.texto.contenido.trim()) piezas.push({ clipId: c.id, campo: 'contenido', texto: c.texto.contenido })
      if (c.texto.subtitulo?.trim()) piezas.push({ clipId: c.id, campo: 'subtitulo', texto: c.texto.subtitulo })
    } else if (c.pista === 'voz' && !c.id.endsWith(SUFIJO_DOBLAJE) && c.texto?.trim() && grupos.has('narraciones')) {
      piezas.push({ clipId: c.id, campo: 'texto', texto: c.texto })
    } else if (c.pista === 'avatar' && c.texto.trim() && grupos.has('avatares')) {
      piezas.push({ clipId: c.id, campo: 'texto', texto: c.texto })
    }
  }
  return piezas
}

/** Cuántos textos hay por grupo (para las píldoras). */
export function cuentaPorGrupo(clips: ClipVideo[]): Record<GrupoTextos, number> {
  const n = { titulos: 0, narraciones: 0, avatares: 0 }
  for (const g of GRUPOS_TEXTOS) n[g] = piezasDe(clips, new Set([g])).length
  return n
}

/** Lotes de hasta 20 textos y ~2500 letras: cada lote es 1 crédito. */
function lotesDe(piezas: Pieza[]): Pieza[][] {
  const lotes: Pieza[][] = []
  let actual: Pieza[] = []
  let letras = 0
  for (const p of piezas) {
    if (actual.length && (actual.length >= TEXTOS_POR_CREDITO || letras + p.texto.length > MAX_LETRAS_LOTE)) {
      lotes.push(actual)
      actual = []
      letras = 0
    }
    actual.push(p)
    letras += p.texto.length
  }
  if (actual.length) lotes.push(actual)
  return lotes
}

export const creditosTextos = (piezas: Pieza[]) => lotesDe(piezas).length

/** Clips con voz IA ya generada entre los que se traducen: su audio dice el texto viejo. */
export function conVozIA(clips: ClipVideo[], piezas: Pieza[], medios: MedioVideo[]): string[] {
  const tts = new Set(medios.filter((m) => m.origen === 'tts' && m.id != null).map((m) => m.id!))
  const ids = new Set(piezas.filter((p) => p.campo === 'texto').map((p) => p.clipId))
  return clips.filter((c) => ids.has(c.id) && (c.pista === 'voz' || c.pista === 'avatar') && c.medioId != null && tts.has(c.medioId)).map((c) => c.id)
}

/**
 * Traduce las piezas y devuelve los clips nuevos. A las narraciones con voz IA
 * se les suelta el audio (dice el texto viejo; el medio sigue en Medios): quien
 * llama decide si rehacerlo.
 */
export async function traducirTextosProyecto(
  clips: ClipVideo[],
  piezas: Pieza[],
  medios: MedioVideo[],
  idioma: DatosIdioma,
  alProgreso: (hecho: number, total: number) => void,
): Promise<{ clips: ClipVideo[]; traducidos: number; sinVoz: string[] }> {
  const lotes = lotesDe(piezas)
  const nuevo = new Map<Pieza, string>()
  alProgreso(0, lotes.length)
  for (let i = 0; i < lotes.length; i++) {
    const salida = await traducirLote(
      lotes[i].map((p) => p.texto),
      idioma,
    )
    lotes[i].forEach((p, k) => salida[k] && nuevo.set(p, salida[k]))
    alProgreso(i + 1, lotes.length)
  }
  const sinVoz = conVozIA(clips, piezas, medios)
  const soltar = new Set(sinVoz)
  const porClip = new Map<string, Pieza[]>()
  for (const p of piezas) porClip.set(p.clipId, [...(porClip.get(p.clipId) ?? []), p])
  const salida = clips.map((c): ClipVideo => {
    const mias = porClip.get(c.id)?.filter((p) => nuevo.has(p))
    if (!mias?.length) return c
    if (c.pista === 'texto') {
      const texto = { ...c.texto }
      for (const p of mias) texto[p.campo as 'contenido' | 'subtitulo'] = nuevo.get(p)!
      return { ...c, texto }
    }
    if (c.pista === 'voz' || c.pista === 'avatar') {
      const audio = soltar.has(c.id) ? { medioId: undefined, desde: undefined, ...(c.pista === 'avatar' ? { envolvente: undefined, envolventeHz: undefined } : {}) } : {}
      return { ...c, texto: nuevo.get(mias[0])!, ...audio } as ClipVideo
    }
    return c
  })
  return { clips: normalizar(salida), traducidos: nuevo.size, sinVoz }
}
