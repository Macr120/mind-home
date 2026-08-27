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

// Solo llega a la ventana del fondo: la vista previa le manda hacia dónde moverse.
ipcRenderer.on('mph:fondo-mover', (_evento, d) => {
  window.dispatchEvent(new CustomEvent('mph:fondo-mover', { detail: d }))
})

const version = process.argv.find((a) => a.startsWith('--mph-version='))?.slice('--mph-version='.length)

contextBridge.exposeInMainWorld('mph', {
  escritorio: true,
  version: version ?? null,
  /** Enciende o apaga la casa como fondo de pantalla; resuelve si queda encendida. */
  ponerDeFondo: () => ipcRenderer.invoke('mph:fondo'),
  /** Foto de cómo se ve el fondo AHORA (data URL), o null si no está puesto. */
  vistaFondo: () => ipcRenderer.invoke('mph:fondo-vista'),
  /** Mueve el encuadre del fondo: arrastre en fracción de pantalla, o zoom. */
  moverFondo: (d) => ipcRenderer.invoke('mph:fondo-mover', d),
})
