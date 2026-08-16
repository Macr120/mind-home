/**
 * Publicación en Meta vía Graph API (v23.0): Reel en Instagram Business y video
 * en la página de Facebook. Funciona con la app en MODO DESARROLLO sobre los
 * activos del propio usuario (sin App Review). Lo orquesta `publicar.mjs`.
 *
 * El Reel de IG exige `video_url` PÚBLICO: servir `salida/` con `npx serve` +
 * un quick tunnel de cloudflared y poner esa URL en VIDEO_BASE_URL.
 */
import { openAsBlob } from 'node:fs'
import path from 'node:path'

const GRAPH = 'https://graph.facebook.com/v23.0'

async function graph(ruta, opciones = {}) {
  const res = await fetch(`${GRAPH}${ruta}`, opciones)
  const dato = await res.json()
  if (!res.ok || dato.error) throw new Error(`Graph ${ruta}: ${dato.error?.message ?? res.status}`)
  return dato
}

const espera = (ms) => new Promise((r) => setTimeout(r, ms))

/** Reel en IG: contenedor → poll hasta FINISHED → publish. Devuelve el media id. */
export async function publicarReelIG({ igId, token, videoUrl, caption }) {
  const cuerpo = new URLSearchParams({ media_type: 'REELS', video_url: videoUrl, caption, access_token: token })
  const { id: contenedor } = await graph(`/${igId}/media`, { method: 'POST', body: cuerpo })
  for (let i = 0; i < 60; i++) {
    await espera(5000)
    const { status_code } = await graph(`/${contenedor}?fields=status_code&access_token=${token}`)
    if (status_code === 'FINISHED') break
    if (status_code === 'ERROR') throw new Error(`IG no pudo procesar el video (${videoUrl})`)
  }
  const pub = await graph(`/${igId}/media_publish`, {
    method: 'POST',
    body: new URLSearchParams({ creation_id: contenedor, access_token: token }),
  })
  return pub.id
}

/** Video en la página de FB, subiendo el archivo local directo (multipart). */
export async function publicarVideoFB({ pageId, token, ruta, descripcion }) {
  const forma = new FormData()
  forma.set('access_token', token)
  forma.set('description', descripcion)
  forma.set('source', await openAsBlob(ruta, { type: 'video/mp4' }), path.basename(ruta))
  const { id } = await graph(`/${pageId}/videos`, { method: 'POST', body: forma })
  return id
}
