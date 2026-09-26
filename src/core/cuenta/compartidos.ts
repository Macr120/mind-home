/**
 * Medios compartidos en R2 (Edge Function `compartidos`): adjuntos del buzón,
 * archivos de los espacios y el plano de una partida. Misma ruta relativa que
 * tenían en sus buckets de Storage; lo viejo se muda solo al primer acceso.
 */
import { bajarDeUrl, llamar, put } from './almacen'

export type AmbitoCompartido = 'buzon' | 'espacio' | 'partida'

export async function subirCompartido(ambito: AmbitoCompartido, ruta: string, blob: Blob): Promise<void> {
  const mime = blob.type || 'application/octet-stream'
  const { url } = await llamar<{ url: string }>({ accion: 'subir', ambito, ruta, bytes: blob.size, mime }, 'compartidos')
  await put(url, blob, mime)
  await llamar({ accion: 'confirmar', ambito, ruta }, 'compartidos')
}

/** Baja un medio; si aún no estaba en R2, pide que se mude y reintenta. */
export async function bajarCompartido(ambito: AmbitoCompartido, ruta: string, mime?: string): Promise<Blob> {
  for (const migrar of [false, true]) {
    const { urls } = await llamar<{ urls: Record<string, string> }>({ accion: 'bajar', ambito, rutas: [ruta], migrar }, 'compartidos')
    const blob = urls[ruta] ? await bajarDeUrl(urls[ruta], mime) : null
    if (blob) return blob
  }
  throw new Error(`sin objeto: ${ruta}`)
}

/** Borra rutas sueltas y/o todo lo que cuelga de `prefijo` (best-effort lo decide el caller). */
export async function borrarCompartidos(ambito: AmbitoCompartido, opciones: { rutas?: string[]; prefijo?: string }): Promise<void> {
  await llamar({ accion: 'borrar', ambito, rutas: opciones.rutas ?? [], prefijo: opciones.prefijo }, 'compartidos')
}
