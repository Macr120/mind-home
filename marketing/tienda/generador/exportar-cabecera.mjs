// Cabecera del App Store («Header and Search Results»): imagen 16:9 de
// 5244×2950, el único tamaño que Apple acepta a la vez para la cabecera de la
// ficha y para los resultados de búsqueda. Junta el mosaico de
// capturar-cabecera.mjs (3×3 trozos de 1748×984, sin reescalar) y pone encima,
// sobre el cielo de la izquierda, el lockup de marca y el titular de la lámina 1
// (sin subtítulo: no cabe en el cielo sin pisar el mapa)
// de cada idioma (copia.json). Necesita el Chrome del piloto (solo pinta HTML).
// Uso: node exportar-cabecera.mjs [es en ...]   (sin argumentos: los 16)
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { pathToFileURL } from 'node:url'
import sharp from 'sharp'
import { ICONO } from './icono.mjs'
import { IDIOMAS, RTL } from './componer.mjs'

const PORT = 9333
const RAIZ = dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'))
const TROZOS = resolve(RAIZ, '..', 'capturas', 'cabecera')
const SALIDA = resolve(RAIZ, '..', 'cabecera')
const TEMP = resolve(RAIZ, 'html')
mkdirSync(SALIDA, { recursive: true })
mkdirSync(TEMP, { recursive: true })

const COPIA = JSON.parse(readFileSync(resolve(RAIZ, 'copia.json'), 'utf8'))
const W = 5244
const H = 2950
const TROZO = { w: 1748, h: 984, n: 3 }
const TINTA = '#1c2333'
const ACENTO = '#6d34b8'

const trozos = []
for (let f = 0; f < TROZO.n; f++) {
  for (let k = 0; k < TROZO.n; k++) {
    const ruta = resolve(TROZOS, `t-${f}-${k}.png`)
    if (!existsSync(ruta)) throw new Error(`falta ${ruta}: corre antes capturar-cabecera.mjs`)
    trozos.push(`<img src="data:image/png;base64,${readFileSync(ruta).toString('base64')}" style="left:${k * TROZO.w}px;top:${f * TROZO.h}px" alt="">`)
  }
}

function lamina({ titulo, rtl }) {
  const u = W / 1000
  const dir = rtl ? ' dir="rtl"' : ''
  return `<meta charset="utf-8">
<title>cabecera</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html { width: ${TROZO.w}px; height: ${TROZO.h}px; overflow: hidden; background: #9ac0ee; }
  body { width: ${W}px; height: ${H}px; overflow: hidden; position: relative; transform-origin: 0 0; font-family: 'Segoe UI Variable Display', 'Segoe UI', system-ui, -apple-system, sans-serif; color: ${TINTA}; -webkit-font-smoothing: antialiased; }
  .mosaico img { position: absolute; width: ${TROZO.w}px; height: ${TROZO.h}px; display: block; }
  /* Velo suave detrás del texto: el cielo ya es claro, solo lo asienta. */
  .velo { position: absolute; inset: 0; background: radial-gradient(60% 70% at 18% 22%, rgba(255,255,255,.55) 0%, rgba(255,255,255,0) 70%); }
  .texto { position: absolute; left: ${60 * u}px; top: ${56 * u}px; width: ${380 * u}px; }
  .marca { display: flex; align-items: center; gap: ${12 * u}px; margin-bottom: ${20 * u}px; }
  .marca svg { width: ${36 * u}px; height: ${36 * u}px; border-radius: ${9 * u}px; display: block; box-shadow: 0 ${2 * u}px ${10 * u}px ${TINTA}26; }
  .marca span { font-size: ${18 * u}px; font-weight: 700; letter-spacing: ${0.5 * u}px; color: ${TINTA}c8; }
  h1 { width: fit-content; font-size: ${44 * u}px; line-height: 1.05; font-weight: 800; letter-spacing: ${rtl ? 0 : -1.6 * u}px; text-wrap: balance; }
  h1 em { font-style: normal; color: ${ACENTO}; }
</style>
<div class="mosaico">${trozos.join('')}</div>
<div class="velo"></div>
<div class="texto">
  <div class="marca">${ICONO}<span>MindHaOS</span></div>
  <h1${dir}>${titulo}</h1>
</div>
`
}

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
  await c.enviar('Emulation.setDeviceMetricsOverride', { width: TROZO.w, height: TROZO.h, deviceScaleFactor: 1, mobile: false, screenWidth: TROZO.w, screenHeight: TROZO.h })
  for (const id of objetivo) {
    const L = COPIA[id]
    const ruta = resolve(TEMP, 'cabecera-actual.html')
    writeFileSync(ruta, lamina({ titulo: L.t1, rtl: RTL.has(id) }), 'utf8')
    await c.enviar('Page.navigate', { url: pathToFileURL(ruta).href + '?v=' + id })
    await new Promise((r) => setTimeout(r, 800))
    for (let i = 0; i < 60; i++) {
      const r = await c.enviar('Runtime.evaluate', {
        expression: '[...document.images].every((i) => i.complete && i.naturalWidth > 0)',
        returnByValue: true,
      })
      if (r.result?.value) break
      await new Promise((r2) => setTimeout(r2, 250))
    }
    await new Promise((r) => setTimeout(r, 400))
    // Un viewport de 15 MP tumba la pestaña: el viewport mide UN trozo, la lámina se
    // desplaza con transform para sacar cada uno de los 3×3 y sharp los vuelve a unir.
    const franjas = []
    for (let y = 0; y < H; y += TROZO.h) {
      for (let x = 0; x < W; x += TROZO.w) {
        await c.enviar('Runtime.evaluate', { expression: `document.body.style.transform = 'translate(-${x}px, -${y}px)'` })
        await new Promise((r) => setTimeout(r, 300))
        const shot = await c.enviar('Page.captureScreenshot', {
          format: 'png', fromSurface: true, captureBeyondViewport: false,
          clip: { x: 0, y: 0, width: Math.min(TROZO.w, W - x), height: Math.min(TROZO.h, H - y), scale: 1 },
        })
        franjas.push({ input: Buffer.from(shot.data, 'base64'), top: y, left: x })
      }
    }
    // Apple no acepta transparencia: se une y luego se le quita el canal alfa.
    const unido = await sharp({ create: { width: W, height: H, channels: 3, background: '#9ac0ee' } }).composite(franjas).png().toBuffer()
    await sharp(unido).removeAlpha().png({ compressionLevel: 9 }).toFile(resolve(SALIDA, id + '.png'))
    console.log(id + ' ✓')
  }
  await c.enviar('Emulation.clearDeviceMetricsOverride')
})
await conWs(v.webSocketDebuggerUrl, (c) => c.enviar('Target.closeTarget', { targetId }))
console.log('listo')
