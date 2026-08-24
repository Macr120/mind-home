// Captura la casa (misma escena que la lámina 1) en formato iPad nativo
// (1024×1366, seguro contra el crash de >~3MP) para los 16 idiomas.
// Necesita el Chrome del piloto arrancado y la ventana agrandada (node cdp.mjs
// arranca + resize.mjs). Uso: node capturar-ipad.mjs [es en ...]
import { writeFileSync, mkdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { IDIOMAS } from './componer.mjs'

const PORT = 9333
const RAIZ = dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'))
const SHOTS = resolve(RAIZ, '..', 'shots')

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

const W = 1024
const H = 1366

const pedidos = process.argv.slice(2).filter((a) => IDIOMAS.includes(a))
const objetivo = pedidos.length ? pedidos : IDIOMAS

const t = (await lista()).find((x) => x.type === 'page' && x.url.includes('localhost:53378'))
if (!t) throw new Error('no hay pestaña con la app abierta')

await conWs(t.webSocketDebuggerUrl, async (c) => {
  await c.enviar('Page.enable')
  await c.enviar('Runtime.enable')
  await c.enviar('Emulation.setFocusEmulationEnabled', { enabled: true })
  await c.enviar('Emulation.setDeviceMetricsOverride', {
    width: W, height: H, deviceScaleFactor: 1, mobile: false, screenWidth: W, screenHeight: H,
  })

  const evaluar = async (cuerpo) => {
    const r = await c.enviar('Runtime.evaluate', {
      expression: `(async () => {\n${cuerpo}\n})()`,
      awaitPromise: true,
      returnByValue: true,
    })
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || 'excepción')
    return r.result?.value
  }

  for (const id of objetivo) {
    console.log('=== ' + id + ' ===')
    // SIN awaitPromise: `location.reload()` destruye el contexto de JS a mitad
    // de camino, y con awaitPromise:true esa promesa nunca se resuelve.
    try {
      await c.enviar('Runtime.evaluate', {
        expression: `(() => {
          localStorage.setItem('mh.demo', '1')
          localStorage.removeItem('mh.probar')
          localStorage.setItem('mh.idioma', ${JSON.stringify(id)})
          Object.keys(localStorage).filter((k) => k.includes('sandbox.sucio')).forEach((k) => localStorage.removeItem(k))
          location.reload()
        })()`,
      })
    } catch {}
    let listo = false
    for (let i = 0; i < 60; i++) {
      await dormir(1500)
      try {
        const r = await evaluar(`
          return !!window.__r3f && !!document.querySelector('canvas') &&
            (window.useCuartos ? useCuartos.getState().cuartos.length >= 17 : false)
        `)
        if (r) { listo = true; break }
      } catch {}
    }
    if (!listo) { console.log('  ¡sin reconstruir! se salta'); continue }
    await dormir(2500)

    const r = await evaluar(`
      const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
      if (useHouse.getState().explotado) useHouse.getState().toggleExplotado()
      await sleep(400)
      useCiclo.setState({ minutos: 12 * 60, modo: 'manual' })
      useCam.setState({ az: Math.PI / 4, el: 0.6154797086703873, vista: 'iso' })
      useCam.getState().enfocarZona([-52, 1, -28], 30, 30)
      await sleep(300)
      document.querySelectorAll('div').forEach((e) => {
        const cl = e.className
        if (typeof cl === 'string' && cl.includes('z-[45]') && cl.includes('fixed') && cl.includes('top-')) {
          e.style.display = 'none'
        }
      })
      const hud = [...document.querySelectorAll('div')].find((e) => (e.className || '') === 'relative h-full w-full')
      if (hud) [...hud.children].slice(1).forEach((e) => { e.style.display = 'none' })
      const st = window.__r3f()
      st.gl.setPixelRatio(1)
      st.gl.setSize(st.size.width, st.size.height, true)
      st.invalidate()
      await sleep(1500)
      return { zoom: useCam.getState().zoom }
    `)
    console.log('  ' + JSON.stringify(r))

    const dir = resolve(SHOTS, id)
    mkdirSync(dir, { recursive: true })
    const shot = await c.enviar('Page.captureScreenshot', {
      format: 'png', fromSurface: true, captureBeyondViewport: false,
      clip: { x: 0, y: 0, width: W, height: H, scale: 1 },
    })
    writeFileSync(resolve(dir, 'ipad-casa.png'), Buffer.from(shot.data, 'base64'))
    console.log('  ipad-casa.png ok')
  }
  await c.enviar('Emulation.clearDeviceMetricsOverride')
})
console.log('capturas listas')
