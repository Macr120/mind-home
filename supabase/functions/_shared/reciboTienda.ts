/**
 * Verificación del recibo de la tienda: ¿de verdad esta instalación se compró?
 *
 * La app se publica como app de PAGO, así que no hay compra in-app que
 * consultar; lo que se comprueba es la LICENCIA de la instalación:
 *
 * - **Android → Play Integrity API**. La app pide un token de integridad y aquí
 *   se decodifica con la Play Integrity API. Vale el alta solo si el veredicto
 *   dice que la app la reconoce Play (`PLAY_RECOGNIZED`), que el paquete es el
 *   nuestro y que la cuenta tiene derecho a la app (`appLicensingVerdict:
 *   LICENSED`) — eso último es exactamente «la compró en Play».
 * - **iOS → App Store**. Se valida el recibo de la app (`verifyReceipt`) y se
 *   comprueba el `bundle_id`. Una app de pago no tiene transacciones in-app: el
 *   recibo de aplicación es la prueba de compra. Todavía no hay proyecto iOS;
 *   el camino queda listo para cuando lo haya.
 *
 * **El nonce va atado a la sesión**: el cliente pide el token de integridad con
 * `sha256(access_token)` como nonce y luego llama con ese mismo access_token en
 * la cabecera. Así el veredicto no se puede reutilizar en otra cuenta ni
 * repetir más tarde, y no hace falta guardar nonces en la base.
 *
 * Configuración (secretos de la función):
 * - `ANDROID_PACKAGE` (p. ej. `com.macr120.mindhome`)
 * - `GOOGLE_SERVICE_ACCOUNT` (JSON de la cuenta de servicio con el rol de Play
 *   Integrity; se usan `client_email` y `private_key`)
 * - `IOS_BUNDLE_ID` (p. ej. `com.macr120.mindhome`)
 * - `ALTA_TIENDA_SIN_RECIBO=1` — **SOLO PRUEBAS**: acepta el alta sin verificar
 *   nada. Sin esta bandera, una tienda sin configurar RECHAZA el alta.
 */

export type Tienda = 'android' | 'ios'

export interface Veredicto {
  ok: boolean
  /** Motivo del rechazo, para el log y la respuesta ('' si ok). */
  motivo: string
}

const ok: Veredicto = { ok: true, motivo: '' }
const no = (motivo: string): Veredicto => ({ ok: false, motivo })

/** ¿Se saltó la verificación a mano? Solo para probar antes de publicar. */
export function sinRecibo(): boolean {
  return Deno.env.get('ALTA_TIENDA_SIN_RECIBO') === '1'
}

/** El nonce que debió usar el cliente: sha256 del access_token, base64url. */
export async function nonceDe(req: Request): Promise<string> {
  const jwt = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '')
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(jwt))
  return base64url(new Uint8Array(hash))
}

function base64url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

/** Verifica el recibo/licencia de la tienda que dice el cliente. */
export async function verificarRecibo(
  tienda: Tienda,
  token: string,
  nonceEsperado: string,
): Promise<Veredicto> {
  if (sinRecibo()) return ok
  if (!token) return no('sin-token')
  return tienda === 'android'
    ? await verificarAndroid(token, nonceEsperado)
    : await verificarIos(token)
}

// ─── Android: Play Integrity ─────────────────────────────────────────────────

interface Integridad {
  requestDetails?: { requestPackageName?: string; nonce?: string; timestampMillis?: string }
  appIntegrity?: { appRecognitionVerdict?: string; packageName?: string }
  accountDetails?: { appLicensingVerdict?: string }
}

