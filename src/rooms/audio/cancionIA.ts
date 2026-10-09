import { conversarIA, extraerJSON } from '../../core/chat/ia'
import type { EfectosPista, InstrumentoAudio, NotaAudio, PistaAudio } from '../../core/data/db'
import { tGlobal } from '../../core/i18n/useT'
import { MAX_COMPASES, MAX_NOTAS_PISTA, PASOS_POR_COMPAS, PATRONES_BATERIA, nuevaPistaId } from './constantes'
import { clasesDeEscala } from './musica'

/**
 * Canción COMPLETA con IA (estilo Suno, pero en notas editables). La IA no
 * escribe nota por nota toda la canción —no cabría en la salida—: devuelve un
 * PLAN compacto (estructura, acordes por compás, energía, letra y una melodía
 * por TIPO de sección) y aquí se despliega en batería, bajo, acordes, melodía y
 * coros. Las secciones repetidas reusan su melodía, como un estribillo real.
 * Todo lo que llega del modelo se valida y recorta en código.
 */

/** Quién canta: decide el registro de la melodía y cómo se le pide la voz a Lyria. */
export type VozCancion = 'mujer' | 'hombre' | 'dueto'

/** Rango MIDI de la melodía y el centro al que se lleva si el modelo se va de registro. */
const REGISTRO: Record<VozCancion, { bajo: number; alto: number; centro: number }> = {
  mujer: { bajo: 57, alto: 79, centro: 68 },
  hombre: { bajo: 45, alto: 67, centro: 57 },
  dueto: { bajo: 50, alto: 74, centro: 62 },
}

/** Cómo se le pide la voz a Lyria (en inglés: así la entiende mejor). */
export const VOZ_LYRIA: Record<VozCancion, string> = {
  mujer: 'Female lead vocal',
  hombre: 'Male lead vocal',
  dueto: 'Male and female duet: they alternate verses and harmonize in the choruses',
}

/** El editor admite 64 compases: la duración máxima a un tempo dado. */
export const segundosMaximos = (bpm: number) => Math.floor((MAX_COMPASES * 240) / bpm)

/** Los patrones del Studio más 'ninguno' (sin batería: piezas tranquilas). */
const RITMOS = [...PATRONES_BATERIA.map((p) => p.clave), 'ninguno']
const TIPOS = ['intro', 'verso', 'precoro', 'coro', 'puente', 'instrumental', 'final'] as const
export type TipoSeccion = (typeof TIPOS)[number]

/** Cómo tocan los acordes: bloques (golpes según la energía), arpegio, rasgueo, pulso de corcheas o pad (redondas). */
const ACOMPS = ['bloques', 'arpegio', 'rasgueo', 'pulso', 'pad'] as const
/** Cómo va el bajo: siguiendo al bombo, en redondas, en octavas o caminante (negras hacia el acorde siguiente). */
const BAJOS = ['bombo', 'raiz', 'octavas', 'caminante'] as const
/** Cuánto aire: reverb y delay de todas las pistas. */
const ESPACIOS = ['seco', 'sala', 'catedral'] as const

const INSTR_ACORDES: InstrumentoAudio[] = ['piano', 'organo', 'pad', 'guitarra', 'arpa', 'violines', 'pluck', 'campanas']
const INSTR_MELODIA: InstrumentoAudio[] = ['lead', 'flauta', 'sax', 'trompeta', 'violines', 'piano', 'campanas', 'guitarra']
/** Los que sostienen: con ellos los acordes van siempre en redondas. */
const SOSTENIDOS: InstrumentoAudio[] = ['pad', 'organo', 'violines']

const NOTAS_LETRA: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }

/** Sufijo del cifrado → intervalos sobre la fundamental. */
const CALIDADES: [RegExp, number[]][] = [
  [/^(maj7|M7|Δ7?)$/, [0, 4, 7, 11]],
  [/^(m7|min7|-7)$/, [0, 3, 7, 10]],
  [/^(m7b5|ø7?)$/, [0, 3, 6, 10]],
  [/^(dim7?|°7?)$/, [0, 3, 6]],
  [/^(m|min|-)$/, [0, 3, 7]],
  [/^(m9|madd9)$/, [0, 3, 7, 14]],
  [/^(7|9|13)$/, [0, 4, 7, 10]],
  [/^sus2$/, [0, 2, 7]],
  [/^(sus4?|7sus4)$/, [0, 5, 7]],
  [/^(add9|9add|2)$/, [0, 4, 7, 14]],
  [/^5$/, [0, 7]],
  [/^(aug|\+)$/, [0, 4, 8]],
  [/^(6|maj|M)?$/, [0, 4, 7]],
  [/^m6$/, [0, 3, 7, 9]],
]

