// La tarjeta de los últimos 3 s de cada parte suelta (cortar.mjs): como el recuadro final de
// la página —«Arma tu casa gratis hoy», el botón de la app y los de la web y las tiendas con
// sus iconos—, con el narrador saludando y el sello de MindHaOS. Una lámina de 1080×1080
// por idioma, capturada en el Chrome del grabador (así se componen bien todas las escrituras):
//   salida/<id>/tarjeta.png
//
//   GUIAS_URL=http://localhost:53390 node marketing/guias/tarjeta.mjs metas [es en …]
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { LADO, RAIZ, conPagina, dormir } from './cdp.mjs'
import { LOGO, partible, sello } from './titulo.mjs'

const BASE = (process.env.GUIAS_URL || 'http://localhost:5174').replace(/\/$/, '')
const IDIOMAS = ['es', 'en', 'pt', 'fr', 'de', 'it', 'ja', 'zh', 'ko', 'ru', 'hi', 'tr', 'id', 'pl', 'nl', 'ar']
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/** Los iconos de los botones (los mismos de LogoTienda en web/src/guias/GuiaApp.tsx). */
const ICONOS = {
  web: '<svg viewBox="0 0 24 24"><g fill="none" stroke="#1c2333" stroke-width="1.8"><circle cx="12" cy="12" r="9.5"/><path d="M2.5 12h19M12 2.5c2.6 2.6 3.9 5.8 3.9 9.5s-1.3 6.9-3.9 9.5M12 2.5C9.4 5.1 8.1 8.3 8.1 12s1.3 6.9 3.9 9.5"/></g></svg>',
  play: '<svg viewBox="0 0 24 24"><path fill="#00a0ff" d="M4 2.5v19l9.3-9.5z"/><path fill="#00e676" d="M4 2.5l9.3 9.5 3.3-3.3z"/><path fill="#ff3d44" d="M4 21.5l9.3-9.5 3.3 3.3z"/><path fill="#ffc400" d="M16.6 8.7 13.3 12l3.3 3.3 3.9-2.2c.8-.5.8-1.7 0-2.2z"/></svg>',
  apple: '<svg viewBox="0 0 24 24"><path fill="#1c2333" d="M12.15 6.9c-.95 0-2.42-1.08-3.96-1.04-2.04.03-3.91 1.18-4.96 3.01-2.12 3.68-.55 9.1 1.52 12.09 1.01 1.45 2.21 3.09 3.79 3.04 1.52-.07 2.09-.99 3.94-.99 1.83 0 2.35.99 3.96.95 1.64-.03 2.68-1.48 3.68-2.95 1.16-1.69 1.64-3.33 1.66-3.42-.04-.01-3.18-1.22-3.22-4.86-.03-3.04 2.48-4.49 2.6-4.56-1.43-2.09-3.62-2.32-4.39-2.38-2-.16-3.68 1.09-4.61 1.09zm3.38-3.07c.84-1.01 1.4-2.43 1.25-3.83-1.21.05-2.66.81-3.53 1.82-.78.9-1.45 2.34-1.27 3.71 1.34.1 2.71-.69 3.56-1.7"/></svg>',
  microsoft: '<svg viewBox="0 0 24 24"><path fill="#f25022" d="M2 2h9.5v9.5H2z"/><path fill="#7fba00" d="M12.5 2H22v9.5h-9.5z"/><path fill="#00a4ef" d="M2 12.5h9.5V22H2z"/><path fill="#ffb900" d="M12.5 12.5H22V22h-9.5z"/></svg>',
}

