// Empaqueta el anuncio como CONTENIDO DE FÁBRICA del Studio de video de la app:
// los clips grabados (recortados a lo que usa el montaje y recomprimidos), las
// voces de los 16 idiomas (mp3 ligero), la captura de escritorio y la música si
// la hay → `public/promo/` de la app; y el montaje RESUELTO por idioma (qué toma
// dura cuánto, dónde entra cada voz y cada rótulo) → `src/rooms/video/promo.data.ts`.
// La app lo siembra como un proyecto normal del Studio (`rooms/video/promo.ts`).
//
// Corre después de `voz.mjs` y de `grabar/grabar.mjs` (los clips de la app salen
// de `public/clips/es` y `public/clips/en`; la ráfaga de idiomas usa el
// calendario de todos los idiomas grabados).
//
//   node empaquetar-studio.mjs              todo (≈ 3 min: recomprime 45 clips)
//   node empaquetar-studio.mjs --sin-medios solo el montaje (reusa public/promo/)
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const RAIZ = path.dirname(fileURLToPath(import.meta.url))
const PUBLIC = path.join(RAIZ, 'public')
const APP = path.join(RAIZ, '..', '..')
const SALIDA = path.join(APP, 'public', 'promo')
const DATOS = path.join(APP, 'src', 'rooms', 'video', 'promo.data.ts')
const FFMPEG = process.env.FFMPEG || 'ffmpeg'
const FFPROBE = process.env.FFPROBE || 'ffprobe'
const SIN_MEDIOS = process.argv.includes('--sin-medios')

const IDIOMAS = ['es', 'en', 'pt', 'fr', 'de', 'it', 'ja', 'zh', 'ko', 'ru', 'hi', 'tr', 'id', 'pl', 'nl', 'ar']
/** Idiomas cuyos clips viajan ENTEROS con la app: el español ve los suyos y el resto los ingleses. */
const CON_CLIPS = ['es', 'en']
const clipsDe = (id) => (id === 'es' ? 'es' : 'en')
/** Ráfaga «16 idiomas»: orden de preferencia (escrituras distintas primero) y cuántos entran. */
const RAFAGA = ['ja', 'ar', 'hi', 'ko', 'ru', 'zh', 'de', 'pt', 'fr', 'tr', 'pl', 'it', 'nl', 'id', 'en', 'es']
const RAFAGA_N = 6
const RAFAGA_SEG = 0.45
/** Silencios alrededor de la voz (segundos), como en `src/escenas.ts`. */
const PAUSA_INICIO = 0.1
const PAUSA_ENTRE = 0.25
const PAUSA_FIN = 0.15
/**
 * Los mp3 de edge-tts traen ≈0,17 s de silencio delante, ≈0,75 s detrás y
 * pausas de hasta 0,85 s en los puntos: se recortan al empaquetar (delante
 * queda 0,05 s; las pausas de ≥ 0,3 s se dejan en 0,4 s = stop_duration +
 * stop_silence; detrás 0,2 s). La cola se recorta al revés (`areverse`): con
 * `stop_periods=-1` ffmpeg espera a la siguiente voz y el silencio final se
 * queda entero.
 */
const RECORTE_SILENCIOS =
  'silenceremove=start_periods=1:start_silence=0.05:start_threshold=-40dB:stop_periods=-1:stop_duration=0.3:stop_silence=0.1:stop_threshold=-40dB,' +
  'areverse,silenceremove=start_periods=1:start_silence=0.2:start_threshold=-40dB,areverse'
/** Aire tras lo que usa el montaje al recortar un clip, y antes de su último fotograma. */
const MARGEN = 0.25
const FIN_CLIP = 0.05
const CRF = 28

/**
 * El anuncio, escena por escena: el mismo montaje que `src/escenas.ts` (Remotion),
 * en segundos. La duración de una escena es la mayor entre lo visual y la voz en
 * ese idioma; el sobrante se reparte de atrás hacia delante entre las tomas de la
 * escena, sin pasar de lo que dura cada clip grabado (el Studio no ralentiza).
 */
