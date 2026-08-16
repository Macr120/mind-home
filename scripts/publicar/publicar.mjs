/**
 * Orquestador del día D: publica las versiones del video en Facebook e
 * Instagram por la Graph API (YouTube y TikTok van a mano: ver marketing/README.md).
 *
 *   node scripts/publicar/publicar.mjs lanzamiento                  ← dry-run (tabla)
 *   node scripts/publicar/publicar.mjs lanzamiento --publicar       ← publica de verdad
 *     [--plataforma=ig,fb] [--idiomas=es,en,pt] [--espera=25]
 *
 * Reglas: SIEMPRE dry-run salvo `--publicar`; con `--publicar` pide confirmación
 * del lote en la terminal; espacia los idiomas (25 min por defecto) para no
 * disparar el anti-spam; y anota lo publicado en marketing/publicaciones.log.json
 * para poder reanudar sin duplicar.
 */
import { createInterface } from 'node:readline/promises'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { RAIZ, requiere } from './entorno.mjs'
import { publicarReelIG, publicarVideoFB } from './meta.mjs'
import { IDIOMAS_DESTINO } from '../video/voces.mjs'

const args = process.argv.slice(2)
const [slug] = args
if (!slug || slug.startsWith('--')) {
  console.error('uso: publicar.mjs <slug> [--publicar] [--plataforma=ig,fb] [--idiomas=…] [--espera=25]')
  process.exit(1)
}
const opcion = (n, def) => args.find((a) => a.startsWith(`--${n}=`))?.split('=')[1] ?? def
const EN_SERIO = args.includes('--publicar')
const plataformas = opcion('plataforma', 'ig,fb').split(',')
const idiomas = opcion('idiomas', ['es', ...IDIOMAS_DESTINO].join(',')).split(',')
const esperaMin = Number(opcion('espera', '25'))

const DIR = path.join(RAIZ, 'marketing', 'video', slug)
const LOG = path.join(RAIZ, 'marketing', 'publicaciones.log.json')
const log = existsSync(LOG) ? JSON.parse(readFileSync(LOG, 'utf8')) : {}
const yaPublicado = (plat, id) => log[slug]?.[plat]?.[id]
const anotar = (plat, id, resultado) => {
  ;((log[slug] ??= {})[plat] ??= {})[id] = { id: resultado, fecha: new Date().toISOString() }
  writeFileSync(LOG, JSON.stringify(log, null, 2) + '\n', 'utf8')
}

/** Caption final: el texto de la plataforma + los hashtags del idioma. */
function captionDe(meta, plataforma) {
  const base =
    plataforma === 'ig'
      ? meta.porPlataforma?.instagram?.caption
      : meta.porPlataforma?.facebook?.texto
  const etiquetas = (meta.hashtags ?? []).map((h) => `#${h.replace(/^#/, '')}`).join(' ')
  return [base || meta.descripcion, etiquetas].filter(Boolean).join('\n\n')
}

// ─── Armar el lote (y avisar de lo que falte) ───────────────────────────────
const lote = []
for (const id of idiomas) {
  const video = path.join(DIR, 'salida', `${id}.mp4`)
  const rutaMeta = path.join(DIR, id === 'es' ? 'meta.es.json' : `meta.${id}.json`)
  if (!existsSync(video) || !existsSync(rutaMeta)) {
    console.warn(`— ${id}: falta ${!existsSync(video) ? `salida/${id}.mp4` : path.basename(rutaMeta)}, se omite`)
    continue
  }
  const meta = JSON.parse(readFileSync(rutaMeta, 'utf8'))
  for (const plat of plataformas) {
    if (yaPublicado(plat, id)) continue
    lote.push({ plat, id, video, caption: captionDe(meta, plat) })
  }
}

if (!lote.length) {
  console.log('Nada pendiente (¿ya está todo en marketing/publicaciones.log.json?).')
  process.exit(0)
}
console.log(`\nLote de ${lote.length} publicaciones (${EN_SERIO ? 'REAL' : 'dry-run'}), espera ${esperaMin} min entre idiomas:\n`)
for (const p of lote) console.log(`  ${p.plat.toUpperCase().padEnd(3)} ${p.id.padEnd(3)} ${p.caption.split('\n')[0].slice(0, 70)}`)
if (plataformas.some((p) => p !== 'ig' && p !== 'fb')) {
  console.log('\nOJO: YouTube y TikTok no van por aquí el día D (subida manual, ver marketing/README.md).')
}
if (!EN_SERIO) {
  console.log('\nDry-run. Añade --publicar para publicar de verdad.')
  process.exit(0)
}

// ─── Confirmación explícita y publicación espaciada ─────────────────────────
const rl = createInterface({ input: process.stdin, output: process.stdout })
const respuesta = await rl.question('\n¿Publicar este lote? (escribe "si") ')
rl.close()
if (respuesta.trim().toLowerCase() !== 'si') {
  console.log('Cancelado.')
  process.exit(0)
}

const pageId = requiere('META_PAGE_ID')
const token = requiere('META_PAGE_TOKEN')
const igId = plataformas.includes('ig') ? requiere('META_IG_ID') : null
const baseUrl = plataformas.includes('ig') ? requiere('VIDEO_BASE_URL').replace(/\/$/, '') : null

let idiomaAnterior = null
for (const p of lote) {
  if (idiomaAnterior && p.id !== idiomaAnterior) {
    console.log(`… esperando ${esperaMin} min (anti-spam) antes de ${p.id}`)
    await new Promise((r) => setTimeout(r, esperaMin * 60_000))
  }
  idiomaAnterior = p.id
  try {
    const resultado =
      p.plat === 'ig'
        ? await publicarReelIG({ igId, token, videoUrl: `${baseUrl}/${p.id}.mp4`, caption: p.caption })
        : await publicarVideoFB({ pageId, token, ruta: p.video, descripcion: p.caption })
    anotar(p.plat, p.id, resultado)
    console.log(`✓ ${p.plat} ${p.id} → ${resultado}`)
  } catch (e) {
    console.error(`✗ ${p.plat} ${p.id}: ${e.message} (el lote sigue; reintenta luego, el log evita duplicados)`)
  }
}
console.log('\nLote terminado. Lo publicado quedó en marketing/publicaciones.log.json.')
