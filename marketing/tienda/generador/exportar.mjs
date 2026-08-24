// Renderiza las 4 láminas × 2 tamaños × 16 idiomas y las escribe como PNG.
// Necesita el Chrome del piloto CDP arrancado (node cdp.mjs arranca).
// Uso: node exportar.mjs [es en ...]   (sin argumentos: los 16)
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { pathToFileURL } from 'node:url'
import { lamina } from './plantilla.mjs'
import { LAMINAS, TAMANOS, IDIOMAS, RTL } from './componer.mjs'

const PORT = 9333
const RAIZ = dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'))
const SHOTS = resolve(RAIZ, '..', 'shots')
const SALIDA = resolve(RAIZ, '..', 'laminas')
const TEMP = resolve(RAIZ, 'html')
mkdirSync(TEMP, { recursive: true })

const COPIA = JSON.parse(readFileSync(resolve(RAIZ, 'copia.json'), 'utf8'))
const dormir = (ms) => new Promise((r) => setTimeout(r, ms))
const lista = async () => (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()

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

// Las capturas se leen una vez por idioma (pesan ~1,5 MB y van embebidas en base64).
const v = await (await fetch(`http://127.0.0.1:${PORT}/json/version`)).json()
const { targetId } = await conWs(v.webSocketDebuggerUrl, (c) =>
  c.enviar('Target.createTarget', { url: 'about:blank' }),
)
const t = (await lista()).find((x) => x.id === targetId)

let hechas = 0
await conWs(t.webSocketDebuggerUrl, async (c) => {
  await c.enviar('Page.enable')
  await c.enviar('Runtime.enable')
  // Con la ventana tapada la pestaña queda 'hidden' y no repinta: esto la mantiene viva.
  await c.enviar('Emulation.setFocusEmulationEnabled', { enabled: true })

  for (const id of objetivo) {
    const L = COPIA[id]
    if (!L) { console.log('sin copia para ' + id); continue }
    for (const s of LAMINAS) {
      const img = readFileSync(resolve(SHOTS, id, s.archivo)).toString('base64')
      for (const tam of TAMANOS) {
        const datos = {
          ...s,
          img,
          rtl: RTL.has(id),
          titulo: L[s.texto.titulo],
          sub: L[s.texto.sub],
          chip: s.chip && s.texto.chip ? { ...s.chip, texto: L[s.texto.chip] } : undefined,
        }
        // Un solo archivo temporal reutilizado: 128 HTML con la imagen embebida
        // serían cientos de megas en disco.
        const ruta = resolve(TEMP, 'actual.html')
        writeFileSync(ruta, lamina(datos, tam), 'utf8')
        await c.enviar('Emulation.setDeviceMetricsOverride', {
          width: tam.w, height: tam.h, deviceScaleFactor: 1, mobile: false,
          screenWidth: tam.w, screenHeight: tam.h,
        })
        // `?v=` evita que Chrome sirva el HTML anterior de su caché.
        await c.enviar('Page.navigate', { url: pathToFileURL(ruta).href + '?v=' + ++hechas })
        await dormir(500)
        for (let i = 0; i < 40; i++) {
          const r = await c.enviar('Runtime.evaluate', {
            expression: '(() => { const i = document.querySelector("img"); return !!i && i.complete && i.naturalWidth > 0 })()',
            returnByValue: true,
          })
          if (r.result?.value) break
          await dormir(250)
        }
        await dormir(350)
        // Autoajuste: en alemán o japonés una línea puede no caber a 92‰ del ancho.
        // Se encoge SOLO lo necesario para respetar las líneas que marcan los <br>.
        const ajuste = await c.enviar('Runtime.evaluate', {
          expression: `(() => {
            const encoger = (el, lineas) => {
              let f = parseFloat(getComputedStyle(el).fontSize)
              for (let i = 0; i < 40; i++) {
                const lh = parseFloat(getComputedStyle(el).lineHeight)
                if (el.getBoundingClientRect().height <= lh * lineas + 2) break
                f -= f * 0.03
                el.style.fontSize = f + 'px'
              }
              return f
            }
            const h1 = document.querySelector('h1')
            const sub = document.querySelector('p.sub')
            return [encoger(h1, h1.querySelectorAll('br').length + 1), encoger(sub, 3)]
          })()`,
          returnByValue: true,
        })
        await dormir(200)
        const shot = await c.enviar('Page.captureScreenshot', {
          format: 'png', fromSurface: true, captureBeyondViewport: false,
          clip: { x: 0, y: 0, width: tam.w, height: tam.h, scale: 1 },
        })
        const dir = resolve(SALIDA, tam.id, id)
        mkdirSync(dir, { recursive: true })
        writeFileSync(resolve(dir, '0' + s.n + '.png'), Buffer.from(shot.data, 'base64'))
      }
    }
    console.log(id + ' ✓')
  }
  await c.enviar('Emulation.clearDeviceMetricsOverride')
})

await conWs(v.webSocketDebuggerUrl, (c) => c.enviar('Target.closeTarget', { targetId }))
console.log(hechas + ' láminas')