/** Sonidos de fábrica del Studio (`rooms/video/sonidos.ts`) y sus segundos. */
const SONIDOS = { aaa: 5.3, bruh: 0.8, click: 0.4, faa: 1.8, golpe: 3.1, 'jeje-boy': 1.9, sus: 2.9, wow: 1.9, nice: 3.1 }
/** Un sonido `tras` la voz de la escena: hueco desde que calla y espacio máximo que se le reserva (el resto se corta si entra otra línea). */
const HUECO_TRAS = 0.1
const TOPE_TRAS = 2.2

// `sfx`: sonido de la carpeta de fábrica con el corte de la toma. `tras` (en la
// escena): sonido que va DESPUÉS de su última línea de voz, nunca encima.
const ESCENAS = [
  { id: 'gancho', tomas: [{ tipo: 'clip', clip: '01-avatar', seg: 3.0 }], lineas: ['gancho'], titulares: [{ clave: 'gancho', desde: 0.25 }], tras: 'faa' },
  {
    id: 'casa',
    tomas: [
      { tipo: 'clip', clip: '02-casa-gira', seg: 2.4, sfx: 'click' },
      { tipo: 'clip', clip: '03-app-cocina', seg: 0.8, sfx: 'click' },
      { tipo: 'clip', clip: '03-app-ejercicio', seg: 1.0, sfx: 'click' },
      { tipo: 'clip', clip: '03-app-finanzas', seg: 0.8, sfx: 'click' },
      { tipo: 'clip', clip: '03-app-metas', seg: 0.8, sfx: 'click' },
      { tipo: 'clip', clip: '03-app-studio', seg: 1.4, sfx: 'click' },
    ],
    lineas: ['casa'],
    titulares: [{ clave: 'apps', desde: 2.4 }],
  },
  {
    id: 'disena',
    tomas: [
      { tipo: 'clip', clip: '04-mosaico', seg: 2.0, sfx: 'click' },
      { tipo: 'clip', clip: '04-editor', seg: 2.2, sfx: 'click' },
      { tipo: 'clip', clip: '04-temas', seg: 3.0, sfx: 'wow' },
    ],
    lineas: ['disena'],
    titulares: [
      { clave: 'disena', desde: 0.3, hasta: 4.0 },
      { clave: 'personaliza', desde: 4.4 },
    ],
  },
  {
    id: 'metas',
    tomas: [
      { tipo: 'clip', clip: '05-calendario', seg: 1.7, sfx: 'click' },
      { tipo: 'clip', clip: '05-misiones', seg: 1.7, sfx: 'click' },
      { tipo: 'clip', clip: '05-cronograma', seg: 1.8, sfx: 'click' },
      { tipo: 'clip', clip: '06-avatar-asistente', seg: 1.7, sfx: 'click' },
    ],
    lineas: ['metas'],
    titulares: [{ clave: 'metas', desde: 0.3, hasta: 5.2 }],
  },
  {
    id: 'ia',
    // «…imágenes, recursos y modelos 3D»: el anecdotario, un diagrama de Ideas,
    // el formulario y la superficie 3D de la sala de cómputo.
    tomas: [
      { tipo: 'clip', clip: '06-chat', seg: 2.0, sfx: 'click' },
      { tipo: 'clip', clip: '06-fotos', seg: 1.5, sfx: 'click' },
      { tipo: 'clip', clip: '06-diagrama', seg: 2.0, sfx: 'click' },
      { tipo: 'clip', clip: '06-formulas', seg: 1.8, sfx: 'click' },
      { tipo: 'clip', clip: '06-grafica', seg: 2.0, sfx: 'click' },
    ],
    lineas: ['ia'],
    titulares: [{ clave: 'ia', desde: 0.3, hasta: 4.8 }],
  },
  {
    id: 'cerebro',
    tomas: [
      { tipo: 'clip', clip: '07-sisifo', seg: 3.2, sfx: 'click' },
      { tipo: 'clip', clip: '07-wrapped', seg: 2.6, sfx: 'nice' },
      { tipo: 'clip', clip: '07-baile', seg: 3.8, sfx: 'click' },
    ],
    lineas: ['cerebro'],
    titulares: [{ clave: 'progreso', desde: 3.4, hasta: 8.6 }],
    // El grito «AAA» cuando acaba el argumento, sobre el baile.
    tras: 'aaa',
  },
  {
    id: 'idiomas',
    tomas: [
      { tipo: 'rafaga', sfx: 'click' },
      { tipo: 'escritorio', seg: 1.9, sfx: 'click' },
      { tipo: 'clip', clip: '07-panel-ia', seg: 2.6, sfx: 'click' },
    ],
    lineas: ['idiomas'],
    titulares: [
      { clave: 'idiomas', desde: 0.1, hasta: 2.6 },
      { clave: 'plataformas', desde: 2.8, hasta: 4.5 },
      { clave: 'conSinIa', desde: 4.7 },
    ],
  },
  { id: 'cta', tomas: [{ tipo: 'clip', clip: '09-atardecer', seg: 3.2, sfx: 'click' }], lineas: ['cta'], titulares: [] },
  { id: 'cierre', tomas: [{ tipo: 'cierre', seg: 6.5, sfx: 'golpe' }], lineas: ['eslogan'], titulares: [] },
  // El último plano repite el primero: en TikTok el video vuelve a empezar solo.
  { id: 'loop', tomas: [{ tipo: 'clip', clip: '01-avatar', seg: 0.8 }], lineas: [], titulares: [] },
]

