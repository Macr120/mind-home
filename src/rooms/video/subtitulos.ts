import type { ClipAvatar, ClipTexto, ClipVideo, ClipVoz, EstiloTexto } from '../../core/data/db'
import { nuevoClipId } from './constantes'
import { fin, normalizar, redondear } from './modelo'

/**
 * Subtítulos generados desde el texto de una narración (o de un avatar), sin
 * IA: se parte por frases y por longitud y se reparte proporcional a los
 * caracteres a lo largo de su audio.
 */

export const MIN_SUBTITULO = 0.8
export const MAX_CARACTERES_SUBTITULO = 40
export const SUBTITULO_DEFECTO: EstiloTexto = { contenido: '', posicion: 'abajo', tamano: 'S', color: '#ffffff', caja: true }

/** Frases cortas: por puntuación y, si siguen largas, por palabras (nunca parte una palabra). */
export function partirFrases(texto: string, max = MAX_CARACTERES_SUBTITULO): string[] {
  const limpio = texto.replace(/\s+/g, ' ').trim()
  if (!limpio) return []
  // Escaneo manual (sin lookbehind: en WKWebView viejas el literal rompe el módulo entero).
  const frases: string[] = []
  let actual = ''
  for (let i = 0; i < limpio.length; i++) {
    const ch = limpio[i]
    actual += ch
    if ('.!?;…'.includes(ch) && (i + 1 >= limpio.length || limpio[i + 1] === ' ')) {
      frases.push(actual.trim())
      actual = ''
    }
  }
  if (actual.trim()) frases.push(actual.trim())
  const trozos: string[] = []
  for (const frase of frases) {
    if (frase.length <= max) {
      trozos.push(frase)
      continue
    }
    let trozo = ''
    for (const palabra of frase.split(' ')) {
      if (trozo && `${trozo} ${palabra}`.length > max) {
        // Pasada la mitad, una coma o dos puntos parten mejor que el corte seco.
        const corte = Math.max(trozo.lastIndexOf(','), trozo.lastIndexOf(':'))
        if (corte > trozo.length / 2) {
          trozos.push(trozo.slice(0, corte + 1).trim())
          trozo = `${trozo.slice(corte + 1).trim()} ${palabra}`.trim()
        } else {
          trozos.push(trozo)
          trozo = palabra
        }
      } else trozo = trozo ? `${trozo} ${palabra}` : palabra
    }
    if (trozo) trozos.push(trozo)
  }
  return trozos.filter(Boolean)
}

/** Reparte `duracion` proporcional a los caracteres; fusiona los trozos que quedarían por debajo de `minimo`. */
export function repartirTiempos(
  segmentos: string[],
  duracion: number,
  minimo = MIN_SUBTITULO,
): { texto: string; desde: number; duracion: number }[] {
  let partes = segmentos.map((s) => ({ texto: s, peso: Math.max(1, s.length) }))
  const durDe = (peso: number, total: number) => (duracion * peso) / total
  for (;;) {
    if (partes.length <= 1) break
    const total = partes.reduce((s, p) => s + p.peso, 0)
    let iCorto = -1
    for (let i = 0; i < partes.length; i++) {
      if (durDe(partes[i].peso, total) < minimo && (iCorto < 0 || partes[i].peso < partes[iCorto].peso)) iCorto = i
    }
    if (iCorto < 0) break
    const izq = partes[iCorto - 1]
    const der = partes[iCorto + 1]
    const j = !izq ? iCorto + 1 : !der ? iCorto - 1 : izq.peso <= der.peso ? iCorto - 1 : iCorto + 1
    const a = Math.min(iCorto, j)
    const b = Math.max(iCorto, j)
    partes = [
      ...partes.slice(0, a),
      { texto: `${partes[a].texto} ${partes[b].texto}`, peso: partes[a].peso + partes[b].peso },
      ...partes.slice(b + 1),
    ]
  }
  const total = partes.reduce((s, p) => s + p.peso, 0)
  const salida: { texto: string; desde: number; duracion: number }[] = []
  let t = 0
  partes.forEach((p, i) => {
    const d = i === partes.length - 1 ? redondear(duracion - t) : redondear(durDe(p.peso, total))
    salida.push({ texto: p.texto, desde: redondear(t), duracion: d })
    t = redondear(t + d)
  })
  return salida
}

/**
 * Sustituye los subtítulos generados de `origen` por los nuevos, repartidos
 * sobre la duración de su audio y recortados a la ventana del clip. Conserva el
 * estilo del primero (los retoques del usuario).
 */
export function generarSubtitulos(clips: ClipVideo[], origen: ClipVoz | ClipAvatar, duracionAudio?: number): ClipVideo[] {
  const texto = origen.texto?.trim() ?? ''
  const previos = clips.filter(
    (c): c is ClipTexto => c.pista === 'texto' && c.origen === 'narracion' && c.deClipId === origen.id,
  )
  const idsPrevios = new Set(previos.map((c) => c.id))
  const resto = clips.filter((c) => !idsPrevios.has(c.id))
  if (!texto) return previos.length === 0 ? clips : normalizar(resto)
  const estilo: EstiloTexto = previos[0] ? { ...previos[0].texto } : { ...SUBTITULO_DEFECTO }
  const durAudio = duracionAudio && duracionAudio > 0 ? duracionAudio : origen.duracion
  const nuevos: ClipTexto[] = []
  for (const s of repartirTiempos(partirFrases(texto), durAudio)) {
    // Tiempo del audio → tiempo del proyecto (el clip puede empezar a mitad del audio: `desde`).
    const ini = origen.inicio - (origen.desde ?? 0) + s.desde
    const iniR = Math.max(ini, origen.inicio)
    const finR = Math.min(ini + s.duracion, fin(origen))
    if (finR - iniR < 0.3) continue
    nuevos.push({
      id: nuevoClipId(),
      pista: 'texto',
      inicio: redondear(iniR),
      duracion: redondear(finR - iniR),
      texto: { ...estilo, contenido: s.texto },
      origen: 'narracion',
      deClipId: origen.id,
    })
  }
  return normalizar([...resto, ...nuevos])
}
