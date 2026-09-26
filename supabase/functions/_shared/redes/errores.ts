/** Errores tipados de las funciones de redes (mismos códigos base que los proxies de IA, más los propios). */
import { json } from '../cors.ts'

export type CodigoRedes =
  | 'sin-sesion'
  | 'limite'
  | 'peticion-invalida'
  | 'proveedor'
  | 'configuracion'
  | 'plataforma'
  | 'sin-cuenta'
  | 'caducada'
  | 'permisos'
  | 'formato'
  | 'demasiado-grande'
  | 'cuota-youtube'
  | 'orden'
  | 'sesion-caducada'
  | 'sin-unlock'

const STATUS: Record<CodigoRedes, number> = {
  'sin-sesion': 401,
  limite: 429,
  'peticion-invalida': 400,
  proveedor: 502,
  configuracion: 503,
  plataforma: 400,
  'sin-cuenta': 404,
  caducada: 401,
  permisos: 403,
  formato: 415,
  'demasiado-grande': 413,
  'cuota-youtube': 429,
  orden: 409,
  'sesion-caducada': 410,
  'sin-unlock': 403,
}

export class ErrorRedes extends Error {
  codigo: CodigoRedes
  status: number
  /** Campos extra de la respuesta (p. ej. `recibido` en 'orden'). */
  extra: Record<string, unknown>
  constructor(codigo: CodigoRedes, mensaje: string, extra: Record<string, unknown> = {}) {
    super(mensaje)
    this.name = 'ErrorRedes'
    this.codigo = codigo
    this.status = STATUS[codigo]
    this.extra = extra
  }
}

/**
 * Respuesta de error. Un fallo no tipado (red, proveedor caído, bug) sale como
 * 502 'proveedor' con un mensaje genérico: el detalle va al log, y nunca los
 * tokens ni las URLs de subida (son credenciales).
 */
export function respuestaError(e: unknown, cors: Record<string, string>): Response {
  if (e instanceof ErrorRedes) return json({ error: e.codigo, mensaje: e.message, ...e.extra }, e.status, cors)
  console.error('[redes]', e instanceof Error ? `${e.name}: ${e.message}` : String(e))
  return json({ error: 'proveedor', mensaje: 'La red social no respondió. Inténtalo de nuevo en unos minutos.' }, 502, cors)
}

/** Lee el JSON de una respuesta del proveedor sin reventar si no es JSON. */
export async function jsonDe(resp: Response): Promise<Record<string, unknown>> {
  try {
    return (await resp.json()) as Record<string, unknown>
  } catch {
    return {}
  }
}

/** Mensaje corto y sin secretos del error de un proveedor. */
export function mensajeProveedor(cuerpo: Record<string, unknown>, status: number): string {
  const e = cuerpo.error
  if (typeof e === 'string') return e.slice(0, 200)
  if (e && typeof e === 'object') {
    const m = (e as Record<string, unknown>).message
    if (typeof m === 'string') return m.slice(0, 200)
  }
  return `HTTP ${status}`
}
