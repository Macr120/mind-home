/**
 * Las cuentas conectadas: leer, guardar (cifrando) y conseguir un token VIGENTE
 * refrescando cuando toca. Google y TikTok tienen refresh; Meta no (su token
 * long-lived dura 60 días y luego hay que reconectar).
 */
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2'
import { cifrar, descifrar } from './cifrado.ts'
import { ErrorRedes } from './errores.ts'
import { refrescarGoogle } from './google.ts'
import type { Plataforma } from './plataformas.ts'
import { refrescarTikTok } from './tiktok.ts'

/** Fila de `redes_cuentas` con los tokens YA descifrados (solo vive en memoria de la petición). */
export interface Cuenta {
  user_id: string
  plataforma: Plataforma
  cuenta_id: string
  nombre: string
  avatar: string | null
  access_token: string
  refresh_token: string | null
  token_padre: string | null
  expira_en: string | null
  refresh_expira_en: string | null
  scopes: string
  extra: Record<string, unknown>
}

/** Lo que se le enseña al cliente: nunca un token. */
export interface CuentaPublica {
  plataforma: Plataforma
  cuenta_id: string
  nombre: string
  avatar: string | null
  expira_en: string | null
  estado: 'ok' | 'caducada'
  extra: Record<string, unknown>
}

const COLUMNAS_PUBLICAS = 'plataforma, cuenta_id, nombre, avatar, expira_en, refresh_expira_en, scopes, extra'

const AVISO_CADUCIDAD_MS = 7 * 86_400_000

export function estadoDe(fila: { plataforma: string; expira_en: string | null; refresh_expira_en: string | null }): 'ok' | 'caducada' {
  const ahora = Date.now()
  // Meta no refresca: se avisa desde 7 días antes para que reconecten a tiempo.
  if (fila.plataforma === 'facebook' || fila.plataforma === 'instagram') {
    return fila.expira_en && new Date(fila.expira_en).getTime() - ahora < AVISO_CADUCIDAD_MS ? 'caducada' : 'ok'
  }
  if (fila.refresh_expira_en && new Date(fila.refresh_expira_en).getTime() < ahora) return 'caducada'
  return 'ok'
}

export async function listarCuentasPublicas(admin: SupabaseClient, uid: string): Promise<CuentaPublica[]> {
  const { data, error } = await admin.from('redes_cuentas').select(COLUMNAS_PUBLICAS).eq('user_id', uid)
  if (error) throw new Error(`redes_cuentas: ${error.message}`)
  return ((data ?? []) as unknown as (CuentaPublica & { refresh_expira_en: string | null })[]).map((f) => ({
    plataforma: f.plataforma,
    cuenta_id: f.cuenta_id,
    nombre: f.nombre,
    avatar: f.avatar,
    expira_en: f.expira_en,
    estado: estadoDe(f),
    extra: f.extra ?? {},
  }))
}

export async function leerCuenta(admin: SupabaseClient, uid: string, plataforma: Plataforma): Promise<Cuenta | null> {
  const { data, error } = await admin.from('redes_cuentas').select('*').eq('user_id', uid).eq('plataforma', plataforma).maybeSingle()
  if (error) throw new Error(`redes_cuentas: ${error.message}`)
  if (!data) return null
  const f = data as Record<string, unknown>
  return {
    user_id: String(f.user_id),
    plataforma,
    cuenta_id: String(f.cuenta_id),
    nombre: String(f.nombre ?? ''),
    avatar: typeof f.avatar === 'string' ? f.avatar : null,
    access_token: await descifrar(String(f.access_token)),
    refresh_token: typeof f.refresh_token === 'string' ? await descifrar(f.refresh_token) : null,
    token_padre: typeof f.token_padre === 'string' ? await descifrar(f.token_padre) : null,
    expira_en: typeof f.expira_en === 'string' ? f.expira_en : null,
    refresh_expira_en: typeof f.refresh_expira_en === 'string' ? f.refresh_expira_en : null,
    scopes: String(f.scopes ?? ''),
    extra: (f.extra as Record<string, unknown>) ?? {},
  }
}

/** Upsert con los tokens cifrados. */
export async function guardarCuenta(admin: SupabaseClient, c: Omit<Cuenta, 'user_id'> & { user_id: string }): Promise<void> {
  const { error } = await admin.from('redes_cuentas').upsert(
    {
      user_id: c.user_id,
      plataforma: c.plataforma,
      cuenta_id: c.cuenta_id,
      nombre: c.nombre,
      avatar: c.avatar,
      access_token: await cifrar(c.access_token),
      refresh_token: c.refresh_token ? await cifrar(c.refresh_token) : null,
      token_padre: c.token_padre ? await cifrar(c.token_padre) : null,
      expira_en: c.expira_en,
      refresh_expira_en: c.refresh_expira_en,
      scopes: c.scopes,
      extra: c.extra,
      actualizado_en: new Date().toISOString(),
    },
    { onConflict: 'user_id,plataforma' },
  )
  if (error) throw new Error(`redes_cuentas: ${error.message}`)
}

export async function borrarCuenta(admin: SupabaseClient, uid: string, plataformas: Plataforma[]): Promise<void> {
  const { error } = await admin.from('redes_cuentas').delete().eq('user_id', uid).in('plataforma', plataformas)
  if (error) throw new Error(`redes_cuentas: ${error.message}`)
}

/**
 * La cuenta con un access token que sirva al menos `margenSeg` más; refresca y
 * guarda si hace falta. Lanza 'sin-cuenta' o 'caducada'.
 */
export async function cuentaVigente(admin: SupabaseClient, uid: string, plataforma: Plataforma, margenSeg = 300): Promise<Cuenta> {
  const cuenta = await leerCuenta(admin, uid, plataforma)
  if (!cuenta) throw new ErrorRedes('sin-cuenta', 'Conecta la cuenta antes de publicar.')
  const ahora = Date.now()
  const caduca = cuenta.expira_en ? new Date(cuenta.expira_en).getTime() : Infinity
  const vigente = caduca - ahora > margenSeg * 1000

  if (plataforma === 'facebook' || plataforma === 'instagram') {
    // El token de Página no caduca por sí mismo, pero el de usuario del que sale sí: al vencer, se reconecta.
    if (!vigente) throw new ErrorRedes('caducada', 'El acceso a Facebook caducó: vuelve a conectar la cuenta.')
    return cuenta
  }
  if (vigente) return cuenta
  if (!cuenta.refresh_token) throw new ErrorRedes('caducada', 'El acceso caducó: vuelve a conectar la cuenta.')
  if (cuenta.refresh_expira_en && new Date(cuenta.refresh_expira_en).getTime() < ahora) {
    throw new ErrorRedes('caducada', 'El acceso a TikTok caducó: vuelve a conectar la cuenta.')
  }

  if (plataforma === 'youtube') {
    const t = await refrescarGoogle(cuenta.refresh_token)
    cuenta.access_token = t.access_token
    cuenta.expira_en = new Date(ahora + t.expires_in * 1000).toISOString()
  } else {
    const t = await refrescarTikTok(cuenta.refresh_token)
    cuenta.access_token = t.access_token
    cuenta.refresh_token = t.refresh_token || cuenta.refresh_token
    cuenta.expira_en = new Date(ahora + t.expires_in * 1000).toISOString()
    cuenta.refresh_expira_en = new Date(ahora + t.refresh_expires_in * 1000).toISOString()
  }
  await guardarCuenta(admin, cuenta)
  return cuenta
}
