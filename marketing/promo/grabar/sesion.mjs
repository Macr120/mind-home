// Sesión CDP del Chrome grabador: arranque, WebSocket con eventos, espera al
// DemoGate y las ayudas que se inyectan en cada escena. Hereda el know-how de
// `marketing/tienda/generador/{cdp,capturar-windows}.mjs` (mismo piloto, otro
// puerto y otro perfil para no pisar el de las capturas de tienda).
import { spawn } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// Varias instancias en paralelo (idiomas repartidos): cada una con su puerto CDP
// y su perfil de Chrome, p. ej. GRABAR_PUERTO=9335 GRABAR_PERFIL=perfil-chrome-2.
export const PORT = Number(process.env.GRABAR_PUERTO || 9334)
export const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe'
export const APP = process.env.MPH_APP || 'http://localhost:53378/'
/** Viewport CSS del teléfono; a escala 3 da exactamente 1080×1920 (2,07 MP: bajo el techo que revienta WebGL). */
export const W = 360
export const H = 640
export const DSF = 3
const RAIZ = path.dirname(fileURLToPath(import.meta.url))
export const PERFIL = process.env.GRABAR_PERFIL ? path.resolve(RAIZ, '..', process.env.GRABAR_PERFIL) : path.join(RAIZ, '..', 'perfil-chrome')

