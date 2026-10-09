// Piloto compartido de las guías: el Chrome headless del grabador, la captura
// de pestaña (video + audio) y el recorte. Lo usan grabar.mjs (la página),
// casa.mjs (tomas en la casa de la app), memes.mjs y montar.mjs.
//
// Mismo know-how que la promo (marketing/promo/grabar/): captura con
// getDisplayMedia + MediaRecorder dentro de la página, descarga por CDP y ffmpeg.
import { spawn, execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { mkdirSync, readdirSync, statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { conWs, dormir } from '../promo/grabar/sesion.mjs'

export { conWs, dormir }
export const ejecutar = promisify(execFile)
export const RAIZ = path.dirname(fileURLToPath(import.meta.url))
export const PORT = Number(process.env.GRABAR_PUERTO || 9337)
export const FFMPEG = process.env.FFMPEG || 'ffmpeg'
export const FFPROBE = process.env.FFPROBE || 'ffprobe'
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe'
// Un perfil por puerto: varios grabadores en paralelo (GRABAR_PUERTO) no comparten Chrome.
const PERFIL = path.join(RAIZ, PORT === 9337 ? 'perfil-chrome-headless' : `perfil-chrome-headless-${PORT}`)
/** Viewport CSS de las tomas: la maqueta de escritorio con letra grande, que es lo que se lee en un teléfono. */
export const W = 720
/** Lado del video final. */
export const LADO = 1080
/**
 * Ventana (DIP) del Chrome headless: holgada para el viewport de 720 CSS a
 * escala 1,5 (1080 px) más el aviso de captura. Con ventana visible no cabía en
 * la pantalla del equipo (720 DIP de alto al 150 %) y Windows la encogía a media toma.
 */
const VENTANA = { ancho: 900, alto: 1000 }
/** Segundo de la toma desde el que se conserva: la marca tarda ~0,5 s en irse tras arrancar la acción (a 1,5 s). */
export const DESDE = 1.8

export const lista = async () => (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()
const vivo = () => lista().then(() => true, () => false)

export async function arrancarChrome() {
  if (await vivo()) return
  mkdirSync(PERFIL, { recursive: true })
  spawn(
    CHROME,
    [
      `--remote-debugging-port=${PORT}`,
      `--user-data-dir=${PERFIL}`,
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-features=Translate,MediaRouter',
      '--hide-scrollbars',
      `--force-device-scale-factor=${LADO / W}`,
      `--window-size=${VENTANA.ancho},${VENTANA.alto}`,
      // Sin ventana: la pantalla del equipo no deja una ventana con un cuadro de 1080 px.
      '--headless=new',
      '--autoplay-policy=no-user-gesture-required',
      // getDisplayMedia elige esta pestaña sin selector (el <title> de las guías y de la app lleva la marca).
      '--auto-select-tab-capture-source-by-title=MindHaOS',
      '--disable-background-timer-throttling',
      '--disable-renderer-backgrounding',
      '--disable-backgrounding-occluded-windows',
      'about:blank',
    ],
    { detached: true, stdio: 'ignore' },
  ).unref()
  for (let i = 0; i < 60 && !(await vivo()); i++) await dormir(500)
}

export async function evaluar(c, expression, extra = {}) {
  const r = await c.enviar('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true, ...extra })
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text)
  return r.result?.value
}

/**
 * Abre la página y el navegador con las descargas en `dir`. La sesión del
 * navegador queda abierta mientras corre `fn`: al cerrarla, Chrome olvida la
 * carpeta y las tomas acaban en Descargas del usuario.
 */
export async function conPagina(dir, fn) {
  await arrancarChrome()
  mkdirSync(dir, { recursive: true })
  const pagina = (await lista()).find((t) => t.type === 'page')
  const navegador = (await (await fetch(`http://127.0.0.1:${PORT}/json/version`)).json()).webSocketDebuggerUrl
  return conWs(navegador, async (b) => {
    await b.enviar('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: dir })
    const { windowId } = await b.enviar('Browser.getWindowForTarget', { targetId: pagina.id })
    await b.enviar('Browser.setWindowBounds', { windowId, bounds: { left: 0, top: 0, width: VENTANA.ancho, height: VENTANA.alto, windowState: 'normal' } })
    return conWs(pagina.webSocketDebuggerUrl, async (c) => {
      await c.enviar('Page.enable')
      await c.enviar('Runtime.enable')
      await c.enviar('Emulation.setFocusEmulationEnabled', { enabled: true })
      return fn(c)
    })
  })
}

/** Viewport (720×720 por omisión) sobre una «pantalla» emulada del tamaño del área real, para que la captura no escale. */
export async function fijarViewport(c, ancho = W, alto = W) {
  await c.enviar('Emulation.clearDeviceMetricsOverride')
  await dormir(1200)
  const [iw, ih, real] = await evaluar(c, '[innerWidth, innerHeight, devicePixelRatio]')
  const k = real / (LADO / W)
  await c.enviar('Emulation.setDeviceMetricsOverride', { width: ancho, height: alto, deviceScaleFactor: LADO / W, mobile: false, screenWidth: Math.floor(iw * k), screenHeight: Math.floor(ih * k) * 2 })
}

/** La marca del viewport para páginas que no la pintan solas (la app): cuadro verde en la esquina inferior derecha. */
export const PONER_MARCA = `document.body.insertAdjacentHTML('beforeend', '<i id="marca-grabador" style="position:fixed;right:0;bottom:0;width:6px;height:6px;background:#00ff00;z-index:2147483647"></i>')`
export const QUITAR_MARCA = `document.getElementById('marca-grabador')?.remove()`

/**
 * Código que corre DENTRO de la página: captura la pestaña (video + audio),
 * deja 1,5 s la marca a la vista, corre `accion` (que arranca y espera lo que
 * se graba) y descarga el archivo. `getDisplayMedia` va lo primero, antes de
 * cualquier await, para no perder el gesto de usuario.
 */
export const codigoCaptura = (nombre, accion, cola = 1400) => `(async () => {
  const pedir = navigator.mediaDevices.getDisplayMedia({
    video: { frameRate: 30 }, audio: { suppressLocalAudioPlayback: false },
    preferCurrentTab: true, selfBrowserSurface: 'include', surfaceSwitching: 'exclude',
  })
  const dormir = (ms) => new Promise((r) => setTimeout(r, ms))
  const flujo = await pedir
  await dormir(1500)
  const mime = ['video/webm;codecs=vp8,opus', 'video/webm'].find((m) => MediaRecorder.isTypeSupported(m))
  const trozos = []
  const rec = new MediaRecorder(flujo, { mimeType: mime, videoBitsPerSecond: 10000000, audioBitsPerSecond: 160000 })
  rec.ondataavailable = (e) => e.data.size && trozos.push(e.data)
  const fin = new Promise((r) => (rec.onstop = r))
  rec.start(1000)
  await dormir(1500)
  await (async () => { ${accion} })()
  await dormir(${cola})
  rec.stop()
  await fin
  flujo.getTracks().forEach((t) => t.stop())
  const blob = new Blob(trozos, { type: mime })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = ${JSON.stringify(nombre)} + '.webm'
  document.body.appendChild(a)
  a.click()
  return { mime, bytes: blob.size, audio: flujo.getAudioTracks().length }
})()`

export async function esperarDescarga(dir, prefijo, previo) {
  for (let i = 0; i < 240; i++) {
    const nuevo = readdirSync(dir).find((f) => f.startsWith(prefijo) && !f.endsWith('.crdownload') && !previo.has(f))
    if (nuevo) {
      const ruta = path.join(dir, nuevo)
      let tam = -1
      while (tam !== statSync(ruta).size) {
        tam = statSync(ruta).size
        await dormir(800)
      }
      return ruta
    }
    await dormir(500)
  }
  throw new Error('la descarga no llegó')
}

/**
 * Dónde acaba el viewport dentro de la captura: la marca verde de su esquina
 * inferior derecha. La escala de la captura no es fija, así que se mide en el
 * propio video.
 */
export async function medirViewport(crudo) {
  const { stdout: dims } = await ejecutar(FFPROBE, ['-v', 'error', '-select_streams', 'v', '-read_intervals', '%+#1', '-show_entries', 'frame=width,height', '-of', 'csv=p=0', crudo])
  const [ancho, alto] = dims.trim().split(/\r?\n/)[0].split(',').map(Number)
  const { stdout } = await ejecutar(FFMPEG, ['-v', 'error', '-ss', '0.4', '-i', crudo, '-frames:v', '1', '-vf', `scale=${ancho}:${alto}`, '-f', 'rawvideo', '-pix_fmt', 'rgb24', 'pipe:1'], { encoding: 'buffer', maxBuffer: 1 << 28 })
  let mx = -1
  let my = -1
  for (let y = 0; y < alto; y++) {
    for (let x = 0; x < ancho; x++) {
      const i = (y * ancho + x) * 3
      if (stdout[i + 1] > 180 && stdout[i] < 90 && stdout[i + 2] < 90) {
        if (x > mx) mx = x
        if (y > my) my = y
      }
    }
  }
  if (mx < 0) throw new Error('no encontré la marca del viewport en la captura')
  return { w: mx + 1, h: my + 1 }
}

/** Toma cruda → 1080×1080 (o `ancho`×`alto`), 30 fps constantes, H.264 + AAC (desde que se fue la marca). */
export async function recortar(crudo, destino, ancho = LADO, alto = LADO) {
  const vp = await medirViewport(crudo)
  await ejecutar(
    FFMPEG,
    ['-y', '-ss', String(DESDE), '-i', crudo, '-vf', `crop='min(iw,${vp.w})':'min(ih,${vp.h})':0:0,scale=${ancho}:${alto}:flags=lanczos,fps=30,format=yuv420p`, '-c:v', 'libx264', '-preset', 'medium', '-crf', '19', '-c:a', 'aac', '-b:a', '160k', '-ar', '48000', '-ac', '2', '-movflags', '+faststart', destino],
    { maxBuffer: 1 << 26 },
  )
  return vp
}
