import type { CategoriaTitular, Titular } from '../../core/data/db'
import type { Idioma } from '../../core/state/ajustesStore'
import { diaDelAnio } from '../../core/fechaLocal'
import { enIdioma, type PorIdioma } from '../../core/i18n/porIdioma'
import { CATEGORIAS } from './constantes'

/**
 * Medios del periódico, por idioma y categoría. Cada edición mezcla varios:
 * de cada categoría entra un medio distinto según el día (rotan), así los
 * titulares no salen siempre de la misma cabecera.
 *
 * La mayoría de feeds se piden directo porque responden con CORS abierto. Los
 * marcados `proxy` no lo hacen y hay que pasarlos por rss2json, que corta las
 * peticiones seguidas: por eso solo entran unos pocos por edición.
 */
interface Medio {
  nombre: string
  categoria: CategoriaTitular
  url: string
  proxy?: boolean
}

const EL_PAIS = (seccion: string) =>
  `https://feeds.elpais.com/mrss-s/pages/ep/site/elpais.com/section/${seccion}/portada`
const AS = (seccion = '') =>
  `https://feeds.as.com/mrss-s/pages/as/site/as.com/${seccion ? `section/${seccion}/` : ''}portada`
const NYT = (seccion: string) => `https://rss.nytimes.com/services/xml/rss/nyt/${seccion}.xml`
const WIRED = (seccion = '') =>
  seccion ? `https://www.wired.com/feed/category/${seccion}/latest/rss` : 'https://www.wired.com/feed/rss'
const CBS_SPORTS = (seccion = '') => `https://www.cbssports.com/rss/headlines/${seccion}`
const BBC = (seccion: string) => `https://feeds.bbci.co.uk/${seccion}/rss.xml`
const GUARDIAN = (seccion: string) => `https://www.theguardian.com/${seccion}/rss`
const EL_MUNDO = (seccion: string) => `https://e00-elmundo.uecdn.es/elmundo/rss/${seccion}.xml`

const MEDIOS_ES: Medio[] = [
  { nombre: 'El País', categoria: 'mundo', url: EL_PAIS('internacional') },
  { nombre: 'El País América', categoria: 'mundo', url: EL_PAIS('america') },
  { nombre: 'El País México', categoria: 'mundo', url: EL_PAIS('mexico') },
  { nombre: 'RTVE', categoria: 'mundo', url: 'https://api2.rtve.es/rss/temas_noticias.xml' },
  { nombre: 'BBC Mundo', categoria: 'mundo', url: 'https://feeds.bbci.co.uk/mundo/rss.xml', proxy: true },
  { nombre: 'elDiario.es', categoria: 'mundo', url: 'https://www.eldiario.es/rss/', proxy: true },
  { nombre: '20minutos', categoria: 'mundo', url: 'https://www.20minutos.es/rss/', proxy: true },
  { nombre: 'France 24', categoria: 'mundo', url: 'https://www.france24.com/es/rss', proxy: true },
  { nombre: 'El Mundo', categoria: 'mundo', url: EL_MUNDO('internacional'), proxy: true },

  { nombre: 'El País Economía', categoria: 'economia', url: EL_PAIS('economia') },
  { nombre: 'Expansión', categoria: 'economia', url: 'https://e00-expansion.uecdn.es/rss/portada.xml', proxy: true },
  { nombre: 'El Confidencial', categoria: 'economia', url: 'https://rss.elconfidencial.com/mercados/', proxy: true },
  { nombre: 'El Mundo Economía', categoria: 'economia', url: EL_MUNDO('economia'), proxy: true },

  { nombre: 'El País Tecnología', categoria: 'tecnologia', url: EL_PAIS('tecnologia') },
  { nombre: 'Xataka', categoria: 'tecnologia', url: 'https://www.xataka.com/index.xml', proxy: true },
  { nombre: 'Hipertextual', categoria: 'tecnologia', url: 'https://hipertextual.com/feed', proxy: true },
  { nombre: 'Genbeta', categoria: 'tecnologia', url: 'https://www.genbeta.com/index.xml', proxy: true },

  { nombre: 'El País Salud', categoria: 'salud', url: EL_PAIS('salud-y-bienestar') },
  { nombre: 'El País Ciencia', categoria: 'salud', url: EL_PAIS('ciencia') },
  {
    nombre: 'National Geographic',
    categoria: 'salud',
    url: 'https://www.nationalgeographic.com.es/feeds/rss.html',
  },
  { nombre: 'El Mundo Ciencia', categoria: 'salud', url: EL_MUNDO('ciencia'), proxy: true },

  { nombre: 'El País Deportes', categoria: 'deportes', url: EL_PAIS('deportes') },
  { nombre: 'Diario AS', categoria: 'deportes', url: AS() },
  { nombre: 'AS Fútbol', categoria: 'deportes', url: AS('futbol') },
  { nombre: 'Marca', categoria: 'deportes', url: 'https://e00-marca.uecdn.es/rss/portada.xml', proxy: true },

  { nombre: 'El País Cultura', categoria: 'entretenimiento', url: EL_PAIS('cultura') },
  { nombre: 'El País Televisión', categoria: 'entretenimiento', url: EL_PAIS('television') },
  { nombre: 'El País Gente', categoria: 'entretenimiento', url: EL_PAIS('gente') },
  { nombre: 'El País Semanal', categoria: 'entretenimiento', url: EL_PAIS('eps') },
  { nombre: 'Espinof', categoria: 'entretenimiento', url: 'https://www.espinof.com/index.xml', proxy: true },
  { nombre: 'El Mundo Cultura', categoria: 'entretenimiento', url: EL_MUNDO('cultura'), proxy: true },
]

