/** Las redes a las que publica el Studio de video y el proveedor OAuth de cada una. */

export type Plataforma = 'youtube' | 'tiktok' | 'facebook' | 'instagram'
export type Proveedor = 'google' | 'tiktok' | 'meta'

export const PLATAFORMAS: readonly Plataforma[] = ['youtube', 'tiktok', 'facebook', 'instagram']

export function esPlataforma(x: unknown): x is Plataforma {
  return typeof x === 'string' && (PLATAFORMAS as readonly string[]).includes(x)
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