async function verificarAndroid(token: string, nonceEsperado: string): Promise<Veredicto> {
  const paquete = Deno.env.get('ANDROID_PACKAGE')
  const cuenta = Deno.env.get('GOOGLE_SERVICE_ACCOUNT')
  if (!paquete || !cuenta) return no('android-sin-configurar')

  let acceso: string
  try {
    acceso = await tokenGoogle(cuenta, 'https://www.googleapis.com/auth/playintegrity')
  } catch (e) {
    return no(`google-auth: ${e instanceof Error ? e.message : String(e)}`)
  }

  const r = await fetch(
    `https://playintegrity.googleapis.com/v1/${paquete}:decodeIntegrityToken`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${acceso}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ integrity_token: token }),
    },
  )
  if (!r.ok) return no(`play-integrity-${r.status}`)

  const datos = (await r.json()) as { tokenPayloadExternal?: Integridad }
  const v = datos.tokenPayloadExternal
  if (!v) return no('veredicto-vacio')

  // El nonce ata el veredicto a ESTA sesión: sin esto, un token válido de otra
  // cuenta (o de ayer) serviría para dar de alta cualquier perfil.
  if (v.requestDetails?.nonce !== nonceEsperado) return no('nonce')
  if (v.requestDetails?.requestPackageName !== paquete) return no('paquete')
  // 5 minutos de margen: el token se pide justo antes de llamar.
  const emitido = Number(v.requestDetails?.timestampMillis ?? 0)
  if (!emitido || Date.now() - emitido > 5 * 60 * 1000) return no('caducado')
  if (v.appIntegrity?.appRecognitionVerdict !== 'PLAY_RECOGNIZED') return no('app-no-reconocida')
  // La prueba de compra de una app de pago: la cuenta tiene derecho a la app.
  if (v.accountDetails?.appLicensingVerdict !== 'LICENSED') return no('sin-licencia')
  return ok
}

/** Access token de la cuenta de servicio (JWT RS256 → oauth2.googleapis.com). */
async function tokenGoogle(cuentaJson: string, scope: string): Promise<string> {
  const cuenta = JSON.parse(cuentaJson) as { client_email: string; private_key: string }
  const ahora = Math.floor(Date.now() / 1000)
  const cabecera = { alg: 'RS256', typ: 'JWT' }
  const cuerpo = {
    iss: cuenta.client_email,
    scope,
    aud: 'https://oauth2.googleapis.com/token',
    iat: ahora,
    exp: ahora + 3600,
  }
  const codificar = (o: unknown) => base64url(new TextEncoder().encode(JSON.stringify(o)))
  const sinFirma = `${codificar(cabecera)}.${codificar(cuerpo)}`

  const clave = await crypto.subtle.importKey(
    'pkcs8',
    pemADer(cuenta.private_key),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const firma = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    clave,
    new TextEncoder().encode(sinFirma),
  )
  const jwt = `${sinFirma}.${base64url(new Uint8Array(firma))}`

  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  })
  if (!r.ok) throw new Error(`oauth-${r.status}`)
  return ((await r.json()) as { access_token: string }).access_token
}

/** PEM (con los `\n` escapados que trae el JSON) → DER para importKey. */
function pemADer(pem: string): Uint8Array {
  const cuerpo = pem
    .replace(/\\n/g, '\n')
    .replace(/-----[A-Z ]+-----/g, '')
    .replace(/\s+/g, '')
  const bin = atob(cuerpo)
  return Uint8Array.from(bin, (c) => c.charCodeAt(0))
}

// ─── iOS: recibo de la App Store ─────────────────────────────────────────────

const VERIFY_PROD = 'https://buy.itunes.apple.com/verifyReceipt'
const VERIFY_SANDBOX = 'https://sandbox.itunes.apple.com/verifyReceipt'

async function verificarIos(recibo: string): Promise<Veredicto> {
  const bundle = Deno.env.get('IOS_BUNDLE_ID')
  if (!bundle) return no('ios-sin-configurar')

  const pedir = async (url: string) => {
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 'receipt-data': recibo }),
    })
    return (await r.json()) as { status?: number; receipt?: { bundle_id?: string } }
  }

  let datos = await pedir(VERIFY_PROD)
  // 21007: recibo de sandbox enviado a producción (TestFlight y simulador).
  if (datos.status === 21007) datos = await pedir(VERIFY_SANDBOX)
  if (datos.status !== 0) return no(`apple-${datos.status ?? 'sin-status'}`)
  if (datos.receipt?.bundle_id !== bundle) return no('bundle')
  return ok
}
