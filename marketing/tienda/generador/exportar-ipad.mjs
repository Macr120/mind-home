// Renderiza la lámina de iPad (2048×2732) en los idiomas pedidos, a partir de
// shots/<idioma>/ipad-casa.png (la captura nativa 1024×1366). Necesita el
// Chrome del piloto arrancado (node cdp.mjs arranca) — solo para pintar el
// HTML plano (sin WebGL, así que no hay riesgo del crash de la app).
// Uso: node exportar-ipad.mjs [es en ...]   (sin argumentos: los 16)
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { pathToFileURL } from 'node:url'
import { laminaIpad } from './plantilla-ipad.mjs'
import { IDIOMAS, RTL } from './componer.mjs'

const PORT = 9333
const RAIZ = dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'))
const SHOTS = resolve(RAIZ, '..', 'shots')
const SALIDA = resolve(RAIZ, '..', 'laminas', 'ipad')
mkdirSync(SALIDA, { recursive: true })
const TEMP = resolve(RAIZ, 'html')
mkdirSync(TEMP, { recursive: true })

const COPIA = JSON.parse(readFileSync(resolve(RAIZ, 'copia.json'), 'utf8'))
const W = 2048
const H = 2732

function conWs(url, fn) {
  return new Promise((res, rej) => {
    const ws = new WebSocket(url)
    let id = 0
    const pend = new Map()
    ws.onmessage = (e) => {
      const m = JSON.parse(e.data)
      if (m.id && pend.has(m.id)) {
        const { ok, ko } = pend.get(m.id)
        pend.delete(m.id)
        m.error ? ko(new Error(JSON.stringify(m.error))) : ok(m.result)
      }
    }
    ws.onerror = () => rej(new Error('ws error'))
    ws.onopen = async () => {
      const enviar = (metodo, params = {}) =>
        new Promise((ok, ko) => {
          const n = ++id
          pend.set(n, { ok, ko })
          ws.send(JSON.stringify({ id: n, method: metodo, params }))
        })
      try {
        const r = await fn({ enviar })
        ws.close()
        res(r)
      } catch (err) {
        ws.close()
        rej(err)
      }
    }
  })
}

const pedidos = process.argv.slice(2).filter((a) => IDIOMAS.includes(a))
const objetivo = pedidos.length ? pedidos : IDIOMAS

const lista = async () => (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()
const v = await (await fetch(`http://127.0.0.1:${PORT}/json/version`)).json()
const { targetId } = await conWs(v.webSocketDebuggerUrl, (c) => c.enviar('Target.createTarget', { url: 'about:blank' }))
const t = (await lista()).find((x) => x.id === targetId)

await conWs(t.webSocketDebuggerUrl, async (c) => {
  await c.enviar('Page.enable')
  await c.enviar('Runtime.enable')
  await c.enviar('Emulation.setDeviceMetricsOverride', {
    width: W, height: H, deviceScaleFactor: 1, mobile: false, screenWidth: W, screenHeight: H,
  })

  for (const id of objetivo) {
    const captura = resolve(SHOTS, id, 'ipad-casa.png')
    if (!existsSync(captura)) { console.log('sin captura para ' + id); continue }
    const L = COPIA[id]
    const img = readFileSync(captura).toString('base64')
    const html = laminaIpad({ titulo: L.t1, sub: L.s1, img, rtl: RTL.has(id) }, { w: W, h: H })
    const ruta = resolve(TEMP, 'ipad-actual.html')
    writeFileSync(ruta, html, 'utf8')
    await c.enviar('Page.navigate', { url: pathToFileURL(ruta).href + '?v=' + id })
    await new Promise((r) => setTimeout(r, 500))
    for (let i = 0; i < 40; i++) {
      const r = await c.enviar('Runtime.evaluate', {
        expression: '(() => { const i = document.querySelector("img"); return !!i && i.complete && i.naturalWidth > 0 })()',
        returnByValue: true,
      })
      if (r.result?.value) break
      await new Promise((r2) => setTimeout(r2, 250))
    }
    await new Promise((r) => setTimeout(r, 300))
    const shot = await c.enviar('Page.captureScreenshot', {
      format: 'png', fromSurface: true, captureBeyondViewport: false,
      clip: { x: 0, y: 0, width: W, height: H, scale: 1 },
    })
    writeFileSync(resolve(SALIDA, id + '.png'), Buffer.from(shot.data, 'base64'))
    console.log(id + ' ✓')
  }
  await c.enviar('Emulation.clearDeviceMetricsOverride')
})
await conWs(v.webSocketDebuggerUrl, (c) => c.enviar('Target.closeTarget', { targetId }))
console.log('listo')
