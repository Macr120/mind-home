import { registerPlugin } from '@capacitor/core'

/**
 * Sign in with Apple NATIVO en iOS (`ios/App/App/AppleLoginPlugin.swift`).
 *
 * El login web de Apple dentro del Safari incrustado se quedó en blanco en la
 * revisión del 24-sep-2026 (iPad Air M3, iPadOS 27.0): la vuelta a la app
 * depende de un salto a `com.macr120.mindhome://oauth` que dispara un POST
 * automático, y el navegador incrustado no siempre lo sigue. La hoja nativa no
 * pasa por la web: devuelve un `identityToken` que Supabase canjea con
 * `signInWithIdToken`.
 *
 * Supabase tiene que aceptar el bundle id (`com.macr120.mindhome`) como
 * audiencia: Authentication › Providers › Apple › Client IDs, junto al
 * Services ID de la web (`com.macr120.mindhome.web`).
 */
interface AppleLoginNativo {
  entrar(opciones: { nonce: string }): Promise<{ identityToken: string; nombre: string }>
}

const AppleLogin = registerPlugin<AppleLoginNativo>('AppleLogin')

/** Lo que la hoja de Apple entrega y Supabase necesita para abrir sesión. */
export interface CredencialApple {
  token: string
  /** El nonce EN CLARO: Supabase lo hashea y lo compara con el del token. */
  nonce: string
  /** Solo llega la primera vez que la persona autoriza la app; si no, ''. */
  nombre: string
}

/** El usuario cerró la hoja de Apple: no es un error que haya que enseñar. */
export class LoginAppleCancelado extends Error {}

async function sha256Hex(texto: string): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(texto))
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

/** Abre la hoja nativa. Lanza `LoginAppleCancelado` si la persona la cierra. */
export async function pedirCredencialApple(): Promise<CredencialApple> {
  const bytes = crypto.getRandomValues(new Uint8Array(32))
  const nonce = [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('')
  try {
    // Método del plugin, nunca el plugin en sí dentro de un `await`
    // (ver `paywallNativo.ts`: el Proxy de Capacitor es un «thenable»).
    const r = await AppleLogin.entrar({ nonce: await sha256Hex(nonce) })
    return { token: r.identityToken, nonce, nombre: r.nombre }
  } catch (e) {
    if ((e as { code?: unknown } | null)?.code === 'CANCELADO') throw new LoginAppleCancelado()
    throw e
  }
}