/** Nombre del proyecto en cada idioma (es dato del usuario, no interfaz: no va en dict). */
const NOMBRE = {
  es: 'Anuncio de MPH',
  en: 'MPH ad',
  pt: 'Anúncio do MPH',
  fr: 'Pub de MPH',
  de: 'MPH-Werbespot',
  it: 'Spot di MPH',
  ja: 'MPHの広告',
  zh: 'MPH 广告',
  ko: 'MPH 광고',
  ru: 'Реклама MPH',
  hi: 'MPH का विज्ञापन',
  tr: 'MPH reklamı',
  id: 'Iklan MPH',
  pl: 'Reklama MPH',
  nl: 'MPH-advertentie',
  ar: 'إعلان MPH',
}

/** Nombres de los medios en la biblioteca, en el idioma de la interfaz que se ve en los clips. */
const NOMBRES_MEDIOS = {
  es: {
    '01-avatar': 'Avatar en primer plano',
    '02-casa-gira': 'La casa gira',
    '03-app-cocina': 'App Cocina',
    '03-app-ejercicio': 'App Ejercicio',
    '03-app-finanzas': 'App Finanzas',
    '03-app-metas': 'App Metas',
    '03-app-studio': 'App Studio',
    '04-mosaico': 'Mosaico de apps',
    '04-editor': 'Editor de la casa',
    '04-temas': 'Temas de la casa',
    '05-calendario': 'Calendario',
    '05-misiones': 'Misiones',
    '05-cronograma': 'Cronograma',
    '06-avatar-asistente': 'Avatar y asistente',
    '06-chat': 'Chat con el asistente',
    '06-fotos': 'Anecdotario',
    '06-ideas': 'Ideas',
    '06-diagrama': 'Diagrama de decisión',
    '06-formulas': 'Formulario de fórmulas',
    '06-grafica': 'Superficie 3D',
    '07-sisifo': 'Sísifo',
    '07-wrapped': 'Resumen',
    '07-baile': 'Baile',
    '07-panel-ia': 'Panel de IA',
    '09-atardecer': 'Atardecer',
    escritorio: 'MPH en escritorio',
    musica: 'Música del anuncio',
  },
  en: {
    '01-avatar': 'Avatar close-up',
    '02-casa-gira': 'The house spins',
    '03-app-cocina': 'Kitchen app',
    '03-app-ejercicio': 'Workout app',
    '03-app-finanzas': 'Finances app',
    '03-app-metas': 'Goals app',
    '03-app-studio': 'Studio app',
    '04-mosaico': 'App mosaic',
    '04-editor': 'House editor',
    '04-temas': 'House themes',
    '05-calendario': 'Calendar',
    '05-misiones': 'Missions',
    '05-cronograma': 'Schedule',
    '06-avatar-asistente': 'Avatar and assistant',
    '06-chat': 'Chat with the assistant',
    '06-fotos': 'Journal',
    '06-ideas': 'Ideas',
    '06-diagrama': 'Decision diagram',
    '06-formulas': 'Formula book',
    '06-grafica': '3D surface',
    '07-sisifo': 'Sisyphus',
    '07-wrapped': 'Recap',
    '07-baile': 'Dance',
    '07-panel-ia': 'AI panel',
    '09-atardecer': 'Sunset',
    escritorio: 'MPH on desktop',
    musica: 'Ad music',
  },
}

