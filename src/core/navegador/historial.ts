import { db } from '../data/db'
import { useAjustesNav } from './ajustes'
import { sitioDe } from './dominio'

/**
 * Historial por página (`historialWeb`) y ficha de cada sitio (`sitiosWeb`).
 * Una fila por URL: volver a la misma página suma `veces` y refresca `visto`.
 * La ficha del sitio nace la primera vez que se visita (sin categoría: la
 * decide el diccionario de fábrica hasta que el usuario o la IA la fijen).
 */

/** Dos avisos de la misma URL en menos de esto son la MISMA vista (pushState + replaceState). */
const REBOTE_MS = 5000

/** Anota una página vista (solo http/https; nada en modo «sin registro»). */
export async function registrarPagina(url: string, titulo?: string): Promise<void> {
  if (!/^https?:/.test(url) || useAjustesNav.getState().sinRegistro) return
  const host = sitioDe(url)
  const ahora = new Date().toISOString()
  await db.transaction('rw', db.historialWeb, async () => {
    const fila = await db.historialWeb.where('url').equals(url).first()
    if (fila?.id != null) {
      const rebote = Date.now() - Date.parse(fila.visto) < REBOTE_MS
      await db.historialWeb.update(fila.id, {
        visto: ahora,
        veces: rebote ? (fila.veces ?? 1) : (fila.veces ?? 1) + 1,
        ...(titulo && !fila.titulo ? { titulo } : {}),
      })
    } else {
      await db.historialWeb.add({ url, host, titulo: titulo || undefined, visto: ahora, veces: 1 })
    }
  })
  await asegurarSitio(host)
}

/** El título llega DESPUÉS de navegar (page-title-updated): se pone a la fila de esa URL. */
export async function ponerTituloPagina(url: string, titulo: string): Promise<void> {
  const limpio = titulo.trim()
  if (!limpio) return
  const fila = await db.historialWeb.where('url').equals(url).first()
  if (fila?.id != null && fila.titulo !== limpio) await db.historialWeb.update(fila.id, { titulo: limpio })
}

/** Ficha del sitio, creándola si no existe. Devuelve su id. */
export async function asegurarSitio(host: string): Promise<number | null> {
  const s = await db.sitiosWeb.where('host').equals(host).first()
  if (s?.id != null) return s.id
  try {
    return await db.sitiosWeb.add({ host, actualizadoEn: new Date().toISOString() })
  } catch {
    // Dos navegaciones seguidas al mismo sitio nuevo: la segunda choca con `&host`.
    const otra = await db.sitiosWeb.where('host').equals(host).first()
    return otra?.id ?? null
  }
}

/** Favicon del sitio (data URL pequeño que manda el shell); se guarda si cambió. */
export async function guardarFavicon(url: string, dataUrl: string): Promise<void> {
  if (!dataUrl.startsWith('data:image/') || dataUrl.length > 12_000) return
  const host = sitioDe(url)
  const id = await asegurarSitio(host)
  if (id == null) return
  const s = await db.sitiosWeb.get(id)
  if (s && s.favicon !== dataUrl) await db.sitiosWeb.update(id, { favicon: dataUrl, actualizadoEn: new Date().toISOString() })
}
