// Gráfico destacado de Google Play: 1024×500, la FOTO del mapa completo a
// pantalla completa (fondo full-bleed), con solo el lockup de marca en una
// esquina — el mapa ya viene a exactamente 2048×1000 (2× el tamaño final).
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { pathToFileURL } from 'node:url'

const PORT = 9333
const RAIZ = dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'))
const SHOTS = resolve(RAIZ, '..', 'shots')
const SALIDA = resolve(RAIZ, '..', 'laminas')
mkdirSync(SALIDA, { recursive: true })

const ICONO = `<svg viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" rx="112" fill="#576748"/>
  <g transform="translate(77.5 206)">
    <rect x="0" y="3" width="94" height="94" rx="20" fill="#DA9425"/>
    <path d="M137 0V100H237Z" fill="#C23A40"/>
    <path d="M257 0H357V100A100 100 0 0 1 257 0Z" fill="#895AC6"/>
  </g>
</svg>`

const img = readFileSync(resolve(SHOTS, 'mapa-completo.png')).toString('base64')

const W = 1024
const H = 500

const html = `<meta charset="utf-8">
<title>feature-graphic</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { width: ${W}px; height: ${H}px; overflow: hidden; background: #90b8e6; }
  .foto { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; display: block; }
  .marca {
    position: absolute; left: 22px; bottom: 20px;
    display: flex; align-items: center; gap: 10px;
    padding: 8px 16px 8px 10px;
    border-radius: 999px;
    background: rgba(255,255,255,.92);
    box-shadow: 0 10px 26px rgba(15,20,35,.28);
  }
  .marca svg { width: 34px; height: 34px; border-radius: 8px; display: block; }
  .marca span { font-family: 'Segoe UI Variable Display', 'Segoe UI', system-ui, sans-serif; font-size: 18px; font-weight: 700; color: #1c2333; letter-spacing: .1px; }
</style>
<img class="foto" src="data:image/png;base64,${img}" alt="">
<div class="marca">${ICONO}<span>MPH</span></div>
`

const ruta = resolve(RAIZ, 'html', 'feature-graphic.html')
mkdirSync(dirname(ruta), { recursive: true })
writeFileSync(ruta, html, 'utf8')

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
  await c.enviar('Page.navigate', { url: pathToFileURL(ruta).href })
  await new Promise((r) => setTimeout(r, 700))
  for (let i = 0; i < 40; i++) {
    const r = await c.enviar('Runtime.evaluate', {
      expression: '(() => { const i = document.querySelector(".foto"); return !!i && i.complete && i.naturalWidth > 0 })()',
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
  const salida = resolve(SALIDA, 'feature-graphic-1024x500.png')
  writeFileSync(salida, Buffer.from(shot.data, 'base64'))
  console.log('ok', salida)
  await c.enviar('Emulation.clearDeviceMetricsOverride')
})
await conWs(v.webSocketDebuggerUrl, (c) => c.enviar('Target.closeTarget', { targetId }))
