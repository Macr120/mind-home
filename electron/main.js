/**
 * Shell de escritorio de Mind Planner Home (Electron, Windows y macOS).
 *
 * Sirve la MISMA web compilada (`dist/`) bajo el protocolo propio `app://mph`,
 * con los defaults de seguridad de Electron (contextIsolation, sandbox, sin
 * nodeIntegration): la app no necesita nada de Node, solo un navegador con
 * marco. Todo lo que sale del shell —el checkout de la web, soporte, enlaces—
 * se abre en el navegador del sistema.
 *
 * El único puente es `precarga.cjs`, y existe por UNA cosa: devolverle a la app
 * el enlace profundo con el que vuelve el login social. Nada más cruza.
 */
import { app, BrowserWindow, dialog, ipcMain, Menu, net, protocol, screen, session, shell } from 'electron'
import os from 'node:os'
import { execFile, spawn } from 'node:child_process'
import fs from 'node:fs/promises'
import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const RAIZ_WEB = path.join(__dirname, '..', 'dist')
const ORIGEN = 'app://mph'
// `--dev` (npm run escritorio:dev): carga el servidor de Vite en vez del build.
const URL_DEV = process.argv.includes('--dev') ? 'http://localhost:5173' : null

/**
 * Por dónde vuelve el login social. Es el MISMO esquema que Android e iOS
 * (`REDIRECT_NATIVO` en `core/cuenta/sesionStore.ts`), que ya está dado de alta
 * en las Redirect URLs de Supabase: una URL menos que mantener, y las tres
 * plataformas comparten el canje de PKCE.
 */
const ESQUEMA_PROFUNDO = 'com.macr120.mindhome'

/** Enlaces que llegaron antes de que hubiera página a la que dárselos. */
const enlacesPendientes = []

// Dos instancias serían dos Chromium sobre el MISMO perfil: IndexedDB corrupta.
if (!app.requestSingleInstanceLock()) app.quit()

