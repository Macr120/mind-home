/**
 * PASE de un paquete de IA (Studio de video): `ia-paquete` cobra de una vez el
 * total de una operación larga («1 crédito por cada 25 s de video») y entrega
 * este pase firmado; `ia-voz`, `ia-chat` e `ia-tts` lo aceptan y NO vuelven a
 * cobrar mientras la llamada quepa en él.
 *
 * - Firma: HMAC-SHA256 con la service role key (solo la conocen las Edge
 *   Functions), así que el cliente no puede fabricar ni retocar un pase.
 * - Uso: cada tipo de llamada tiene un TOPE; el contador vive en `rate_limits`
 *   (bucket `pase:<id>:<tipo>`, ventana de una hora ≥ la vida del pase, así
 *   que no se reinicia a mitad). Falla CERRADO: sin contador, se cobra normal.
 * - Un pase que no vale (otro usuario, caducado, tipo no incluido o tope
 *   agotado) NUNCA da error: la llamada se cobra como siempre.
 */
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2'
import { dentroDeLimite } from './limite.ts'

export interface Pase {
  /** uuid del paquete. */
  id: string
  uid: string
  /** Operación comprada ('video.editar', …). */
  op: string
  /** Tramos de 25 s pagados. */
  tramos: number
  /** Créditos por tramo. */
  tarifa: number
  /** Tipo de reserva con que se cobró ('voz' = 1 crédito, 'tts' = 3). */
  tipo: string
  /** Llamadas máximas por tipo de op. */
  topes: Record<string, number>
  /** Caducidad (ms epoch). */
  exp: number
}

/** Vida del pase; la ventana del contador es mayor para que no se reinicie dentro. */
export const VIDA_PASE_MS = 60 * 60 * 1000
const VENTANA_CONTADOR_SEG = 2 * 60 * 60

const b64url = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
function deB64url(s: string): Uint8Array {
  const b = atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4))
  return Uint8Array.from(b, (c) => c.charCodeAt(0))
}

let claveHmac: Promise<CryptoKey> | null = null
function clave(): Promise<CryptoKey> {
  claveHmac ??= crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(`pase-ia:${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''}`),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  )
  return claveHmac
}

export async function firmarPase(p: Pase): Promise<string> {
  const cuerpo = b64url(new TextEncoder().encode(JSON.stringify(p)))
  const firma = new Uint8Array(await crypto.subtle.sign('HMAC', await clave(), new TextEncoder().encode(cuerpo)))
  return `${cuerpo}.${b64url(firma)}`
}

/** El pase si la firma es buena, es del usuario y no caducó (`aunCaducado`: para devolver lo no usado); si no, null. */
export async function leerPase(token: unknown, uid: string, opciones: { aunCaducado?: boolean } = {}): Promise<Pase | null> {
  if (typeof token !== 'string' || token.length > 4000) return null
  const [cuerpo, firma] = token.split('.')
  if (!cuerpo || !firma) return null
  try {
    const ok = await crypto.subtle.verify('HMAC', await clave(), deB64url(firma), new TextEncoder().encode(cuerpo))
    if (!ok) return null
    const p = JSON.parse(new TextDecoder().decode(deB64url(cuerpo))) as Pase
    if (p.uid !== uid) return null
    // Devolver vale hasta un día después (la reserva también se purga al día).
    if (!(p.exp > Date.now() - (opciones.aunCaducado ? 24 * 60 * 60 * 1000 : 0))) return null
    return p
  } catch {
    return null
  }
}

/** Bucket del contador de un tipo dentro del pase. */
export const bucketPase = (p: Pase, tipo: string) => `pase:${p.id}:${tipo}`

/**
 * ¿Esta llamada la cubre el pase? Si sí, ya quedó contada (no hay que cobrarla).
 * Cualquier «no» deja que la función cobre como siempre.
 */
export async function cubiertaPorPase(admin: SupabaseClient, uid: string, token: unknown, tipo: string): Promise<boolean> {
  if (token == null) return false
  const p = await leerPase(token, uid)
  const tope = p?.topes[tipo]
  if (!p || !tope) return false
  return dentroDeLimite(admin, uid, bucketPase(p, tipo), tope, VENTANA_CONTADOR_SEG, false)
}

/** Llamadas ya hechas con el pase, por tipo (lee el contador sin sumar). */
export async function usosDelPase(admin: SupabaseClient, p: Pase): Promise<Record<string, number>> {
  const { data } = await admin
    .from('rate_limits')
    .select('bucket, cuenta')
    .eq('uid', p.uid)
    .like('bucket', `pase:${p.id}:%`)
  const usos: Record<string, number> = {}
  for (const fila of (data ?? []) as { bucket: string; cuenta: number }[]) usos[fila.bucket.slice(`pase:${p.id}:`.length)] = fila.cuenta
  return usos
}