const r2 = (x) => Math.round(x * 100) / 100
const ff = (args) => execFileSync(FFMPEG, ['-v', 'error', '-y', ...args], { stdio: ['ignore', 'inherit', 'inherit'] })
function sonda(ruta) {
  const s = execFileSync(FFPROBE, [
    '-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height:format=duration', '-of', 'json', ruta,
  ]).toString()
  const j = JSON.parse(s)
  return { seg: r2(Number(j.format?.duration ?? 0)), ancho: j.streams?.[0]?.width, alto: j.streams?.[0]?.height }
}
const duracion = (ruta) => sonda(ruta).seg

// ─── 1. Qué hay: guiones, voces, clips ───────────────────────────────────────

const salida = (...p) => path.join(SALIDA, ...p)
if (!SIN_MEDIOS) rmSync(SALIDA, { recursive: true, force: true })
mkdirSync(SALIDA, { recursive: true })

const guion = {}
/** Duración de cada línea YA recortada de silencios: el montaje se planifica con ella. */
const voz = {}
for (const id of IDIOMAS) {
  const g = path.join(RAIZ, 'guion', id + '.json')
  if (!existsSync(g)) throw new Error(`falta guion/${id}.json`)
  guion[id] = JSON.parse(readFileSync(g, 'utf8'))
  const t = path.join(PUBLIC, 'voz', id, 'tiempos.json')
  if (!existsSync(t)) throw new Error(`falta la voz de ${id} (node voz.mjs ${id})`)
  voz[id] = {}
  mkdirSync(salida('voz', id), { recursive: true })
  for (const linea of Object.keys(JSON.parse(readFileSync(t, 'utf8')))) {
    const destino = salida('voz', id, linea + '.mp3')
    if (!SIN_MEDIOS) ff(['-i', path.join(PUBLIC, 'voz', id, linea + '.mp3'), '-af', RECORTE_SILENCIOS, '-ac', '1', '-b:a', '48k', destino])
    if (existsSync(destino)) voz[id][linea] = duracion(destino)
  }
}
for (const set of CON_CLIPS) {
  if (!existsSync(path.join(PUBLIC, 'clips', set))) throw new Error(`faltan los clips de ${set} (node grabar/grabar.mjs ${set})`)
}
/** Duración real de cada clip grabado, por set. */
const grabados = {}
for (const set of CON_CLIPS) {
  grabados[set] = {}
  for (const f of readdirSync(path.join(PUBLIC, 'clips', set))) {
    if (f.endsWith('.mp4')) grabados[set][f.slice(0, -4)] = duracion(path.join(PUBLIC, 'clips', set, f))
  }
}
/** Idiomas con calendario grabado (la ráfaga). */
const conCalendario = IDIOMAS.filter((id) => existsSync(path.join(PUBLIC, 'clips', id, '05-calendario.mp4')))

