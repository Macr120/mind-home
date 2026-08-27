/**
 * El shell de escritorio de Mind Planner Home (Electron, macOS y Windows).
 *
 * La app que corre aquí dentro es EXACTAMENTE la misma web de `dist/`: igual
 * que Capacitor en el teléfono, aquí no se recompila nada aparte ni se duplica
 * un gramo de UI. Lo único que aporta este proceso es lo que un navegador no
 * puede dar: una ventana propia, un icono en el Dock, el origen estable que
 * necesita IndexedDB, el pago abierto en el navegador del sistema y la vuelta
 * del login social por enlace profundo.
 *
 * Tres decisiones que conviene entender antes de tocar nada:
 *
 * 1. **La web se sirve por `mph://app/`, no por `file://`.** Un `file://` no
 *    tiene origen, y sin origen no hay IndexedDB, ni localStorage, ni service
 *    worker — o sea, no hay app. El esquema propio se declara «standard» y
 *    «secure» (abajo), así que Chromium lo trata como un https cualquiera y
 *    los datos del usuario viven siempre en el mismo sitio entre versiones.
 * 2. **El user agent lleva la marca `MindPlannerHome`.** Es lo que hace que
 *    `esEscritorio()` (`src/core/plataforma.ts`) responda que sí y que la app
 *    mande el pago al navegador en vez de intentar cobrar aquí dentro. Y se le
 *    quita el token `Electron/…`, que algunos proveedores de login rechazan.
 * 3. **Nada navega fuera de `mph://app/`.** Cualquier enlace externo —la web
 *    de venta, el soporte, un enlace del Diario— se abre en el navegador del
 *    sistema. Una ventana de Electron no es sitio para un formulario de pago.
 */
import { app, BrowserWindow, Menu, protocol, net, screen, shell, session } from 'electron'
import { readFile, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const AQUI = path.dirname(fileURLToPath(import.meta.url))

/** Esquema propio de la app. El origen resultante es `mph://app`. */
const ESQUEMA = 'mph'
const ORIGEN = `${ESQUEMA}://app`
const INICIO = `${ORIGEN}/index.html`

/**
 * El esquema del login social, el MISMO que usan Android e iOS
 * (`REDIRECT_NATIVO` en `core/cuenta/sesionStore.ts`) y que ya está en las
 * Redirect URLs de Supabase. Reusarlo evita dar de alta una URL más.
 */
const ESQUEMA_PROFUNDO = 'com.macr120.mindhome'

/**
 * La marca que `esEscritorio()` busca en el user agent (`src/core/plataforma.ts`).
 * Se pone A PROPÓSITO y no se confía en la que Electron deriva del nombre del
 * producto: cambiar «Mind Planner Home» por cualquier otra cosa en el
 * `package.json` se llevaría por delante la caja de pago sin que nada avise.
 */
const MARCA = 'MindPlannerHome'

/** La carpeta con la web compilada: `dist/` en desarrollo, `Resources/web` empaquetado. */
const RAIZ_WEB = app.isPackaged
  ? path.join(process.resourcesPath, 'web')
  : path.join(AQUI, '..', 'dist')

/** Enlaces profundos que llegaron antes de que hubiera ventana a la que dárselos. */
const pendientes = []
let ventana = null

app.setName('Mind Planner Home')

// Antes de `ready`, o Chromium ya decidió que `mph://` es un esquema cualquiera.
protocol.registerSchemesAsPrivileged([
  {
    scheme: ESQUEMA,
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
      stream: true,
      allowServiceWorkers: true,
    },
  },
])

// Una sola instancia: la segunda le pasa a la primera lo que traía (en Windows,
// el enlace profundo del login llega así, como argumento) y se cierra.
if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  app.on('second-instance', (_e, argv) => {
    const url = argv.find((a) => a.startsWith(`${ESQUEMA_PROFUNDO}://`))
    if (url) repartirEnlace(url)
    if (ventana) {
      if (ventana.isMinimized()) ventana.restore()
      ventana.focus()
    }
  })
}

// macOS: el enlace profundo llega por aquí, y puede llegar ANTES de `ready`.
app.on('open-url', (evento, url) => {
  evento.preventDefault()
  repartirEnlace(url)
})

