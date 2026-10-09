// Las imágenes de Pep@ de los memes: la página en `?pose=<id>` capturada con
// fondo transparente en el Chrome del grabador (headless, lo arranca grabar.mjs).
//   web/public/guias/<tema>/memes/<pose>.png
//
//   node marketing/guias/memes.mjs ejercicio
import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { conWs, dormir } from '../promo/grabar/sesion.mjs'

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const PORT = Number(process.env.GRABAR_PUERTO || 9337)
const BASE = (process.env.GUIAS_URL || 'http://localhost:5174').replace(/\/$/, '')
const tema = process.argv[2] ?? 'ejercicio'
/** Las poses de `web/src/guias/Memes.tsx` (POSES). */
const POSES = ['rechaza', 'aprueba', 'orgulloso', 'confundido', 'relajado', 'cansado', 'contento']
const DESTINO = path.join(RAIZ, 'web', 'public', 'guias', tema, 'memes')
mkdirSync(DESTINO, { recursive: true })

const pagina = (await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()).find((t) => t.type === 'page')
if (!pagina) throw new Error(`no hay Chrome grabador en el puerto ${PORT}: corre antes grabar.mjs`)
await conWs(pagina.webSocketDebuggerUrl, async (c) => {
  await c.enviar('Page.enable')
  await c.enviar('Emulation.setDeviceMetricsOverride', { width: 400, height: 400, deviceScaleFactor: 1.5, mobile: false })
  await c.enviar('Emulation.setDefaultBackgroundColorOverride', { color: { r: 0, g: 0, b: 0, a: 0 } })
  for (const pose of POSES) {
    await c.enviar('Page.navigate', { url: `${BASE}/guias/${tema}?pose=${pose}&t=${Date.now()}` })
    await dormir(4500) // Pep@ cargado y la cámara asentada
    const { data } = await c.enviar('Page.captureScreenshot', { format: 'png' })
    writeFileSync(path.join(DESTINO, `${pose}.png`), Buffer.from(data, 'base64'))
    console.log(`✓ ${pose}.png`)
  }
  await c.enviar('Emulation.setDefaultBackgroundColorOverride', {})
  await c.enviar('Emulation.clearDeviceMetricsOverride')
})
