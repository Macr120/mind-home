/**
 * Shell de escritorio de Mind Planner Home (Electron, Windows y macOS).
 *
 * Sirve la MISMA web compilada (`dist/`) bajo el protocolo propio `app://mph`,
 * sin preload y con los defaults de seguridad de Electron (contextIsolation,
 * sandbox, sin nodeIntegration): la app no necesita nada de Node, solo un
 * navegador con marco. Todo lo que sale del shell —el checkout de la web,
 * soporte, enlaces— se abre en el navegador del sistema.
 */
import { app, BrowserWindow, dialog, net, protocol, screen, shell } from 'electron'
import { execFile, spawn } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const RAIZ_WEB = path.join(__dirname, '..', 'dist')
const ORIGEN = 'app://mph'
// `--dev` (npm run escritorio:dev): carga el servidor de Vite en vez del build.
const URL_DEV = process.argv.includes('--dev') ? 'http://localhost:5173' : null

// Dos instancias serían dos Chromium sobre el MISMO perfil: IndexedDB corrupta.
if (!app.requestSingleInstanceLock()) app.quit()

// `esEscritorio()` (src/core/plataforma.ts) busca esta marca en el user agent;
// de ella cuelga `canalPago() === 'escritorio'` (el pago sale al navegador).
app.userAgentFallback += ` MindPlannerHome/${app.getVersion()}`
// Sin el AppUserModelID los toasts de Windows salen como «electron.app.mind-home».
app.setAppUserModelId('com.macr120.mindhome')

// Antes del ready, obligatorio. `standard`+`secure` hacen de app://mph un
// contexto seguro (crypto.subtle, getUserMedia); `allowServiceWorkers` es
// VITAL: sin él sw.js no registra y `notificar()` se queda esperando
// `serviceWorker.ready` para siempre — no saldría ni un aviso.
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'app',
    privileges: { standard: true, secure: true, supportFetchAPI: true, allowServiceWorkers: true, stream: true },
  },
])

/** Sirve `dist/` bajo app://mph con fallback SPA y sin path-traversal. */
async function responder(req) {
  const ruta = decodeURIComponent(new URL(req.url).pathname)
  let destino = path.normalize(path.join(RAIZ_WEB, ruta))
  // Fuera de dist/ (`..%2f..`) → como cualquier ruta inexistente: index.html.
  if (destino === RAIZ_WEB || destino.startsWith(RAIZ_WEB + path.sep)) {
    try {
      if ((await fs.stat(destino)).isDirectory()) destino = path.join(destino, 'index.html')
    } catch {
      destino = path.join(RAIZ_WEB, 'index.html')
    }
  } else {
    destino = path.join(RAIZ_WEB, 'index.html')
  }
  // net.fetch sobre file:// pone el Content-Type según la extensión.
  return net.fetch(pathToFileURL(destino).toString())
}

let ventana = null
let ventanaFondo = null

/**
 * Modo fondo (`--fondo`): la casa como wallpaper vivo. En Windows la ventana se
 * cuelga del WorkerW del escritorio (electron/fondo.ps1 — el truco de Wallpaper
 * Engine/Lively) y queda DETRÁS de los iconos; en macOS basta `type: 'desktop'`.
 * Ahí el SO ya no le manda input, así que el shell reenvía el cursor global con
 * `sendInputEvent` (mueve el puntero espacial de la app) y fondo-raton.ps1
 * avisa de los clics del botón izquierdo — solo se reenvían los que caen sobre
 * el escritorio, para que hacer clic dentro de otra app no mueva al personaje.
 * La app entra en este modo por la query `?fondo=1` (esModoFondo).
 */
