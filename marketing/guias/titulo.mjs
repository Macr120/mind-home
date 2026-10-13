// La pregunta de la guía en grande, para el primer segundo del video completo
// (montar.mjs la pone encima de la toma de entrada y la desvanece): una lámina
// transparente de 1080×1080 con la pregunta y el sello de MindHaOS, capturada en
// el Chrome del grabador (así cualquier escritura —japonés, árabe, hindi— se
// compone bien, cosa que el drawtext de ffmpeg no garantiza).
import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { LADO, RAIZ, dormir } from './cdp.mjs'

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/** El texto escapado; en japonés y chino (sin espacios) con <wbr> entre palabras, para no partir a media palabra. */
export function partible(texto, id) {
  if (!['ja', 'zh'].includes(id)) return esc(texto)
  const pegada = (seg) => id === 'ja' && /^[぀-ゟ　-〿！-？]/.test(seg)
  return [...new Intl.Segmenter(id, { granularity: 'word' }).segment(texto)].map((x, i) => (i && !pegada(x.segment) ? '<wbr>' : '') + esc(x.segment)).join('')
}

/**
 * El texto del sello: «Guía 4 · Finanzas · MindHaOS» (las guías van numeradas desde
 * Finanzas: `numero` y `nombre` del guion); sin número, «Guía completa · MindHaOS».
 */
export function sello(g, ui) {
  if (g.numero && g.nombre) return `${esc((ui.paquete?.guiaN ?? 'Guía {n}').replace('{n}', g.numero))} · ${esc(g.nombre)} · MindHaOS`
  return `${esc(ui.paquete?.guiaCompleta ?? '')} · MindHaOS`
}

/** El logotipo de MindHaOS (las tres formas). */
export const LOGO = '<svg viewBox="0 0 357 100"><rect y="3" width="94" height="94" rx="20" fill="#FFB319"/><path d="M137 0V100H237Z" fill="#FF505F"/><path d="M257 0H357V100A100 100 0 0 1 257 0Z" fill="#C07DFE"/></svg>'

function html(tema, id) {
  const g = JSON.parse(readFileSync(path.join(RAIZ, tema, `guion.${id}.json`), 'utf8'))
  const ui = JSON.parse(readFileSync(path.resolve(RAIZ, '..', '..', 'web', 'i18n', 'guias', `${id}.json`), 'utf8'))
  return `<!doctype html><html lang="${id}" dir="${id === 'ar' ? 'rtl' : 'ltr'}"><head><meta charset="utf-8"><style>
  html,body{margin:0;width:${LADO}px;height:${LADO}px;overflow:hidden;background:transparent}
  body{position:relative;font-family:"Segoe UI","Yu Gothic UI","Microsoft YaHei UI","Malgun Gothic","Nirmala UI",sans-serif}
  .velo{position:absolute;inset:0 0 auto 0;height:62%;background:linear-gradient(180deg,rgb(15 17 30/.85) 0%,rgb(15 17 30/.55) 55%,rgb(15 17 30/0) 100%)}
  .texto{position:absolute;inset-inline:72px;top:84px}
  h1{text-wrap:balance;word-break:keep-all;margin:0;color:#fff;font-weight:900;font-size:108px;line-height:1.02;letter-spacing:-.02em;text-shadow:0 6px 24px rgb(0 0 0/.55),0 2px 0 rgb(0 0 0/.35)}
  .chip{white-space:nowrap;display:inline-flex;align-items:center;gap:14px;margin-top:30px;padding:12px 22px;border-radius:999px;background:#fff;color:#1c2333;font-weight:800;font-size:30px;box-shadow:0 8px 24px rgb(0 0 0/.3)}
  .chip svg{height:26px}
</style></head><body>
  <div class="velo"></div>
  <div class="texto"><h1>${partible(g.pregunta, id)}</h1>
    <span class="chip">${LOGO}${sello(g, ui)}</span></div>
</body></html>`
}

/** Captura la lámina del título en `destino` (PNG transparente) con la sesión de CDP `c`. */
export async function capturarTitulo(c, tema, id, destino) {
  const archivo = destino.replace(/\.png$/, '.html')
  writeFileSync(archivo, html(tema, id))
  // Se vuelve a la página de antes: en el archivo local no hay localStorage y la demo no abriría.
  const antes = (await c.enviar('Runtime.evaluate', { expression: 'location.href', returnByValue: true })).result?.value
  await c.enviar('Emulation.setDeviceMetricsOverride', { width: LADO, height: LADO, deviceScaleFactor: 1, mobile: false })
  await c.enviar('Emulation.setDefaultBackgroundColorOverride', { color: { r: 0, g: 0, b: 0, a: 0 } })
  await c.enviar('Page.navigate', { url: pathToFileURL(archivo).href })
  await dormir(1200)
  writeFileSync(destino, Buffer.from((await c.enviar('Page.captureScreenshot', { format: 'png' })).data, 'base64'))
  await c.enviar('Emulation.setDefaultBackgroundColorOverride', {})
  await c.enviar('Emulation.clearDeviceMetricsOverride')
  if (antes?.startsWith('http')) {
    await c.enviar('Page.navigate', { url: antes })
    await dormir(3000)
  }
}