export const dormir = (ms) => new Promise((r) => setTimeout(r, ms))
export const lista = async () => (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()

async function vivo() {
  try {
    await lista()
    return true
  } catch {
    return false
  }
}

/** Lanza el Chrome grabador si no está ya. Devuelve true si lo arrancó. */
export async function arrancarChrome() {
  if (await vivo()) return false
  mkdirSync(PERFIL, { recursive: true })
  const args = [
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${PERFIL}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-features=Translate,MediaRouter',
    '--hide-scrollbars',
    // Escala REAL de 3 (no emulada): así la captura de pestaña sale a 1080×1920 físicos.
    `--force-device-scale-factor=${DSF}`,
    // Alto de sobra para el viewport emulado + pestañas + barra + el aviso de «compartiendo pestaña».
    `--window-size=${W + 20},${H + 200}`,
    '--window-position=0,0',
    '--autoplay-policy=no-user-gesture-required',
    // getDisplayMedia elige esta pestaña sin abrir el selector (coincide con el <title> de la app).
    '--auto-select-tab-capture-source-by-title=Mind Planner Home',
    '--disable-background-timer-throttling',
    '--disable-renderer-backgrounding',
    '--disable-backgrounding-occluded-windows',
    APP,
  ]
  const p = spawn(CHROME, args, { detached: true, stdio: 'ignore' })
  p.unref()
  for (let i = 0; i < 60 && !(await vivo()); i++) await dormir(500)
  return true
}

export async function cerrarChrome() {
  try {
    await conNavegador((c) => c.enviar('Browser.close'))
  } catch {}
}

/**
 * Cliente CDP mínimo sobre el WebSocket nativo de Node. `enviar` manda un
 * comando; `escuchar` registra un oyente de eventos (p. ej. la descarga).
 */
export function conWs(url, fn) {
  return new Promise((res, rej) => {
    const ws = new WebSocket(url)
    let id = 0
    const pend = new Map()
    const oyentes = new Map()
    ws.onmessage = (e) => {
      const m = JSON.parse(e.data)
      if (m.id && pend.has(m.id)) {
        const { ok, ko } = pend.get(m.id)
        pend.delete(m.id)
        m.error ? ko(new Error(JSON.stringify(m.error))) : ok(m.result)
      } else if (m.method && oyentes.has(m.method)) {
        for (const cb of oyentes.get(m.method)) cb(m.params)
      }
    }
    ws.onerror = () => rej(new Error('ws error'))
    ws.onclose = () => rej(new Error('ws cerrado'))
    ws.onopen = async () => {
      const enviar = (metodo, params = {}) => {
        const p = new Promise((ok, ko) => {
          const n = ++id
          pend.set(n, { ok, ko })
          ws.send(JSON.stringify({ id: n, method: metodo, params }))
        })
        // Un reload deja llamadas colgadas que rechazan sin dueño: marcarlas atendidas.
        p.catch(() => {})
        return p
      }
      const escuchar = (metodo, cb) => {
        if (!oyentes.has(metodo)) oyentes.set(metodo, new Set())
        oyentes.get(metodo).add(cb)
        return () => oyentes.get(metodo)?.delete(cb)
      }
      try {
        const r = await fn({ enviar, escuchar })
        ws.close()
        res(r)
      } catch (err) {
        ws.close()
        rej(err)
      }
    }
  })
}

export async function conNavegador(fn) {
  const v = await (await fetch(`http://127.0.0.1:${PORT}/json/version`)).json()
  return conWs(v.webSocketDebuggerUrl, fn)
}

/** La pestaña con la app, buscada de nuevo cada vez (el reload la renueva). */
export async function pestana() {
  const t = (await lista()).find((x) => x.type === 'page' && x.url.includes('localhost:53378'))
  if (!t) throw new Error('no hay pestaña con la app; ¿está levantado mind-home-pruebas (53378)?')
  return t
}

/** Sesión de página con el viewport del teléfono y la pestaña siempre «visible» para R3F. */
export async function conSesion(fn) {
  const t = await pestana()
  return conWs(t.webSocketDebuggerUrl, async (c) => {
    await c.enviar('Page.enable')
    await c.enviar('Runtime.enable')
    await c.enviar('Emulation.setFocusEmulationEnabled', { enabled: true })
    await aplicarViewport(c)
    return fn(c, t)
  })
}

/**
 * Viewport emulado del teléfono. deviceScaleFactor 0 = el real del proceso (el
 * --force-device-scale-factor=3). Medido con getDisplayMedia: la captura de
 * pestaña toma el ÁREA DE CONTENIDO REAL de la ventana y la escala para que quepa
 * en la «pantalla» emulada (screenWidth×3 por screenHeight×3). Por eso el ancho
 * de contenido tiene que ser EXACTAMENTE 360 DIP (ver `ajustarVentana`) y la
 * pantalla emulada, alta de sobra: así no escala nada y el viewport queda en
 * los 1080×1920 de la esquina superior izquierda, que recorta ffmpeg.
 */
export async function aplicarViewport(c, pantalla = { ancho: W, alto: H * 2 }) {
  await c.enviar('Emulation.setDeviceMetricsOverride', {
    width: W,
    height: H,
    deviceScaleFactor: 0,
    mobile: false,
    screenWidth: pantalla.ancho,
    screenHeight: pantalla.alto,
  })
}

/**
 * Chrome no deja ventanas de menos de ~512 DIP de ancho, así que el área de
 * contenido siempre es MÁS ANCHA que el viewport emulado. La salida: medir ese
 * área real (con el override quitado, porque con él `innerWidth` devuelve el
 * emulado) y declarar una «pantalla» emulada de ese mismo tamaño, para que la
 * captura no escale nada. El viewport queda 1:1 en la esquina superior
 * izquierda y lo demás se recorta.
 */
export async function ajustarVentana(c, b, targetId) {
  const { windowId } = await b.enviar('Browser.getWindowForTarget', { targetId })
  await b.enviar('Browser.setWindowBounds', { windowId, bounds: { left: 0, top: 0, width: 520, height: H + 300, windowState: 'normal' } })
  await dormir(500)
  await c.enviar('Emulation.clearDeviceMetricsOverride')
  await dormir(400)
  const r = await c.enviar('Runtime.evaluate', { expression: '[innerWidth, innerHeight]', returnByValue: true })
  const [iw, ih] = r.result?.value || [0, 0]
  if (iw < W || ih < H + 60) throw new Error(`el área de contenido (${iw}×${ih}) no cubre el viewport de ${W}×${H} más el aviso de captura`)
  await aplicarViewport(c, { ancho: iw, alto: ih * 2 })
  return { iw, ih }
}

/**
 * Pone idioma + demo y espera a que el DemoGate reconstruya la casa de Pep@.
 * Copiado de `capturar-windows.mjs`: `Page.navigate` (no `location.reload`),
 * marca `__viejo` para no dar por bueno el contexto anterior, hasta 300 s, y
 * comprobación de que la página no vuelve a recargarse.
 */
export async function esperarDemo(c, id) {
  try {
    await c.enviar('Runtime.evaluate', {
      expression: `(() => {
        window.__viejo = 1
        localStorage.setItem('mh.demo', '1')
        localStorage.removeItem('mh.probar')
        localStorage.setItem('mh.idioma', ${JSON.stringify(id)})
      })()`,
      returnByValue: true,
    })
  } catch {}
  try {
    await c.enviar('Page.navigate', { url: APP })
  } catch {}
  const CONDICION = `(() => {
    if (window.__viejo) return false
    const v = localStorage.getItem('mh.demo.version') || ''
    if (!v.endsWith(':' + ${JSON.stringify(id)})) return false
    const g = ['useHouse', 'useCam', 'useCiclo', 'useDiseño', 'useLayout', 'useMascota', 'useCuartos', 'useHerramienta']
    if (!g.every((k) => !!window[k])) return false
    return useCuartos.getState().cuartos.length >= 17 && !!window.__r3f && !!document.querySelector('canvas')
  })()`
  const esperar = async (vueltas) => {
    for (let i = 0; i < vueltas; i++) {
      await dormir(2000)
      try {
        const r = await c.enviar('Runtime.evaluate', { expression: CONDICION, returnByValue: true })
        if (r.result?.value) return true
      } catch {}
    }
    return false
  }
  if (!(await esperar(150))) return 'sin reconstruir: se salta'
  await dormir(4000)
  if (!(await esperar(30))) return 'el contexto se recargó y no volvió: se salta'
  let estable = false
  for (let i = 0; i < 6 && !estable; i++) {
    await c.enviar('Runtime.evaluate', { expression: 'window.__captura = 1' })
    await dormir(12000)
    estable = await intacto(c)
    if (!estable) await esperar(60)
  }
  return estable ? 'ok' : 'la página no deja de recargarse: se salta'
}

/** ¿Sigue siendo la misma página (sin recargas) desde que se marcó? */
export async function intacto(c) {
  try {
    const r = await c.enviar('Runtime.evaluate', {
      expression: '(() => window.__captura === 1 && !!window.useHouse)()',
      returnByValue: true,
    })
    return !!r.result?.value
  } catch {
    return false
  }
}

/** Nombre de la GPU que usa WebGL en esa pestaña (para avisar si no es la dedicada). */
export async function gpu(c) {
  const r = await c.enviar('Runtime.evaluate', {
    expression: `(() => {
      const gl = document.createElement('canvas').getContext('webgl')
      const d = gl && gl.getExtension('WEBGL_debug_renderer_info')
      return d ? gl.getParameter(d.UNMASKED_RENDERER_WEBGL) : 'desconocida'
    })()`,
    returnByValue: true,
  })
  return r.result?.value
}

/**
 * Ayudas inyectadas al principio de CADA escena (se pierden al recargar).
 * Las escenas de `escenas.mjs` las usan como si fueran globales.
 */
export const AYUDAS = `
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const ISO_EL = 0.6154797086703873
const ISO_AZ = Math.PI / 4
/** El chip «salir de la demo» no es parte del producto: fuera (se localiza por clases, el texto cambia de idioma). */
const ocultarChipDemo = () => {
  document.querySelectorAll('div').forEach((e) => {
    const c = e.className
    if (typeof c === 'string' && c.includes('z-[45]') && c.includes('fixed') && c.includes('top-')) e.style.display = 'none'
  })
}
/** Lienzo 3D a 3× (el dpr del Canvas de R3F lo capa a 1.5). */
const prep = () => {
  const st = window.__r3f()
  st.gl.setPixelRatio(${DSF})
  st.gl.setSize(st.size.width, st.size.height, true)
  st.invalidate()
  ocultarChipDemo()
}
/** La instancia REAL de un módulo (con el ?t= de HMR que cargó la app), no un duplicado. */
const modulo = async (ruta) => {
  const e = performance.getEntriesByType('resource').filter((x) => x.name.includes(ruta)).sort((a, b) => a.startTime - b.startTime)[0]
  return import(e ? e.name : ruta)
}
const lerp = (a, b, q) => a + (b - a) * q
const ease = (q) => (q < 0.5 ? 2 * q * q : 1 - Math.pow(-2 * q + 2, 2) / 2)
const easeOut = (q) => 1 - Math.pow(1 - q, 3)
const easeIn = (q) => q * q * q
const camAhora = () => { const s = useCam.getState(); return { focus: [s.focus[0], s.focus[1], s.focus[2]], zoom: s.zoom, az: s.az, el: s.el } }
/** Mueve la cámara de A a B en ms por rAF; el CameraRig añade su propio suavizado. */
const moverCam = (a, b, ms, fn = ease) => new Promise((r) => {
  const t0 = performance.now()
  const paso = () => {
    const q = Math.min(1, (performance.now() - t0) / ms)
    const e = fn(q)
    useCam.setState({
      focus: [lerp(a.focus[0], b.focus[0], e), lerp(a.focus[1], b.focus[1], e), lerp(a.focus[2], b.focus[2], e)],
      zoom: lerp(a.zoom, b.zoom, e), az: lerp(a.az, b.az, e), el: lerp(a.el, b.el, e),
    })
    if (q < 1) requestAnimationFrame(paso); else r()
  }
  paso()
})
/** Corte seco a un encuadre (sin easing del CameraRig). */
const cortarCam = async (b) => {
  const cs = await modulo('/src/core/state/cameraStore.ts')
  cs.camSalto.pendiente = true
  useCam.setState({ ...b, vista: 'iso' })
}
/** Encuadre sobre el jugador. */
const camJugador = async (zoom, dy = -1.6) => {
  const hs = await modulo('/src/core/state/houseStore.ts')
  const p = hs.playerPos
  return { focus: [p.x, p.y + dy, p.z], zoom, az: ISO_AZ, el: ISO_EL }
}
const CASA = { focus: [-52, 1, -28], zoom: 13, az: ISO_AZ, el: ISO_EL }
const escape = () => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
const abrirApp = async (id, seccion) => { const m = await modulo('/src/core/abrirApp.ts'); return m.abrirApp(id, seccion) }
/**
 * Los avisos modales del demo/plan («Estás en la casa demo», sesión, cuota…)
 * se abren solos en la primera escritura y taparían la toma: se cierran y se
 * les anula el «abrir» para el resto de la sesión.
 */
const silenciarAvisos = async () => {
  const m = await modulo('/src/core/state/avisosPlanStore.ts')
  for (const s of [m.useAvisoDemo, m.useAvisoSesion, m.useCuotaAgotada, m.useAvisoRenovar]) {
    if (s) s.setState({ abierto: false, abrir: () => {} })
  }
}
/** Cierra todo lo que una escena anterior pudo dejar abierto. */
const limpiarTodo = async () => {
  await silenciarAvisos()
  escape()
  // Ciclo día/noche APAGADO y fijo a media mañana: toda la grabación con luz plena.
  useCiclo.setState({ minutos: 11 * 60, modo: 'manual' })
  useHouse.getState().closeRoom()
  ;(await modulo('/src/core/state/rutinasUiStore.ts')).useRutinasUI.getState().cerrarCalendario()
  ;(await modulo('/src/core/state/previaPlantillaStore.ts')).usePreviaPlantilla.getState().cerrar()
  ;(await modulo('/src/core/state/sisifoUiStore.ts')).useSisifoUi.getState().cerrar()
  ;(await modulo('/src/core/state/wrappedUiStore.ts')).useWrappedUi.getState().cerrar()
  ;(await modulo('/src/core/state/demoEjercicioStore.ts')).useDemoEjercicio.getState().cerrar()
  ;(await modulo('/src/core/state/hudStore.ts')).useHud.getState().setMenuAbierto(false)
  if (useLayout.getState().editMode) useLayout.getState().setEditMode(false)
  useMascota.getState().cerrarConversacion()
  useHerramienta.getState().setEmote(null)
  await sleep(400)
}
/** Desplaza suavemente la caja con scroll más grande que haya en pantalla (el cuerpo de la app abierta). */
const desplazar = async (px, ms) => {
  const cajas = [...document.querySelectorAll('*')].filter((e) => e.scrollHeight > e.clientHeight + 40 && ['auto', 'scroll'].includes(getComputedStyle(e).overflowY))
  const c = cajas.sort((a, b) => b.clientHeight * b.clientWidth - a.clientHeight * a.clientWidth)[0]
  if (!c) return false
  const t0 = performance.now()
  const y0 = c.scrollTop
  await new Promise((r) => {
    const paso = () => {
      const q = Math.min(1, (performance.now() - t0) / ms)
      c.scrollTop = y0 + px * ease(q)
      if (q < 1) requestAnimationFrame(paso); else r()
    }
    paso()
  })
  return true
}
`