app.whenReady().then(async () => {
  marcarUserAgent()
  registrarEsquemaProfundo()
  servirWeb()
  permisos()
  Menu.setApplicationMenu(construirMenu())
  await abrirVentana()
})

// macOS deja la app viva sin ventanas; el clic en el Dock vuelve a abrirla.
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) void abrirVentana()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

/**
 * Deja el user agent con la marca UNA vez y para toda la app (`userAgentFallback`
 * lo heredan todas las ventanas y sus peticiones). Se limpia antes lo que
 * Electron ya había puesto: su propio token `Electron/…`, que algunos
 * proveedores de login rechazan, y la marca duplicada que deriva del nombre.
 */
function marcarUserAgent() {
  const limpio = app.userAgentFallback
    .replace(/ Electron\/[\d.]+/g, '')
    .replace(new RegExp(` ${MARCA}\\/[\\d.]+`, 'g'), '')
  app.userAgentFallback = `${limpio} ${MARCA}/${app.getVersion()}`
}

/**
 * Sirve `dist/` bajo `mph://app/`. Todo lo que no exista y no parezca un
 * archivo cae en `index.html`: la app es una sola página y así una ruta escrita
 * a mano no deja la ventana en blanco.
 */
function servirWeb() {
  protocol.handle(ESQUEMA, async (peticion) => {
    const { host, pathname } = new URL(peticion.url)
    if (host !== 'app') return new Response('No encontrado', { status: 404 })

    const relativa = decodeURIComponent(pathname === '/' ? '/index.html' : pathname)
    let archivo = path.join(RAIZ_WEB, relativa)

    // Nadie se sale de la carpeta de la web con un `..` en la URL.
    if (!archivo.startsWith(RAIZ_WEB + path.sep) && archivo !== RAIZ_WEB) {
      return new Response('Prohibido', { status: 403 })
    }
    if (!existsSync(archivo)) {
      if (path.extname(archivo)) return new Response('No encontrado', { status: 404 })
      archivo = path.join(RAIZ_WEB, 'index.html')
    }
    return net.fetch(pathToFileURL(archivo).toString())
  })
}

/** Deja que el sistema sepa que los `com.macr120.mindhome://…` son nuestros. */
function registrarEsquemaProfundo() {
  if (process.defaultApp && process.argv.length >= 2) {
    // `electron .` en desarrollo: hay que decirle al sistema qué ejecutar.
    app.setAsDefaultProtocolClient(ESQUEMA_PROFUNDO, process.execPath, [path.resolve(process.argv[1])])
  } else {
    app.setAsDefaultProtocolClient(ESQUEMA_PROFUNDO)
  }
}

/**
 * Cámara y micrófono sí (el probador de máscaras y el dictado), notificaciones
 * sí (los recordatorios), y lo demás no. Solo para nuestro propio origen: una
 * página externa nunca debería estar cargada aquí, pero si lo estuviera,
 * tampoco pediría nada.
 */
function permisos() {
  const CONCEDIDOS = new Set(['media', 'notifications', 'clipboard-sanitized-write', 'fullscreen'])
  const nuestro = (url) => typeof url === 'string' && url.startsWith(ORIGEN)

  session.defaultSession.setPermissionRequestHandler((contenido, permiso, responder) => {
    responder(CONCEDIDOS.has(permiso) && nuestro(contenido.getURL()))
  })
  session.defaultSession.setPermissionCheckHandler((_c, permiso, origen) =>
    CONCEDIDOS.has(permiso) && nuestro(origen),
  )
}

