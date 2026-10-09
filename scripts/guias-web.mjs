/**
 * Las guías narradas, después del build de la web: una copia de cada
 * `dist-web/guias/<tema>.html` por idioma con guion, con el título, la
 * descripción, `hreflang` y el TEXTO COMPLETO ya pintado dentro de #root.
 * Así la guía se indexa (y se lee sin JS) aunque sea una isla React; al montar,
 * React la sustituye por la versión interactiva.
 *
 * También rellena la portada `/guias` (plantilla web/guias.html, ya traducida
 * por web-i18n.mjs) con una tarjeta por guía, y deja FUERA del despliegue lo
 * que no sirve la web: las láminas (solo del video) y el audio (vive en R2,
 * media.mindhaos.com; lo sube scripts/guias/subir-audio.mjs).
 *
 *   node scripts/guias-web.mjs        (lo encadena `npm run build:web`)
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { IDIOMAS, prefijo } from '../web/i18n/idiomas.mjs'

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const DIST = path.join(RAIZ, 'dist-web')
const GUIAS = path.join(RAIZ, 'marketing', 'guias')
const BASE = 'https://mindhaos.com'

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const leer = (ruta) => JSON.parse(readFileSync(ruta, 'utf8'))

const temas = readdirSync(GUIAS).filter((t) => existsSync(path.join(DIST, 'guias', `${t}.html`)))
const urls = []

for (const tema of temas) {
  const plantilla = readFileSync(path.join(DIST, 'guias', `${tema}.html`), 'utf8')
  const ids = IDIOMAS.map((i) => i.id).filter((id) => existsSync(path.join(GUIAS, tema, `guion.${id}.json`)))
  const ruta = `/guias/${tema}`
  const alternas = [
    ...ids.map((id) => `<link rel="alternate" hreflang="${id}" href="${BASE}${prefijo(id)}${ruta}" />`),
    `<link rel="alternate" hreflang="x-default" href="${BASE}${ruta}" />`,
  ].join('\n    ')

  for (const id of ids) {
    const g = leer(path.join(GUIAS, tema, `guion.${id}.json`))
    const textosRuta = path.join(RAIZ, 'web', 'i18n', 'guias', `${id}.json`)
    const textos = leer(existsSync(textosRuta) ? textosRuta : path.join(RAIZ, 'web', 'i18n', 'guias', 'es.json'))
    const meta = textos[tema]?.meta ?? { titulo: g.pregunta, desc: g.subtitulo }
    const url = `${BASE}${prefijo(id)}${ruta}`
    const cabeza = [
      `<meta name="description" content="${esc(meta.desc)}" />`,
      `<link rel="canonical" href="${url}" />`,
      `<meta property="og:type" content="article" />`,
      `<meta property="og:url" content="${url}" />`,
      `<meta property="og:title" content="${esc(meta.titulo)}" />`,
      `<meta property="og:description" content="${esc(meta.desc)}" />`,
      `<meta property="og:image" content="${BASE}/og.png" />`,
      alternas,
    ].join('\n    ')
    // El texto completo, sin estilos de la isla: títulos, párrafos, fuentes.
    const cuerpo = [
      `<main class="g-estatico"><h1>${esc(g.pregunta)}</h1><p>${esc(g.subtitulo)}</p>`,
      ...g.partes.map(
        (p, i) => `<section id="parte-${i + 1}"><h2>${esc(p.titulo)}</h2>${p.lineas.filter((l) => l.visual.tipo !== 'encabezado').map((l) => `<p>${esc(l.texto)}</p>`).join('')}</section>`,
      ),
      `<section id="cuarto"><p>${esc(g.cierre.texto)}</p></section>`,
      `<p>${esc(g.aviso)}</p><ol>${g.fuentes.map((f) => `<li><a href="${esc(f.url)}">${esc(f.texto)}</a></li>`).join('')}</ol></main>`,
    ].join('')
    const html = plantilla
      .replace('<html lang="es">', `<html lang="${id}"${id === 'ar' ? ' dir="rtl"' : ''}>`)
      .replace(/<title>[^<]*<\/title>/, `<title>${esc(meta.titulo)}</title>`)
      .replace('<!--guia-meta-->', cabeza)
      .replace('<!--guia-estatico-->', cuerpo)
    const destino = path.join(DIST, prefijo(id).slice(1), 'guias')
    mkdirSync(destino, { recursive: true })
    writeFileSync(path.join(destino, `${tema}.html`), html, 'utf8')
    urls.push(
      `  <url>\n    <loc>${url}</loc>\n` +
        ids.map((o) => `    <xhtml:link rel="alternate" hreflang="${o}" href="${BASE}${prefijo(o)}${ruta}"/>\n`).join('') +
        '  </url>',
    )
  }
  // Las láminas (fotos y clips de la esquina, la app grabada) solo las usa el modo
  // grabación del video: la web pública no las muestra. El audio se sirve desde R2.
  rmSync(path.join(DIST, 'guias', tema, 'laminas'), { recursive: true, force: true })
  rmSync(path.join(DIST, 'guias', tema, 'audio'), { recursive: true, force: true })
  console.log(`✓ guía ${tema}: ${ids.join(', ')}`)
}

// ─── Portada /guias: una tarjeta por guía en cada idioma ───
/** Minutos de voz de una guía en un idioma (suma de sus líneas). */
function minutos(tema, id) {
  const ruta = path.join(RAIZ, 'web', 'public', 'guias', tema, 'audio', id, 'tiempos.json')
  if (!existsSync(ruta)) return null
  const t = leer(ruta)
  return Math.round(Object.entries(t).reduce((s, [k, v]) => (k.startsWith('_') ? s : s + v), 0) / 60)
}
let portadas = 0
for (const { id } of IDIOMAS) {
  const ruta = path.join(DIST, prefijo(id).slice(1), 'guias.html')
  if (!existsSync(ruta)) continue
  const { TEXTOS } = await import(new URL(`../web/i18n/paginas/${id}.mjs`, import.meta.url))
  const tarjetas = temas
    .filter((tema) => existsSync(path.join(GUIAS, tema, `guion.${id}.json`)))
    .map((tema, i) => {
      const g = leer(path.join(GUIAS, tema, `guion.${id}.json`))
      const min = minutos(tema, id)
      const datos = [`${g.partes.length} ${TEXTOS['guias.partes']}`, min ? `${min} ${TEXTOS['guias.min']}` : ''].filter(Boolean).join(' · ')
      return (
        `<li><a class="guia-tarjeta" href="${prefijo(id)}/guias/${tema}" style="animation-delay:${i * 80}ms">` +
        `<img src="/guias/${tema}/fondo.webp" alt="" loading="lazy" />` +
        `<div><h2>${esc(g.pregunta)}</h2><p>${esc(g.subtitulo)}</p><span class="guia-meta">${esc(datos)}</span></div></a></li>`
      )
    })
  writeFileSync(ruta, readFileSync(ruta, 'utf8').replace('<!--guias-lista-->', tarjetas.join('')), 'utf8')
  portadas++
}
console.log(`✓ portada de guías: ${portadas} idiomas`)

// Al mapa del sitio que acaba de escribir web-i18n.mjs.
const mapa = path.join(DIST, 'sitemap.xml')
if (existsSync(mapa) && urls.length) {
  writeFileSync(mapa, readFileSync(mapa, 'utf8').replace('</urlset>', `${urls.join('\n')}\n</urlset>`), 'utf8')
}