// ─── 2. El montaje resuelto por idioma ───────────────────────────────────────

function planificar(id) {
  const set = clipsDe(id)
  const rafaga = RAFAGA.filter((otro) => otro !== id && conCalendario.includes(otro)).slice(0, RAFAGA_N)
  const tomas = []
  const voces = []
  const rotulos = []
  const efectos = []
  let cursor = 0
  for (const e of ESCENAS) {
    // Tomas de la escena con su duración base; la ráfaga se abre en sus sub-tomas.
    const lista = e.tomas.flatMap((t) => {
      if (t.tipo === 'rafaga') return rafaga.map((otro) => ({ tipo: 'rafaga', idioma: otro, seg: RAFAGA_SEG, tope: RAFAGA_SEG, sfx: t.sfx }))
      if (t.tipo === 'clip') {
        const real = grabados[set][t.clip]
        if (real == null) throw new Error(`${set}: falta el clip ${t.clip}`)
        return [{ ...t, tope: real - FIN_CLIP }]
      }
      return [{ ...t, tope: Infinity }]
    })
    const visual = lista.reduce((a, t) => a + t.seg, 0)
    const dur = e.lineas.map((l) => voz[id][l] ?? 0).filter((s) => s > 0)
    const tras = e.tras && dur.length ? HUECO_TRAS + Math.min(SONIDOS[e.tras], TOPE_TRAS) : PAUSA_FIN
    const vozSeg = dur.length ? PAUSA_INICIO + dur.reduce((a, b) => a + b, 0) + PAUSA_ENTRE * (dur.length - 1) + tras : 0
    let sobrante = Math.max(0, vozSeg - visual)
    for (let i = lista.length - 1; i >= 0 && sobrante > 0; i--) {
      const extra = Math.min(sobrante, Math.max(0, lista[i].tope - lista[i].seg))
      lista[i].seg = r2(lista[i].seg + extra)
      sobrante -= extra
    }
    const escenaSeg = r2(lista.reduce((a, t) => a + t.seg, 0))
    for (const t of lista) {
      const sfx = t.sfx ? { sfx: t.sfx } : {}
      tomas.push(t.tipo === 'clip' ? { tipo: 'clip', clip: t.clip, seg: t.seg, ...sfx } : t.tipo === 'rafaga' ? { tipo: 'rafaga', idioma: t.idioma, seg: t.seg, ...sfx } : { tipo: t.tipo, seg: t.seg, ...sfx })
    }
    let v0 = cursor + PAUSA_INICIO
    let finVoz = cursor
    for (const l of e.lineas) {
      const s = voz[id][l]
      if (!s) continue
      voces.push({ linea: l, desde: r2(v0), seg: s })
      finVoz = v0 + s
      v0 += s + PAUSA_ENTRE
    }
    if (e.tras && dur.length) efectos.push({ clave: e.tras, desde: r2(finVoz + HUECO_TRAS) })
    for (const t of e.titulares) {
      const hasta = Math.min(escenaSeg, t.hasta ?? escenaSeg)
      if (hasta > t.desde) rotulos.push({ clave: t.clave, desde: r2(cursor + t.desde), hasta: r2(cursor + hasta) })
    }
    cursor = r2(cursor + escenaSeg)
  }
  const g = guion[id]
  return {
    nombre: NOMBRE[id],
    clips: set,
    lineas: g.lineas,
    titulares: g.titulares,
    cierre: g.cierre,
    gratis: g.cta.gratis,
    tomas,
    voces,
    rotulos,
    efectos,
    total: cursor,
  }
}

const planes = {}
for (const id of IDIOMAS) planes[id] = planificar(id)

