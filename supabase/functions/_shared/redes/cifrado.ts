/**
 * Cifrado en reposo de los tokens de las redes (AES-GCM 256 con WebCrypto).
 * Sin pgsodium ni Vault: la clave vive en el secreto `REDES_CIFRADO_KEY`
 * (32 bytes en base64), así que un volcado de la BD no expone credenciales
 * que publican en cuentas ajenas. Formato: `v1.<iv>.<cifrado>` en base64url.
 */

let clave: Promise<CryptoKey> | null = null

function claveCifrado(): Promise<CryptoKey> {
  clave ??= (async () => {
    const b64 = Deno.env.get('REDES_CIFRADO_KEY') ?? ''
    const bytes = b64 ? deBase64(b64) : new Uint8Array()
    if (bytes.length !== 32) throw new Error('REDES_CIFRADO_KEY debe ser 32 bytes en base64')
    return crypto.subtle.importKey('raw', bytes, 'AES-GCM', false, ['encrypt', 'decrypt'])
  })()
  return clave
}

export async function cifrar(texto: string): Promise<string> {
  const k = await claveCifrado()
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, k, new TextEncoder().encode(texto))
  return `v1.${aBase64Url(iv)}.${aBase64Url(new Uint8Array(ct))}`
}

export async function descifrar(cifrado: string): Promise<string> {
  const [v, iv, ct] = cifrado.split('.')
  if (v !== 'v1' || !iv || !ct) throw new Error('token cifrado con formato desconocido')
  const k = await claveCifrado()
  const claro = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: deBase64Url(iv) }, k, deBase64Url(ct))
  return new TextDecoder().decode(claro)
}

export function aBase64Url(bytes: Uint8Array): string {
  let bin = ''
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i])
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function deBase64Url(s: string): Uint8Array<ArrayBuffer> {
  return deBase64(s.replace(/-/g, '+').replace(/_/g, '/'))
}

/** Sobre un ArrayBuffer propio (no compartido): es lo que exigen WebCrypto y `fetch` como BufferSource. */
function deBase64(s: string): Uint8Array<ArrayBuffer> {
  const relleno = s.length % 4 === 0 ? s : s + '='.repeat(4 - (s.length % 4))
  const bin = atob(relleno)
  const bytes = new Uint8Array(new ArrayBuffer(bin.length))
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return bytes
}