// `esEscritorio()` (src/core/plataforma.ts) busca esta marca en el user agent;
// de ella cuelga `canalPago() === 'escritorio'` (el pago sale al navegador).
// Se limpia antes la que Electron deriva del nombre del producto, o viaja dos
// veces; y se pone a propósito, sin confiar en esa: renombrar el producto en el
// package.json se llevaría por delante la caja de pago sin que nada avise.
app.userAgentFallback = `${app.userAgentFallback.replace(/ MindPlannerHome\/[\d.]+/g, '')} MindPlannerHome/${app.getVersion()}`
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
    // El mismo puente que la ventana normal: por aquí le llegan los arrastres
    // de la vista previa de Configuraciones. Sin él, el fondo no se deja mover.
    webPreferences: {
      preload: path.join(__dirname, 'precarga.cjs'),
      additionalArguments: [`--mph-version=${app.getVersion()}`],
      // Un fondo de pantalla está SIEMPRE tapado por otras ventanas, y Chromium
      // congela lo que cree oculto para ahorrar batería: sin esto la casa deja
      // de animarse en cuanto abres cualquier cosa encima y el fondo se queda
      // en una foto fija. Medido: dos capturas con 8 s de diferencia salían
      // idénticas al byte, ni el latido del puntero se movía.
      backgroundThrottling: false,
    },
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
    ...medidaGuardada(),
    minWidth: 800,
    minHeight: 600,
    backgroundColor: '#0f1115',
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'precarga.cjs'),
      // La versión por argumento: un preload en sandbox no puede leerla de
      // ningún otro sitio sin abrirle a la página un canal que no necesita.
      additionalArguments: [`--mph-version=${app.getVersion()}`],
    },
  })
  ventana.once('ready-to-show', () => ventana.show())
  ventana.on('close', () => guardarMedida())
  ventana.on('closed', () => {
    ventana = null
  })

  // Los enlaces que llegaron antes de tiempo se sueltan cuando la página ya
  // corrió su JavaScript, NO cuando la ventana se ve: quien los escucha es la
  // app (`escucharDeepLinkAuth`), y hasta que no arranca no hay nadie al otro
  // lado. Abrir la app *desde* el enlace del login es justo ese caso.
  ventana.webContents.on('did-finish-load', () => {
    for (const url of enlacesPendientes.splice(0)) repartirEnlace(url)
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

/**
 * Tamaño y posición con los que se cerró. La posición solo se reusa si aquella
 * pantalla sigue conectada: un portátil que se desconecta del monitor abriría
 * la app fuera de cuadro, así que ahí se devuelve solo el tamaño y Electron
 * centra. Que no se pueda recordar nunca es motivo para molestar a nadie.
 */
function archivoMedida() {
  return path.join(app.getPath('userData'), 'ventana.json')
}

function medidaGuardada() {
  const POR_DEFECTO = { width: 1280, height: 800 }
  try {
    const { x, y, width, height } = JSON.parse(readFileSync(archivoMedida(), 'utf8'))
    if (!width || !height) return POR_DEFECTO
    const visible = screen
      .getAllDisplays()
      .some(({ workArea: z }) => x >= z.x && y >= z.y && x < z.x + z.width && y < z.y + z.height)
    return visible ? { x, y, width, height } : { width, height }
  } catch {
    return POR_DEFECTO
  }
}

function guardarMedida() {
  try {
    if (!ventana || ventana.isDestroyed() || ventana.isFullScreen()) return
    writeFileSync(archivoMedida(), JSON.stringify(ventana.getNormalBounds()), 'utf8')
  } catch {
    /* el tamaño no vale un aviso */
  }
}

/**
 * La vuelta del login social: el navegador del sistema termina en
 * `com.macr120.mindhome://oauth?code=…` y el SO nos despierta con esa URL. Se
 * la pasamos al precargador, que la reemite como evento del DOM para que la
 * canjee `escucharDeepLinkAuth`. Si todavía no hay página cargada se encola:
 * abrir la app DESDE el enlace es el caso normal, no el raro.
 */
function repartirEnlace(url) {
  if (!ventana || ventana.webContents.isLoading()) {
    enlacesPendientes.push(url)
    if (!ventana) crearVentana()
    return
  }
  if (ventana.isMinimized()) ventana.restore()
  ventana.focus()
  ventana.webContents.send('mph:enlace-profundo', url)
}

/**
 * Deja que el sistema sepa que los `com.macr120.mindhome://…` son nuestros.
 *
 * ⚠️ En macOS **solo empaquetada**, y esto costó una tarde: ahí el esquema lo
 * declara el propio bundle (`CFBundleURLTypes`, que escribe el `protocols:` del
 * electron-builder.yml), así que pedirlo a mano no hace falta — y en desarrollo
 * hace daño. La variante con `execPath` es un patrón de Windows: en macOS
 * registra el BUNDLE dueño de ese ejecutable, que en desarrollo es el Electron
 * genérico de `node_modules`, y desde ese momento el sistema le manda a él la
 * vuelta del login en vez de a la app instalada. Silenciosamente: el navegador
 * termina bien, no vuelve nadie, y no hay ni un error que mirar.
 */
function registrarEsquemaProfundo() {
  if (process.platform === 'darwin') {
    if (app.isPackaged) app.setAsDefaultProtocolClient(ESQUEMA_PROFUNDO)
    return
  }
  if (process.defaultApp && process.argv.length >= 2) {
    // Windows en desarrollo: aquí sí hay que decirle al sistema qué ejecutar.
    app.setAsDefaultProtocolClient(ESQUEMA_PROFUNDO, process.execPath, [path.resolve(process.argv[1])])
  } else {
    app.setAsDefaultProtocolClient(ESQUEMA_PROFUNDO)
  }
}

/**
 * Cámara y micrófono sí (Chat AR y dictado) y notificaciones sí (los avisos);
 * lo demás, no. Y solo para nuestro propio origen: con los permisos de serie,
 * cualquier página que llegara a cargarse aquí podría pedirlos.
 */
function permisos() {
  const CONCEDIDOS = new Set(['media', 'notifications', 'clipboard-sanitized-write', 'fullscreen'])
  const nuestro = (url) => typeof url === 'string' && (url.startsWith(ORIGEN) || (URL_DEV && url.startsWith(URL_DEV)))

  session.defaultSession.setPermissionRequestHandler((contenido, permiso, responder) => {
    responder(CONCEDIDOS.has(permiso) && nuestro(contenido.getURL()))
  })
  session.defaultSession.setPermissionCheckHandler((_c, permiso, origen) => CONCEDIDOS.has(permiso) && nuestro(origen))
}

/**
 * Menú en español. En Windows va oculto (`autoHideMenuBar`) y macOS siempre
 * enseña el suyo, pero el motivo de que exista no es decorativo: sin un menú
 * Editar con sus roles nativos, **⌘C y ⌘V no funcionan** en los campos de texto
 * de la app. Electron los cablea desde el menú, no desde el sistema.
 */
function construirMenu() {
  const esMac = process.platform === 'darwin'
  return Menu.buildFromTemplate([
    ...(esMac
      ? [
          {
            label: app.getName(),
            submenu: [
              { role: 'about', label: 'Acerca de Mind Planner Home' },
              { type: 'separator' },
              { role: 'services', label: 'Servicios' },
              { type: 'separator' },
              { role: 'hide', label: 'Ocultar Mind Planner Home' },
              { role: 'hideOthers', label: 'Ocultar otras' },
              { role: 'unhide', label: 'Mostrar todas' },
              { type: 'separator' },
              { role: 'quit', label: 'Salir de Mind Planner Home' },
            ],
          },
        ]
      : []),
    {
      label: 'Editar',
      submenu: [
        { role: 'undo', label: 'Deshacer' },
        { role: 'redo', label: 'Rehacer' },
        { type: 'separator' },
        { role: 'cut', label: 'Cortar' },
        { role: 'copy', label: 'Copiar' },
        { role: 'paste', label: 'Pegar' },
        { role: 'selectAll', label: 'Seleccionar todo' },
      ],
    },
    {
      label: 'Ver',
      submenu: [
        { role: 'reload', label: 'Recargar' },
        { role: 'resetZoom', label: 'Tamaño normal' },
        { role: 'zoomIn', label: 'Acercar' },
        { role: 'zoomOut', label: 'Alejar' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: 'Pantalla completa' },
        ...(app.isPackaged ? [] : [{ role: 'toggleDevTools', label: 'Herramientas de desarrollo' }]),
      ],
    },
    {
      label: 'Ventana',
      submenu: [
        { role: 'minimize', label: 'Minimizar' },
        { role: 'zoom', label: 'Zoom' },
        ...(esMac
          ? [{ type: 'separator' }, { role: 'front', label: 'Traer todo al frente' }]
          : [{ role: 'close', label: 'Cerrar' }]),
      ],
    },
    {
      label: 'Ayuda',
      submenu: [
        { label: 'Soporte', click: () => shell.openExternal('https://mindplannerhome.com/soporte') },
        { label: 'Sitio web', click: () => shell.openExternal('https://mindplannerhome.com') },
      ],
    },
  ])
}

/**
 * El interruptor del fondo de pantalla, que la app enciende desde
 * Configuraciones › Interfaz. Crear ventanas es cosa del shell, así que la
 * página solo pide y aquí se decide. Al encenderlo se crea una ventana NUEVA:
 * así el fondo nace con la casa tal y como está ahora, sin depender de que algo
 * le avise de los cambios. Devuelve si queda encendido, para que el botón sepa
 * qué decir.
 */
ipcMain.handle('mph:fondo', () => {
  if (ventanaFondo) {
    ventanaFondo.close()
    return false
  }
  crearVentanaFondo()
  return true
})

/**
 * La vista previa: una foto de la ventana del fondo tal y como está. Se captura
 * de la ventana REAL en vez de dibujar una simulación, así lo que se ve en
 * Configuraciones es exactamente lo que hay detrás de las ventanas. Devuelve
 * null si el fondo no está puesto — no hay nada que enseñar.
 */
ipcMain.handle('mph:fondo-vista', async () => {
  if (!ventanaFondo || ventanaFondo.isDestroyed()) return null
  try {
    const imagen = await ventanaFondo.webContents.capturePage()
    // A la mitad: la vista previa es pequeña y así el data URL no engorda el IPC.
    return imagen.resize({ width: Math.round(imagen.getSize().width / 2) }).toDataURL()
  } catch {
    return null
  }
})

/** Mueve el encuadre del fondo. Lo aplica y lo guarda la propia ventana. */
ipcMain.handle('mph:fondo-mover', (_e, d) => {
  if (!ventanaFondo || ventanaFondo.isDestroyed()) return false
  ventanaFondo.webContents.send('mph:fondo-mover', d ?? {})
  return true
})

/**
 * Recursos del sistema para el panel del fondo: CPU y memoria. La CPU se mide
 * por DELTA entre esta llamada y la anterior (os.cpus() da acumulados desde el
 * arranque; el primer valor sería la media histórica, que no dice nada del
 * ahora). La memoria en macOS no puede salir de os.freemem(): ahí «free» son
 * solo páginas vacías y el caché de archivos cuenta como usada, así que el
 * número asustaría sin motivo — se pregunta a vm_stat y se descuentan las
 * páginas inactivas y purgables, que el sistema suelta en cuanto alguien las
 * necesita.
 */
let cpuAnterior = os.cpus().map((c) => c.times)
ipcMain.handle('mph:fondo-recursos', async () => {
  const ahora = os.cpus().map((c) => c.times)
  let activo = 0
  let total = 0
  for (let i = 0; i < ahora.length; i++) {
    const a = ahora[i]
    const b = cpuAnterior[i] ?? a
    const dTotal = a.user + a.nice + a.sys + a.idle + a.irq - (b.user + b.nice + b.sys + b.idle + b.irq)
    const dIdle = a.idle - b.idle
    total += dTotal
    activo += dTotal - dIdle
  }
  cpuAnterior = ahora
  const cpu = total > 0 ? Math.round((activo / total) * 100) : 0

  const totalMem = os.totalmem()
  let usada = totalMem - os.freemem()
  if (process.platform === 'darwin') {
    try {
      const vm = await new Promise((res, rej) =>
        execFile('/usr/bin/vm_stat', (err, out) => (err ? rej(err) : res(out))),
      )
      const pagina = Number(/page size of (\d+)/.exec(vm)?.[1] ?? 16384)
      const paginas = (nombre) => Number(new RegExp(`${nombre}:\\s+(\\d+)`).exec(vm)?.[1] ?? 0)
      const libres = (paginas('Pages free') + paginas('Pages inactive') + paginas('Pages purgeable')) * pagina
      usada = totalMem - libres
    } catch {
      /* vm_stat no respondió: queda la cuenta simple */
    }
  }
  return { cpu, memUsadaGB: usada / 1024 ** 3, memTotalGB: totalMem / 1024 ** 3 }
})

/**
 * Qué suena en el SISTEMA (Música o Spotify), para el panel del fondo. Solo
 * macOS: se les pregunta por AppleScript, y SIEMPRE tras comprobar con System
 * Events que la app ya corre — un `tell` a una app cerrada la ABRIRÍA, y nadie
 * quiere que su fondo de pantalla lance el Spotify solo. La primera vez macOS
 * pedirá permiso de automatización; si el usuario lo niega, osascript falla y
 * aquí se devuelve null: el panel simplemente no enseña nada.
 * En Windows no hay equivalente accesible desde Electron (el SMTC pide módulo
 * nativo): null, y el panel se oculta.
 */
const GUION_MUSICA = `
set salida to ""
tell application "System Events" to set hayMusic to exists (processes where name is "Music")
if hayMusic then
  tell application "Music"
    if player state is playing then set salida to artist of current track & "\n" & name of current track
  end tell
end if
if salida is "" then
  tell application "System Events" to set haySpotify to exists (processes where name is "Spotify")
  if haySpotify then
    tell application "Spotify"
      if player state is playing then set salida to artist of current track & "\n" & name of current track
    end tell
  end if
end if
return salida`
ipcMain.handle('mph:fondo-musica', async () => {
  if (process.platform !== 'darwin') return null
  try {
    const salida = await new Promise((res, rej) =>
      execFile('/usr/bin/osascript', ['-e', GUION_MUSICA], { timeout: 4000 }, (err, out) =>
        err ? rej(err) : res(String(out).trim()),
      ),
    )
    if (!salida) return null
    const [artista, ...titulo] = salida.split('\n')
    return { artista, titulo: titulo.join(' ') }
  } catch {
    return null
  }
})

// macOS: el enlace profundo llega por aquí, y puede llegar ANTES del ready.
app.on('open-url', (evento, url) => {
  evento.preventDefault()
  repartirEnlace(url)
})

app.on('second-instance', (_e, argv) => {
  // Windows y Linux no tienen `open-url`: el enlace profundo llega como UN
  // ARGUMENTO más. Se busca por esquema y no con un `includes`, que no
  // distinguiría la URL del flag `--fondo` que viene justo debajo.
  const enlace = argv.find((a) => a.startsWith(`${ESQUEMA_PROFUNDO}://`))
  if (enlace) {
    repartirEnlace(enlace)
    return
  }
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
  registrarEsquemaProfundo()
  permisos()
  Menu.setApplicationMenu(construirMenu())
  if (process.argv.includes('--fondo')) crearVentanaFondo()
  else crearVentana()
  // Windows: si el SO nos arrancó POR el enlace, viene en nuestro propio argv.
  const enlaceInicial = process.argv.find((a) => a.startsWith(`${ESQUEMA_PROFUNDO}://`))
  if (enlaceInicial) repartirEnlace(enlaceInicial)
  if (app.isPackaged) void avisarVersionNueva()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) crearVentana()
  })
})
