/**
 * Genera los textos de la ficha de Microsoft Store para los 16 idiomas, a partir
 * de los catálogos de la web (`web/i18n/paginas/<id>.mjs`) — la misma fuente que
 * la ficha del App Store, así que no hay nada nuevo que traducir.
 * Salida: `marketing/tienda/msstore/textos/<id>.json`.
 *
 *   node marketing/tienda/generador/ficha-msstore.mjs
 *
 * Diferencias con `ficha-appstore.mjs`, que son las que justifican un generador
 * aparte y no un parámetro:
 *
 * - **El precio SÍ se puede nombrar.** Apple prohíbe importes en la ficha; la
 *   Store no. Por eso aquí no se pasa nada por `sinPrecio()` y el bloque del
 *   precio entra entero.
 * - **Las características son un campo propio** («Product features»): hasta 20
 *   viñetas de 200 caracteres que la Store pinta en su sección «Características».
 *   En Apple iban embutidas dentro de la descripción.
 * - Los límites son otros: descripción 10 000 (contra 4 000) y descripción corta
 *   1 000, aunque la Store solo enseña los primeros 270 sin desplegar — el aviso
 *   `>270` de la tabla es eso, no un error.
 * - No hay campo de palabras clave: la Store indexa la descripción.
 */
import { writeFile, mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const AQUI = dirname(fileURLToPath(import.meta.url))
const RAIZ = join(AQUI, '..', '..', '..')
const SALIDA = join(RAIZ, 'marketing', 'tienda', 'msstore', 'textos')

const IDIOMAS = ['es', 'en', 'pt', 'fr', 'de', 'it', 'ja', 'zh', 'ko', 'ru', 'hi', 'tr', 'id', 'pl', 'nl', 'ar']

/**
 * Código de idioma de Partner Center. Son los MISMOS que declara el paquete en
 * `electron-builder.yml` (appx.languages): la Store saca de ahí los idiomas que
 * ofrece la ficha, así que las dos listas tienen que cuadrar.
 */
const LOCALE = {
  es: 'es-mx',
  en: 'en-us',
  pt: 'pt-br',
  fr: 'fr-fr',
  de: 'de-de',
  it: 'it-it',
  ja: 'ja-jp',
  zh: 'zh-cn',
  ko: 'ko-kr',
  ru: 'ru-ru',
  hi: 'hi-in',
  tr: 'tr-tr',
  id: 'id-id',
  pl: 'pl-pl',
  nl: 'nl-nl',
  ar: 'ar-sa',
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

/** Tope de la Store por viñeta de «Product features». */
const TOPE_CARAC = 200

/**
 * «Título: explicación» dentro del tope. Las cartas de la web se escribieron
 * para leerse en una tarjeta, no en una viñeta, y en los idiomas largos
 * (fr/de/nl) se pasan. Se recorta por FRASES, quedándose con las que quepan:
 * cortar a mitad de palabra dejaría la viñeta manca. El punto latino solo
 * cuenta si le sigue espacio, o partiría cifras como «8.89».
 */
function vineta(titulo, desc) {
  const entera = `${titulo}: ${desc}`
  if (entera.length <= TOPE_CARAC) return entera
  const hueco = TOPE_CARAC - titulo.length - 2 // el «: »
  // El título ya llena la viñeta: lo que quepa detrás no diría nada.
  if (hueco < 24) return titulo

  const frases = desc.match(/[\s\S]*?(?:[.](?=\s|$)|[。！？।!?]|$)/g) || []
  let corto = ''
  for (const f of frases) {
    if (!f.trim()) continue
    const intento = corto ? `${corto} ${f.trim()}` : f.trim()
    if (intento.length > hueco) break
    corto = intento
  }
  if (corto) return `${titulo}: ${corto}`

  // Ni la primera frase cabe (varias cartas son UNA frase larga, y alguna se
  // pasa por cuatro caracteres): antes se tiraba la explicación entera. Se corta
  // por palabra y se marca con puntos suspensivos. En ja/zh/ko no hay espacios
  // que buscar, y ahí el corte seco es lo normal.
  const recorte = desc.slice(0, hueco - 1)
  const espacio = recorte.lastIndexOf(' ')
  const base = espacio > hueco / 2 ? recorte.slice(0, espacio) : recorte
  return `${titulo}: ${base.replace(/[\s,;:—–-]+$/, '')}…`
}

const textos = {}
for (const id of IDIOMAS) {
  const { TEXTOS: t } = await import(`../../../web/i18n/paginas/${id}.mjs`)

  // Las ocho cartas de la web, ya en el formato de viñeta que pide la Store
  // (sin el «•»: lo pinta ella, y añadirlo saldría duplicado).
  const caracteristicas = ['car.todo', 'car.nocaduca', 'car.1', 'car.2', 'car.3', 'car.4', 'car.5', 'car.6'].map((k) =>
    vineta(plano(t[`${k}.t`]), plano(t[`${k}.p`])),
  )

  const descripcion = [
    plano(t['meta.desc']),
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
    plano(t['ia.h2']).toUpperCase(),
    '',
    plano(t['ia.sub']),
    '',
    `${plano(t['ia.local.t'])}: ${plano(t['ia.local.p'])}`,
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
    // El nombre NO se traduce: es el que la tienda reservó y el que lleva la app
    // instalada en los 16 idiomas.
    nombre: 'Mind Planner Home',
    // La Store no tiene «subtítulo»: su descripción corta hace ese papel, y sale
    // del mismo texto de portada que el subtítulo de Apple.
    descripcionCorta: plano(t['og.desc']),
    descripcion,
    caracteristicas,
    // «What's new»: vacío a propósito en el primer envío, como pide la Store.
    novedades: '',
    soporte: `https://mindplannerhome.com/${id === 'es' ? '' : id + '/'}soporte`,
    privacidad: `https://mindplannerhome.com/${id === 'es' ? '' : id + '/'}privacidad`,
  }
}

await mkdir(SALIDA, { recursive: true })
for (const [id, v] of Object.entries(textos)) {
  await writeFile(join(SALIDA, `${id}.json`), JSON.stringify(v, null, 2) + '\n', 'utf8')
}

// Tabla de control con los límites de Partner Center.
const LIM = { nombre: 256, descripcionCorta: 1000, descripcion: 10000, caracteristica: 200 }
console.log('id  locale  corta  desc   carac.  la más larga')
for (const [id, v] of Object.entries(textos)) {
  const larga = Math.max(...v.caracteristicas.map((c) => c.length))
  const marca = (n, lim, suf = '') => (n > lim ? `${n}!!` : `${n}${suf}`)
  console.log(
    id.padEnd(4),
    v.locale.padEnd(7),
    // Aviso, no error: la Store enseña 270 y esconde el resto tras un enlace.
    marca(v.descripcionCorta.length, LIM.descripcionCorta, v.descripcionCorta.length > 270 ? '>270' : '').padStart(6),
    marca(v.descripcion.length, LIM.descripcion).padStart(6),
    String(v.caracteristicas.length).padStart(5),
    marca(larga, LIM.caracteristica).padStart(8),
  )
}
console.log(`\n${Object.keys(textos).length} fichas en ${SALIDA}`)