const MEDIOS_EN: Medio[] = [
  { nombre: 'The New York Times', categoria: 'mundo', url: NYT('World') },
  { nombre: 'NYT Europe', categoria: 'mundo', url: NYT('Europe') },
  { nombre: 'The Atlantic', categoria: 'mundo', url: 'https://www.theatlantic.com/feed/all/' },
  { nombre: 'NYT Climate', categoria: 'mundo', url: NYT('Climate') },
  { nombre: 'BBC News', categoria: 'mundo', url: BBC('news/world'), proxy: true },
  { nombre: 'The Guardian', categoria: 'mundo', url: GUARDIAN('world'), proxy: true },
  { nombre: 'NPR', categoria: 'mundo', url: 'https://feeds.npr.org/1004/rss.xml', proxy: true },

  { nombre: 'The New York Times', categoria: 'economia', url: NYT('Business') },
  { nombre: 'WIRED Business', categoria: 'economia', url: WIRED('business') },
  { nombre: 'BBC Business', categoria: 'economia', url: BBC('news/business'), proxy: true },
  { nombre: 'The Guardian', categoria: 'economia', url: GUARDIAN('business'), proxy: true },

  { nombre: 'The New York Times', categoria: 'tecnologia', url: NYT('Technology') },
  { nombre: 'WIRED', categoria: 'tecnologia', url: WIRED() },
  { nombre: 'WIRED Gear', categoria: 'tecnologia', url: WIRED('gear') },
  { nombre: 'BBC Technology', categoria: 'tecnologia', url: BBC('news/technology'), proxy: true },
  { nombre: 'The Verge', categoria: 'tecnologia', url: 'https://www.theverge.com/rss/index.xml', proxy: true },
  { nombre: 'Ars Technica', categoria: 'tecnologia', url: 'https://feeds.arstechnica.com/arstechnica/index', proxy: true },

  { nombre: 'The New York Times', categoria: 'salud', url: NYT('Health') },
  { nombre: 'NYT Science', categoria: 'salud', url: NYT('Science') },
  { nombre: 'WIRED Science', categoria: 'salud', url: WIRED('science') },
  { nombre: 'BBC Health', categoria: 'salud', url: BBC('news/health'), proxy: true },
  { nombre: 'The Guardian', categoria: 'salud', url: GUARDIAN('society/health'), proxy: true },

  { nombre: 'CBS Sports', categoria: 'deportes', url: CBS_SPORTS() },
  { nombre: 'CBS Sports NBA', categoria: 'deportes', url: CBS_SPORTS('nba/') },
  { nombre: 'CBS Sports NFL', categoria: 'deportes', url: CBS_SPORTS('nfl/') },
  { nombre: 'BBC Sport', categoria: 'deportes', url: BBC('sport'), proxy: true },
  { nombre: 'The Guardian', categoria: 'deportes', url: GUARDIAN('sport'), proxy: true },

  { nombre: 'The New York Times', categoria: 'entretenimiento', url: NYT('Arts') },
  { nombre: 'NYT Movies', categoria: 'entretenimiento', url: NYT('Movies') },
  { nombre: 'NYT Music', categoria: 'entretenimiento', url: NYT('Music') },
  { nombre: 'Pitchfork', categoria: 'entretenimiento', url: 'https://pitchfork.com/feed/feed-news/rss' },
  { nombre: 'WIRED Culture', categoria: 'entretenimiento', url: WIRED('culture') },
  { nombre: 'BBC Entertainment', categoria: 'entretenimiento', url: BBC('news/entertainment_and_arts'), proxy: true },
  { nombre: 'The Guardian', categoria: 'entretenimiento', url: GUARDIAN('culture'), proxy: true },
  { nombre: 'Variety', categoria: 'entretenimiento', url: 'https://variety.com/feed/', proxy: true },
]

