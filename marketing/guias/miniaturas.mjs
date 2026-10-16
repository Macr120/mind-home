// Miniaturas de los videos de una guía, una por idioma:
//   salida/<id>/final/miniatura.jpg          1280×720 (YouTube)
//   salida/<id>/final/miniatura-cuadrada.jpg 1080×1080 (portada de TikTok, IG y FB)
//
//   node marketing/guias/miniaturas.mjs ejercicio [en fr …]
//
// De fondo, Pep@ en la caminadora dentro de la casa (el plano desde arriba de
// la toma de entrada, casa.mjs); en primer plano, Pep@ pensando (la pose
// `?pose=pensando` de la página, capturada con fondo transparente desde el
// servidor de la web, GUIAS_URL); y la pregunta de la guía en su idioma.
// Si el guion trae `corta` (la pregunta en 3-4 palabras), va esa: en hindi o
// alemán la pregunta entera ocupaba media imagen. Si la escena trae
// el icono de la app (`<tema>/icono-app.svg`, de iconos.mjs; si no lo hay, `MINIATURA.objeto`, un emoji del tema), va en primer plano junto a Pep@.
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { FFMPEG, RAIZ, conPagina, dormir } from './cdp.mjs'
import { sello } from './titulo.mjs'

const BASE = (process.env.GUIAS_URL || 'http://localhost:5174').replace(/\/$/, '')
const [tema = 'ejercicio', ...pedidos] = process.argv.slice(2)
const SALIDA = path.join(RAIZ, tema, 'salida')
const TEXTOS = path.resolve(RAIZ, '..', '..', 'web', 'i18n', 'guias')
const ids = pedidos.length ? pedidos : ['es', 'en', 'pt', 'fr', 'de', 'it', 'ja', 'zh', 'ko', 'ru', 'hi', 'tr', 'id', 'pl', 'nl', 'ar'].filter((id) => existsSync(path.join(SALIDA, id, 'casa-entrada.mp4')))
const PEP = path.join(RAIZ, tema, 'pep-pensando.png')
const FORMATOS = [
  { archivo: 'miniatura.jpg', ancho: 1280, alto: 720 },
  { archivo: 'miniatura-cuadrada.jpg', ancho: 1080, alto: 1080 },
]

/** El plano isométrico del gancho (el que marque la escena del tema; el 3.º si no dice). */
const { PLANOS, MINIATURA } = await import(pathToFileURL(path.join(RAIZ, tema, 'escena.mjs')).href)
const ISO = Math.max(1, PLANOS.findIndex((p) => p.iso)) || 2

/** Fondo: el plano isométrico (entre su corte y el siguiente), donde se ven Pep@ en lo suyo y la casa alrededor. */
function fondo(id) {
  const destino = path.join(SALIDA, id, 'final', 'fondo-miniatura.jpg')
  const { cortes } = JSON.parse(readFileSync(path.join(SALIDA, id, 'casa-entrada.json'), 'utf8'))
  const t = cortes.length > ISO ? (cortes[ISO - 1] + cortes[ISO]) / 2 : 4
  execFileSync(FFMPEG, ['-y', '-v', 'error', '-ss', String(t), '-i', path.join(SALIDA, id, 'casa-entrada.mp4'), '-frames:v', '1', '-q:v', '2', destino])
  return destino
}

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/**
 * El título escapado; en japonés y chino (sin espacios) con <wbr> entre
 * palabras: con `word-break: keep-all` solo se parte ahí, no a media palabra.
 */
function partible(texto, id) {
  if (!['ja', 'zh'].includes(id)) return esc(texto)
  // En japonés, las partículas y terminaciones en hiragana (は, で, しょうか…) van pegadas a lo anterior.
  const pegada = (seg) => id === 'ja' && /^[぀-ゟ　-〿！-？]/.test(seg)
  return [...new Intl.Segmenter(id, { granularity: 'word' }).segment(texto)].map((x, i) => (i && !pegada(x.segment) ? '<wbr>' : '') + esc(x.segment)).join('')
}

/** La pregunta de la miniatura: la primera frase del gancho («¿Qué es el ejercicio?»), ya en su idioma. */
function primeraFrase(g) {
  const texto = g.partes[0].lineas[0].texto
  const m = /^[\s\S]*?[?？؟]/.exec(texto)
  return m ? m[0].trim() : g.pregunta
}

/** El icono de la app de la guía (iconos.mjs): el mismo mosaico que en la vista «apps» del panel de cuartos; si no hay, el emoji de MINIATURA. */
const ICONO_APP = path.join(RAIZ, tema, 'icono-app.svg')

