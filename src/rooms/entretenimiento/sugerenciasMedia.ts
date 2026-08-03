import type { TipoMedia } from '../../core/data/db'

/**
 * Sugerencias de títulos mientras escribes, para elegir la obra correcta de
 * una lista en vez de teclearla entera. Mismas fuentes gratuitas y sin clave
 * que las portadas: Open Library para libros y la Wikipedia en inglés para
 * todo lo demás (es la que sí tiene pósters y encuentra igual los títulos en
 * español).
 */

async function fetchJson(url: string, signal: AbortSignal): Promise<unknown> {
  const res = await fetch(url, { signal })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

/** Palabra que orienta la búsqueda en Wikipedia según el tipo de obra. */
const SUFIJO: Record<TipoMedia, string> = {
  pelicula: 'film',
  serie: 'TV series',
  libro: 'novel',
  videojuego: 'video game',
}

export interface SugerenciaMedia {
  /** Título que se copiará al formulario. */
  titulo: string
  /** Línea de apoyo: descripción del artículo, o autor y año. */
  detalle: string
  /** Miniatura para la lista. */
  miniatura?: string
  /** Portada ya resuelta (Open Library la da directa). */
  portada?: string
  /** Artículo de Wikipedia: fija la obra para la portada y para la IA. */
  wiki?: string
  autor?: string
}

async function sugerenciasLibro(texto: string, signal: AbortSignal): Promise<SugerenciaMedia[]> {
  const q = new URLSearchParams({
    q: texto,
    limit: '6',
    fields: 'title,author_name,first_publish_year,cover_i',
  })
  const data = (await fetchJson(`https://openlibrary.org/search.json?${q}`, signal)) as {
    docs?: { title?: string; author_name?: string[]; first_publish_year?: number; cover_i?: number }[]
  }
  return (data.docs ?? [])
    .filter((d) => d.title)
    .map((d) => ({
      titulo: d.title as string,
      detalle: [d.author_name?.[0], d.first_publish_year].filter(Boolean).join(' · '),
      miniatura: d.cover_i ? `https://covers.openlibrary.org/b/id/${d.cover_i}-S.jpg` : undefined,
      portada: d.cover_i ? `https://covers.openlibrary.org/b/id/${d.cover_i}-M.jpg` : undefined,
      autor: d.author_name?.[0],
    }))
}

async function sugerenciasWiki(
  tipo: TipoMedia,
  texto: string,
  signal: AbortSignal,
): Promise<SugerenciaMedia[]> {
  const data = (await fetchJson(
    `https://en.wikipedia.org/w/rest.php/v1/search/page?q=${encodeURIComponent(`${texto} ${SUFIJO[tipo]}`)}&limit=8`,
    signal,
  )) as { pages?: { key?: string; title?: string; description?: string; thumbnail?: { url?: string } }[] }
  return (data.pages ?? [])
    // Las listas y anexos no son obras: solo estorban en el desplegable.
    .filter((p) => p.title && !/^(List|Lists|Outline|Index) of /.test(p.title))
    .slice(0, 6)
    .map((p) => ({
      titulo: (p.title as string).replace(/\s*\((film|TV series|video game|novel)\)$/i, ''),
      detalle: p.description ?? '',
      // El buscador devuelve la URL sin protocolo.
      miniatura: p.thumbnail?.url ? `https:${p.thumbnail.url}` : undefined,
      wiki: p.key,
    }))
}

/** Sugerencias para lo tecleado. Devuelve [] si la fuente falla o se cancela. */
export async function buscarSugerencias(
  tipo: TipoMedia,
  texto: string,
  signal: AbortSignal,
): Promise<SugerenciaMedia[]> {
  try {
    return tipo === 'libro'
      ? await sugerenciasLibro(texto, signal)
      : await sugerenciasWiki(tipo, texto, signal)
  } catch {
    return []
  }
}
