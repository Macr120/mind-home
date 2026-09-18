/**
 * Shell de escritorio de MindHaOS (Electron, Windows y macOS).
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
import { app, BrowserWindow, dialog, ipcMain, Menu, nativeImage, nativeTheme, net, powerMonitor, protocol, screen, session, shell, WebContentsView } from 'electron'
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
// Empaquetada para Store NO se toca: en MSIX el identificador lo fija la
// identidad del paquete y sobrescribirlo deja los avisos sin dueño.
if (!process.windowsStore) app.setAppUserModelId('com.macr120.mindhome')

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

/** Lo último que dijo el vigía de la música (Windows); null si no suena nada. */
let sonando = null

/**
 * Dónde se recuerda el fondo entre sesiones: en qué pantalla va (`pantalla`,
 * para el arranque con `--fondo`) y si quedó puesto (`activo`, para que vuelva
 * solo al encender el equipo).
 */
function archivoFondo() {
  return path.join(app.getPath('userData'), 'fondo.json')
}

function estadoFondo() {
  try {
    return JSON.parse(readFileSync(archivoFondo(), 'utf8'))
  } catch {
    return {}
  }
}

function eleccionFondoGuardada() {
  return estadoFondo().pantalla ?? 'todas'
}

function guardarEstadoFondo(cambios) {
  try {
    writeFileSync(archivoFondo(), JSON.stringify({ ...estadoFondo(), ...cambios }), 'utf8')
  } catch {
    /* sin disco se pierde la preferencia, pero el fondo de esta vez vale */
  }
}

/**
 * Con el fondo puesto, la app se apunta al arranque de la sesión para que el
 * escritorio amanezca con la casa; al quitarlo, se borra de ahí. En Windows el
 * elemento de arranque lleva `--fondo` (solo la ventana wallpaper, sin abrir la
 * app); en macOS los elementos de inicio no admiten argumentos, así que allí
 * arranca la app normal y es el `activo` guardado quien enciende el fondo.
 *
 * Solo empaquetada: en dev registraría el Electron genérico de node_modules
 * (la misma trampa que el esquema profundo). En la build de Store (MSIX) no
 * surte efecto sin declarar una startupTask en el manifiesto.
 */
function apuntarAlArranque(activo) {
  if (!app.isPackaged) return
  app.setLoginItemSettings({
    openAtLogin: activo,
    // El `name` NUNCA puede quedarse en el de por defecto (el AppUserModelId,
    // com.macr120.mindhome): ese mismo texto es el ProgID del enlace profundo
    // en HKCU\Software\Classes, y con esa colisión Windows 25H2 no trató la
    // entrada como app de arranque — no salía en «Aplicaciones de inicio» y
    // Explorer la omitió en dos reinicios seguidos, sin error ni rastro.
    // `--fondo-auto` y no `--fondo`: el del arranque pasa por la guarda de
    // `activo`, para que una entrada rezagada no plante el fondo que el usuario
    // ya quitó — y es el MISMO argumento que manda la startupTask del MSIX.
    ...(process.platform === 'win32' ? { name: 'MindPlannerHome', args: ['--fondo-auto'] } : {}),
  })
  // Y el marcador «habilitado» de StartupApproved —02 y once bytes a cero, el
  // mismo que escribe el Administrador de tareas—, para que la entrada nazca
  // catalogada y el primer reinicio ya la arranque. En MSIX no aplica: el
  // arranque ahí sería una startupTask del manifiesto.
  if (process.platform === 'win32' && !process.windowsStore) {
    const clave = 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\StartupApproved\\Run'
    const argumentos = activo
      ? ['add', clave, '/v', 'MindPlannerHome', '/t', 'REG_BINARY', '/d', '020000000000000000000000', '/f']
      : ['delete', clave, '/v', 'MindPlannerHome', '/f']
    execFile('reg.exe', argumentos, () => {
      /* sin el marcador la entrada sigue existiendo; no vale un aviso */
    })
  }
}

/**
 * El trozo de escritorio que va a ocupar el fondo. Con `todas` es el rectángulo
 * que envuelve a todas las pantallas —el mismo que cubre el WorkerW—, y con una
 * elegida, la suya. Se devuelve también el origen del escritorio virtual porque
 * el helper coloca la ventana en coordenadas RELATIVAS a él: con un monitor a la
 * izquierda del principal, ese origen es negativo y sin restarlo el fondo se
 * iría media pantalla.
 */
function zonaFondo(eleccion) {
  const pantallas = screen.getAllDisplays()
  const virtualX = Math.min(...pantallas.map((p) => p.bounds.x))
  const virtualY = Math.min(...pantallas.map((p) => p.bounds.y))
  const elegida = eleccion && eleccion !== 'todas' ? pantallas.find((p) => String(p.id) === String(eleccion)) : null
  if (elegida) return { ...elegida.bounds, todas: false, virtualX, virtualY }
  const derecha = Math.max(...pantallas.map((p) => p.bounds.x + p.bounds.width))
  const abajo = Math.max(...pantallas.map((p) => p.bounds.y + p.bounds.height))
  return {
    x: virtualX,
    y: virtualY,
    width: derecha - virtualX,
    height: abajo - virtualY,
    todas: true,
    virtualX,
    virtualY,
  }
}