function html({ ancho, alto }, id, fondoJpg) {
  const g = JSON.parse(readFileSync(path.join(RAIZ, tema, `guion.${id}.json`), 'utf8'))
  const ui = JSON.parse(readFileSync(path.join(TEXTOS, `${id}.json`), 'utf8'))
  const cuadrada = ancho === alto
  return `<!doctype html><html lang="${id}" dir="${id === 'ar' ? 'rtl' : 'ltr'}"><head><meta charset="utf-8"><style>
  html,body{margin:0;width:${ancho}px;height:${alto}px;overflow:hidden}
  body{position:relative;font-family:"Segoe UI","Yu Gothic UI","Microsoft YaHei UI","Malgun Gothic","Nirmala UI",sans-serif}
  .fondo{position:absolute;inset:0;background:url("${pathToFileURL(fondoJpg)}") center/cover;filter:saturate(1.15)}
  .velo{position:absolute;inset:0;background:${cuadrada ? 'linear-gradient(180deg,rgb(15 17 30/.82) 0%,rgb(15 17 30/.35) 42%,rgb(15 17 30/0) 62%)' : 'linear-gradient(90deg,rgb(15 17 30/.86) 0%,rgb(15 17 30/.55) 42%,rgb(15 17 30/0) 70%)'}}
  [dir=rtl] .velo{transform:scaleX(-1)}
  .pep{position:absolute;${cuadrada ? 'right:-90px;bottom:-130px;height:900px' : 'inset-inline-end:-40px;bottom:-130px;height:860px'}}
  .objeto{position:absolute;${cuadrada ? 'right:470px;bottom:40px' : 'inset-inline-end:520px;bottom:30px'};font-size:210px;line-height:1;font-family:"Segoe UI Emoji";filter:drop-shadow(0 14px 22px rgb(0 0 0/.45));transform:rotate(-8deg)}
  .objeto.app{filter:none;width:250px;height:250px}
  /* En la horizontal, el icono va en la columna del título, debajo de la píldora (con títulos de tres renglones no la pisa). */
  .app-ancho{display:block;width:${g.corta ? 160 : 150}px;height:${g.corta ? 160 : 150}px;margin-top:18px;margin-inline-start:-8px;transform:rotate(-6deg)}
  /* Señala con la mano izquierda (a su izquierda): en espejo apunta a la pregunta; en árabe la pregunta ya queda de ese lado. */
  .pep{transform:scaleX(-1)}
  [dir=rtl] .pep{transform:none}
  .burbuja{position:absolute;${cuadrada ? 'right:330px;bottom:770px' : 'inset-inline-end:450px;top:20px'};width:120px;height:120px;border-radius:50%;background:#fff;color:#6d34b8;font:900 92px/120px "Segoe UI",sans-serif;text-align:center;box-shadow:0 10px 30px rgb(0 0 0/.35)}
  .burbuja::after{content:"";position:absolute;width:30px;height:30px;border-radius:50%;background:#fff;right:-8px;bottom:-30px}
  .texto{position:absolute;${cuadrada ? 'left:64px;right:64px;top:70px' : 'inset-inline-start:64px;top:0;bottom:0;width:640px;display:flex;flex-direction:column;justify-content:center'}}
  h1{text-wrap:balance;word-break:keep-all;margin:0;color:#fff;font-weight:900;font-size:${g.corta ? (cuadrada ? 128 : 112) : cuadrada ? 104 : 92}px;line-height:1.02;letter-spacing:-.02em;text-shadow:0 6px 24px rgb(0 0 0/.55),0 2px 0 rgb(0 0 0/.35)}
  .chip{white-space:nowrap;display:inline-flex;align-items:center;gap:14px;margin-top:26px;padding:12px 22px;border-radius:999px;background:#fff;color:#1c2333;font-weight:800;font-size:30px;box-shadow:0 8px 24px rgb(0 0 0/.3);align-self:flex-start}
  .chip svg{height:26px}
</style></head><body>
  <div class="fondo"></div><div class="velo"></div>
  <img class="pep" src="${pathToFileURL(PEP)}">
  ${existsSync(ICONO_APP) ? (cuadrada ? `<img class="objeto app" src="${pathToFileURL(ICONO_APP)}">` : '') : MINIATURA?.objeto ? `<div class="objeto">${MINIATURA.objeto}</div>` : ''}
  <div class="texto"><h1>${partible(g.corta ?? primeraFrase(g), id)}</h1>
    <span class="chip"><svg viewBox="0 0 357 100"><rect y="3" width="94" height="94" rx="20" fill="#FFB319"/><path d="M137 0V100H237Z" fill="#FF505F"/><path d="M257 0H357V100A100 100 0 0 1 257 0Z" fill="#C07DFE"/></svg>${sello(g, ui)}</span>${existsSync(ICONO_APP) && !cuadrada ? `<img class="app-ancho" src="${pathToFileURL(ICONO_APP)}">` : ''}</div>
</body></html>`
}

await conPagina(path.join(RAIZ, tema, 'grabaciones'), async (c) => {
  // Pep@ pensando, una sola vez (es igual en todos los idiomas).
  await c.enviar('Emulation.setDeviceMetricsOverride', { width: 600, height: 600, deviceScaleFactor: 2, mobile: false })
  await c.enviar('Emulation.setDefaultBackgroundColorOverride', { color: { r: 0, g: 0, b: 0, a: 0 } })
  await c.enviar('Page.navigate', { url: `${BASE}/guias/${tema}?pose=miniatura&t=${Date.now()}` })
  await dormir(6000)
  writeFileSync(PEP, Buffer.from((await c.enviar('Page.captureScreenshot', { format: 'png' })).data, 'base64'))
  await c.enviar('Emulation.setDefaultBackgroundColorOverride', {})

  for (const id of ids) {
    const fondoJpg = fondo(id)
    for (const f of FORMATOS) {
      const archivoHtml = path.join(SALIDA, id, 'final', `miniatura-${f.ancho}.html`)
      writeFileSync(archivoHtml, html(f, id, fondoJpg))
      await c.enviar('Emulation.setDeviceMetricsOverride', { width: f.ancho, height: f.alto, deviceScaleFactor: 1, mobile: false })
      await c.enviar('Page.navigate', { url: pathToFileURL(archivoHtml).href })
      await dormir(1200)
      const { data } = await c.enviar('Page.captureScreenshot', { format: 'jpeg', quality: 92 })
      writeFileSync(path.join(SALIDA, id, 'final', f.archivo), Buffer.from(data, 'base64'))
    }
    console.log(`✓ ${id}`)
  }
  await c.enviar('Emulation.clearDeviceMetricsOverride')
})
