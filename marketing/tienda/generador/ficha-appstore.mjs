/**
 * Genera los textos de la ficha del App Store para los 16 idiomas, a partir de
 * los catálogos de la web (`web/i18n/paginas/<id>.mjs`), con la MISMA plantilla
 * que ya se subió en inglés. Salida: `marketing/tienda/appstore/textos/<id>.json`.
 *
 *   node marketing/tienda/generador/ficha-appstore.mjs
 */
import { writeFile, mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const AQUI = dirname(fileURLToPath(import.meta.url))
const RAIZ = join(AQUI, '..', '..', '..')
const SALIDA = join(RAIZ, 'marketing', 'tienda', 'appstore', 'textos')

const IDIOMAS = ['es', 'en', 'pt', 'fr', 'de', 'it', 'ja', 'zh', 'ko', 'ru', 'hi', 'tr', 'id', 'pl', 'nl', 'ar']

/** Código de idioma de App Store Connect para cada idioma de la app. */
const LOCALE = {
  es: 'Spanish (Mexico)',
  en: 'English (U.S.)',
  pt: 'Portuguese (Brazil)',
  fr: 'French',
  de: 'German',
  it: 'Italian',
  ja: 'Japanese',
  zh: 'Chinese (Simplified)',
  ko: 'Korean',
  ru: 'Russian',
  hi: 'Hindi',
  tr: 'Turkish',
  id: 'Indonesian',
  pl: 'Polish',
  nl: 'Dutch',
  ar: 'Arabic',
}

/** Palabras clave (100 caracteres máx., separadas por coma y sin espacios). */
const CLAVES = {
  es: 'hábitos,metas,agenda,diario,finanzas,nutrición,ejercicio,sueño,estudio,ia,asistente,organizador',
  en: 'habits,goals,planner,journal,budget,nutrition,workout,sleep,study,ai,assistant,organizer',
  pt: 'hábitos,metas,agenda,diário,finanças,nutrição,treino,sono,estudo,ia,assistente,organizador',
  fr: 'habitudes,objectifs,agenda,journal,budget,nutrition,sport,sommeil,étude,ia,assistant',
  de: 'gewohnheiten,ziele,planer,tagebuch,budget,ernährung,training,schlaf,lernen,ki,assistent',
  it: 'abitudini,obiettivi,agenda,diario,budget,nutrizione,allenamento,sonno,studio,ia,assistente',
  ja: '習慣,目標,手帳,日記,家計簿,食事,運動,睡眠,学習,ai,アシスタント,3d,管理',
  zh: '习惯,目标,日程,日记,记账,饮食,健身,睡眠,学习,ai,助手,3d,规划',
  ko: '습관,목표,플래너,일기,가계부,식단,운동,수면,공부,ai,비서,3d,관리',
  ru: 'привычки,цели,планер,дневник,бюджет,питание,тренировки,сон,учёба,ии,помощник',
  hi: 'आदतें,लक्ष्य,प्लानर,डायरी,बजट,पोषण,कसरत,नींद,पढ़ाई,एआई,सहायक',
  tr: 'alışkanlık,hedef,planlayıcı,günlük,bütçe,beslenme,egzersiz,uyku,çalışma,yapay zeka',
  id: 'kebiasaan,tujuan,agenda,jurnal,anggaran,nutrisi,olahraga,tidur,belajar,ai,asisten',
  pl: 'nawyki,cele,planer,dziennik,budżet,dieta,trening,sen,nauka,ai,asystent,organizer',
  nl: 'gewoontes,doelen,planner,dagboek,budget,voeding,training,slaap,studie,ai,assistent',
  ar: 'عادات,أهداف,مخطط,يوميات,ميزانية,تغذية,تمارين,نوم,دراسة,ذكاء اصطناعي,مساعد',
}

/** Subtítulos que no caben en los 30 caracteres de Apple, acortados a mano. */
const SUBTITULO = {
  id: 'Pikiranmu dalam rumah 3D',
}

/** Quita etiquetas HTML y deja el texto plano de una sola línea. */
const plano = (s) =>
  String(s || '')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    // El salto de línea de la portada deja un espacio sobrante en los idiomas
    // que no separan con espacios (ja/zh/ko): su coma ya hace de separación.
    .replace(/([、，。：！？])\s+/g, '$1')
    .trim()

/**
 * El texto de la web sin la frase del precio: Apple no quiere importes en la
 * ficha, y de paso deja el promocional dentro de sus 170 caracteres. Corta por
 * frases (el punto latino solo cuenta si le sigue espacio, o partiría «8.89»)
 * y se queda con las anteriores a la primera que nombre el precio.
 */
function sinPrecio(s) {
  const frases = plano(s).match(/[\s\S]*?(?:[.](?=\s|$)|[。！？।!?]|$)/g) || []
  const buenas = []
  for (const f of frases) {
    if (/\d[.,]\d\d|USD|\$|€/.test(f)) break
    if (f.trim()) buenas.push(f.trim())
  }
  return buenas.join(' ').replace(/([。！？।、，：])\s+/g, '$1')
}

const textos = {}
for (const id of IDIOMAS) {
  const { TEXTOS: t } = await import(`../../../web/i18n/paginas/${id}.mjs`)
  const bullet = (k) => `• ${plano(t[`${k}.t`])}: ${plano(t[`${k}.p`])}`

  const descripcion = [
    sinPrecio(t['meta.desc']),
    '',
    plano(t['como.h2']).toUpperCase(),
    '',
    `1. ${plano(t['como.1.t'])}`,
    plano(t['como.1.p']),
    '',
    `2. ${plano(t['como.2.t'])}`,
    plano(t['como.2.p']),
    '',
    `3. ${plano(t['como.3.t'])}`,
    plano(t['como.3.p']),
    '',
    plano(t['car.h2']).toUpperCase(),
    bullet('car.todo'),
    bullet('car.nocaduca'),
    bullet('car.1'),
    bullet('car.2'),
    bullet('car.3'),
    bullet('car.4'),
    bullet('car.5'),
    bullet('car.6'),
    '',
    plano(t['ia.h2']).toUpperCase(),
    '',
    plano(t['ia.sub']),
    '',
    bullet('ia.local'),
    '',
    plano(t['precio.app.nombre']).toUpperCase(),
    `• ${plano(t['precio.app.1'])}`,
    `• ${plano(t['precio.app.2'])}`,
    `• ${plano(t['precio.app.3'])}`,
    '',
    plano(t['mani.cierre']),
  ].join('\n')

  textos[id] = {
    locale: LOCALE[id],
    // El nombre NO se traduce: el icono del teléfono dice «Mind Planner Home»
    // en los 16 idiomas (`app_name` de Android no está localizado) y Apple pide
    // que la ficha coincida con el nombre instalado.
    nombre: 'Mind Planner Home',
    subtitulo: SUBTITULO[id] || plano(t['hero.h1']),
    promocional: sinPrecio(t['og.desc']),
    descripcion,
    claves: CLAVES[id],
    soporte: `https://mindplannerhome.com/${id === 'es' ? '' : id + '/'}soporte`,
    marketing: `https://mindplannerhome.com/${id === 'es' ? '' : id + '/'}`,
    privacidad: `https://mindplannerhome.com/${id === 'es' ? '' : id + '/'}privacidad`,
  }
}

await mkdir(SALIDA, { recursive: true })
for (const [id, v] of Object.entries(textos)) {
  await writeFile(join(SALIDA, `${id}.json`), JSON.stringify(v, null, 2) + '\n', 'utf8')
}

// Tabla de control: los límites de App Store Connect.
const LIM = { nombre: 30, subtitulo: 30, promocional: 170, descripcion: 4000, claves: 100 }
console.log('id  locale                 nombre sub  promo desc  claves')
for (const [id, v] of Object.entries(textos)) {
  const marca = (c, n) => (v[c].length > LIM[c] ? `${v[c].length}!!` : String(v[c].length))
  console.log(
    id.padEnd(4),
    v.locale.padEnd(22),
    marca('nombre').padStart(4),
    marca('subtitulo').padStart(5),
    marca('promocional').padStart(5),
    marca('descripcion').padStart(5),
    marca('claves').padStart(5),
  )
}
console.log(`\n${Object.keys(textos).length} fichas en ${SALIDA}`)
