// Empaqueta el VIDEO DE FÁBRICA del Studio de video de la app («Día 1 → Día 365»,
// ≈10 s y sin textos): los clips grabados (recortados a lo que usa el montaje y
// recomprimidos), las voces de los 16 idiomas (mp3 ligero, solo las líneas que
// usa) y la música si la hay → `public/promo/` de la app; y el montaje RESUELTO
// por idioma (qué toma dura cuánto, dónde entra cada voz) →
// `src/rooms/video/promo.data.ts`. El anuncio largo de TikTok es otra cosa: lo
// renderiza Remotion (`src/escenas.ts`) y no viaja con la app.
// La app lo siembra como un proyecto normal del Studio (`rooms/video/promo.ts`).
//
// Corre después de `voz.mjs` y de `grabar/grabar.mjs` (los clips salen de
// `public/clips/es`; la ráfaga de idiomas usa el calendario de los idiomas de
// `RAFAGA`).
//
//   node empaquetar-studio.mjs              todo
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
/**
 * Una sola tanda de clips para los 16 idiomas: las tomas no llevan texto y el
 * cambio de idioma lo cuenta la ráfaga, así que el video es universal y pesa poco.
 */
const CON_CLIPS = ['es']
const clipsDe = () => 'es'
/** Ráfaga de idiomas: calendarios grabados con la interfaz actual (escrituras distintas primero) y cuántos entran. */
const RAFAGA = ['ja', 'ar', 'hi', 'ko', 'ru', 'zh', 'es']
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
 * El video de fábrica, escena por escena. La duración de una escena es la mayor
 * entre lo visual y la voz en ese idioma; el sobrante se reparte de atrás hacia
 * delante entre las tomas de la escena, sin pasar de lo que dura cada clip
 * grabado (el Studio no ralentiza).
 */
/** Sonidos de fábrica del Studio (`rooms/video/sonidos.ts`) y sus segundos. */
const SONIDOS = { aaa: 5.3, bruh: 0.8, click: 0.4, faa: 1.8, golpe: 3.1, 'jeje-boy': 1.9, sus: 2.9, wow: 1.9, nice: 3.1 }
/** Un sonido `tras` la voz de la escena: hueco desde que calla y espacio máximo que se le reserva (el resto se corta si entra otra línea). */
const HUECO_TRAS = 0.1
const TOPE_TRAS = 2.2

// `sfx`: sonido de la carpeta de fábrica con el corte de la toma. `tras` (en la
// escena): sonido que va DESPUÉS de su última línea de voz, nunca encima.
const ESCENAS = [
  // Día 1: la casa recién creada (modo prueba) con sus dos cuartos.
  { id: 'dia1', tomas: [{ tipo: 'clip', clip: '00-dia1', seg: 3.0 }], lineas: ['dia1'] },
  // La interfaz en otros idiomas: un clic en cada corte.
  { id: 'idiomas', tomas: [{ tipo: 'rafaga', sfx: 'click' }], lineas: [] },
  // Día 365: del personaje a la casa entera, y el eslogan del anuncio.
  { id: 'dia365', tomas: [{ tipo: 'clip', clip: '11-dia365', seg: 4.0, sfx: 'wow' }], lineas: ['dia365', 'eslogan'], tras: 'jeje-boy' },
]
/** Las líneas de voz que usa el montaje: las demás del guion (las del anuncio largo) no viajan. */
const LINEAS = new Set(ESCENAS.flatMap((e) => e.lineas))

