import type { CuentaRed } from './tipos'

/**
 * Las cuentas por idioma de MindHaOS (MindHaOS-日本, Mindhaos-es, mindhaos.ja…):
 * de qué idioma es cada una, a qué hora conviene publicar allá y qué hashtags
 * usar. Ninguna red deja elegir el país de una publicación orgánica: lo que
 * la lleva a ese país es el idioma del texto y publicar en su hora pico.
 */
export interface IdiomaCuenta {
  /** Código de la app (es, ja…), el mismo de `porIdioma`. */
  codigo: string
  /** Código BCP-47 que entiende YouTube (`snippet.defaultLanguage`). */
  youtube: string
  /** Zona horaria del país principal de ese idioma. */
  zona: string
  /** Hora local (0-23) en la que más se ve contenido corto allá. */
  horaPico: number
  hashtags: string
}

const IDIOMAS: Record<string, Omit<IdiomaCuenta, 'codigo'>> = {
  es: { youtube: 'es', zona: 'America/Mexico_City', horaPico: 19, hashtags: '#productividad #hábitos #organización #planificador #mindhaos' },
  en: { youtube: 'en', zona: 'America/New_York', horaPico: 19, hashtags: '#productivity #habits #lifeorganization #planner #mindhaos' },
  pt: { youtube: 'pt', zona: 'America/Sao_Paulo', horaPico: 20, hashtags: '#produtividade #hábitos #organização #planejamento #mindhaos' },
  fr: { youtube: 'fr', zona: 'Europe/Paris', horaPico: 19, hashtags: '#productivité #habitudes #organisation #planification #mindhaos' },
  de: { youtube: 'de', zona: 'Europe/Berlin', horaPico: 19, hashtags: '#produktivität #gewohnheiten #organisation #planer #mindhaos' },
  it: { youtube: 'it', zona: 'Europe/Rome', horaPico: 20, hashtags: '#produttività #abitudini #organizzazione #pianificazione #mindhaos' },
  nl: { youtube: 'nl', zona: 'Europe/Amsterdam', horaPico: 19, hashtags: '#productiviteit #gewoontes #organiseren #planner #mindhaos' },
  pl: { youtube: 'pl', zona: 'Europe/Warsaw', horaPico: 19, hashtags: '#produktywność #nawyki #organizacja #planer #mindhaos' },
  tr: { youtube: 'tr', zona: 'Europe/Istanbul', horaPico: 20, hashtags: '#verimlilik #alışkanlıklar #planlama #düzen #mindhaos' },
  id: { youtube: 'id', zona: 'Asia/Jakarta', horaPico: 19, hashtags: '#produktivitas #kebiasaan #perencanaan #manajemenwaktu #mindhaos' },
  ja: { youtube: 'ja', zona: 'Asia/Tokyo', horaPico: 20, hashtags: '#生産性 #習慣化 #手帳 #自己管理 #mindhaos' },
  // Facebook, Instagram y YouTube no entran en China continental: el público está en Taiwán, Hong Kong y Singapur.
  zh: { youtube: 'zh-CN', zona: 'Asia/Taipei', horaPico: 20, hashtags: '#效率 #习惯 #时间管理 #自律 #mindhaos' },
  ko: { youtube: 'ko', zona: 'Asia/Seoul', horaPico: 20, hashtags: '#생산성 #습관 #자기관리 #플래너 #mindhaos' },
  ru: { youtube: 'ru', zona: 'Europe/Moscow', horaPico: 19, hashtags: '#продуктивность #привычки #саморазвитие #планирование #mindhaos' },
  ar: { youtube: 'ar', zona: 'Asia/Riyadh', horaPico: 21, hashtags: '#إنتاجية #عادات #تنظيم_الوقت #تطوير_الذات #mindhaos' },
  hi: { youtube: 'hi', zona: 'Asia/Kolkata', horaPico: 20, hashtags: '#उत्पादकता #आदतें #समय_प्रबंधन #प्रेरणा #mindhaos' },
}

/** El sufijo con que se nombraron las cuentas en escritura nativa (MindHaOS-日本, Mindhaos-рус…). */
const NATIVOS: Record<string, string> = { '日本': 'ja', '中文': 'zh', '한국': 'ko', 'рус': 'ru', 'عربي': 'ar', 'हिं': 'hi' }

/**
 * El idioma de la cuenta según su nombre: «MindHaOS-pt», «mindhaos.pt» o el
 * sufijo nativo. Las principales (MindHaOS, @mindhaos, mindhaos.app) son las
 * de inglés. Solo se llama cuando el usuario tiene varias cuentas en la red.
 */
export function idiomaDeCuenta(cuenta: CuentaRed): IdiomaCuenta | null {
  for (const n of [cuenta.extra.username, cuenta.nombre]) {
    if (!n) continue
    if (/^mindhaos(\.app)?$/i.test(n.trim())) return { codigo: 'en', ...IDIOMAS.en }
    const m = n.trim().match(/^mindhaos[-.](.+)$/i)
    if (!m) continue
    const codigo = NATIVOS[m[1]] ?? m[1].toLowerCase()
    if (IDIOMAS[codigo]) return { codigo, ...IDIOMAS[codigo] }
  }
  return null
}

/** Minutos que la zona va adelantada respecto a UTC en ese instante. */
function desfaseMin(zona: string, instante: Date): number {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', { timeZone: zona, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric' })
      .formatToParts(instante)
      .map((x) => [x.type, Number(x.value)]),
  )
  return Math.round((Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute) - instante.getTime()) / 60_000)
}

/**
 * La próxima hora pico en el país de la cuenta, con al menos 20 min de margen
 * (Facebook pide 10 y la subida tarda): hoy si aún llega, si no mañana.
 */
export function proximaHoraPico(idioma: IdiomaCuenta, ahora = new Date()): Date {
  for (let dias = 0; dias < 3; dias++) {
    const base = new Date(ahora.getTime() + dias * 86_400_000)
    const p = Object.fromEntries(
      new Intl.DateTimeFormat('en-US', { timeZone: idioma.zona, year: 'numeric', month: 'numeric', day: 'numeric' })
        .formatToParts(base)
        .map((x) => [x.type, Number(x.value)]),
    )
    const local = Date.UTC(p.year, p.month - 1, p.day, idioma.horaPico, 0)
    const cuando = new Date(local - desfaseMin(idioma.zona, new Date(local)) * 60_000)
    if (cuando.getTime() - ahora.getTime() >= 20 * 60_000) return cuando
  }
  return new Date(ahora.getTime() + 86_400_000)
}
