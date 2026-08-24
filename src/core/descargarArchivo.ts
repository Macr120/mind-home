import { esAppNativa } from './plataforma'

/**
 * Guardar en el dispositivo un archivo que genera la app: el respaldo de datos,
 * una hoja de cálculo, una imagen del visor.
 *
 * En el navegador basta el `<a download>` de toda la vida. En la app de tienda
 * NO: el WebView de Capacitor no trae gestor de descargas —ni iOS, donde nadie
 * implementa `WKDownloadDelegate`, ni Android, que no registra ningún
 * `DownloadListener`—, así que el clic no hace absolutamente nada y el usuario
 * se queda creyendo que guardó su respaldo. Ahí el archivo se escribe en la
 * carpeta de la app y se ofrece por la hoja de compartir, que es por donde los
 * dos sistemas dejan sacar un archivo al exterior (Archivos, Drive, correo…).
 *
 * Si el puente falla —plugins sin sincronizar en una plataforma, por ejemplo—
 * se cae al `<a download>`: no arregla nada, pero tampoco empeora lo de antes.
 */
export async function descargarArchivo(blob: Blob, nombre: string): Promise<void> {
  if (esAppNativa() && (await guardarYCompartir(blob, nombre))) return
  descargarPorEnlace(URL.createObjectURL(blob), nombre, true)
}

/** Lo mismo, partiendo de una URL ya hecha (`blob:` o `data:` del visor). */
export async function descargarUrl(url: string, nombre: string): Promise<void> {
  if (esAppNativa()) {
    try {
      if (await guardarYCompartir(await (await fetch(url)).blob(), nombre)) return
    } catch (err) {
      console.warn('[MPH] No se pudo leer la imagen para guardarla:', err)
    }
  }
  // Sin revocar: la URL es del visor, que sigue pintándola.
  descargarPorEnlace(url, nombre, false)
}

/** Escribe el archivo en la carpeta de la app y abre la hoja de compartir. */
async function guardarYCompartir(blob: Blob, nombre: string): Promise<boolean> {
  try {
    const [{ Filesystem, Directory }, { Share }] = await Promise.all([
      import('@capacitor/filesystem'),
      import('@capacitor/share'),
    ])
    // Cache y no Documents: es una entrega de mano al sistema, no un archivo
    // que la app tenga que conservar (y en iOS, Documents se sincroniza).
    const { uri } = await Filesystem.writeFile({
      path: nombre,
      data: await aBase64(blob),
      directory: Directory.Cache,
    })
    await Share.share({ title: nombre, url: uri })
    return true
  } catch (err) {
    // Cancelar la hoja de compartir también entra por aquí; el archivo ya está
    // escrito, así que no hay nada que rescatar y el enlace no aportaría nada.
    if (err instanceof Error && /cancel/i.test(err.message)) return true
    console.warn('[MPH] No se pudo compartir el archivo:', err)
    return false
  }
}

function descargarPorEnlace(url: string, nombre: string, revocar: boolean): void {
  const a = document.createElement('a')
  a.href = url
  a.download = nombre
  a.click()
  if (revocar) URL.revokeObjectURL(url)
}

/** Blob → base64 pelado (sin la cabecera `data:…;base64,`), que es lo que pide Filesystem. */
function aBase64(blob: Blob): Promise<string> {
  return new Promise((resolver, rechazar) => {
    const lector = new FileReader()
    lector.onerror = () => rechazar(lector.error)
    lector.onload = () => resolver(String(lector.result).split(',')[1] ?? '')
    lector.readAsDataURL(blob)
  })
}