/**
 * Las cabeceras por idioma. Traducir aquí no serviría de nada: un lector en
 * francés quiere prensa francesa, no El País en francés, así que cada idioma
 * trae sus propios medios. El que no tenga lista lee el periódico español.
 */
const MEDIOS: PorIdioma<Medio[]> = {
  es: MEDIOS_ES,
  en: MEDIOS_EN,
}

/** Titulares que se toman de cada medio. */
const POR_MEDIO = 3
/** Medios de refuerzo que pasan por el proxy en cada edición (su cuota es corta). */
const REFUERZOS = 3

type ItemRss = {
  title?: string
  description?: string
  content?: string
  link?: string
  pubDate?: string
  thumbnail?: string
  enclosure?: { link?: string; type?: string; thumbnail?: string }
}

type RespuestaRss = { status?: string; items?: ItemRss[] }

/** fetch JSON con timeout. */
export async function fetchJson(url: string, ms = 12_000): Promise<unknown> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), ms)
  try {
    const res = await fetch(url, { signal: ctrl.signal })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return await res.json()
  } finally {
    clearTimeout(timer)
  }
}

function textoPlano(html: string): string {
  const limpio = html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim()
  return limpio.length > 300 ? `${limpio.slice(0, 297)}…` : limpio
}

const ES_IMAGEN = /\.(jpe?g|png|webp|gif)(\?|$)/i

const imagenEnHtml = (html: string) => html.match(/<img[^>]+src="([^"]+)"/i)?.[1]

/** Imagen de un item de rss2json: enclosure (si es imagen) → thumbnail → <img> del contenido. */
function imagenDeItem(item: ItemRss): string | undefined {
  const enc = item.enclosure
  if (enc?.link && (enc.type?.startsWith('image') || ES_IMAGEN.test(enc.link))) return enc.link
  if (enc?.thumbnail) return enc.thumbnail
  if (item.thumbnail) return item.thumbnail
  return imagenEnHtml(item.content ?? item.description ?? '')
}

const texto = (nodo: Element, tag: string) =>
  nodo.getElementsByTagName(tag)[0]?.textContent?.trim() ?? ''

/**
 * Imagen de un <item> del XML: los feeds la publican en media:content,
 * media:thumbnail o enclosure; si no, se rescata la primera <img> del cuerpo.
 */
function imagenDeNodo(nodo: Element): string | undefined {
  for (const tag of ['media:content', 'media:thumbnail', 'enclosure']) {
    // Varios tamaños de la misma foto: se prefiere el más ancho.
    const candidatos = [...nodo.getElementsByTagName(tag)]
      .filter((el) => {
        if (!el.getAttribute('url')) return false
        // Muchos feeds no declaran el tipo; solo se descarta lo que dice no ser imagen.
        const tipo = el.getAttribute('type') ?? el.getAttribute('medium') ?? ''
        if (tipo && !tipo.startsWith('image')) return false
        // Las miniaturas (Yahoo publica de 130 px) se ven borrosas de portada.
        const ancho = Number(el.getAttribute('width'))
        return !ancho || ancho >= 300
      })
      .sort((a, b) => Number(b.getAttribute('width') ?? 0) - Number(a.getAttribute('width') ?? 0))
    const url = candidatos[0]?.getAttribute('url')
    if (url) return url
  }
  return imagenEnHtml(
    nodo.getElementsByTagName('content:encoded')[0]?.textContent ?? texto(nodo, 'description'),
  )
}