interface Acorde {
  raiz: number
  intervalos: number[]
}

/** 'F#m7' → { raiz: 6, intervalos: [0,3,7,10] }; null si no se entiende. Ignora el bajo de '/G'. */
function leerAcorde(cifrado: unknown): Acorde | null {
  if (typeof cifrado !== 'string') return null
  const m = /^\s*([A-Ga-g])([#b♯♭]?)([^/\s]*)/.exec(cifrado)
  if (!m) return null
  const raiz = (NOTAS_LETRA[m[1].toUpperCase()] + (m[2] === '#' || m[2] === '♯' ? 1 : m[2] ? -1 : 0) + 12) % 12
  const calidad = CALIDADES.find(([re]) => re.test(m[3]))
  return { raiz, intervalos: calidad ? calidad[1] : [0, 4, 7] }
}

/** Tipos de sección como los nombre el modelo (en inglés, con número…) → los nuestros. */
const ALIAS_TIPO: Record<string, TipoSeccion> = {
  verse: 'verso',
  chorus: 'coro',
  hook: 'coro',
  estribillo: 'coro',
  prechorus: 'precoro',
  bridge: 'puente',
  outro: 'final',
  ending: 'final',
  solo: 'instrumental',
  break: 'instrumental',
}

function tipoDe(v: unknown): TipoSeccion | null {
  if (typeof v !== 'string') return null
  const limpio = v.toLowerCase().replace(/[^a-záéíóú]/g, '')
  return (TIPOS as readonly string[]).includes(limpio) ? (limpio as TipoSeccion) : (ALIAS_TIPO[limpio] ?? null)
}

/**
 * Si la salida llegó cortada por el tope de tokens, la recorta al último valor
 * cerrado y cierra lo que quedó abierto: se pierde la cola (unas notas de la
 * última melodía) en vez de la canción entera.
 */
function repararTruncado(texto: string): Record<string, unknown> {
  const ini = texto.indexOf('{')
  if (ini < 0) throw new Error('Respuesta sin JSON')
  const pila: string[] = []
  let enCadena = false
  let escape = false
  let corte = -1
  let pilaCorte: string[] = []
  for (let i = ini; i < texto.length; i++) {
    const c = texto[i]
    if (enCadena) {
      if (escape) escape = false
      else if (c === '\\') escape = true
      else if (c === '"') enCadena = false
      continue
    }
    if (c === '"') enCadena = true
    else if (c === '{' || c === '[') pila.push(c === '{' ? '}' : ']')
    else if (c === '}' || c === ']') {
      pila.pop()
      corte = i + 1
      pilaCorte = [...pila]
      if (!pila.length) break
    }
  }
  if (corte < 0) throw new Error('Respuesta sin JSON')
  const obj: unknown = JSON.parse(texto.slice(ini, corte) + pilaCorte.reverse().join(''))
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) throw new Error('JSON inesperado')
  return obj as Record<string, unknown>
}

function leerRespuesta(texto: string): Record<string, unknown> {
  try {
    return extraerJSON(texto)
  } catch {
    return repararTruncado(texto)
  }
}

const ent = (v: unknown, min: number, max: number, def: number) => {
  const n = Math.round(Number(v))
  return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : def
}

const elegir = <T extends string>(v: unknown, opciones: readonly T[], def: T): T =>
  opciones.includes(v as T) ? (v as T) : def

export interface Seccion {
  tipo: TipoSeccion
  nombre: string
  compases: number
  acordes: Acorde[]
  energia: number
  letra: string
}

export interface Plan {
  titulo: string
  bpm: number
  tonica: number
  menor: boolean
  ritmo: string
  swing: number
  acomp: (typeof ACOMPS)[number]
  bajo: (typeof BAJOS)[number]
  espacio: (typeof ESPACIOS)[number]
  acordesInstr: InstrumentoAudio
  melodiaInstr: InstrumentoAudio
  bateriaInstr: 'bateria' | 'bateria808'
  secciones: Seccion[]
  melodias: Partial<Record<TipoSeccion, [number, number, number][]>>
}

interface Encargo {
  conVoz: boolean
  letraPropia: boolean
  segundos: number
  /** Tempo fijado por el usuario; ausente = lo elige el modelo. */
  bpm?: number
  /** Idioma de la letra, como lo nombra `nombreIA` del catálogo de idiomas. */
  idioma: string
  voz: VozCancion
}

function system(e: Encargo): string {
  const r = REGISTRO[e.voz]
  const duracion = e.bpm
    ? `en total ${Math.min(MAX_COMPASES, Math.round((e.segundos * e.bpm) / 240))} compases`
    : `que dure unos ${e.segundos} segundos: compases totales ≈ segundos × bpm ÷ 240 (máximo ${MAX_COMPASES})`
  return [
    'Eres productor y compositor. Compón una canción completa para un secuenciador MIDI (4/4, 16 semicorcheas por compás).',
    'Responde ÚNICAMENTE con un objeto JSON COMPACTO en una sola línea (sin saltos de línea ni sangrías), sin texto ni markdown alrededor, con esta forma:',
    '{"titulo":"…","bpm":96,"tonica":"A","modo":"menor","ritmo":"rock","swing":0,"acomp":"bloques","bajo":"bombo","espacio":"sala",',
    `"instrumentos":{"acordes":"piano","melodia":"lead","bateria":"bateria"},`,
    '"secciones":[{"tipo":"verso","nombre":"Verso 1","compases":8,"acordes":["Am","F","C","G"],"energia":1,"letra":"línea\\nlínea"}],',
    '"melodias":{"verso":[[inicio,duracion,tono],…],"coro":[…]}}',
    'Reglas:',
    e.bpm ? `- bpm: EXACTAMENTE ${e.bpm}.` : '- bpm 60..180, el que pida el estilo.',
    `- tonica una de C C# D Eb E F F# G Ab A Bb B; modo "mayor" o "menor"; ritmo uno de: ${RITMOS.join(', ')} ('ninguno' = sin batería); swing 0..40.`,
    `- acomp (cómo tocan los acordes) uno de: ${ACOMPS.join(', ')}. bajo uno de: ${BAJOS.join(', ')} (caminante = jazz/bossa). espacio uno de: ${ESPACIOS.join(', ')}. Elígelos según el estilo.`,
    `- instrumentos.acordes uno de: ${INSTR_ACORDES.join(', ')}. instrumentos.melodia uno de: ${INSTR_MELODIA.join(', ')}. instrumentos.bateria: bateria o bateria808.`,
    `- secciones en orden, tipo uno de (literal, en español): ${TIPOS.join(', ')}; compases 2..16 (normalmente 4 u 8); ${duracion}.`,
    '- Estructura de canción real: intro, verso, (precoro), coro, verso, coro, puente, coro final, final. El coro es el gancho y se repite.',
    '- acordes: un cifrado por compás en notación inglesa (C, Am, F#m7, Bbmaj7, Gsus4, E7…); si hay menos que compases se repiten en ciclo.',
    '- energia 0..3: 0 casi vacío, 1 suave, 2 lleno, 3 máximo (coros finales). Construye una curva de tensión.',
    e.conVoz
      ? e.letraPropia
        ? '- letra: reparte LA LETRA DEL USUARIO entre las secciones, sin cambiarla; intro, instrumental y final van sin letra.'
        : `- letra: escribe una letra original con rima y métrica regular, OBLIGATORIAMENTE en ${e.idioma} (aunque la descripción venga en otro idioma); 4 a 6 líneas por verso/coro; intro, instrumental y final sin letra.`
      : '- Es instrumental: letra siempre "".',
    e.conVoz ? '- Un coro que repite la letra del coro anterior lleva "letra":"=" (no la copies).' : '',
    `- nombre: la etiqueta de la sección en ${e.idioma} (p. ej. "Coro", "Chorus").`,
    `- melodias: UNA melodía por cada tipo de sección que la lleve (mínimo verso y coro); sus claves son los mismos valores de tipo (verso, coro…). inicio es relativo al arranque de la sección: 0..(compases×16−1); duracion 1..16; tono MIDI ${r.bajo}..${r.alto}.`,
    e.conVoz
      ? `- La melodía se canta (${e.voz === 'mujer' ? 'voz de mujer' : e.voz === 'hombre' ? 'voz de hombre' : 'dueto de hombre y mujer'}): aproximadamente una nota por sílaba de la letra, con respiraciones (silencios) al final de cada línea.`
      : '- La melodía la toca un instrumento solista: frases claras con pregunta y respuesta.',
    '- Usa notas de la escala, apoya las notas del acorde en los tiempos fuertes y haz el coro más agudo y pegadizo que el verso.',
    '- Máximo 32 notas por melodía.',
  ]
    .filter(Boolean)
    .join('\n')
}

/** Coerciones y topes del plan que devuelve el modelo (o de una receta fija). */
export function validarPlan(
  obj: Record<string, unknown>,
  conVoz: boolean,
  opts: { maxCompases?: number } = {},
): Plan {
  const maxCompases = opts.maxCompases ?? MAX_COMPASES
  const instr = (obj.instrumentos ?? {}) as Record<string, unknown>
  const tonica = leerAcorde(obj.tonica)?.raiz ?? 0
  const menor = obj.modo === 'menor' || obj.modo === 'minor'
  const porDefecto: Acorde = { raiz: tonica, intervalos: menor ? [0, 3, 7] : [0, 4, 7] }

  const secciones: Seccion[] = []
  /** Última letra por tipo, para resolver los coros con "=". */
  const letraPrevia = new Map<TipoSeccion, string>()
  let total = 0
  for (const cruda of Array.isArray(obj.secciones) ? obj.secciones.slice(0, 16) : []) {
    if (!cruda || typeof cruda !== 'object') continue
    const s = cruda as Record<string, unknown>
    const compases = Math.min(ent(s.compases, 1, 16, 4), maxCompases - total)
    if (compases <= 0) break
    const acordes = (Array.isArray(s.acordes) ? s.acordes.slice(0, 16) : [])
      .map(leerAcorde)
      .filter((a): a is Acorde => a != null)
    const tipo = tipoDe(s.tipo) ?? 'verso'
    let letra = conVoz && typeof s.letra === 'string' ? s.letra.trim().slice(0, 1200) : ''
    if (letra === '=') letra = letraPrevia.get(tipo) ?? ''
    else if (letra) letraPrevia.set(tipo, letra)
    secciones.push({
      tipo,
      nombre: typeof s.nombre === 'string' && s.nombre.trim() ? s.nombre.trim().slice(0, 40) : tipo,
      compases,
      acordes: acordes.length ? acordes : [porDefecto],
      energia: ent(s.energia, 0, 3, 2),
      letra,
    })
    total += compases
  }
  if (secciones.length < 2) throw new Error('La IA no devolvió una estructura usable')

  const melodias: Plan['melodias'] = {}
  const crudas = (obj.melodias ?? {}) as Record<string, unknown>
  for (const [clave, lista] of Object.entries(crudas)) {
    const tipo = tipoDe(clave)
    if (!tipo || melodias[tipo] || !Array.isArray(lista)) continue
    const notas: [number, number, number][] = []
    for (const n of lista.slice(0, 96)) {
      if (!Array.isArray(n) || n.length < 3) continue
      const [i, d, t] = [Number(n[0]), Number(n[1]), Number(n[2])].map(Math.round)
      if (![i, d, t].every(Number.isFinite) || i < 0 || i >= 16 * PASOS_POR_COMPAS) continue
      notas.push([i, Math.max(1, Math.min(16, d)), Math.max(48, Math.min(84, t))])
    }
    if (notas.length) melodias[tipo] = notas
  }
  if (!Object.keys(melodias).length) throw new Error('La IA no devolvió melodías usables')

  return {
    titulo: typeof obj.titulo === 'string' && obj.titulo.trim() ? obj.titulo.trim().slice(0, 60) : '',
    bpm: ent(obj.bpm, 60, 180, 100),
    tonica,
    menor,
    ritmo: elegir(obj.ritmo, RITMOS, RITMOS[0]),
    swing: ent(obj.swing, 0, 40, 0),
    acomp: elegir(obj.acomp, ACOMPS, 'bloques'),
    bajo: elegir(obj.bajo, BAJOS, 'bombo'),
    espacio: elegir(obj.espacio, ESPACIOS, 'sala'),
    acordesInstr: elegir(instr.acordes, INSTR_ACORDES, 'piano'),
    melodiaInstr: elegir(instr.melodia, INSTR_MELODIA, 'lead'),
    bateriaInstr: instr.bateria === 'bateria808' ? 'bateria808' : 'bateria',
    secciones,
    melodias,
  }
}

// ─── Despliegue del plan en pistas ─────────────────────────────────────────

/** Voicing cerrado del acorde con el centro más cercano a `centro` (enlace suave). */
function voicing(a: Acorde, centro: number): number[] {
  const base = a.intervalos.map((s) => a.raiz + s)
  let mejor: number[] = []
  let dist = Infinity
  for (let inv = 0; inv < base.length; inv++) {
    const notas = base.map((n, i) => n + (i < inv ? 12 : 0))
    const media = notas.reduce((x, y) => x + y, 0) / notas.length
    const oct = Math.round((centro - media) / 12) * 12
    const d = Math.abs(media + oct - centro)
    if (d < dist) {
      dist = d
      mejor = notas.map((n) => n + oct)
    }
  }
  return mejor
}

/** Golpes de un compás en bloques según la energía (y el ritmo, para el house). */
function golpesAcordes(energia: number, ritmo: string): [number, number][] {
  if (energia <= 1) return [[0, 16]]
  if (ritmo === 'house') return [[2, 2], [6, 2], [10, 2], [14, 2]]
  if (energia === 2) return [[0, 6], [6, 2], [8, 8]]
  return [0, 2, 4, 6, 8, 10, 12, 14].map((p) => [p, 2])
}

/** Un compás de acompañamiento: notas [paso, dur, tono, vel] relativas al compás. */
function acompanar(acomp: Plan['acomp'], v: number[], energia: number, ritmo: string, sostenido: boolean): NotaAudio[] {
  const acorde = (paso: number, dur: number, vel: number): NotaAudio[] => v.map((t) => [paso, dur, t, vel])
  if (acomp === 'pad' || sostenido || energia === 0) return acorde(0, 16, 72)
  if (acomp === 'arpegio') {
    // Sube y baja por el acorde (más la octava de la fundamental), en corcheas que se dejan sonar.
    const subida = [...v, v[0] + 12]
    const figura = [...subida, ...subida.slice(1, -1).reverse()]
    const paso = energia >= 3 ? 1 : 2
    return Array.from({ length: 16 / paso }, (_, k) => [k * paso, paso * 1.5, figura[k % figura.length], k % 4 === 0 ? 82 : 66])
  }
  if (acomp === 'rasgueo') {
    // Abajo-abajo-arriba-arriba-abajo-arriba; cada golpe desgrana las cuerdas.
    const golpes: [number, boolean][] =
      energia <= 1 ? [[0, true], [8, true]] : [[0, true], [4, true], [6, false], [10, false], [12, true], [14, false]]
    return golpes.flatMap(([paso, abajo]) =>
      (abajo ? v : [...v].reverse()).map((t, k): NotaAudio => [paso + k * 0.12, energia <= 1 ? 8 : 3, t, abajo ? 84 : 62]),
    )
  }
  if (acomp === 'pulso') {
    const paso = energia <= 1 ? 4 : 2
    return Array.from({ length: 16 / paso }, (_, k) => acorde(k * paso, paso * 0.75, k % 2 === 0 ? 80 : 64)).flat()
  }
  return golpesAcordes(energia, ritmo).flatMap(([paso, dur]) => acorde(paso, dur, paso % 4 === 0 ? 80 : 68))
}

/** Un compás de bajo. `sig` = el acorde del compás siguiente (el caminante va hacia él). */
function bajear(estilo: Plan['bajo'], a: Acorde, sig: Acorde, energia: number, bombos: number[]): NotaAudio[] {
  const raiz = 36 + a.raiz > 45 ? 24 + a.raiz : 36 + a.raiz // Bb1..A2
  const quinta = raiz + (a.intervalos.includes(6) && !a.intervalos.includes(7) ? 6 : 7)
  const tercera = raiz + (a.intervalos.includes(3) ? 3 : a.intervalos.includes(4) ? 4 : a.intervalos[1])
  if (energia <= 1 && estilo !== 'caminante') return [[0, 16, raiz, 95]]
  if (estilo === 'raiz') return [[0, 8, raiz, 100], [8, 8, quinta, 92]]
  if (estilo === 'octavas') return Array.from({ length: 8 }, (_, k) => [k * 2, 1.5, raiz + (k % 2) * 12, k % 2 ? 88 : 104])
  if (estilo === 'caminante') {
    // Negras: fundamental, tercera, quinta y una nota de paso a medio tono del acorde siguiente.
    const destino = 36 + sig.raiz > 45 ? 24 + sig.raiz : 36 + sig.raiz
    const paso = destino > quinta ? destino - 1 : destino + 1
    return [[0, 3.5, raiz, 100], [4, 3.5, tercera, 86], [8, 3.5, quinta, 92], [12, 3.5, paso, 84]]
  }
  if (!bombos.length) return [[0, 8, raiz, 100], [8, 8, quinta, 92]]
  return bombos.map((paso, k): NotaAudio => {
    const fin = bombos[k + 1] ?? 16
    return [paso, Math.max(1, fin - paso - 1), raiz + (energia >= 3 && k % 2 === 1 ? 12 : 0), 105]
  })
}

/** Reverb/delay por pista según el espacio de la canción. */
const ESPACIO_FX: Record<Plan['espacio'], { acordes: number; melodia: number; colchon: number; delay: number }> = {
  seco: { acordes: 0.1, melodia: 0.12, colchon: 0.25, delay: 0.05 },
  sala: { acordes: 0.25, melodia: 0.3, colchon: 0.45, delay: 0.15 },
  catedral: { acordes: 0.45, melodia: 0.5, colchon: 0.65, delay: 0.25 },
}

/** Lleva la melodía a la escala y a un registro cómodo (sin saltos de octava). */
function ajustarMelodia(
  notas: [number, number, number][],
  tonica: number,
  menor: boolean,
  centro: number,
): [number, number, number][] {
  const escala = clasesDeEscala({ tonica, tipo: menor ? 'menor' : 'mayor' })
  const media = notas.reduce((m, n) => m + n[2], 0) / notas.length
  const corrimiento = Math.round((centro - media) / 12) * 12
  return notas.map(([i, d, t]) => {
    let tono = t + corrimiento
    if (!escala.has(((tono % 12) + 12) % 12)) tono += escala.has((((tono + 1) % 12) + 12) % 12) ? 1 : -1
    return [i, d, tono]
  })
}

const fx = (reverb: number, delay = 0, chorus = 0): EfectosPista => ({ reverb, delay, chorus, dist: 0 })

const pista = (
  nombre: string,
  instrumento: InstrumentoAudio,
  volumen: number,
  efectos: EfectosPista,
  notas: NotaAudio[],
  maxNotas: number,
): PistaAudio => ({
  pistaId: nuevaPistaId(),
  nombre,
  instrumento,
  volumen,
  efectos,
  notas: notas.sort((a, b) => a[0] - b[0] || a[2] - b[2]).slice(0, maxNotas),
})

const mmss = (seg: number) => `${Math.floor(seg / 60)}:${String(Math.floor(seg % 60)).padStart(2, '0')}`

/**
 * El plan hecho pistas. `maxNotas` sube el tope del editor (la música ambiental no
 * se edita) y `repetirMelodias` repite una melodía más corta que su sección.
 */
export function desplegar(
  plan: Plan,
  conVoz: boolean,
  voz: VozCancion,
  opts: { maxNotas?: number; repetirMelodias?: boolean } = {},
) {
  const maxNotas = opts.maxNotas ?? MAX_NOTAS_PISTA
  const bateria: NotaAudio[] = []
  const bajo: NotaAudio[] = []
  const acordes: NotaAudio[] = []
  const melodia: NotaAudio[] = []
  const coros: NotaAudio[] = []
  const patron = PATRONES_BATERIA.find((p) => p.clave === plan.ritmo)?.golpes ?? []
  const bombos = [...new Set(patron.filter((g) => g[1] === 36).map((g) => g[0]))].sort((a, b) => a - b)
  const sostenido = SOSTENIDOS.includes(plan.acordesInstr)
  const melodias = Object.fromEntries(
    Object.entries(plan.melodias).map(([k, v]) => [k, ajustarMelodia(v, plan.tonica, plan.menor, REGISTRO[voz].centro)]),
  ) as Plan['melodias']
  const segPorCompas = (60 / plan.bpm) * 4
  const letra: string[] = []

  /** Todos los acordes en orden, para que el bajo caminante sepa a dónde va. */
  const sucesion = plan.secciones.flatMap((s) => Array.from({ length: s.compases }, (_, c) => s.acordes[c % s.acordes.length]))
  let compas = 0
  for (const [iSec, s] of plan.secciones.entries()) {
    const previa = plan.secciones[iSec - 1]
    const siguiente = plan.secciones[iSec + 1] ?? plan.secciones[0]
    /** Redoble en el último compás antes de un coro (la batería «respira» y entra). */
    const antesDelCoro = siguiente.tipo === 'coro' && s.tipo !== 'coro' && siguiente.energia >= 2
    const inicioSec = compas * PASOS_POR_COMPAS
    const pasosSec = s.compases * PASOS_POR_COMPAS
    if (s.letra) letra.push(`[${s.nombre} · ${mmss(compas * segPorCompas)}]\n${s.letra}`)

    for (let c = 0; c < s.compases; c++) {
      const p0 = (compas + c) * PASOS_POR_COMPAS
      const acorde = s.acordes[c % s.acordes.length]
      const ultimo = c === s.compases - 1

      // Batería: 0 = sin batería, 1 = solo bombo y platos, 2 = patrón, 3 = patrón + redoble de toms.
      // El platillo marca la entrada a una sección con más energía que la anterior.
      if (s.energia >= 1 && patron.length) {
        const redoble = ultimo && antesDelCoro
        for (const [paso, tono, vel] of patron) {
          if (s.energia === 1 && tono !== 36 && tono !== 42 && tono !== 46) continue
          if ((s.energia >= 3 && ultimo && paso >= 12) || (redoble && paso >= 8)) continue
          bateria.push([p0 + paso, 1, tono, s.energia === 1 ? Math.round(vel * 0.75) : vel])
        }
        if (c === 0 && s.energia >= 2 && (previa?.energia ?? 0) < s.energia) bateria.push([p0, 1, 49, 112])
        if (redoble) {
          ;[8, 10, 12, 13, 14, 15].forEach((paso, k) => bateria.push([p0 + paso, 1, 38, 60 + k * 10]))
        } else if (s.energia >= 3 && ultimo) {
          ;[48, 48, 41, 41].forEach((tono, k) => bateria.push([p0 + 12 + k, 1, tono, 90 + k * 8]))
        }
      }

      // Bajo según su estilo (en lo suave, redondas).
      if (s.energia >= 1) {
        const sig = sucesion[compas + c + 1] ?? sucesion[0]
        for (const [paso, dur, tono, vel] of bajear(plan.bajo, acorde, sig, s.energia, bombos)) {
          bajo.push([p0 + paso, dur, tono, vel])
        }
      }

      // Acordes según el acompañamiento, y colchón de coros (pad en los instrumentales).
      for (const [paso, dur, tono, vel] of acompanar(plan.acomp, voicing(acorde, 62), s.energia, plan.ritmo, sostenido)) {
        acordes.push([p0 + paso, dur, tono, vel])
      }
      if (s.tipo === 'coro' || (s.energia >= 3 && s.tipo !== 'final')) {
        for (const tono of voicing(acorde, 70)) coros.push([p0, 16, tono, 70])
      }
    }

    // Melodía/voz: la del tipo de sección, recortada a su largo.
    // Con voz solo se canta donde hay letra; sin voz, el solo toma el coro en los instrumentales.
    // Una sección con letra pero sin melodía propia canta la del verso (o la del coro).
    const frase =
      melodias[s.tipo] ??
      (s.letra ? (melodias.verso ?? melodias.coro) : !conVoz && s.tipo === 'instrumental' ? melodias.coro : undefined)
    if (frase && (!conVoz || s.letra)) {
      // Repetida (si se pide) cada tantos compases como ocupa, hasta llenar la sección.
      const largo = Math.ceil(frase.reduce((m, n) => Math.max(m, n[0] + n[1]), 1) / PASOS_POR_COMPAS) * PASOS_POR_COMPAS
      // Cada repetición impar sube una octava la última frase (si cabe): el motivo vuelve, pero no idéntico.
      for (let desde = 0, vuelta = 0; desde < pasosSec; desde += opts.repetirMelodias ? largo : pasosSec, vuelta++) {
        for (const [i, d, t] of frase) {
          if (desde + i >= pasosSec) continue
          const alza = vuelta % 2 === 1 && i >= largo - PASOS_POR_COMPAS && t + 12 <= 84 ? 12 : 0
          melodia.push([inicioSec + desde + i, Math.min(d, pasosSec - desde - i), t + alza, s.tipo === 'coro' ? 110 : 96])
        }
      }
    }
    compas += s.compases
  }

  const n = (clave: string, es: string) => tGlobal(clave, es)
  const e = ESPACIO_FX[plan.espacio]
  const pistas = [
    pista(n('audio.cancionIA.pBateria', 'Batería'), plan.bateriaInstr, 0.8, fx(0.08), bateria, maxNotas),
    pista(n('audio.cancionIA.pBajo', 'Bajo'), 'bajo', 0.75, fx(0), bajo, maxNotas),
    pista(n('audio.cancionIA.pAcordes', 'Acordes'), plan.acordesInstr, 0.5, fx(e.acordes, 0, 0.2), acordes, maxNotas),
    pista(
      conVoz ? n('audio.cancionIA.pVoz', 'Voz') : n('audio.cancionIA.pMelodia', 'Melodía'),
      conVoz ? 'voz' : plan.melodiaInstr,
      0.85,
      fx(e.melodia, e.delay),
      melodia,
      maxNotas,
    ),
    pista(
      conVoz ? n('audio.cancionIA.pCoros', 'Coros') : n('audio.cancionIA.pColchon', 'Colchón'),
      conVoz ? 'coro' : 'pad',
      0.4,
      fx(e.colchon, 0, 0.3),
      coros,
      maxNotas,
    ),
  ].filter((p) => p.notas.length > 0)

  return { compases: compas, pistas, letra: letra.join('\n\n') }
}

export interface CancionCompuesta {
  nombre: string
  /** La descripción del usuario: queda en el proyecto para la versión cantada. */
  estilo: string
  bpm: number
  compases: number
  swing: number
  letra: string
  pistas: PistaAudio[]
}

/**
 * Compone una canción entera desde una descripción (y, opcional, la letra del
 * usuario). Reintenta UNA vez solo si el formato no se puede usar, como `ia.ts`.
 */
export async function componerCancion(opts: {
  descripcion: string
  letra?: string
  conVoz: boolean
  segundos: number
  bpm?: number
  idioma: string
  voz: VozCancion
}): Promise<CancionCompuesta> {
  const letraPropia = opts.conVoz && !!opts.letra?.trim()
  const sys = system({ ...opts, letraPropia })
  const texto = [
    `Descripción: ${opts.descripcion.trim() || 'una canción pop pegadiza'}`,
    letraPropia ? `Letra del usuario:\n${opts.letra!.trim().slice(0, 3000)}` : '',
  ]
    .filter(Boolean)
    .join('\n\n')

  let ultimo: unknown = null
  for (let intento = 0; intento < 2; intento++) {
    const respuesta = await conversarIA(sys, [{ rol: 'usuario', texto }], 4096)
    try {
      const plan = validarPlan(leerRespuesta(respuesta), opts.conVoz)
      if (opts.bpm) plan.bpm = opts.bpm // el tempo del usuario manda aunque el modelo lo ignore
      const { compases, pistas, letra } = desplegar(plan, opts.conVoz, opts.voz)
      return {
        nombre: plan.titulo || tGlobal('audio.cancionIA.sinTitulo', 'Canción con IA'),
        // La voz viaja dentro del estilo: así la versión de Lyria (y la que se rehaga desde el editor) la respeta.
        estilo: [opts.descripcion.trim(), opts.conVoz ? VOZ_LYRIA[opts.voz] : ''].filter(Boolean).join('. '),
        bpm: plan.bpm,
        compases: Math.max(1, compases),
        swing: plan.swing,
        letra,
        pistas,
      }
    } catch (e) {
      ultimo = e
      console.warn(
        '[audio] canción de IA no usable, reintentando:',
        e instanceof Error ? e.message : e,
        respuesta.length,
        respuesta.slice(-300),
      )
    }
  }
  throw ultimo instanceof Error ? ultimo : new Error('La IA no devolvió una canción usable')
}
