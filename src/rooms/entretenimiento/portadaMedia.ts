import type { MediaArchivo, TipoMedia } from '../../core/data/db'

/**
 * Carátula REAL de una obra, sin IA ni claves de API: Wikipedia en inglés (la
 * española no admite pósters con copyright, así que casi nunca los tiene) y
 * Open Library para los libros. Se guarda solo la URL, como las imágenes de
 * las efemérides del Diario; si no aparece nada, la tarjeta se queda con su
 * emoji.
 */

async function fetchJson(url: string, ms = 8_000): Promise<unknown> {
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

/** Palabra que desambigua el título al buscar en Wikipedia. */
const SUFIJO: Record<TipoMedia, string> = {
  pelicula: 'film',
  serie: 'TV series',
  libro: 'novel',
  videojuego: 'video game',
}

/** Miniatura del artículo de Wikipedia en inglés, por título exacto. */
export async function imagenArticulo(titulo: string): Promise<string | undefined> {
  const data = (await fetchJson(
    `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(titulo.replace(/ /g, '_'))}`,
  )) as { thumbnail?: { source?: string } }
  return data.thumbnail?.source
}

/**
 * Título del artículo que mejor encaja. El primer resultado del buscador suele
 * ser la entrega más famosa de la saga («Zelda» → la última), así que primero
 * se busca uno cuyo título contenga el de la obra.
 */
async function buscarArticulo(titulo: string, consulta: string): Promise<string | undefined> {
  const data = (await fetchJson(
    `https://en.wikipedia.org/w/rest.php/v1/search/page?q=${encodeURIComponent(consulta)}&limit=5`,
  )) as { pages?: { key?: string; title?: string }[] }
  const pages = data.pages ?? []
  const buscado = titulo.trim().toLowerCase()
  const exacto = pages.find((p) => (p.title ?? '').toLowerCase().includes(buscado))
  return (exacto ?? pages[0])?.key
}

/** Portada de un libro en Open Library (cubre mucho más que Wikipedia). */
async function portadaOpenLibrary(titulo: string, autor?: string): Promise<string | undefined> {
  const q = new URLSearchParams({ title: titulo, limit: '1', fields: 'cover_i' })
  if (autor) q.set('author', autor)
  const data = (await fetchJson(`https://openlibrary.org/search.json?${q}`)) as {
    docs?: { cover_i?: number }[]
  }
  const id = data.docs?.[0]?.cover_i
  return id ? `https://covers.openlibrary.org/b/id/${id}-M.jpg` : undefined
}

/**
 * Busca la carátula probando las vías por fiabilidad. Devuelve undefined si
 * ninguna da resultado (una vía caída no cancela las demás).
 */
export async function buscarPortada(
  item: Pick<MediaArchivo, 'tipo' | 'titulo' | 'autor' | 'resumen'>,
): Promise<string | undefined> {
  const vias: (() => Promise<string | undefined>)[] = []

  if (item.tipo === 'libro') vias.push(() => portadaOpenLibrary(item.titulo, item.autor))
  // El título de artículo que devolvió la IA al resumir es el más fiable.
  const wiki = item.resumen?.wiki
  if (wiki) vias.push(() => imagenArticulo(wiki))
  vias.push(async () => {
    const key = await buscarArticulo(item.titulo, `${item.titulo} ${SUFIJO[item.tipo]}`)
    return key ? imagenArticulo(key) : undefined
  })

  for (const via of vias) {
    try {
      const url = await via()
      if (url) return url
    } catch {
      // vía caída o sin red: se prueba la siguiente
    }
  }
  return undefined
}
