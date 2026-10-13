// Captura la casa demo para la cabecera del App Store («Header and Search
// Results», 16:9 a 5244×2950). Esa resolución (15 MP) tumba la escena WebGL
// (ver el README: más de ~3 MP crashea la pestaña), así que se renderiza en
// MOSAICO: la cámara recorta con `setViewOffset` cada uno de los 3×3 trozos
// del encuadre completo y cada trozo sale a 1748×984, su tamaño nativo. El
// exportador los vuelve a juntar sin reescalar.
//
// La escena no lleva texto, así que basta con UN idioma (la lámina pone el
// titular traducido encima). Necesita el Chrome del piloto con la app abierta
// en modo demo. Uso:
//   node capturar-cabecera.mjs           mosaico completo → capturas/cabecera/t-<f>-<c>.png
//   node capturar-cabecera.mjs --prueba  una sola toma 1748×984 → capturas/cabecera/prueba.png
import { writeFileSync, mkdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'

const PORT = 9333
const RAIZ = dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'))
const SALIDA = resolve(RAIZ, '..', 'capturas', 'cabecera')
mkdirSync(SALIDA, { recursive: true })
const PUERTO_APP = process.env.MH_PUERTO || '53378'

/** Un trozo del mosaico; 3×3 trozos = 5244×2952 (el exportador recorta 2 px). */
export const TROZO = { w: 1748, h: 984, n: 3 }

const prueba = process.argv.includes('--prueba')
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

const t = (await lista()).find((x) => x.type === 'page' && x.url.includes(`localhost:${PUERTO_APP}`))
if (!t) throw new Error(`no hay pestaña con la app abierta en localhost:${PUERTO_APP}`)

// La ventana real tiene que cubrir el viewport emulado o Chrome lo recorta.
const v = await (await fetch(`http://127.0.0.1:${PORT}/json/version`)).json()
await conWs(v.webSocketDebuggerUrl, async (c) => {
  const { windowId } = await c.enviar('Browser.getWindowForTarget', { targetId: t.id })
  await c.enviar('Browser.setWindowBounds', { windowId, bounds: { width: TROZO.w + 100, height: TROZO.h + 200, windowState: 'normal' } })
})

await conWs(t.webSocketDebuggerUrl, async (c) => {
  await c.enviar('Page.enable')
  await c.enviar('Runtime.enable')
  await c.enviar('Emulation.setFocusEmulationEnabled', { enabled: true })
  await c.enviar('Emulation.setDeviceMetricsOverride', {
    width: TROZO.w, height: TROZO.h, deviceScaleFactor: 1, mobile: false, screenWidth: TROZO.w, screenHeight: TROZO.h,
  })
  const evaluar = async (cuerpo) => {
    const r = await c.enviar('Runtime.evaluate', { expression: `(async () => {\n${cuerpo}\n})()`, awaitPromise: true, returnByValue: true })
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || 'excepción')
    return r.result?.value
  }

  for (let i = 0; i < 60; i++) {
    const listo = await evaluar(`return !!window.__r3f && !!window.useHouse && !!document.querySelector('canvas') && (window.useCuartos ? useCuartos.getState().cuartos.length >= 17 : false)`).catch(() => false)
    if (listo) break
    await dormir(1500)
  }
  await dormir(2500)

  // Misma escena que la lámina 1 (isométrica de mediodía) pero apaisada: la casa
  // a la derecha del centro, para que el titular de la izquierda no la tape.
  console.log(JSON.stringify(await evaluar(`
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
    if (useHouse.getState().explotado) useHouse.getState().toggleExplotado()
    await sleep(400)
    useCiclo.setState({ minutos: 12 * 60, modo: 'manual' })
    useCam.setState({ az: Math.PI / 4, el: 0.6154797086703873, vista: 'iso' })
    useCam.getState().enfocarZona([-58, 1, -22], 42, 42)
    await sleep(300)
    document.querySelectorAll('div').forEach((e) => {
      const cl = e.className
      if (typeof cl === 'string' && cl.includes('z-[45]') && cl.includes('fixed') && cl.includes('top-')) e.style.display = 'none'
    })
    document.querySelectorAll('div.ui-panel-glass.rounded-full').forEach((e) => {
      (e.closest('[class*="fixed"]') || e).style.display = 'none'
    })
    const hud = [...document.querySelectorAll('div')].find((e) => (e.className || '') === 'relative h-full w-full')
    if (hud) [...hud.children].slice(1).forEach((e) => { e.style.display = 'none' })
    const st = window.__r3f()
    st.gl.setPixelRatio(1)
    st.gl.setSize(st.size.width, st.size.height, true)
    st.invalidate()
    await sleep(6000)
    return { zoom: useCam.getState().zoom, canvas: [st.size.width, st.size.height] }
  `)))

  const foto = async (nombre) => {
    const shot = await c.enviar('Page.captureScreenshot', {
      format: 'png', fromSurface: true, captureBeyondViewport: false,
      clip: { x: 0, y: 0, width: TROZO.w, height: TROZO.h, scale: 1 },
    })
    writeFileSync(resolve(SALIDA, nombre), Buffer.from(shot.data, 'base64'))
    console.log('  ' + nombre)
  }

  if (prueba) {
    await foto('prueba.png')
  } else {
    for (let f = 0; f < TROZO.n; f++) {
      for (let k = 0; k < TROZO.n; k++) {
        await evaluar(`
          const st = window.__r3f()
          // CameraRig borra el recorte en cada fotograma (cam.clearViewOffset): mientras
          // dura el mosaico se anula en ESTA cámara y al final se devuelve el original.
          if (!Object.hasOwn(st.camera, 'clearViewOffset')) st.camera.clearViewOffset = () => {}
          st.camera.setViewOffset(${TROZO.w * TROZO.n}, ${TROZO.h * TROZO.n}, ${k * TROZO.w}, ${f * TROZO.h}, ${TROZO.w}, ${TROZO.h})
          st.camera.updateProjectionMatrix()
          st.invalidate()
          await new Promise((r) => setTimeout(r, 1200))
        `)
        await foto(`t-${f}-${k}.png`)
      }
    }
    await evaluar(`const st = window.__r3f(); delete st.camera.clearViewOffset; st.camera.clearViewOffset(); st.camera.updateProjectionMatrix(); st.invalidate()`)
  }
  await c.enviar('Emulation.clearDeviceMetricsOverride')
})
console.log('listo')
