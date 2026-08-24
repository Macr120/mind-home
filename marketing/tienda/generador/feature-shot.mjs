// Captura la casa demo en formato panorámico ancho, para el gráfico destacado
// de Play (1024×500). Necesita el Chrome del piloto ya en la app con el modo
// demo activo (mismo flujo que capturar.mjs, pero una sola escena y una sola
// conexión WS de principio a fin: Emulation.setFocusEmulationEnabled solo dura
// mientras el socket sigue abierto).
import { writeFileSync, mkdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'

const PORT = 9333
const RAIZ = dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'))
const SHOTS = resolve(RAIZ, '..', 'shots')
mkdirSync(SHOTS, { recursive: true })

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

const ANCHO = 2048
const ALTO = 1000 // 2× 1024×500 — margen de calidad para el reescalado final

const t = (await lista()).find((x) => x.type === 'page' && x.url.includes('localhost:53378'))
if (!t) throw new Error('no hay pestaña con la app abierta')

await conWs(t.webSocketDebuggerUrl, async (c) => {
  await c.enviar('Page.enable')
  await c.enviar('Runtime.enable')
  await c.enviar('Emulation.setFocusEmulationEnabled', { enabled: true })
  await c.enviar('Emulation.setDeviceMetricsOverride', {
    width: ANCHO, height: ALTO, deviceScaleFactor: 1, mobile: false, screenWidth: ANCHO, screenHeight: ALTO,
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

  const r = await evaluar(`
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
    const m = await import('/src/core/state/layoutStore.ts')
    if (useHouse.getState().explotado) useHouse.getState().toggleExplotado()
    await sleep(400)
    useCiclo.setState({ minutos: 12 * 60, modo: 'manual' })
    // Casa: bloque cuadrado 3x3 de nivel 0/1, x en [-60,-44], z en [-36,-20] (8 u. por cuarto).
    useCam.setState({ az: Math.PI / 2, el: Math.PI / 2 - 0.02, vista: 'iso' })
    useCam.getState().enfocarZona([0, 1, 0], 144, 96)
    await sleep(500)
    // Fuera el chip "Salir de la demo" (fixed, arriba) y TODO el HUD (menú, reloj,
    // cubo de vista, barra de chat, etiquetas de plantas…): solo queda el canvas 3D.
    document.querySelectorAll('div').forEach((e) => {
      const cl = e.className
      if (typeof cl === 'string' && cl.includes('z-[45]') && cl.includes('fixed') && cl.includes('top-')) {
        e.style.display = 'none'
      }
    })
    const hud = [...document.querySelectorAll('div')].find((e) => (e.className || '') === 'relative h-full w-full')
    if (hud) [...hud.children].slice(1).forEach((e) => { e.style.display = 'none' })
    const st = window.__r3f()
    st.gl.setPixelRatio(1) // el canvas YA está a 2048x1000: no hace falta multiplicar
    st.gl.setSize(st.size.width, st.size.height, true)
    st.invalidate()
    await sleep(1600)
    const cam2 = st.camera
    const w2 = st.size.width, h2 = st.size.height
    const V3 = st.scene.children[0].position.constructor
    const esquinas = [
      [-72, 0, -48], [72, 0, -48], [-72, 0, 48], [72, 0, 48],
      [-72, 8, -48], [72, 8, -48], [-72, 8, 48], [72, 8, 48],
    ]
    let x0=1e9,x1=-1e9,y0=1e9,y1=-1e9
    for (const [x,y,z] of esquinas) {
      const v = new V3(x, y, z)
      v.project(cam2)
      const px = (v.x * 0.5 + 0.5) * w2
      const py = (1 - (v.y * 0.5 + 0.5)) * h2
      x0 = Math.min(x0, px); x1 = Math.max(x1, px)
      y0 = Math.min(y0, py); y1 = Math.max(y1, py)
    }
    return { zoom: useCam.getState().zoom, focus: useCam.getState().focus, canvas: [w2, h2], bboxCasa: [x0, x1, y0, y1] }
  `)
  console.log(JSON.stringify(r))

  const shot = await c.enviar('Page.captureScreenshot', {
    format: 'png', fromSurface: true, captureBeyondViewport: false,
    clip: { x: 0, y: 0, width: ANCHO, height: ALTO, scale: 1 },
  })
  writeFileSync(resolve(SHOTS, 'mapa-completo.png'), Buffer.from(shot.data, 'base64'))
  console.log('ok mapa-completo.png')

  await c.enviar('Emulation.clearDeviceMetricsOverride')
})