/**
 * Modo fondo (`--fondo`): la casa como wallpaper vivo. En Windows la ventana se
 * cuelga del WorkerW del escritorio (electron/fondo/fondo.ps1 — el truco de Wallpaper
 * Engine/Lively) y queda DETRÁS de los iconos; en macOS basta `type: 'desktop'`.
 * Ahí el SO ya no le manda input, así que el shell reenvía el cursor global con
 * `sendInputEvent` (mueve el puntero espacial de la app) y fondo-raton.ps1
 * avisa de los clics del botón izquierdo — solo se reenvían los que caen sobre
 * el escritorio, para que hacer clic dentro de otra app no mueva al personaje.
 * La app entra en este modo por la query `?fondo=1` (esModoFondo).
 */
function crearVentanaFondo(eleccion = eleccionFondoGuardada()) {
  const zona = zonaFondo(eleccion)
  ventanaFondo = new BrowserWindow({
    x: zona.x,
    y: zona.y,
    width: zona.width,
    height: zona.height,
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
  // Un clic sobre un objeto con página web la abre en el navegador del sistema.
  salidasAlSistema(win.webContents)

  // Cursor global → mousemove de la página, a ~15 Hz. Mueve el puntero
  // espacial de la casa, que es un adorno lento: a 30 Hz se pagaba el doble de
  // IPC y de raycasts para que nadie viera la diferencia.
  //
  // Y si el cursor no se ha movido, no se manda nada. No es solo ahorrarse el
  // IPC y el raycast: el fondo baja a un latido de reposo cuando lleva un rato
  // sin `mousemove`, y mandándolos a ciegas quince veces por segundo esa siesta
  // no llegaba nunca.
  let anterior = { x: -1, y: -1 }
  const cursor = setInterval(() => {
    if (win.isDestroyed()) return
    const p = screen.getCursorScreenPoint()
    if (p.x === anterior.x && p.y === anterior.y) return
    anterior = p
    win.webContents.sendInputEvent({ type: 'mouseMove', x: p.x - zona.x, y: p.y - zona.y })
  }, 66)

  // Clic global (solo Windows): el helper emite «down True|False» y «up».
  let raton = null
  if (process.platform === 'win32') {
    raton = spawn('powershell.exe', [
      '-NoProfile',
      '-ExecutionPolicy',
      'Bypass',
      '-File',
      path.join(__dirname, 'fondo', 'fondo-raton.ps1'),
    ])
    let bajado = false
    raton.stdout.on('data', (buf) => {
      if (win.isDestroyed()) return
      for (const linea of String(buf).trim().split(/\r?\n/)) {
        const [tipo, sobreEscritorio] = linea.split(' ')
        const p = screen.getCursorScreenPoint()
        const ev = { x: p.x - zona.x, y: p.y - zona.y, button: 'left', clickCount: 1 }
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

  // Qué suena en el sistema, para el panel de música. Persistente, como el
  // vigía del ratón: emite «artista|titulo» en cada cambio y línea vacía cuando
  // no suena nada, y aquí solo se guarda lo último que dijo. En macOS no hace
  // falta: allí se le pregunta a Música o Spotify por AppleScript cuando toca.
  let musica = null
  if (process.platform === 'win32') {
    musica = spawn('powershell.exe', [
      '-NoProfile',
      '-ExecutionPolicy',
      'Bypass',
      '-File',
      path.join(__dirname, 'fondo', 'fondo-musica.ps1'),
    ])
    musica.stdout.on('data', (buf) => {
      // El `pop()` tira lo que viene DESPUÉS del último salto, que no es una
      // línea todavía. Sin él, «artista|titulo\r\n» se parte en dos —el texto y
      // una cadena vacía— y esa vacía, que aquí significa «no suena nada»,
      // borraba de inmediato la canción recién leída: el panel no salía nunca.
      const lineas = String(buf).split(/\r?\n/)
      lineas.pop()
      for (const linea of lineas) {
        const corte = linea.indexOf('|')
        sonando =
          corte < 0
            ? null
            : { artista: linea.slice(0, corte).trim(), titulo: linea.slice(corte + 1).trim() }
      }
    })
  }

  win.on('closed', () => {
    ventanaFondo = null
    sonando = null
    clearInterval(cursor)
    raton?.kill()
    musica?.kill()
  })

  void win.loadURL(`${ORIGEN}/?fondo=1`).then(() => {
    if (win.isDestroyed()) return
    if (process.platform !== 'win32') return
    const hwnd = win.getNativeWindowHandle().readBigUInt64LE(0).toString()
    // Con una sola pantalla elegida hay que decirle al helper QUÉ trozo del
    // escritorio ocupar; sin estos cuatro números estira la ventana sobre el
    // WorkerW entero, que es justo lo que se quiere en «todas las pantallas».
    const zonaArgs = zona.todas
      ? []
      : ['-X', String(zona.x - zona.virtualX), '-Y', String(zona.y - zona.virtualY), '-W', String(zona.width), '-H', String(zona.height)]
    execFile(
      'powershell.exe',
      ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', path.join(__dirname, 'fondo', 'fondo.ps1'), '-Hwnd', hwnd, ...zonaArgs],
      (err) => {
        if (win.isDestroyed()) return
        // Si el reparent falló (Windows raro), que al menos se vea la ventana.
        if (err) console.warn('[MPH] fondo.ps1 falló:', err)
        // Y ya colgada, mostrarla DESDE ELECTRON, siempre. `fondo.ps1` la enseña
        // por Win32 (SWP_SHOWWINDOW) y con eso Windows ya dibuja la ventana,
        // pero el compositor de Chromium sigue creyéndola oculta —nació con
        // `show: false`— y no pinta NADA dentro: el escritorio se quedaba del
        // color de fondo, sin casa ni paneles. Aquí estaba el guard
        // `if (!win.isVisible())`, que no servía justo por eso: se lo pregunta a
        // Win32, que ya la había mostrado, así que esto nunca se llamaba.
        win.showInactive()
        // Y el tamaño, otra vez: al mostrarla, Electron le devuelve las medidas
        // que él recuerda, y con «todas las pantallas» vienen recortadas —Windows
        // no deja nacer una ventana más alta que el monitor donde aparece—, así
        // que el fondo se quedaba cubriendo solo la pantalla principal. Ya colgada
        // del WorkerW, estas coordenadas son las del escritorio virtual. Sale unos
        // seis píxeles pasado por cada lado —el borde invisible que Windows deja
        // alrededor de una ventana sin marco, y que ni `setBounds` ni
        // `setContentBounds` descuentan—; en un fondo de pantalla es preferible
        // pasarse a dejar una franja sin pintar.
        win.setContentBounds({
          x: zona.x - zona.virtualX,
          y: zona.y - zona.virtualY,
          width: zona.width,
          height: zona.height,
        })
      },
    )
  })
}

/**
 * El icono de la ventana (barra de tareas de Windows) y del Dock (macOS) sigue
 * al aspecto del sistema: las piezas sobre blanco en claro y sobre negro en
 * oscuro (`electron/iconos/`, los genera scripts/icono-escritorio.mjs). Es lo
 * único que se puede cambiar en caliente: el .ico del ejecutable y el acceso
 * directo anclado son fijos; el de la Store cambia por sus mosaicos «unplated»
 * (uno por tema de la barra de tareas) y el de iOS por su catálogo.
 */
function aplicarIconoTema() {
  const icono = nativeImage.createFromPath(
    path.join(__dirname, 'iconos', nativeTheme.shouldUseDarkColors ? 'oscuro.png' : 'claro.png'),
  )
  if (icono.isEmpty()) return
  if (process.platform === 'darwin') app.dock?.setIcon(icono)
  else ventana?.setIcon(icono)
}
nativeTheme.on('updated', aplicarIconoTema)

function crearVentana(query = '') {
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
  aplicarIconoTema()
  ventana.once('ready-to-show', () => ventana.show())
  ventana.on('close', () => guardarMedida())
  ventana.on('closed', () => {
    ventana = null
    // Las vistas del navegador mueren con su ventana: solo hay que soltar las referencias.
    pestanas.clear()
    pestanaActivaId = null
  })

  // Los enlaces que llegaron antes de tiempo se sueltan cuando la página ya
  // corrió su JavaScript, NO cuando la ventana se ve: quien los escucha es la
  // app (`escucharDeepLinkAuth`), y hasta que no arranca no hay nadie al otro
  // lado. Abrir la app *desde* el enlace del login es justo ese caso.
  ventana.webContents.on('did-finish-load', () => {
    for (const url of enlacesPendientes.splice(0)) repartirEnlace(url)
  })

  salidasAlSistema(ventana.webContents)

  void ventana.loadURL(URL_DEV ? URL_DEV + query : `${ORIGEN}/${query}`)
}

/**
 * Cualquier salida de una ventana de la app es navegación de verdad: al
 * navegador del sistema. Aquí caen el checkout del escritorio (los enlaces a
 * /cuenta de la web), soporte, cualquier target="_blank" de la app y el enlace
 * web de un objeto pulsado en el fondo de pantalla (allí no hay navegador
 * embebido). Sin esto, Electron abriría una BrowserWindow suelta.
 */
function salidasAlSistema(wc) {
  wc.setWindowOpenHandler(({ url }) => {
    if (/^https?:/.test(url)) void shell.openExternal(url)
    return { action: 'deny' }
  })
  wc.on('will-navigate', (e, url) => {
    if (url.startsWith(ORIGEN) || (URL_DEV && url.startsWith(URL_DEV))) return
    e.preventDefault()
    if (/^https?:/.test(url)) void shell.openExternal(url)
  })
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
    // El destino sale de la respuesta JSON de GitHub: se abre SOLO si es una URL
    // https de github.com, no lo que venga en el campo (auditoría 26-ago-2026).
    const destino = urlReleaseSegura(release.html_url)
    if (!destino) return
    const { response } = await dialog.showMessageBox(ventana, {
      type: 'info',
      title: 'MindHaOS',
      message: `Hay una versión nueva (${remota}).`,
      detail: 'Descárgala para tener las últimas mejoras. Tus datos se quedan como están.',
      buttons: ['Descargar', 'Ahora no'],
      cancelId: 1,
    })
    if (response === 0) void shell.openExternal(destino)
  } catch {
    /* sin red o sin releases: no se molesta */
  }
}

/** Solo una URL https del propio repo en github.com; si no, null (no se abre). */
function urlReleaseSegura(valor) {
  try {
    const u = new URL(String(valor))
    return u.protocol === 'https:' && (u.hostname === 'github.com' || u.hostname.endsWith('.github.com'))
      ? u.toString()
      : null
  } catch {
    return null
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
  // En MSIX lo declara el manifiesto —el bloque `protocols:` del
  // electron-builder.yml, verificado dentro del .appx— y el registro de un
  // proceso empaquetado no sale de su contenedor: aquí no hay nada que hacer.
  if (process.windowsStore) return
  if (process.defaultApp && process.argv.length >= 2) {
    // Windows en desarrollo: aquí sí hay que decirle al sistema qué ejecutar.
    app.setAsDefaultProtocolClient(ESQUEMA_PROFUNDO, process.execPath, [path.resolve(process.argv[1])])
  } else {
    app.setAsDefaultProtocolClient(ESQUEMA_PROFUNDO)
  }
}

/**
 * Cámara y micrófono sí (Chat AR y dictado), notificaciones sí (los avisos) y
 * captura de pantalla sí (grabar la app para el Studio de video); lo demás, no.
 * Y solo para nuestro propio origen: con los permisos de serie, cualquier
 * página que llegara a cargarse aquí podría pedirlos.
 */
function permisos() {
  const CONCEDIDOS = new Set(['media', 'notifications', 'clipboard-sanitized-write', 'fullscreen', 'display-capture'])
  const nuestro = (url) => typeof url === 'string' && (url.startsWith(ORIGEN) || (URL_DEV && url.startsWith(URL_DEV)))

  session.defaultSession.setPermissionRequestHandler((contenido, permiso, responder) => {
    responder(CONCEDIDOS.has(permiso) && nuestro(contenido.getURL()))
  })
  session.defaultSession.setPermissionCheckHandler((_c, permiso, origen) => CONCEDIDOS.has(permiso) && nuestro(origen))
  // `getDisplayMedia` (grabar la app): la propia página, sin selector de
  // pantallas, con su audio si lo pide. A otro origen no se le responde, que es
  // como se deniega.
  session.defaultSession.setDisplayMediaRequestHandler((peticion, responder) => {
    if (!peticion.frame || !nuestro(peticion.securityOrigin)) return
    responder(peticion.audioRequested ? { video: peticion.frame, audio: peticion.frame } : { video: peticion.frame })
  })
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
              { role: 'about', label: 'Acerca de MindHaOS' },
              { type: 'separator' },
              { role: 'services', label: 'Servicios' },
              { type: 'separator' },
              { role: 'hide', label: 'Ocultar MindHaOS' },
              { role: 'hideOthers', label: 'Ocultar otras' },
              { role: 'unhide', label: 'Mostrar todas' },
              { type: 'separator' },
              { role: 'quit', label: 'Salir de MindHaOS' },
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
        { label: 'Soporte', click: () => shell.openExternal('https://mindhaos.com/soporte') },
        { label: 'Sitio web', click: () => shell.openExternal('https://mindhaos.com') },
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
ipcMain.handle('mph:fondo', (_e, eleccion) => {
  if (ventanaFondo) {
    ventanaFondo.close()
    guardarEstadoFondo({ activo: false })
    apuntarAlArranque(false)
    return false
  }
  guardarEstadoFondo({ pantalla: eleccion ?? 'todas', activo: true })
  apuntarAlArranque(true)
  crearVentanaFondo(eleccion)
  return true
})

/**
 * Un panel del fondo pide abrir la app en un sitio («misiones», el chat, o
 * `objeto-<id>` cuando se pulsa un objeto con app en el fondo de pantalla). Si la
 * ventana normal no existe se crea YA con el destino en la URL, que es lo que la
 * app lee al arrancar; si existe, se despierta y se le manda por el puente. Dos
 * caminos porque una ventana recién creada todavía no tiene a nadie escuchando.
 */
ipcMain.handle('mph:abrir-en', (_e, destino) => {
  const donde = String(destino ?? '').replace(/[^a-z0-9-]/gi, '').slice(0, 32)
  if (!donde) return false
  if (!ventana) {
    crearVentana(`?abrir=${donde}`)
    return true
  }
  if (ventana.isMinimized()) ventana.restore()
  ventana.focus()
  ventana.webContents.send('mph:abrir-en', donde)
  return true
})

// ——— Programas del equipo asignados a objetos (solo Windows) ———

const EXT_PROGRAMA = new Set(['.exe', '.lnk', '.bat', '.cmd'])

/**
 * Ruta absoluta a un ejecutable que EXISTE, o null. Es lo único que se lanza, y
 * nunca con argumentos: la ruta la manda el renderer (viaja por el sync), así
 * que aquí se desconfía de ella aunque la haya elegido el propio usuario.
 */
async function rutaProgramaValida(v) {
  if (typeof v !== 'string' || v.length > 1024 || v.includes('\0')) return null
  const ruta = path.normalize(v)
  if (!path.isAbsolute(ruta) || !EXT_PROGRAMA.has(path.extname(ruta).toLowerCase())) return null
  try {
    return (await fs.stat(ruta)).isFile() ? ruta : null
  } catch {
    return null
  }
}

/** El diálogo del sistema para elegir el programa; devuelve ruta y nombre legible, o null. */
ipcMain.handle('mph:programa-elegir', async (e) => {
  if (process.platform !== 'win32') return null
  const duena = BrowserWindow.fromWebContents(e.sender)
  const opciones = {
    title: 'Elegir programa',
    properties: ['openFile'],
    filters: [
      { name: 'Programas', extensions: ['exe', 'lnk', 'bat', 'cmd'] },
      { name: 'Todos los archivos', extensions: ['*'] },
    ],
  }
  const { canceled, filePaths } = duena ? await dialog.showOpenDialog(duena, opciones) : await dialog.showOpenDialog(opciones)
  const ruta = canceled ? null : await rutaProgramaValida(filePaths[0])
  return ruta ? { ruta, nombre: path.basename(ruta, path.extname(ruta)) } : null
})

/** Lanza el programa; `openPath` devuelve '' si abrió y el error en texto si no. */
ipcMain.handle('mph:programa-abrir', async (_e, v) => {
  const ruta = await rutaProgramaValida(v)
  if (!ruta) return false
  return (await shell.openPath(ruta)) === ''
})

/** El icono del programa (data URL), para la burbuja y el diálogo; null si no hay. */
ipcMain.handle('mph:programa-icono', async (_e, v) => {
  const ruta = await rutaProgramaValida(v)
  if (!ruta) return null
  try {
    const img = await app.getFileIcon(ruta, { size: 'normal' })
    return img.isEmpty() ? null : img.toDataURL()
  } catch {
    return null
  }
})

// ——— Navegador embebido con pestañas (navegador v2) ———

/**
 * Pestañas del navegador: id → { vista, url, titulo, ultimaActiva }. La vista
 * es null mientras la pestaña está DORMIDA (llevaba mucho en segundo plano y
 * se cerró su proceso para no gastar memoria; al activarla se recrea). La
 * BARRA no existe: la app pinta una tira al pie (`TiraNavegador.tsx`) y decide
 * los bounds; aquí solo se navega y se avisa de todo por `mph:nav-*`.
 */
const pestanas = new Map()
let pestanaActivaId = null
let siguientePestanaId = 1
/** Bounds y visibilidad que pide la app: se aplican a la pestaña activa. */
let boundsNav = { x: 0, y: 0, width: 800, height: 600 }
let navVisible = true
const TOPE_PESTANAS = 12
const DORMIR_MS = 20 * 60_000
let siesta = null

/**
 * Sesión PROPIA y persistente (`persist:navegador`): los logins del usuario en
 * sus páginas sobreviven entre sesiones y quedan separados de la app. OJO: sin
 * handler de permisos Electron los CONCEDE, y por aquí navega la web abierta —
 * solo pantalla completa (video); cámara, micrófono y avisos, no. Las descargas
 * se mandan al navegador del sistema: el shell no gestiona archivos.
 */
function sesionNavegador() {
  const s = session.fromPartition('persist:navegador')
  if (!s.mphNavLista) {
    s.mphNavLista = true
    s.setPermissionRequestHandler((_c, permiso, responder) => responder(permiso === 'fullscreen'))
    s.setPermissionCheckHandler((_c, permiso) => permiso === 'fullscreen')
    s.on('will-download', (e, item) => {
      e.preventDefault()
      const url = item.getURL()
      if (/^https?:/.test(url)) void shell.openExternal(url)
    })
    // Modo foco: la navegación principal a un sitio bloqueado se corta y la
    // pestaña muestra la página del foco (una data URL, que no pasa por aquí).
    s.webRequest.onBeforeRequest({ urls: ['http://*/*', 'https://*/*'] }, (d, cb) => {
      if (d.resourceType !== 'mainFrame' || !focoBloquea(d.url)) return cb({})
      cb({ cancel: true })
      avisarNavegador('mph:nav-bloqueado', { url: d.url })
      for (const p of pestanas.values()) {
        if (p.vista && p.vista.webContents.id === d.webContentsId) {
          void p.vista.webContents.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(focoHtml))
        }
      }
    })
  }
  return s
}

// ——— Modo foco: sitios que no se abren mientras dure (lo decide la app) ———

let focoHosts = []
let focoHasta = 0
let focoHtml = ''

/** ¿La URL cae en un sitio bloqueado (él o un subdominio) y el foco sigue vivo? */
function focoBloquea(url) {
  if (!focoHosts.length || Date.now() > focoHasta) return false
  let host = ''
  try {
    host = new URL(url).hostname.toLowerCase().replace(/^www\./, '')
  } catch {
    return false
  }
  return focoHosts.some((b) => host === b || host.endsWith('.' + b))
}

function avisarNavegador(canal, datos) {
  if (ventana && !ventana.isDestroyed()) ventana.webContents.send(canal, datos)
}

/** Bounds saneados: enteros no negativos, por si llegara cualquier cosa por IPC. */
function limitesVista(b) {
  const n = (v) => Math.min(20000, Math.max(0, Math.round(Number(v) || 0)))
  return { x: n(b?.x), y: n(b?.y), width: n(b?.width), height: n(b?.height) }
}

function vistaActiva() {
  return pestanas.get(pestanaActivaId)?.vista ?? null
}

/** Atajos tecleados DENTRO de la página (la app no los ve): se le avisan y no llegan al sitio. */
function atajoDe(input) {
  if (input.type !== 'keyDown') return null
  const k = input.key
  const ctrl = input.control || input.meta
  if (ctrl && !input.shift && (k === 't' || k === 'T')) return 'nueva'
  if (ctrl && (k === 'w' || k === 'W')) return 'cerrar'
  if (ctrl && k === 'Tab') return input.shift ? 'anterior' : 'siguiente'
  if (ctrl && (k === 'l' || k === 'L')) return 'direccion'
  if (ctrl && /^[1-8]$/.test(k)) return `ir:${k}`
  if (input.alt && k === 'ArrowLeft') return 'atras'
  if (input.alt && k === 'ArrowRight') return 'adelante'
  if (k === 'F5') return 'recargar'
  return null
}

/** Crea (o recrea, si dormía) la vista de la pestaña `id` y carga `url`. */
function crearVista(id, url) {
  const p = pestanas.get(id)
  const vista = new WebContentsView({
    webPreferences: { session: sesionNavegador(), sandbox: true },
  })
  const wc = vista.webContents
  // Un target="_blank" abre pestaña nueva en segundo plano (sin ventanas emergentes).
  wc.setWindowOpenHandler(({ url: destino }) => {
    if (/^https?:/.test(destino)) abrirPestana(destino, { fondo: true })
    return { action: 'deny' }
  })
  wc.on('will-navigate', (ev, destino) => {
    if (!/^https?:/.test(destino)) ev.preventDefault()
  })
  // `enPagina`: pushState/hash dentro del MISMO documento (el título sigue valiendo).
  const navego = (enPagina) => () => {
    p.url = wc.getURL()
    avisarNavegador('mph:nav-navego', {
      pestanaId: id,
      url: p.url,
      atras: wc.navigationHistory.canGoBack(),
      adelante: wc.navigationHistory.canGoForward(),
      enPagina,
    })
  }
  wc.on('did-navigate', navego(false))
  wc.on('did-navigate-in-page', navego(true))
  wc.on('page-title-updated', (_ev, titulo) => {
    p.titulo = titulo
    avisarNavegador('mph:nav-titulo', { pestanaId: id, titulo })
  })
  wc.on('page-favicon-updated', (_ev, urls) => {
    if (urls?.[0]) void mandarFavicon(wc, id, urls[0])
  })
  // Un video que arranca o se detiene: la tira lo marca y cambia si la visita cuenta en segundo plano.
  wc.on('audio-state-changed', (ev) => {
    avisarNavegador('mph:nav-audible', { pestanaId: id, audible: !!ev.audible })
    evaluarActividad()
  })
  wc.on('before-input-event', (ev, input) => {
    const accion = atajoDe(input)
    if (!accion) return
    ev.preventDefault()
    avisarNavegador('mph:nav-atajo', { accion })
  })
  // Si el proceso de la página muere, mejor cerrar la pestaña que una vista zombi tapando la app.
  wc.on('render-process-gone', () => {
    cerrarPestana(id)
    avisarNavegador('mph:nav-cerrado', { pestanaId: id, ultima: pestanas.size === 0 })
  })
  ventana.contentView.addChildView(vista)
  vista.setBounds(limitesVista(boundsNav))
  vista.setVisible(false)
  p.vista = vista
  void wc.loadURL(url)
  return vista
}

/** Muestra solo la pestaña activa (y solo si la app no ha escondido la página). */
function aplicarVisibilidad() {
  for (const [id, p] of pestanas) p.vista?.setVisible(navVisible && id === pestanaActivaId)
}

function activarPestana(id) {
  const p = pestanas.get(id)
  if (!p) return false
  pestanaActivaId = id
  p.ultimaActiva = Date.now()
  if (!p.vista) crearVista(id, p.url) // dormía: se recrea y recarga
  else p.vista.setBounds(limitesVista(boundsNav))
  aplicarVisibilidad()
  avisarNavegador('mph:nav-activa', { pestanaId: id })
  evaluarActividad()
  return true
}

/**
 * Abre `url` en una pestaña nueva (o en `pestanaId` si se da); con `fondo` no
 * la activa. Al tope de pestañas, navega la activa. Devuelve el id (0 = nada).
 */
function abrirPestana(url, { pestanaId, fondo } = {}) {
  if (!ventana || !/^https?:/.test(String(url))) return 0
  let id = pestanaId != null && pestanas.has(pestanaId) ? pestanaId : null
  if (id == null && pestanas.size >= TOPE_PESTANAS) id = pestanaActivaId
  if (id == null) {
    id = siguientePestanaId++
    pestanas.set(id, { vista: null, url, titulo: '', ultimaActiva: fondo ? 0 : Date.now() })
    crearVista(id, url)
    avisarNavegador('mph:nav-pestana', { pestanaId: id, url, fondo: !!fondo })
  } else {
    const p = pestanas.get(id)
    p.url = url
    if (!p.vista) crearVista(id, url)
    else void p.vista.webContents.loadURL(url)
  }
  // La vigilancia arranca ANTES de activar: activar evalúa y avisa del estado real.
  vigilarActividad()
  if (!fondo || pestanaActivaId == null) activarPestana(id)
  else aplicarVisibilidad()
  if (!siesta) siesta = setInterval(dormirPestanas, 60_000)
  return id
}

function soltarVista(p) {
  if (!p.vista) return
  if (ventana && !ventana.isDestroyed()) ventana.contentView.removeChildView(p.vista)
  p.vista.webContents.close()
  p.vista = null
}

/** Cierra una pestaña; si era la activa, activa la más reciente (o cierra todo). */
function cerrarPestana(id) {
  const p = pestanas.get(id)
  if (!p) return
  pestanas.delete(id)
  soltarVista(p)
  if (pestanaActivaId !== id) return
  pestanaActivaId = null
  const vecina = [...pestanas.entries()].sort((a, b) => b[1].ultimaActiva - a[1].ultimaActiva)[0]
  if (vecina) activarPestana(vecina[0])
  else cerrarNavegador()
}

function cerrarNavegador() {
  pararVigilancia()
  if (siesta) clearInterval(siesta)
  siesta = null
  for (const p of pestanas.values()) soltarVista(p)
  pestanas.clear()
  pestanaActivaId = null
}

/** Cada minuto: las pestañas que llevan mucho en segundo plano (y no suenan) sueltan su proceso. */
function dormirPestanas() {
  const ahora = Date.now()
  for (const [id, p] of pestanas) {
    if (id === pestanaActivaId || !p.vista || ahora - p.ultimaActiva < DORMIR_MS) continue
    if (p.vista.webContents.isCurrentlyAudible()) continue
    soltarVista(p)
    avisarNavegador('mph:nav-dormida', { pestanaId: id })
  }
}

// ——— Actividad: ¿el usuario sigue delante de la página? ———

/** Segundos sin teclado ni ratón a partir de los que la visita se pausa (la app lo configura). */
let navInactivoSeg = 120
let vigilante = null
let navActivo = true

/**
 * La visita solo cuenta con la ventana enfocada y sin minimizar, y con el
 * usuario activo (o con la página sonando: un video en segundo plano sí se
 * está viendo). Cada cambio se avisa a la app, que pausa o reanuda la fila.
 */
function evaluarActividad() {
  const vista = vistaActiva()
  if (!ventana || ventana.isDestroyed() || !vista) return
  const audible = vista.webContents.isCurrentlyAudible()
  const inactivo = powerMonitor.getSystemIdleTime() >= navInactivoSeg
  const activo = ventana.isFocused() && !ventana.isMinimized() && (!inactivo || audible)
  if (activo === navActivo) return
  navActivo = activo
  avisarNavegador('mph:nav-actividad', { activo })
}

function vigilarActividad() {
  if (vigilante) return
  navActivo = true
  vigilante = setInterval(evaluarActividad, 15_000)
  if (ventana && !ventana.mphNavOyentes) {
    ventana.mphNavOyentes = true
    for (const ev of ['blur', 'focus', 'minimize', 'restore']) ventana.on(ev, evaluarActividad)
  }
}

function pararVigilancia() {
  if (vigilante) clearInterval(vigilante)
  vigilante = null
  navActivo = true
}

/**
 * Favicon de la página como data URL pequeño: se baja aquí (en la app sería
 * una petición cruzada) y se reduce a 32 px. Un .ico no lo lee `nativeImage`:
 * si es pequeño se manda tal cual (Chromium sí lo pinta en un <img>).
 */
async function mandarFavicon(wc, pestanaId, urlIcono) {
  try {
    const pagina = wc.getURL()
    const r = await net.fetch(urlIcono, { signal: AbortSignal.timeout(5000) })
    if (!r.ok) return
    const tipo = (r.headers.get('content-type') || '').split(';')[0].trim()
    if (!tipo.startsWith('image/')) return
    const bytes = Buffer.from(await r.arrayBuffer())
    if (bytes.length > 256 * 1024) return
    let dataUrl = null
    const img = nativeImage.createFromBuffer(bytes)
    if (!img.isEmpty()) dataUrl = img.resize({ width: 32, height: 32 }).toDataURL()
    else if (bytes.length <= 8 * 1024) dataUrl = `data:${tipo};base64,${bytes.toString('base64')}`
    if (dataUrl && !wc.isDestroyed()) avisarNavegador('mph:nav-favicon', { pestanaId, url: pagina, dataUrl })
  } catch {
    // Sin favicon: la app pinta el icono genérico.
  }
}

ipcMain.handle('mph:nav-abrir', (_e, url, bounds, opts) => {
  if (bounds) boundsNav = limitesVista(bounds)
  const o = opts && typeof opts === 'object' ? opts : {}
  return abrirPestana(url, { pestanaId: o.pestanaId != null ? Number(o.pestanaId) : undefined, fondo: !!o.fondo })
})
ipcMain.handle('mph:nav-activar', (_e, id) => activarPestana(Number(id)))
ipcMain.handle('mph:nav-cerrar-pestana', (_e, id) => cerrarPestana(Number(id)))
ipcMain.handle('mph:nav-visible', (_e, v) => {
  navVisible = !!v
  aplicarVisibilidad()
})
ipcMain.handle('mph:nav-config', (_e, c) => {
  const seg = Number(c?.inactivoSeg)
  if (Number.isFinite(seg) && seg >= 30) navInactivoSeg = Math.round(seg)
})
ipcMain.handle('mph:nav-bounds', (_e, b) => {
  boundsNav = limitesVista(b)
  vistaActiva()?.setBounds(boundsNav)
})
ipcMain.handle('mph:nav-atras', () => vistaActiva()?.webContents.navigationHistory.goBack())
ipcMain.handle('mph:nav-adelante', () => vistaActiva()?.webContents.navigationHistory.goForward())
ipcMain.handle('mph:nav-recargar', () => vistaActiva()?.webContents.reload())
ipcMain.handle('mph:nav-cerrar', () => cerrarNavegador())
ipcMain.handle('mph:nav-foco', (_e, d) => {
  focoHosts = Array.isArray(d?.hosts) ? d.hosts.map((h) => String(h).toLowerCase()).filter(Boolean) : []
  focoHasta = Number(d?.hasta) || 0
  focoHtml = typeof d?.html === 'string' ? d.html : ''
})
/** «Cerrar sesiones de los sitios»: cookies, almacenamiento y caché de la sesión del navegador. */
ipcMain.handle('mph:nav-limpiar-sesion', async () => {
  const s = sesionNavegador()
  await s.clearStorageData()
  await s.clearCache()
})

/**
 * Las pantallas, para que Configuraciones deje elegir. El nombre viene vacío en
 * muchos equipos (depende del driver), así que la app numera las que no tengan
 * nombre — y el orden es el del sistema, no el de conexión.
 */
ipcMain.handle('mph:pantallas', () => {
  const principal = screen.getPrimaryDisplay().id
  return screen.getAllDisplays().map((p) => ({
    id: String(p.id),
    nombre: p.label || '',
    principal: p.id === principal,
    ancho: p.bounds.width,
    alto: p.bounds.height,
  }))
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
  if (process.platform === 'win32') return sonando
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

/**
 * La voz del dispositivo como archivo (narración gratis del Studio de video):
 * SAPI por PowerShell en Windows y `say` en macOS. Devuelve el WAV en base64,
 * o null si el sistema no pudo. El texto viaja en base64 y el nombre de la voz
 * se sanea: nada del renderer llega a la shell sin envolver.
 */
ipcMain.handle('mph:voz-archivo', async (_e, texto, voz, lang) => {
  if (typeof texto !== 'string' || !texto.trim()) return null
  const idioma = String(lang || 'es').replace(/[^a-zA-Z-]/g, '') || 'es'
  const ruta = path.join(app.getPath('temp'), `mph-voz-${process.pid}-${Date.now()}.wav`)
  try {
    if (process.platform === 'win32') {
      // Chromium cuelga « - Idioma (País)» al nombre SAPI; SAPI quiere el corto.
      const nombre = String(voz || '').split(' - ')[0].replace(/[^\p{L}\p{N} .()-]/gu, '').trim()
      const ps = (s) => `'${s.replace(/'/g, "''")}'`
      const guion = [
        'Add-Type -AssemblyName System.Speech',
        '$s = New-Object System.Speech.Synthesis.SpeechSynthesizer',
        `$texto = [System.Text.Encoding]::UTF8.GetString([Convert]::FromBase64String(${ps(Buffer.from(texto, 'utf8').toString('base64'))}))`,
        nombre ? `try { $s.SelectVoice(${ps(nombre)}) } catch { }` : '',
        // Sin la voz pedida (o con la del sistema en otro idioma): la primera del idioma de la app.
        `if ($s.Voice.Culture.TwoLetterISOLanguageName -ne ${ps(idioma.slice(0, 2).toLowerCase())}) { try { $s.SelectVoiceByHints([System.Speech.Synthesis.VoiceGender]::NotSet, [System.Speech.Synthesis.VoiceAge]::NotSet, 0, [System.Globalization.CultureInfo]::GetCultureInfo(${ps(idioma.slice(0, 2).toLowerCase())})) } catch { } }`,
        `$s.SetOutputToWaveFile(${ps(ruta)})`,
        '$s.Speak($texto)',
        '$s.Dispose()',
      ]
        .filter(Boolean)
        .join('; ')
      await new Promise((res, rej) =>
        execFile(
          'powershell.exe',
          ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', guion],
          { timeout: 90000, windowsHide: true },
          (err) => (err ? rej(err) : res()),
        ),
      )
    } else if (process.platform === 'darwin') {
      const nombre = String(voz || '').replace(/[^\p{L}\p{N} .()-]/gu, '').trim()
      const decir = (conVoz) =>
        new Promise((res, rej) =>
          execFile(
            '/usr/bin/say',
            [...(conVoz && nombre ? ['-v', nombre] : []), '-o', ruta, '--data-format=LEI16@22050', '--', texto],
            { timeout: 90000 },
            (err) => (err ? rej(err) : res()),
          ),
        )
      try {
        await decir(true)
      } catch {
        await decir(false) // la voz pedida no existe con ese nombre: la del sistema
      }
    } else return null
    return (await fs.readFile(ruta)).toString('base64')
  } catch {
    return null
  } finally {
    fs.unlink(ruta).catch(() => {})
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
  // El del arranque con la app ya abierta (p. ej. cambio rápido de usuario):
  // igual, pero con la guarda de `activo` y sin despertar la ventana normal.
  if (argv.includes('--fondo-auto')) {
    if (estadoFondo().activo && !ventanaFondo) crearVentanaFondo()
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
  else if (process.argv.includes('--fondo-auto')) {
    // El arranque de sesión: la clave Run del NSIS, o la startupTask del MSIX
    // — que dispara en CADA inicio de sesión, sepa o no si el fondo quedó
    // puesto. Solo la casa de fondo, y solo si sigue activa; si no, morir sin
    // abrir nada. El `--fondo` a secas es la orden directa y no se cuestiona.
    if (estadoFondo().activo) crearVentanaFondo()
    else app.quit()
  } else {
    crearVentana()
    // El fondo quedó puesto la última vez: vuelve solo con la app. Es el camino
    // de macOS al iniciar sesión (su elemento de inicio no lleva argumentos) y
    // de cualquier arranque a mano con el fondo aún activo.
    if (estadoFondo().activo) crearVentanaFondo()
  }
  // Windows: si el SO nos arrancó POR el enlace, viene en nuestro propio argv.
  const enlaceInicial = process.argv.find((a) => a.startsWith(`${ESQUEMA_PROFUNDO}://`))
  if (enlaceInicial) repartirEnlace(enlaceInicial)
  // En Store no: actualiza la propia tienda, y mandar al usuario a descargar un
  // instalador de fuera es justo lo que la certificación no quiere ver.
  if (app.isPackaged && !process.windowsStore) void avisarVersionNueva()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) crearVentana()
  })
})