function crearVentanaFondo() {
  const pantalla = screen.getPrimaryDisplay()
  ventanaFondo = new BrowserWindow({
    x: pantalla.bounds.x,
    y: pantalla.bounds.y,
    width: pantalla.bounds.width,
    height: pantalla.bounds.height,
    frame: false,
    skipTaskbar: true,
    backgroundColor: '#0f1115',
    // En Windows nace oculta: la muestra el propio fondo.ps1 (SWP_SHOWWINDOW)
    // ya colgada del WorkerW, para no ver la ventana suelta durante el arranque.
    show: process.platform === 'darwin',
    ...(process.platform === 'darwin' ? { type: 'desktop' } : {}),
  })
  const win = ventanaFondo

  // Cursor global → mousemove de la página, a ~30 Hz.
  const cursor = setInterval(() => {
    if (win.isDestroyed()) return
    const p = screen.getCursorScreenPoint()
    win.webContents.sendInputEvent({ type: 'mouseMove', x: p.x - pantalla.bounds.x, y: p.y - pantalla.bounds.y })
  }, 33)

  // Clic global (solo Windows): el helper emite «down True|False» y «up».
  let raton = null
  if (process.platform === 'win32') {
    raton = spawn('powershell.exe', [
      '-NoProfile',
      '-ExecutionPolicy',
      'Bypass',
      '-File',
      path.join(__dirname, 'fondo-raton.ps1'),
    ])
    let bajado = false
    raton.stdout.on('data', (buf) => {
      if (win.isDestroyed()) return
      for (const linea of String(buf).trim().split(/\r?\n/)) {
        const [tipo, sobreEscritorio] = linea.split(' ')
        const p = screen.getCursorScreenPoint()
        const ev = { x: p.x - pantalla.bounds.x, y: p.y - pantalla.bounds.y, button: 'left', clickCount: 1 }
        if (tipo === 'down' && sobreEscritorio === 'True') {
          bajado = true
          win.webContents.sendInputEvent({ type: 'mouseDown', ...ev })
        } else if (tipo === 'up' && bajado) {
          // El up se manda siempre que hubo down: un botón «pegado» en el
          // renderer dejaría al raycast de R3F creyendo que sigue el arrastre.
          bajado = false
          win.webContents.sendInputEvent({ type: 'mouseUp', ...ev })
        }
      }
    })
  }

  win.on('closed', () => {
    ventanaFondo = null
    clearInterval(cursor)
    raton?.kill()
  })

  void win.loadURL(`${ORIGEN}/?fondo=1`).then(() => {
    if (win.isDestroyed()) return
    if (process.platform !== 'win32') return
    const hwnd = win.getNativeWindowHandle().readBigUInt64LE(0).toString()
    execFile(
      'powershell.exe',
      ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', path.join(__dirname, 'fondo.ps1'), '-Hwnd', hwnd],
      (err) => {
        if (win.isDestroyed()) return
        // Si el reparent falló (Windows raro), que al menos se vea la ventana.
        if (err) console.warn('[MPH] fondo.ps1 falló:', err)
        if (!win.isVisible()) win.showInactive()
      },
    )
  })
}

function crearVentana() {
  ventana = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    backgroundColor: '#0f1115',
    autoHideMenuBar: true,
    show: false,
  })
  ventana.once('ready-to-show', () => ventana.show())
  ventana.on('closed', () => {
    ventana = null
  })

  // Cualquier salida es navegación de verdad: al navegador del sistema. Aquí
  // caen el checkout del escritorio (los enlaces a /cuenta de la web), soporte
  // y cualquier target="_blank" de la app.
  ventana.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/.test(url)) void shell.openExternal(url)
    return { action: 'deny' }
  })
  ventana.webContents.on('will-navigate', (e, url) => {
    if (url.startsWith(ORIGEN) || (URL_DEV && url.startsWith(URL_DEV))) return
    e.preventDefault()
    if (/^https?:/.test(url)) void shell.openExternal(url)
  })

  void ventana.loadURL(URL_DEV ?? `${ORIGEN}/`)
}

/**
 * Aviso de versión nueva, sin electron-updater en v1: mira la última release de
 * GitHub y ofrece abrirla en el navegador. Falla en silencio (sin red, sin
 * releases todavía) y solo corre empaquetada: en dev sería ruido.
 */
async function avisarVersionNueva() {
  try {
    const res = await net.fetch('https://api.github.com/repos/Macr120/mind-home/releases/latest')
    if (!res.ok) return
    const release = await res.json()
    const remota = String(release.tag_name ?? '').replace(/^v/, '')
    if (!remota || !esMayor(remota, app.getVersion()) || !ventana) return
    const { response } = await dialog.showMessageBox(ventana, {
      type: 'info',
      title: 'Mind Planner Home',
      message: `Hay una versión nueva (${remota}).`,
      detail: 'Descárgala para tener las últimas mejoras. Tus datos se quedan como están.',
      buttons: ['Descargar', 'Ahora no'],
      cancelId: 1,
    })
    if (response === 0) void shell.openExternal(release.html_url)
  } catch {
    /* sin red o sin releases: no se molesta */
  }
}

function esMayor(a, b) {
  const pa = a.split('.').map(Number)
  const pb = b.split('.').map(Number)
  for (let i = 0; i < 3; i++) {
    if ((pa[i] || 0) !== (pb[i] || 0)) return (pa[i] || 0) > (pb[i] || 0)
  }
  return false
}

app.on('second-instance', (_e, argv) => {
  // `--fondo` desde fuera: la ventana wallpaper se abre EN ESTE proceso (mismo
  // perfil; dos procesos sobre la misma IndexedDB es justo lo que el lock
  // impide). Y al revés: abrir la app normal con el fondo ya corriendo.
  if (argv.includes('--fondo')) {
    if (!ventanaFondo) crearVentanaFondo()
    return
  }
  if (!ventana) {
    crearVentana()
    return
  }
  if (ventana.isMinimized()) ventana.restore()
  ventana.focus()
})

// En macOS cerrar la ventana deja la app en el dock; en Windows la termina.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

void app.whenReady().then(() => {
  protocol.handle('app', responder)
  if (process.argv.includes('--fondo')) crearVentanaFondo()
  else crearVentana()
  if (app.isPackaged) void avisarVersionNueva()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) crearVentana()
  })
})
