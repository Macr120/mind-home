/**
 * Llamadas a las Edge Functions de IA (proxy con la clave del SERVIDOR).
 *
 * `usarViaCuenta()` decide el transporte en `chat/ia.ts` e `imagenIA.ts`: con
 * sesión y plan Pro la IA sale por aquí (JWT del usuario + cuota mensual); el
 * camino BYOK con claves del navegador queda solo para desarrollo (`devIA()`).
 */
import { esPro } from '../edicion'
import { supabase, hayBackend } from './supabase'
import { haySesion, useSesion } from './sesionStore'

export type CodigoErrorIA = 'sin-sesion' | 'sin-pro' | 'cuota-agotada' | 'proveedor' | 'peticion-invalida'

/** Error tipado de la vía cuenta; `message` ya viene listo para mostrarse. */
export class ErrorIA extends Error {
  codigo: CodigoErrorIA
  constructor(codigo: CodigoErrorIA, mensaje: string) {
    super(mensaje)
    this.name = 'ErrorIA'
    this.codigo = codigo
  }
}

/** ¿La IA debe salir por el proxy de la cuenta? (backend + sesión + Pro real) */
export function usarViaCuenta(): boolean {
  return hayBackend() && haySesion() && esPro()
}

export interface MensajeCuenta {
  rol: 'usuario' | 'asistente'
  texto: string
  imagen?: { base64: string; mediaType: string }
}

export interface ToolCuenta {
  name: string
  description: string
  schema: Record<string, unknown>
}

export interface RespuestaChatCuenta {
  texto: string | null
  llamadas: { name: string; input: Record<string, unknown> }[]
  uso: { entrada: number; salida: number; usadas: number; limite: number }
}

async function llamarFuncion<T>(nombre: string, cuerpo: unknown): Promise<T> {
  if (!supabase) throw new ErrorIA('sin-sesion', 'Sin backend configurado.')
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) throw new ErrorIA('sin-sesion', 'Inicia sesión para usar la IA.')

  let resp: Response
  try {
    resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${nombre}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(cuerpo),
    })
  } catch {
    throw new ErrorIA('proveedor', 'No hay conexión con el servidor de Mind Planner Home.')
  }
  const json: unknown = await resp.json().catch(() => null)
  if (!resp.ok) {
    const e = (json ?? {}) as { error?: CodigoErrorIA; mensaje?: string }
    throw new ErrorIA(e.error ?? 'proveedor', e.mensaje ?? 'Error del servidor de IA.')
  }
  return json as T
}

/** Chat/tools/visión vía `ia-chat`. Refresca el medidor local con el uso devuelto. */
export async function iaChatCuenta(cuerpo: {
  system: string
  mensajes: MensajeCuenta[]
  tools?: ToolCuenta[]
  maxTokens?: number
}): Promise<RespuestaChatCuenta> {
  const r = await llamarFuncion<RespuestaChatCuenta>('ia-chat', cuerpo)
  const uso = useSesion.getState().usoIA
  if (uso) {
    useSesion.setState({
      usoIA: { ...uso, solicitudes: r.uso.usadas, limiteSolicitudes: r.uso.limite },
    })
  }
  return r
}

/** Imagen vía `ia-imagen` (base64 + mime). */
export async function iaImagenCuenta(prompt: string): Promise<{ base64: string; mime: string }> {
  const r = await llamarFuncion<{ base64: string; mime: string; uso: { usadas: number; limite: number } }>(
    'ia-imagen',
    { prompt },
  )
  const uso = useSesion.getState().usoIA
  if (uso) {
    useSesion.setState({ usoIA: { ...uso, imagenes: r.uso.usadas, limiteImagenes: r.uso.limite } })
  }
  return { base64: r.base64, mime: r.mime }
}
