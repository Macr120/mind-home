/**
 * Buscador de previews de iTunes para el mezclador. La Search API y el host de
 * previews mandan CORS (verificado 31 ago 2026), así que todo va DIRECTO del
 * navegador a Apple, sin pasar por nuestro backend. Son muestras públicas de
 * 30 s sin DRM; solo streaming efímero — NUNCA se guardan en la biblioteca.
 * Si Apple retirara el CORS de /search, la salida sería un proxy edge function.
 */

export interface ResultadoItunes {
  id: number
  nombre: string
  artista: string
  artworkUrl: string
  previewUrl: string
}

interface PistaItunes {
  trackId?: number
  trackName?: string
  artistName?: string
  artworkUrl100?: string
  previewUrl?: string
}

export async function buscarItunes(termino: string): Promise<ResultadoItunes[]> {
  const term = encodeURIComponent(termino.trim().slice(0, 120))
  const r = await fetch(`https://itunes.apple.com/search?media=music&entity=song&limit=25&term=${term}`)
  if (!r.ok) throw new Error('itunes')
  const data = (await r.json()) as { results?: PistaItunes[] }
  return (data.results ?? [])
    .filter((x) => x.previewUrl && x.trackName)
    .map((x) => ({
      id: x.trackId ?? 0,
      nombre: x.trackName ?? '',
      artista: x.artistName ?? '',
      artworkUrl: x.artworkUrl100 ?? '',
      previewUrl: x.previewUrl ?? '',
    }))
}

export async function descargarPreview(previewUrl: string): Promise<Blob> {
  // La URL viene de la propia Search API, pero solo se aceptan hosts de Apple.
  const u = new URL(previewUrl)
  if (u.protocol !== 'https:' || !(u.hostname.endsWith('.apple.com') || u.hostname.endsWith('.mzstatic.com'))) {
    throw new Error('itunes')
  }
  const r = await fetch(previewUrl)
  if (!r.ok) throw new Error('itunes')
  return r.blob()
}