/** Convierte el XML de un feed (RSS o Atom) en titulares de la categoría del medio. */
function parsearFeed(xml: string, medio: Medio): Titular[] {
  const doc = new DOMParser().parseFromString(xml, 'application/xml')
  if (doc.getElementsByTagName('parsererror').length) throw new Error('XML inválido')

  const nodos = [...doc.getElementsByTagName('item'), ...doc.getElementsByTagName('entry')]
  const titulares: Titular[] = []
  for (const nodo of nodos) {
    const titulo = texto(nodo, 'title')
    // Atom pone la URL en el atributo href de <link>.
    const url = texto(nodo, 'link') || (nodo.getElementsByTagName('link')[0]?.getAttribute('href') ?? '')
    if (!titulo || !url) continue
    titulares.push({
      categoria: medio.categoria,
      titulo,
      resumen: textoPlano(texto(nodo, 'description') || texto(nodo, 'summary')),
      fuente: medio.nombre,
      url,
      imagen: imagenDeNodo(nodo),
      publicado: texto(nodo, 'pubDate') || texto(nodo, 'published') || texto(nodo, 'updated'),
    })
    if (titulares.length >= POR_MEDIO) break
  }
  if (!titulares.length) throw new Error('feed vacío')
  return titulares
}

/** Feed de un medio: directo si permite CORS, por rss2json si no. */
async function cargarMedio(medio: Medio): Promise<Titular[]> {
  if (medio.proxy) {
    const data = (await fetchJson(
      `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(medio.url)}`,
    )) as RespuestaRss
    if (data.status !== 'ok' || !data.items?.length) throw new Error('feed vacío')
    return data.items
      .filter((i) => i.title?.trim() && i.link?.trim())
      .slice(0, POR_MEDIO)
      .map((i) => ({
        categoria: medio.categoria,
        titulo: i.title!.trim(),
        resumen: textoPlano(i.description ?? ''),
        fuente: medio.nombre,
        url: i.link!.trim(),
        imagen: imagenDeItem(i),
        publicado: i.pubDate ?? '',
      }))
  }

  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 12_000)
  try {
    const res = await fetch(medio.url, { signal: ctrl.signal })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return parsearFeed(await res.text(), medio)
  } finally {
    clearTimeout(timer)
  }
}

/** Toma `n` elementos de la lista empezando en el día (rotación diaria). */
function rotar<T>(lista: T[], dia: number, n: number): T[] {
  if (!lista.length) return []
  return Array.from({ length: Math.min(n, lista.length) }, (_, i) => lista[(dia + i) % lista.length])
}

/**
 * Titulares del día: un medio directo por categoría (rotando cuál) más unos
 * refuerzos vía proxy de otras cabeceras. Lo que falle se omite.
 */
export async function cargarTitulares(fecha: string, idioma: Idioma): Promise<Titular[]> {
  const dia = diaDelAnio(fecha)
  const medios = enIdioma(MEDIOS, idioma)

  // El desfase por categoría evita que todas caigan en el mismo índice y la
  // edición salga entera de la misma cabecera.
  const elegidos = CATEGORIAS.flatMap((c, i) =>
    rotar(
      medios.filter((m) => !m.proxy && m.categoria === c.id),
      dia + i,
      1,
    ),
  )
  // Los refuerzos rotan sobre la lista completa de proxy, así cada día entran
  // cabeceras distintas (y en categorías distintas).
  elegidos.push(...rotar(medios.filter((m) => m.proxy), dia * REFUERZOS, REFUERZOS))

  const cargas = await Promise.allSettled(elegidos.map(cargarMedio))
  const titulares = cargas.flatMap((r) => (r.status === 'fulfilled' ? r.value : []))

  // Se agrupan por categoría (el orden del feed) intercalando los medios que
  // coincidan en una, para que no salgan seguidos los de la misma cabecera.
  return CATEGORIAS.flatMap((c) => {
    const grupos: Titular[][] = []
    for (const t of titulares.filter((x) => x.categoria === c.id)) {
      const grupo = grupos.find((g) => g[0].fuente === t.fuente)
      if (grupo) grupo.push(t)
      else grupos.push([t])
    }
    const orden: Titular[] = []
    for (let i = 0; i < POR_MEDIO; i++) {
      for (const g of grupos) if (g[i]) orden.push(g[i])
    }
    return orden
  })
}