/** Nombre del proyecto en cada idioma (es dato del usuario, no interfaz: no va en dict). */
const NOMBRE = {
  es: 'Día 1 → Día 365',
  en: 'Day 1 → Day 365',
  pt: 'Dia 1 → Dia 365',
  fr: 'Jour 1 → Jour 365',
  de: 'Tag 1 → Tag 365',
  it: 'Giorno 1 → Giorno 365',
  ja: '1日目 → 365日目',
  zh: '第1天 → 第365天',
  ko: '1일 차 → 365일 차',
  ru: 'День 1 → День 365',
  hi: 'दिन 1 → दिन 365',
  tr: '1. gün → 365. gün',
  id: 'Hari 1 → Hari 365',
  pl: 'Dzień 1 → Dzień 365',
  nl: 'Dag 1 → Dag 365',
  ar: 'اليوم 1 ← اليوم 365',
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
    '10-zoom-out': 'La casa desde lejos',
    '00-dia1': 'Día uno',
    '11-dia365': 'Día 365',
    escritorio: 'MindHaOS en escritorio',
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
    '10-zoom-out': 'The house from afar',
    '00-dia1': 'Day one',
    '11-dia365': 'Day 365',
    escritorio: 'MindHaOS on desktop',
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
  for (const linea of Object.keys(JSON.parse(readFileSync(t, 'utf8'))).filter((l) => LINEAS.has(l))) {
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
const conCalendario = RAFAGA.filter((id) => existsSync(path.join(PUBLIC, 'clips', id, '05-calendario.mp4')))

// ─── 2. El montaje resuelto por idioma ───────────────────────────────────────

function planificar(id) {
  const set = clipsDe(id)
  const rafaga = RAFAGA.filter((otro) => otro !== id && conCalendario.includes(otro)).slice(0, RAFAGA_N)
  const tomas = []
  const voces = []
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
    if (e.tras && dur.length) {
      // Nunca encima de un efecto de corte que aún suena (el «nice» del resumen): espera a que acabe.
      const trasVoz = finVoz + HUECO_TRAS
      let t = cursor
      let desde = trasVoz
      for (const toma of lista) {
        if (toma.sfx && t <= trasVoz) desde = Math.max(desde, t + SONIDOS[toma.sfx])
        t += toma.seg
      }
      efectos.push({ clave: e.tras, desde: r2(desde) })
    }
    cursor = r2(cursor + escenaSeg)
  }
  const g = guion[id]
  return {
    nombre: NOMBRE[id],
    clips: set,
    lineas: g.lineas,
    cierre: g.cierre,
    gratis: g.cta.gratis,
    tomas,
    voces,
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
  medios.calendarios[otro] =
    medios.clips[otro]?.['05-calendario'] ??
    clipRecortado(path.join(PUBLIC, 'clips', otro, '05-calendario.mp4'), destino, RAFAGA_SEG + MARGEN)
}
for (const set of ESCENAS.some((e) => e.tomas.some((t) => t.tipo === 'escritorio')) ? CON_CLIPS : []) {
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
// El video de fábrica de MindHaOS («Día 1 → Día 365») montado para el Studio de video, resuelto por idioma: las
// tomas en orden con su duración (el sobrante de la voz ya repartido), dónde
// entra cada línea de voz, y los textos. Los binarios viven en
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
  cierre: string[]
  gratis: string
  tomas: TomaPromo[]
  voces: { linea: string; desde: number; seg: number }[]
  /** Sonidos de fábrica que van DESPUÉS de una línea de voz (se cortan si entra la siguiente). */
  efectos: { clave: string; desde: number }[]
}

/** Duraciones (s) y tamaños de lo que hay en \`public/promo/\`. */
export const PROMO_MEDIOS: {
  clips: Record<string, Record<string, number>>
  /** El calendario de cada idioma grabado (la ráfaga). */
  calendarios: Record<string, number>
  escritorio: Record<string, { ancho: number; alto: number }>
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
console.log(`\nclips ${mb(pesoDir(salida('clips')))} · voces ${mb(pesoDir(salida('voz')))} · total ${mb(pesoDir(SALIDA))}`)
if (!medios.musica) console.log('sin public/musica.mp3: el proyecto sale sin pista de música')
console.log(`montaje → ${path.relative(APP, DATOS)}`)
