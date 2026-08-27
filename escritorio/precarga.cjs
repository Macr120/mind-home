/**
 * El único puente entre el shell y la app. A propósito es diminuto: la web no
 * necesita Node para nada, así que aquí solo entra lo que no puede resolver
 * ella sola.
 *
 * Lo que cruza es UNA cosa: la vuelta del login social. El navegador del
 * sistema termina en `com.macr120.mindhome://oauth#access_token=…`, el proceso
 * principal recoge esa URL y la reenvía aquí; esto la vuelve a emitir como un
 * evento del DOM (`mph:enlace-profundo`), que es algo que la app ya sabe
 * escuchar sin saber nada de Electron.
 *
 * Nada de `ipcRenderer` queda expuesto a la página: el `contextBridge` publica
 * solo dos datos de lectura.
 */
const { contextBridge, ipcRenderer } = require('electron')

ipcRenderer.on('mph:enlace-profundo', (_evento, url) => {
  window.dispatchEvent(new CustomEvent('mph:enlace-profundo', { detail: url }))
})

const version = process.argv.find((a) => a.startsWith('--mph-version='))?.slice('--mph-version='.length)

contextBridge.exposeInMainWorld('mph', { escritorio: true, version: version ?? null })
