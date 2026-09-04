/**
 * El `state` del OAuth: un id aleatorio (clave de `redes_oauth_pendientes`) más
 * su firma HMAC-SHA256 con `REDES_STATE_SECRET`. La firma se verifica en tiempo
 * constante ANTES de tocar la BD, así que un `state` inventado no cuesta ni una
 * consulta. También vive aquí el PKCE de TikTok.
 */
import { aBase64Url, deBase64Url } from './cifrado.ts'

let clave: Promise<CryptoKey> | null = null

function claveFirma(): Promise<CryptoKey> {
  clave ??= (async () => {
    const secreto = Deno.env.get('REDES_STATE_SECRET') ?? ''
    if (secreto.length < 16) throw new Error('REDES_STATE_SECRET no configurado')
    return crypto.subtle.importKey('raw', new TextEncoder().encode(secreto), { name: 'HMAC', hash: 'SHA-256' }, false, [
      'sign',
      'verify',
    ])
  })()
  return clave
}

export function idAleatorio(bytes = 32): string {
  return aBase64Url(crypto.getRandomValues(new Uint8Array(bytes)))
}

/** `<id>.<firma>` para la URL de autorización. */
export async function firmarState(id: string): Promise<string> {
  const firma = await crypto.subtle.sign('HMAC', await claveFirma(), new TextEncoder().encode(id))
  return `${id}.${aBase64Url(new Uint8Array(firma))}`
}

/** El id si la firma es válida; null si no (sin consultar nada). */
export async function verificarState(state: string): Promise<string | null> {
  const punto = state.lastIndexOf('.')
  if (punto <= 0 || state.length > 200) return null
  const id = state.slice(0, punto)
  const firma = state.slice(punto + 1)
  let bytes: Uint8Array<ArrayBuffer>
  try {
    bytes = deBase64Url(firma)
  } catch {
    return null
  }
  const ok = await crypto.subtle.verify('HMAC', await claveFirma(), bytes, new TextEncoder().encode(id))
  return ok ? id : null
}

/**
 * PKCE de TikTok: su Login Kit documenta el `code_challenge` como el SHA-256 del
 * verifier en HEXADECIMAL (no en base64url como el RFC 7636).
 */
export async function retoPkceTikTok(verifier: string): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))
  return Array.from(new Uint8Array(hash), (b) => b.toString(16).padStart(2, '0')).join('')
}
