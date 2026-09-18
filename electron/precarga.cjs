/**
 * El único puente entre el shell y la web. A propósito es diminuto: la app no
 * necesita Node para nada, así que aquí solo entra lo que no puede resolver
 * ella sola, y hoy es UNA cosa: la vuelta del login social.
 *
 * El navegador del sistema termina en `com.macr120.mindhome://oauth?code=…`, el
 * proceso principal recoge esa URL y la reenvía aquí; esto la reemite como un
 * evento del DOM (`mph:enlace-profundo`), que es algo que la app ya sabe
 * escuchar —`escucharDeepLinkAuth` en `core/cuenta/sesionStore.ts`— sin tener
 * que saber que Electron existe. Ese nombre de evento es el contrato entre las
 * dos mitades: cambiarlo aquí rompe el login y no falla en voz alta.
 *
 * A la página no se le expone `ipcRenderer` ni nada de Node: solo dos datos de
 * lectura por `contextBridge`.
 */
const { contextBridge, ipcRenderer } = require('electron')

ipcRenderer.on('mph:enlace-profundo', (_evento, url) => {
  window.dispatchEvent(new CustomEvent('mph:enlace-profundo', { detail: url }))
})

// Y el aviso de «ábrete por aquí» que manda un panel del fondo de pantalla.
ipcRenderer.on('mph:abrir-en', (_evento, donde) => {
  window.dispatchEvent(new CustomEvent('mph:abrir-en', { detail: donde }))
})

// Solo llega a la ventana del fondo: la vista previa le manda hacia dónde moverse.
ipcRenderer.on('mph:fondo-mover', (_evento, d) => {
  window.dispatchEvent(new CustomEvent('mph:fondo-mover', { detail: d }))
})

// El navegador embebido avisa de sus pestañas (nueva, activa, dormida, cerrada),
// por dónde va cada una, del favicon y el audio de la página, de los atajos
// tecleados dentro de ella y de si el usuario sigue delante (foco, minimizado,
// inactividad); los oye `TiraNavegador.tsx`.
for (const canal of [
  'mph:nav-pestana',
  'mph:nav-activa',
  'mph:nav-dormida',
  'mph:nav-cerrado',
  'mph:nav-navego',
  'mph:nav-titulo',
  'mph:nav-favicon',
  'mph:nav-audible',
  'mph:nav-atajo',
  'mph:nav-actividad',
  'mph:nav-bloqueado',
]) {
  ipcRenderer.on(canal, (_evento, datos) => {
    window.dispatchEvent(new CustomEvent(canal, { detail: datos }))
  })
}

const version = process.argv.find((a) => a.startsWith('--mph-version='))?.slice('--mph-version='.length)

contextBridge.exposeInMainWorld('mph', {
  escritorio: true,
  version: version ?? null,
  /**
   * ¿Este shell puede reenviarle CLICS al fondo de pantalla? Solo Windows: allí
   * lo consigue `fondo-raton.ps1` enganchándose al ratón global. En macOS la
   * ventana vive por debajo del escritorio y el sistema no le manda clics, así
   * que el fondo mueve al personaje siguiendo el cursor en vez de esperarlos.
   */
  clicsEnFondo: process.platform === 'win32',
  /**
   * Enciende o apaga la casa como fondo de pantalla; resuelve si queda
   * encendida. `pantalla` es el id de un monitor o 'todas'.
   */
  ponerDeFondo: (pantalla) => ipcRenderer.invoke('mph:fondo', pantalla),
  /** Los monitores conectados, para elegir en cuál va el fondo. */
  pantallas: () => ipcRenderer.invoke('mph:pantallas'),
  /** Abre (o despierta) la ventana normal en un sitio concreto de la app. */
  abrirEn: (donde) => ipcRenderer.invoke('mph:abrir-en', donde),
  /** Foto de cómo se ve el fondo AHORA (data URL), o null si no está puesto. */
  vistaFondo: () => ipcRenderer.invoke('mph:fondo-vista'),
  /** Mueve el encuadre del fondo: arrastre en fracción de pantalla, o zoom. */
  moverFondo: (d) => ipcRenderer.invoke('mph:fondo-mover', d),
  /** CPU y memoria del sistema, para el panel del fondo. */
  recursosSistema: () => ipcRenderer.invoke('mph:fondo-recursos'),
  /** Qué suena en el sistema: SMTC en Windows, Música o Spotify en macOS. */
  musicaSistema: () => ipcRenderer.invoke('mph:fondo-musica'),
  /** La voz del sistema como WAV en base64 (narración gratis del Studio de video); null si no pudo. */
  vozAArchivo: (texto, voz, lang) => ipcRenderer.invoke('mph:voz-archivo', texto, voz, lang),
  /**
   * Navegador embebido (fase 2 de los enlaces web): el shell pinta la página en
   * una vista nativa; la app pone la barra y decide los bounds.
   */
  navegador: {
    /** Abre `url` (pestaña nueva, o `opts.pestanaId`; `opts.fondo` no la activa). Resuelve el id de la pestaña. */
    abrir: (url, bounds, opts) => ipcRenderer.invoke('mph:nav-abrir', url, bounds, opts),
    activar: (id) => ipcRenderer.invoke('mph:nav-activar', id),
    cerrarPestana: (id) => ipcRenderer.invoke('mph:nav-cerrar-pestana', id),
    /** Esconde o muestra la página activa sin cerrarla (un panel del chat encima). */
    visible: (v) => ipcRenderer.invoke('mph:nav-visible', v),
    bounds: (b) => ipcRenderer.invoke('mph:nav-bounds', b),
    atras: () => ipcRenderer.invoke('mph:nav-atras'),
    adelante: () => ipcRenderer.invoke('mph:nav-adelante'),
    recargar: () => ipcRenderer.invoke('mph:nav-recargar'),
    cerrar: () => ipcRenderer.invoke('mph:nav-cerrar'),
    /** Ajustes del shell: segundos de inactividad a partir de los que la visita se pausa. */
    configurar: (c) => ipcRenderer.invoke('mph:nav-config', c),
    /** Modo foco: sitios bloqueados hasta `hasta` (ms) y la página que se muestra en su lugar. */
    foco: (d) => ipcRenderer.invoke('mph:nav-foco', d),
    /** Cierra las sesiones de los sitios (cookies, almacenamiento y caché del navegador). */
    limpiarSesion: () => ipcRenderer.invoke('mph:nav-limpiar-sesion'),
  },
  /**
   * Programas del equipo asignados a objetos (solo Windows, que es donde el
   * fondo de pantalla recibe clics): elegir con el diálogo del sistema, lanzar
   * y pedir su icono. Donde no existe, la app ni ofrece la opción.
   */
  ...(process.platform === 'win32'
    ? {
        programas: {
          elegir: () => ipcRenderer.invoke('mph:programa-elegir'),
          abrir: (ruta) => ipcRenderer.invoke('mph:programa-abrir', ruta),
          icono: (ruta) => ipcRenderer.invoke('mph:programa-icono', ruta),
        },
      }
    : {}),
})