/** Cuánto de cada clip usa el montaje en el idioma que más lo alarga: a eso se recorta. */
const usado = {}
for (const set of CON_CLIPS) usado[set] = {}
for (const id of IDIOMAS) {
  const p = planes[id]
  for (const t of p.tomas) if (t.tipo === 'clip') usado[p.clips][t.clip] = Math.max(usado[p.clips][t.clip] ?? 0, t.seg)
}

// ─── 3. Medios → public/promo/ ───────────────────────────────────────────────

const medios = { clips: {}, calendarios: {}, escritorio: {}, musica: null }

function clipRecortado(origen, destino, seg) {
  mkdirSync(path.dirname(destino), { recursive: true })
  if (!SIN_MEDIOS) {
    ff(['-i', origen, '-t', String(seg), '-c:v', 'libx264', '-preset', 'slow', '-crf', String(CRF), '-pix_fmt', 'yuv420p', '-an', '-movflags', '+faststart', destino])
    // Miniatura para la timeline (como la que saca `importar.ts` al importar).
    ff(['-ss', '0.1', '-i', destino, '-frames:v', '1', '-vf', 'scale=-2:200', '-q:v', '5', destino.replace(/\.mp4$/, '.jpg')])
  }
  return duracion(destino)
}

for (const set of CON_CLIPS) {
  medios.clips[set] = {}
  for (const [clip, seg] of Object.entries(usado[set])) {
    const real = grabados[set][clip]
    medios.clips[set][clip] = clipRecortado(path.join(PUBLIC, 'clips', set, clip + '.mp4'), salida('clips', set, clip + '.mp4'), Math.min(real, seg + MARGEN))
    process.stdout.write(`${set}/${clip} `)
  }
}
for (const otro of conCalendario) {
  const destino = salida('clips', otro, '05-calendario.mp4')
  medios.calendarios[otro] = CON_CLIPS.includes(otro)
    ? medios.clips[otro]['05-calendario']
    : clipRecortado(path.join(PUBLIC, 'clips', otro, '05-calendario.mp4'), destino, RAFAGA_SEG + MARGEN)
}
for (const set of CON_CLIPS) {
  const destino = salida(`escritorio-${set}.jpg`)
  if (!SIN_MEDIOS) ff(['-i', path.join(PUBLIC, 'marca', `escritorio-${set}.png`), '-vf', 'scale=1280:-2', '-q:v', '3', destino])
  const { ancho, alto } = sonda(destino)
  medios.escritorio[set] = { ancho, alto }
}
const musica = path.join(PUBLIC, 'musica.mp3')
if (existsSync(musica)) {
  const destino = salida('musica.mp3')
  if (!SIN_MEDIOS) ff(['-i', musica, '-b:a', '96k', destino])
  medios.musica = duracion(destino)
}
console.log('')

// ─── 4. promo.data.ts ────────────────────────────────────────────────────────

/** Literal TS legible: claves sin comillas cuando son identificadores. */
function literal(v, sangria = '') {
  if (Array.isArray(v)) {
    if (v.length === 0) return '[]'
    const dentro = sangria + '  '
    return '[\n' + v.map((x) => dentro + literal(x, dentro)).join(',\n') + '\n' + sangria + ']'
  }
  if (v && typeof v === 'object') {
    const claves = Object.keys(v)
    if (claves.length === 0) return '{}'
    // Objetos planos y cortos (una toma, una voz…) en una línea: el archivo se lee de un vistazo.
    if (claves.every((k) => v[k] === null || typeof v[k] !== 'object')) {
      const linea = '{ ' + claves.map((k) => `${/^[A-Za-z_$][\w$]*$/.test(k) ? k : JSON.stringify(k)}: ${literal(v[k])}`).join(', ') + ' }'
      if (sangria.length + linea.length <= 110) return linea
    }
    const dentro = sangria + '  '
    return (
      '{\n' +
      claves.map((k) => `${dentro}${/^[A-Za-z_$][\w$]*$/.test(k) ? k : JSON.stringify(k)}: ${literal(v[k], dentro)}`).join(',\n') +
      '\n' +
      sangria +
      '}'
    )
  }
  if (typeof v === 'string') return "'" + v.replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'"
  return String(v)
}

