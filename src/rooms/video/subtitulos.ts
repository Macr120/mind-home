import type { ClipAvatar, ClipTexto, ClipVideo, ClipVoz, EstiloTexto } from '../../core/data/db'
import { nuevoClipId } from './constantes'
import { fin, normalizar, redondear } from './modelo'

/**
 * Subtítulos generados desde el texto de una narración (o de un avatar), sin
 * IA: se parte por frases y por longitud y se reparte proporcional a los
 * caracteres a lo largo de su audio.
 */

const MIN_SUBTITULO = 0.8
const MAX_CARACTERES_SUBTITULO = 40
const SUBTITULO_DEFECTO: EstiloTexto = { contenido: '', posicion: 'abajo', tamano: 'S', color: '#ffffff', caja: true }

/** Frases cortas: por puntuación y, si siguen largas, por palabras (nunca parte una palabra). */
function partirFrases(texto: string, max = MAX_CARACTERES_SUBTITULO): string[] {
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
function repartirTiempos(
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

/** `deClipId` de los subtítulos sacados de la transcripción del video (IA): se rehacen en bloque al volver a editar. */
export const ID_TRANSCRIPCION = 'transcripcion'

/** Estilo por defecto de los subtítulos de la transcripción: más grandes que los de una narración. */
export const SUBTITULO_TRANSCRIPCION: EstiloTexto = { ...SUBTITULO_DEFECTO, tamano: 'M', fuente: 'display' }

/**
 * Subtítulos desde frases con tiempo (la transcripción del audio del video, ya
 * en segundos del proyecto): cada frase se parte en trozos legibles y se
 * reparte sobre su propia ventana.
 */
export function subtitulosDeFrases(
  frases: { inicio: number; fin: number; texto: string }[],
  estilo: EstiloTexto = SUBTITULO_TRANSCRIPCION,
): ClipTexto[] {
  const salida: ClipTexto[] = []
  for (const f of frases) {
    const dur = f.fin - f.inicio
    if (dur < 0.3 || !f.texto.trim()) continue
    for (const s of repartirTiempos(partirFrases(f.texto), dur, Math.min(MIN_SUBTITULO, dur))) {
      if (s.duracion < 0.2) continue
      salida.push({
        id: nuevoClipId(),
        pista: 'texto',
        inicio: redondear(f.inicio + s.desde),
        duracion: redondear(s.duracion),
        texto: { ...estilo, contenido: s.texto },
        origen: 'narracion',
        deClipId: ID_TRANSCRIPCION,
      })
    }
  }
  return salida
}

/** Palabra normalizada para comparar (minúsculas, sin puntuación alrededor). */
export const normalizarPalabra = (p: string) => p.toLowerCase().replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '')

/**
 * Subtítulos desde palabras con tiempo exacto: grupos cortos (pausa, punto o
 * ~32 letras) con el inicio de cada palabra en `tiempos` para el karaoke. Las
 * `destacadas` (palabra normalizada → emoji o '') van en `claves` y, si traen
 * emoji, lo llevan pegado (sin espacio: no descuadra el karaoke).
 */
export function subtitulosDePalabras(
  palabras: { p: string; i: number; f: number }[],
  estilo: EstiloTexto,
  destacadas: Map<string, string> = new Map(),
): ClipTexto[] {
  const grupos: { p: string; i: number; f: number }[][] = []
  let actual: { p: string; i: number; f: number }[] = []
  for (const w of palabras) {
    const previa = actual[actual.length - 1]
    const largo = actual.reduce((s, x) => s + x.p.length + 1, 0)
    if (previa && (w.i - previa.f > 0.5 || /[.!?…]$/.test(previa.p) || largo + w.p.length > 32 || actual.length >= 7)) {
      grupos.push(actual)
      actual = []
    }
    actual.push(w)
  }
  if (actual.length) grupos.push(actual)
  const salida: ClipTexto[] = []
  grupos.forEach((g, k) => {
    const inicio = g[0].i
    const siguiente = grupos[k + 1]?.[0].i ?? Infinity
    const final = Math.min(siguiente, g[g.length - 1].f + 0.25)
    if (final - inicio < 0.2) return
    const claves: number[] = []
    const textos = g.map((w, j) => {
      const emoji = destacadas.get(normalizarPalabra(w.p))
      if (emoji == null) return w.p
      claves.push(j)
      return emoji ? `${w.p}${emoji}` : w.p
    })
    salida.push({
      id: nuevoClipId(),
      pista: 'texto',
      inicio: redondear(inicio),
      duracion: redondear(final - inicio),
      texto: { ...estilo, contenido: textos.join(' ') },
      origen: 'narracion',
      deClipId: ID_TRANSCRIPCION,
      tiempos: g.map((w) => redondear(w.i - inicio)),
      ...(claves.length ? { claves } : {}),
    })
  })
  return salida
}
