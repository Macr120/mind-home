/** Las redes a las que publica el Studio de video y el proveedor OAuth de cada una. */
import { ErrorRedes } from './errores.ts'

export type Plataforma = 'youtube' | 'tiktok' | 'facebook' | 'instagram'
export type Proveedor = 'google' | 'tiktok' | 'meta'

export const PLATAFORMAS: readonly Plataforma[] = ['youtube', 'tiktok', 'facebook', 'instagram']

export function esPlataforma(x: unknown): x is Plataforma {
  return typeof x === 'string' && (PLATAFORMAS as readonly string[]).includes(x)
}

/**
 * Cuántas cuentas por red puede conectar el usuario: 16 (una por idioma) para
 * los correos de `REDES_MULTICUENTA_EMAILS`, 1 para el resto. Exige el correo
 * confirmado: si no, cualquiera podría registrarse con esa dirección.
 */
const MAX_RANURAS = 16
export function ranurasDe(usuario: { email?: string | null; email_confirmed_at?: string | null }): number {
  const lista = (Deno.env.get('REDES_MULTICUENTA_EMAILS') ?? 'macr120cme@gmail.com').toLowerCase().split(',').map((s) => s.trim())
  const email = (usuario.email ?? '').toLowerCase()
  return email && usuario.email_confirmed_at && lista.includes(email) ? MAX_RANURAS : 1
}

/** La ranura pedida (0 si no viene); fuera de rango es un error, no un «usa la 0». */
export function leerRanura(x: unknown, max: number): number {
  if (x == null) return 0
  if (typeof x !== 'number' || !Number.isInteger(x) || x < 0 || x >= max) {
    throw new ErrorRedes('peticion-invalida', 'Ranura de cuenta inválida.')
  }
  return x
}

/** Facebook e Instagram comparten la app de Meta (un solo login para las dos). */
export function proveedorDe(p: Plataforma): Proveedor {
  if (p === 'youtube') return 'google'
  if (p === 'tiktok') return 'tiktok'
  return 'meta'
}

/** Contenedores que admite la subida; el cliente manda el mime completo del MediaRecorder. */
export function mimeNormalizado(mime: unknown): 'video/mp4' | 'video/webm' | null {
  if (typeof mime !== 'string') return null
  const base = mime.split(';')[0].trim().toLowerCase()
  if (base === 'video/mp4') return 'video/mp4'
  if (base === 'video/webm') return 'video/webm'
  return null
}