const planesSinTotal = Object.fromEntries(IDIOMAS.map((id) => [id, (({ total: _t, ...p }) => p)(planes[id])]))
const ts = `// GENERADO por marketing/promo/empaquetar-studio.mjs — no editar a mano.
//
// El anuncio de MPH montado para el Studio de video, resuelto por idioma: las
// tomas en orden con su duración (el sobrante de la voz ya repartido), dónde
// entra cada línea de voz y cada rótulo, y los textos. Los binarios viven en
// \`public/promo/\`; \`rooms/video/promo.ts\` los siembra como un proyecto normal.
import type { PorIdioma } from '../../core/i18n/porIdioma'

/** \`sfx\`: sonido de fábrica (clave de \`sonidos.ts\`) que suena con el corte de la toma. */
export type TomaPromo =
  | { tipo: 'clip'; clip: string; seg: number; sfx?: string }
  /** Un calendario en otro idioma (la ráfaga «16 idiomas»). */
  | { tipo: 'rafaga'; idioma: string; seg: number; sfx?: string }
  | { tipo: 'escritorio'; seg: number; sfx?: string }
  | { tipo: 'cierre'; seg: number; sfx?: string }

export interface PlanPromo {
  nombre: string
  /** Carpeta de clips de la app en ese idioma (\`public/promo/clips/<clips>/\`); la captura de escritorio va igual. */
  clips: 'es' | 'en'
  lineas: Record<string, string>
  titulares: Record<string, string>
  cierre: string[]
  gratis: string
  tomas: TomaPromo[]
  voces: { linea: string; desde: number; seg: number }[]
  rotulos: { clave: string; desde: number; hasta: number }[]
  /** Sonidos de fábrica que van DESPUÉS de una línea de voz (se cortan si entra la siguiente). */
  efectos: { clave: string; desde: number }[]
}

/** Duraciones (s) y tamaños de lo que hay en \`public/promo/\`. */
export const PROMO_MEDIOS: {
  clips: Record<'es' | 'en', Record<string, number>>
  /** El calendario de cada idioma grabado (la ráfaga). */
  calendarios: Record<string, number>
  escritorio: Record<'es' | 'en', { ancho: number; alto: number }>
  musica: number | null
} = ${literal(medios)}

export const PROMO_NOMBRES: Record<'es' | 'en', Record<string, string>> = ${literal(NOMBRES_MEDIOS)}

export const PROMO: PorIdioma<PlanPromo> = ${literal(planesSinTotal)}
`
writeFileSync(DATOS, ts)

// ─── Resumen ─────────────────────────────────────────────────────────────────

function pesoDir(dir) {
  let total = 0
  for (const f of readdirSync(dir, { withFileTypes: true })) total += f.isDirectory() ? pesoDir(path.join(dir, f.name)) : statSync(path.join(dir, f.name)).size
  return total
}
const mb = (n) => (n / 1024 / 1024).toFixed(1) + ' MB'
for (const id of IDIOMAS) console.log(`${id}: ${planes[id].total.toFixed(1)} s · ${planes[id].tomas.length} tomas · ráfaga ${planes[id].tomas.filter((t) => t.tipo === 'rafaga').length}`)
console.log(`\nclips es ${mb(pesoDir(salida('clips', 'es')))} · en ${mb(pesoDir(salida('clips', 'en')))} · voces ${mb(pesoDir(salida('voz')))} · total ${mb(pesoDir(SALIDA))}`)
if (!medios.musica) console.log('sin public/musica.mp3: el proyecto sale sin pista de música')
console.log(`montaje → ${path.relative(APP, DATOS)}`)
