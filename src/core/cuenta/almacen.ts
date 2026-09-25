/**
 * Cliente del almacén en Cloudflare R2 (Edge Function `almacen`, migración
 * 20260925000001). Supabase firma y lleva la cuota; los bytes viajan directo
 * entre el navegador y R2.
 *
 * Las claves son RELATIVAS al usuario: `sync/<tabla>/<uid>/<campo>` para los
 * blobs del sync y `archivo/<uid>` para el cuarto Archivo.
 *
 * Cuota: Pro ×1/×2/×3 = 10/30/100 GB, trial = 10 GB, sin plan = solo lectura.
 */
import { create } from 'zustand'
import { obtenerSupabase } from './supabase'
import { tGlobal } from '../i18n/useT'

export type MotivoAlmacen = 'sin-sesion' | 'sin-pro' | 'cuota' | 'grande' | 'sin-objeto' | 'sin-almacen' | 'red'

/** Error tipado del almacén; `message` ya viene listo para mostrarse. */
export class ErrorAlmacen extends Error {
  motivo: MotivoAlmacen
  constructor(motivo: MotivoAlmacen) {
    super(mensajeDe(motivo))
    this.name = 'ErrorAlmacen'
    this.motivo = motivo
  }
}

function mensajeDe(m: MotivoAlmacen): string {
  switch (m) {
    case 'sin-sesion':
      return tGlobal('almacen.error.sinSesion', 'Inicia sesión para usar tu Archivo.')
    case 'sin-pro':
      return tGlobal('almacen.error.sinPro', 'Guardar archivos en la nube es parte de Pro.')
    case 'cuota':
      return tGlobal('almacen.error.cuota', 'Tu Archivo está lleno. Libera espacio o sube de nivel.')
    case 'grande':
      return tGlobal('almacen.error.grande', 'El archivo pasa del tope de 2 GB.')
    case 'sin-objeto':
      return tGlobal('almacen.error.sinObjeto', 'La subida no llegó completa. Inténtalo de nuevo.')
    case 'sin-almacen':
      return tGlobal('almacen.error.sinAlmacen', 'El almacenamiento en la nube no está disponible ahora.')
    default:
      return tGlobal('almacen.error.red', 'No hay conexión con el almacenamiento de MindHaOS.')
  }
}

/** Tope por archivo (igual que `almacen_reservar`). */
export const TOPE_ARCHIVO = 2 * 1024 ** 3

interface UsoAlmacen {
  usados: number
  /** Bytes; null = sin tope (cuenta ilimitada). */
  cuota: number | null
}

/** Medidor del almacén: lo pintan Archivo y la sección Cuenta. */
export const useAlmacen = create<{ uso: UsoAlmacen | null }>(() => ({ uso: null }))

async function llamar<T>(cuerpo: Record<string, unknown>): Promise<T> {
  const sb = await obtenerSupabase()
  if (!sb) throw new ErrorAlmacen('sin-almacen')
  const token = (await sb.auth.getSession()).data.session?.access_token
  if (!token) throw new ErrorAlmacen('sin-sesion')
  let resp: Response
  try {
    resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/almacen`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(cuerpo),
    })
  } catch {
    throw new ErrorAlmacen('red')
  }
  const json = (await resp.json().catch(() => null)) as ({ ok?: boolean; motivo?: MotivoAlmacen; error?: string } & T) | null
  if (!resp.ok) throw new ErrorAlmacen(json?.error === 'sin-sesion' ? 'sin-sesion' : resp.status === 503 ? 'sin-almacen' : 'red')
  if (!json?.ok) throw new ErrorAlmacen(json?.motivo ?? 'red')
  return json
}

/** PUT directo a R2 con progreso (fetch no lo da en subidas). */
function put(url: string, blob: Blob, mime: string, onProgreso?: (fraccion: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('PUT', url)
    xhr.setRequestHeader('Content-Type', mime)
    if (onProgreso) xhr.upload.onprogress = (e) => e.lengthComputable && onProgreso(e.loaded / e.total)
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new ErrorAlmacen('red')))
    xhr.onerror = () => reject(new ErrorAlmacen('red'))
    xhr.send(blob)
  })
}

/** Sube un blob a la clave dada; devuelve los bytes que quedaron contados. */
export async function subirArchivo(clave: string, blob: Blob, onProgreso?: (fraccion: number) => void): Promise<number> {
  if (blob.size > TOPE_ARCHIVO) throw new ErrorAlmacen('grande')
  const mime = blob.type || 'application/octet-stream'
  const { url } = await llamar<{ url: string }>({ accion: 'subir', clave, bytes: blob.size, mime })
  await put(url, blob, mime, onProgreso)
  const { bytes } = await llamar<{ bytes: number }>({ accion: 'confirmar', clave })
  return bytes
}

/** URLs de lectura firmadas (15 min), en un solo viaje. `nombre` fuerza la descarga. */
export async function urlsDeBajada(claves: string[], nombre?: string): Promise<Record<string, string>> {
  const urls: Record<string, string> = {}
  for (let i = 0; i < claves.length; i += 200) {
    const r = await llamar<{ urls: Record<string, string> }>({ accion: 'bajar', claves: claves.slice(i, i + 200), nombre })
    Object.assign(urls, r.urls)
  }
  return urls
}

/** Baja el blob de una URL firmada; null si el objeto no existe. */
export async function bajarDeUrl(url: string, mime?: string): Promise<Blob | null> {
  let r: Response
  try {
    r = await fetch(url)
  } catch {
    throw new ErrorAlmacen('red')
  }
  if (r.status === 404) return null
  if (!r.ok) throw new ErrorAlmacen('red')
  const b = await r.blob()
  return mime && b.type !== mime ? new Blob([b], { type: mime }) : b
}

export async function bajarArchivo(clave: string, mime?: string): Promise<Blob | null> {
  const urls = await urlsDeBajada([clave])
  return bajarDeUrl(urls[clave], mime)
}

/** Borra claves sueltas y/o todo lo que cuelga de `prefijo`. */
export async function borrarArchivos(claves: string[], prefijo?: string): Promise<void> {
  for (let i = 0; i < Math.max(claves.length, 1); i += 500) {
    await llamar({ accion: 'borrar', claves: claves.slice(i, i + 500), prefijo: i === 0 ? prefijo : undefined })
  }
}

/** Relee el medidor del servidor y lo deja en `useAlmacen`. */
export async function refrescarUsoAlmacen(): Promise<UsoAlmacen | null> {
  try {
    const r = await llamar<UsoAlmacen>({ accion: 'uso' })
    const uso = { usados: Number(r.usados) || 0, cuota: r.cuota == null ? null : Number(r.cuota) }
    useAlmacen.setState({ uso })
    return uso
  } catch {
    return null
  }
}

/** «1.3/10 GB» (misma unidad) o «350 MB/10 GB»: el medidor corto del chat. */
export function formatoUso(usados: number, cuota: number): string {
  const [u, uu] = formatoBytes(usados).split(' ')
  const [c, cu] = formatoBytes(cuota).split(' ')
  return uu === cu ? `${u}/${c} ${cu}` : `${u} ${uu}/${c} ${cu}`
}

/** «1.2 GB», «350 MB»… */
export function formatoBytes(n: number): string {
  if (n < 1024) return `${n} B`
  const u = ['KB', 'MB', 'GB', 'TB']
  let v = n / 1024
  let i = 0
  while (v >= 1024 && i < u.length - 1) {
    v /= 1024
    i++
  }
  return `${v >= 10 || i === 0 ? Math.round(v) : v.toFixed(1)} ${u[i]}`
}