async function abrirVentana() {
  const guardadas = await leerVentana()

  ventana = new BrowserWindow({
    ...guardadas,
    minWidth: 1024,
    minHeight: 700,
    // El mismo fondo que el splash de iOS y el `theme-color` de la web: sin él,
    // entre que abre la ventana y pinta el primer frame se cuela un fogonazo
    // blanco (`capacitor.config.ts` lo arregla igual en el teléfono).
    backgroundColor: '#0f1115',
    show: false,
    title: 'Mind Planner Home',
    webPreferences: {
      preload: path.join(AQUI, 'precarga.cjs'),
      // La versión, por argumento: un preload en sandbox no puede leerla de
      // ningún otro sitio sin abrirle a la página un canal que no necesita.
      additionalArguments: [`--mph-version=${app.getVersion()}`],
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      spellcheck: true,
    },
  })

  ventana.once('ready-to-show', () => ventana.show())

  // Los enlaces que llegaron antes de tiempo se sueltan cuando la página ya
  // corrió su JavaScript, no cuando la ventana se ve: quien los escucha es la
  // app (`escucharDeepLinkAuth`), y hasta que no arranca no hay nadie al otro
  // lado. Abrir la app *desde* el enlace del login es justo ese caso.
  ventana.webContents.on('did-finish-load', () => {
    for (const url of pendientes.splice(0)) repartirEnlace(url)
  })

  afuera(ventana.webContents)
  ventana.on('close', () => void guardarVentana(ventana))
  ventana.on('closed', () => {
    ventana = null
  })

  await ventana.loadURL(INICIO)
}

/** Todo lo que no sea la app se abre en el navegador del sistema. */
function afuera(contenido) {
  contenido.setWindowOpenHandler(({ url }) => {
    if (/^https?:/.test(url) || url.startsWith(`${ESQUEMA_PROFUNDO}://`)) void shell.openExternal(url)
    return { action: 'deny' }
  })
  contenido.on('will-navigate', (evento, url) => {
    if (url.startsWith(ORIGEN)) return
    evento.preventDefault()
    if (/^https?:/.test(url)) void shell.openExternal(url)
  })
}

/**
 * La vuelta del login social. El navegador del sistema termina en
 * `com.macr120.mindhome://oauth#access_token=…` y el sistema nos despierta con
 * esa URL; la ventana la recoge en `precarga.cjs` y la app hace el resto.
 */
function repartirEnlace(url) {
  if (!ventana || ventana.webContents.isLoading()) {
    pendientes.push(url)
    return
  }
  if (ventana.isMinimized()) ventana.restore()
  ventana.focus()
  ventana.webContents.send('mph:enlace-profundo', url)
}

/** Tamaño y posición de la ventana, para que abra donde se cerró. */
function archivoVentana() {
  return path.join(app.getPath('userData'), 'ventana.json')
}

async function leerVentana() {
  const POR_DEFECTO = { width: 1440, height: 900 }
  try {
    const { x, y, width, height } = JSON.parse(await readFile(archivoVentana(), 'utf8'))
    if (!width || !height) return POR_DEFECTO
    // La posición solo se reusa si aquella pantalla sigue conectada: si no,
    // se devuelve solo el tamaño y Electron centra la ventana. Un portátil que
    // se desconecta del monitor abriría la app fuera de cuadro.
    const visible = screen
      .getAllDisplays()
      .some(({ workArea: z }) => x >= z.x && y >= z.y && x < z.x + z.width && y < z.y + z.height)
    return visible ? { x, y, width, height } : { width, height }
  } catch {
    return POR_DEFECTO
  }
}

async function guardarVentana(win) {
  try {
    if (!win || win.isDestroyed() || win.isFullScreen()) return
    await writeFile(archivoVentana(), JSON.stringify(win.getNormalBounds()), 'utf8')
  } catch {
    // Que no se pueda recordar el tamaño no es motivo para molestar a nadie.
  }
}

/** Menú en español, con lo que un usuario de escritorio espera encontrar. */
function construirMenu() {
  const esMac = process.platform === 'darwin'
  const plantilla = [
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
        ...(esMac ? [{ type: 'separator' }, { role: 'front', label: 'Traer todo al frente' }] : [{ role: 'close', label: 'Cerrar' }]),
      ],
    },
    {
      label: 'Ayuda',
      submenu: [
        {
          label: 'Soporte',
          click: () => shell.openExternal('https://mindplannerhome.com/soporte'),
        },
        {
          label: 'Sitio web',
          click: () => shell.openExternal('https://mindplannerhome.com'),
        },
      ],
    },
  ]
  return Menu.buildFromTemplate(plantilla)
}
