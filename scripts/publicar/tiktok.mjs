/**
 * TikTok Content Posting API — PARA EL FUTURO: sin el audit de la app, TikTok
 * fuerza los posts a SELF_ONLY (solo los ve el propio usuario), así que el día D
 * la subida es manual en tiktok.com/upload. Cuando el audit esté aprobado, este
 * script publica directo (Direct Post con FILE_UPLOAD).
 *
 *   node scripts/publicar/tiktok.mjs subir <slug> <idioma>
 *
 * Requiere TIKTOK_ACCESS_TOKEN (Login Kit con scope video.publish) en
 * .env.marketing.
 */
import { readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import { RAIZ, requiere } from './entorno.mjs'

const API = 'https://open.tiktokapis.com/v2'
const [orden, slug, idioma] = process.argv.slice(2)

if (orden !== 'subir' || !slug || !idioma) {
  console.error('uso: tiktok.mjs subir <slug> <idioma>')
  process.exit(1)
}

const token = requiere('TIKTOK_ACCESS_TOKEN')
const DIR = path.join(RAIZ, 'marketing', 'video', slug)
const ruta = path.join(DIR, 'salida', `${idioma}.mp4`)
const meta = JSON.parse(readFileSync(path.join(DIR, `meta.${idioma}.json`), 'utf8'))
const caption = meta.porPlataforma?.tiktok?.caption || meta.descripcion
const tam = statSync(ruta).size

// 1) Iniciar el post (un solo chunk: los Shorts pesan mucho menos de 64 MB).
const inicio = await fetch(`${API}/post/publish/video/init/`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({
    post_info: { title: caption, privacy_level: 'PUBLIC_TO_EVERYONE' },
    source_info: { source: 'FILE_UPLOAD', video_size: tam, chunk_size: tam, total_chunk_count: 1 },
  }),
}).then((r) => r.json())
if (inicio.error?.code !== 'ok') {
  console.error(`TikTok init: ${inicio.error?.message ?? JSON.stringify(inicio)}`)
  process.exit(1)
}

// 2) Subir el archivo.
const subida = await fetch(inicio.data.upload_url, {
  method: 'PUT',
  headers: {
    'Content-Type': 'video/mp4',
    'Content-Range': `bytes 0-${tam - 1}/${tam}`,
  },
  body: readFileSync(ruta),
})
if (!subida.ok) {
  console.error(`TikTok upload: HTTP ${subida.status}`)
  process.exit(1)
}

// 3) Esperar el estado final.
for (let i = 0; i < 30; i++) {
  await new Promise((r) => setTimeout(r, 5000))
  const estado = await fetch(`${API}/post/publish/status/fetch/`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ publish_id: inicio.data.publish_id }),
  }).then((r) => r.json())
  const s = estado.data?.status
  if (s === 'PUBLISH_COMPLETE') {
    console.log(`✓ publicado (${inicio.data.publish_id})`)
    process.exit(0)
  }
  if (s === 'FAILED') {
    console.error(`✗ falló: ${estado.data?.fail_reason}`)
    process.exit(1)
  }
}
console.error('✗ sin estado final tras 150 s; revisa en la app')
process.exit(1)
