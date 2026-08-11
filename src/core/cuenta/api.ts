/**
 * Llamadas a las Edge Functions de IA (proxy con la clave del SERVIDOR).
 *
 * `usarViaCuenta()` decide el transporte en `chat/ia.ts` e `imagenIA.ts`: con
 * sesión y algo que gastar (pool del mes o créditos de recarga) la IA sale por
 * aquí; el camino BYOK con claves del navegador queda solo para desarrollo
 * (`devIA()`).
 *
 * Ya NO hace falta suscripción para usar la IA: el modo local compra recargas
 * (créditos que no caducan) y las gasta por este mismo camino. Quien se queda
 * sin créditos recibe un 429 'cuota-agotada' y el modal decide qué ofrecerle
 * según el plan — recargar, o renovar si su Pro venció.
 */
import { esPro, fuePro } from '../edicion'
import { supabase, hayBackend } from './supabase'
import { haySesion, useSesion } from './sesionStore'
import { useAvisoRenovar, useCuotaAgotada } from '../state/avisosPlanStore'
import type { OpIA } from './costos'
import type { CalidadImagen } from './calidadImagen'

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

/**
 * ¿La IA debe salir por el proxy de la cuenta? Basta con tener sesión y algo que
 * gastar. `fuePro()` sigue contando para que un ex-suscriptor con el pool en 0
 * llegue al servidor y reciba el aviso de renovación en vez de caer a BYOK.
 */
export function usarViaCuenta(): boolean {
  if (!hayBackend() || !haySesion()) return false
  return esPro() || fuePro() || useSesion.getState().creditosExtra > 0
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
  /** Breakpoint de prompt caching al final de esta tool (lo traduce el proxy). */
  cache?: boolean
}

/** Medidor que devuelve el proxy tras cobrar: pool del mes + recargas. */
export interface UsoCuenta {
  usadas: number
  limite: number
  /** Créditos de recarga que quedan (los que no caducan). */
  extra: number
  /** Lo que costó ESTA llamada. */
  costo: number
}

export interface RespuestaChatCuenta {
  texto: string | null
  llamadas: { name: string; input: Record<string, unknown> }[]
  uso: UsoCuenta & { entrada: number; salida: number }
}

/** Refleja en el store el medidor que acaba de devolver el servidor. */
function refrescarMedidor(uso: UsoCuenta): void {
  const previo = useSesion.getState().usoIA
  useSesion.setState({
    creditosExtra: uso.extra,
    usoIA: previo
      ? { ...previo, creditos: uso.usadas, limiteCreditos: uso.limite }
      : { creditos: uso.usadas, limiteCreditos: uso.limite },
  })
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
    const codigo = e.error ?? 'proveedor'
    if (codigo === 'cuota-agotada') {
      // El modal decide qué ofrecer (recargar o renovar) según el plan.
      useCuotaAgotada.getState().abrir()
      // Los créditos que quedan pudieron cambiar en otro dispositivo.
      void useSesion.getState().refrescarPerfil()
    } else if (codigo === 'sin-pro') {
      // El espejo local iba desfasado (canceló en otro lado): resincronizar.
      useAvisoRenovar.getState().abrir()
      void useSesion.getState().refrescarPerfil()
    }
    throw new ErrorIA(codigo, e.mensaje ?? 'Error del servidor de IA.')
  }
  return json as T
}

/** Chat/tools/visión vía `ia-chat`. Refresca el medidor local con el uso devuelto. */
export async function iaChatCuenta(cuerpo: {
  system: string
  mensajes: MensajeCuenta[]
  tools?: ToolCuenta[]
  maxTokens?: number
  /** `calidad` = modelo mayor con razonamiento (cuesta más créditos). Ver `PerfilIA`. */
  perfil?: 'rapido' | 'calidad'
  /** Operación que se cobra. El servidor le impone su tope de `maxTokens`. */
  op?: OpIA
}): Promise<RespuestaChatCuenta> {
  const r = await llamarFuncion<RespuestaChatCuenta>('ia-chat', cuerpo)
  refrescarMedidor(r.uso)
  return r
}

/** Dictado vía `ia-voz` (Whisper). Fallback cuando no hay `SpeechRecognition` nativo. */
export async function iaVozCuenta(audioBase64: string, mime: string, idioma?: string): Promise<string> {
  const r = await llamarFuncion<{ texto: string; uso: UsoCuenta }>('ia-voz', { audioBase64, mime, idioma })
  refrescarMedidor(r.uso)
  return r.texto
}

/** Voz con IA vía `ia-tts` (OpenAI). Alternativa a `speechSynthesis` nativo. */
export async function iaTtsCuenta(texto: string, voz?: string): Promise<{ base64: string; mime: string }> {
  const r = await llamarFuncion<{ base64: string; mime: string; uso: UsoCuenta }>('ia-tts', { texto, voz })
  refrescarMedidor(r.uso)
  return { base64: r.base64, mime: r.mime }
}

/** Imagen vía `ia-imagen` (base64 + mime). Con `imagen` se manda una foto de referencia. */
export async function iaImagenCuenta(
  prompt: string,
  imagen?: { base64: string; mime: string },
  aspecto?: string,
  /** `buena` usa Gemini y cuesta 10; sin ella, la rápida (gpt-image-1-mini, 3). */
  calidad?: CalidadImagen,
): Promise<{ base64: string; mime: string }> {
  const r = await llamarFuncion<{ base64: string; mime: string; uso: UsoCuenta }>('ia-imagen', {
    prompt,
    imagen,
    aspecto,
    calidad,
  })
  refrescarMedidor(r.uso)
  return { base64: r.base64, mime: r.mime }
}