function html(tema, id, narrador) {
  const g = JSON.parse(readFileSync(path.join(RAIZ, tema, `guion.${id}.json`), 'utf8'))
  const ui = JSON.parse(readFileSync(path.resolve(RAIZ, '..', '..', 'web', 'i18n', 'guias', `${id}.json`), 'utf8'))
  const boton = (icono, texto) => `<span class="boton">${ICONOS[icono]}${esc(texto)}</span>`
  return `<!doctype html><html lang="${id}" dir="${id === 'ar' ? 'rtl' : 'ltr'}"><head><meta charset="utf-8"><style>
  html,body{margin:0;width:${LADO}px;height:${LADO}px;overflow:hidden}
  body{position:relative;font-family:"Segoe UI","Yu Gothic UI","Microsoft YaHei UI","Malgun Gothic","Nirmala UI",sans-serif;color:#1c2333;
    background:linear-gradient(135deg,#efe3ff 0%,#f6efff 45%,#fff3e3 100%)}
  .contenido{position:absolute;inset:40px 60px 110px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:40px}
  .narrador{position:relative;flex:none;width:400px;height:400px;border-radius:50%;overflow:hidden;
    background:radial-gradient(circle at 50% 40%,#6b3b55 0%,#3b2232 70%,#2a1824 100%);border:10px solid #fff;box-shadow:0 18px 50px rgb(60 30 90/.28)}
  .narrador img{position:absolute;inset:-4% -4% auto -4%;width:108%}
  h1{margin:0;text-align:center;text-wrap:balance;word-break:keep-all;
    color:#6d28d9;font-weight:900;font-size:72px;line-height:1.08;letter-spacing:-.01em}
  .acciones{display:flex;flex-wrap:wrap;justify-content:center;gap:18px}
  .boton{display:inline-flex;align-items:center;gap:14px;padding:16px 26px;border-radius:18px;background:#fff;border:2px solid #e6e1f0;
    font-weight:600;font-size:32px;white-space:nowrap;box-shadow:0 6px 18px rgb(60 30 90/.08)}
  .boton svg{width:36px;height:36px;flex:none}
  .principal{background:#6d28d9;border-color:transparent;color:#fff;font-weight:700}
  .principal .pastilla{display:inline-flex;padding:7px 9px;border-radius:10px;background:#fff}
  .principal .pastilla svg{width:auto;height:24px}
  .sello{position:absolute;bottom:34px;inset-inline-end:40px;display:inline-flex;align-items:center;gap:12px;padding:10px 20px;border-radius:999px;
    background:#fff;font-weight:800;font-size:24px;box-shadow:0 6px 18px rgb(0 0 0/.12)}
  .sello svg{height:22px}
</style></head><body>
  <div class="contenido">
  <div class="narrador"><img src="${pathToFileURL(narrador).href}" alt=""></div>
  <h1>${partible(ui.comun.gratis, id)}</h1>
  <div class="acciones">
    <span class="boton principal"><span class="pastilla">${LOGO}</span>${esc(g.cierre.boton)}</span>
    ${boton('web', ui.comun.web)}${boton('play', 'Google Play')}${boton('apple', 'App Store')}${boton('microsoft', 'Microsoft Store')}
  </div>
  </div>
  <span class="sello">${LOGO}${sello(g, ui)}</span>
</body></html>`
}

const [tema = 'ejercicio', ...pedidos] = process.argv.slice(2)
const ids = (pedidos.length ? pedidos : IDIOMAS).filter((id) => existsSync(path.join(RAIZ, tema, `guion.${id}.json`)))
const narrador = path.join(RAIZ, tema, 'narrador-saluda.png')

await conPagina(path.join(RAIZ, tema, 'grabaciones'), async (c) => {
  // El narrador saludando (la pose «contento» de los memes), una vez por guía: fondo transparente.
  await c.enviar('Emulation.setDeviceMetricsOverride', { width: 500, height: 500, deviceScaleFactor: 2, mobile: false })
  await c.enviar('Emulation.setDefaultBackgroundColorOverride', { color: { r: 0, g: 0, b: 0, a: 0 } })
  await c.enviar('Page.navigate', { url: `${BASE}/guias/${tema}?pose=contento&t=${Date.now()}` })
  await dormir(6000)
  writeFileSync(narrador, Buffer.from((await c.enviar('Page.captureScreenshot', { format: 'png' })).data, 'base64'))
  await c.enviar('Emulation.setDefaultBackgroundColorOverride', {})

  await c.enviar('Emulation.setDeviceMetricsOverride', { width: LADO, height: LADO, deviceScaleFactor: 1, mobile: false })
  for (const id of ids) {
    const destino = path.join(RAIZ, tema, 'salida', id, 'tarjeta.png')
    const archivo = destino.replace(/\.png$/, '.html')
    writeFileSync(archivo, html(tema, id, narrador))
    await c.enviar('Page.navigate', { url: pathToFileURL(archivo).href })
    await dormir(1000)
    writeFileSync(destino, Buffer.from((await c.enviar('Page.captureScreenshot', { format: 'png' })).data, 'base64'))
    console.log(`✓ ${id}`)
  }
  await c.enviar('Emulation.clearDeviceMetricsOverride')
})
