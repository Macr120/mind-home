/**
 * Conectar las redes del usuario (YouTube, TikTok, Facebook, Instagram) para
 * publicar desde el Studio de video.
 *
 * Se despliega con `verify_jwt = false` porque el callback del OAuth llega por
 * redirección del navegador, sin JWT (`GET …/redes-oauth/callback`). Es la
 * ÚNICA rama anterior a `exigirUsuario`: todas las acciones POST validan la
 * sesión a mano con `usuarioDe(clienteUsuario(req))`, que es lo que hacen las
 * demás funciones (el gateway solo comprueba la firma).
 *
 * Acciones (POST JSON con Bearer):
 *   iniciar {plataforma, retorno}  → {url}  (retorno: {tipo:'app'} | {tipo:'popup'|'pestana', origen})
 *   estado                          → {cuentas, avisos, youtube_restantes_hoy}
 *   elegir {plataforma, page_id}    → {ok}   (otra Página / cuenta de Instagram)
 *   desconectar {plataforma}        → {ok}
 *
 * El `state` es un id aleatorio firmado (HMAC) que ata al usuario, la
 * plataforma y a dónde volver; caduca a los 10 min y se consume una sola vez.
 * El callback NUNCA lee un destino de la query: vuelve a la app por el esquema
 * propio (302, como Supabase Auth) o al origen validado en `iniciar`.
 *
 * Secretos: REDES_STATE_SECRET, REDES_CIFRADO_KEY, GOOGLE_CLIENT_ID/SECRET,
 * TIKTOK_CLIENT_KEY/SECRET, META_APP_ID/SECRET (+ META_CONFIG_ID opcional),
 * REDES_CALLBACK_URL (opcional), banderas REDES_YT_AUDITADO /
 * REDES_TIKTOK_AUDITADO / REDES_META_LIVE (0/1, sin redeploy).
 */
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2'
import { clienteAdmin, clienteUsuario, usuarioDe } from '../_shared/auth.ts'
import { corsDe, json, origenPermitido, preflight } from '../_shared/cors.ts'
import { dentroDeLimite } from '../_shared/limite.ts'
import { ErrorRedes, respuestaError } from '../_shared/redes/errores.ts'
import { canjearGoogle, perfilGoogle, revocarGoogle, urlAutorizacionGoogle } from '../_shared/redes/google.ts'
import { canjearMeta, paginaMetaPorId, paginasMeta, urlAutorizacionMeta, type PaginaMeta } from '../_shared/redes/meta.ts'
import { esPlataforma, proveedorDe, type Plataforma, type Proveedor } from '../_shared/redes/plataformas.ts'
import { firmarState, idAleatorio, retoPkceTikTok, verificarState } from '../_shared/redes/state.ts'
import { canjearTikTok, perfilTikTok, revocarTikTok, urlAutorizacionTikTok } from '../_shared/redes/tiktok.ts'
import { borrarCuenta, guardarCuenta, leerCuenta, listarCuentasPublicas } from '../_shared/redes/tokens.ts'

/** Host fijo del deep link de vuelta (distinto del `oauth` del login de Supabase). */
const ESQUEMA_APP = 'com.macr120.mindhome://redes'
const UID_GLOBAL = '00000000-0000-0000-0000-000000000000'
const MAX_YT_DIA = Number(Deno.env.get('REDES_YT_MAX_DIA') ?? 5)

const callbackUrl = () => Deno.env.get('REDES_CALLBACK_URL') ?? `${Deno.env.get('SUPABASE_URL')}/functions/v1/redes-oauth/callback`

const bandera = (nombre: string) => (Deno.env.get(nombre) ?? '0') === '1'

/** Motivos de fallo que viajan en la vuelta (literal cerrado: acaban en una URL y en un script). */
type MotivoVuelta = 'denegado' | 'caducado' | 'permisos' | 'sin-pagina' | 'sin-instagram' | 'proveedor' | 'configuracion'

type Retorno = { tipo: 'app' } | { tipo: 'popup' | 'pestana'; origen: string }

Deno.serve(async (req) => {
  const pf = preflight(req)
  if (pf) return pf
  const url = new URL(req.url)
  if (req.method === 'GET' && url.pathname.endsWith('/callback')) return callback(url)

  const cors = corsDe(req)
  if (req.method !== 'POST') return json({ error: 'peticion-invalida', mensaje: 'Método no soportado.' }, 400, cors)
  try {
    const usuario = await usuarioDe(clienteUsuario(req))
    if (!usuario) throw new ErrorRedes('sin-sesion', 'Inicia sesión para conectar tus redes.')
    const admin = clienteAdmin()
    let cuerpo: Record<string, unknown> = {}
    try {
      cuerpo = (await req.json()) as Record<string, unknown>
    } catch {
      /* sin cuerpo: cae en 'peticion-invalida' abajo */
    }
    switch (cuerpo.accion) {
      case 'iniciar':
        return json(await iniciar(admin, usuario.id, cuerpo), 200, cors)
      case 'estado':
        return json(await estado(admin, usuario.id), 200, cors)
      case 'elegir':
        return json(await elegir(admin, usuario.id, cuerpo), 200, cors)
      case 'desconectar':
        return json(await desconectar(admin, usuario.id, cuerpo), 200, cors)
      default:
        throw new ErrorRedes('peticion-invalida', 'Acción desconocida.')
    }
  } catch (e) {
    return respuestaError(e, cors)
  }
})

// ─── iniciar ─────────────────────────────────────────────────────────────────

async function iniciar(admin: SupabaseClient, uid: string, cuerpo: Record<string, unknown>): Promise<{ url: string }> {
  const plataforma = cuerpo.plataforma
  if (!esPlataforma(plataforma)) throw new ErrorRedes('plataforma', 'Red desconocida.')
  const retorno = leerRetorno(cuerpo.retorno)
  if (!(await dentroDeLimite(admin, uid, 'redes-oauth', 10, 3600))) {
    throw new ErrorRedes('limite', 'Demasiados intentos de conexión; espera un rato.')
  }
  // Limpieza oportunista (no hay pg_cron): estados que nadie consumió.
  await admin.from('redes_oauth_pendientes').delete().lt('creado_en', new Date(Date.now() - 15 * 60_000).toISOString())

  const proveedor = proveedorDe(plataforma)
  const id = idAleatorio()
  const verifier = proveedor === 'tiktok' ? idAleatorio(48) : null
  const { error } = await admin.from('redes_oauth_pendientes').insert({
    state: id,
    user_id: uid,
    proveedor,
    plataforma,
    code_verifier: verifier,
    retorno: retorno.tipo === 'app' ? 'app' : `${retorno.tipo}:${retorno.origen}`,
  })
  if (error) throw new Error(`redes_oauth_pendientes: ${error.message}`)

  const state = await firmarState(id)
  const redirect = callbackUrl()
  if (proveedor === 'google') return { url: urlAutorizacionGoogle(state, redirect) }
  if (proveedor === 'tiktok') return { url: urlAutorizacionTikTok(state, redirect, await retoPkceTikTok(verifier!)) }
  return { url: urlAutorizacionMeta(state, redirect) }
}

function leerRetorno(r: unknown): Retorno {
  const o = (r ?? {}) as Record<string, unknown>
  if (o.tipo === 'app') return { tipo: 'app' }
  if ((o.tipo === 'popup' || o.tipo === 'pestana') && typeof o.origen === 'string' && origenPermitido(o.origen)) {
    return { tipo: o.tipo, origen: o.origen }
  }
  throw new ErrorRedes('peticion-invalida', 'Destino de vuelta no permitido.')
}

// ─── callback (sin JWT) ──────────────────────────────────────────────────────

async function callback(url: URL): Promise<Response> {
  const state = url.searchParams.get('state') ?? ''
  const id = await verificarState(state)
  if (!id) return paginaError()

  const admin = clienteAdmin()
  // Caducidad (10 min) y un solo uso en un mismo statement.
  const { data: pendiente } = await admin
    .from('redes_oauth_pendientes')
    .delete()
    .eq('state', id)
    .gt('creado_en', new Date(Date.now() - 10 * 60_000).toISOString())
    .select()
    .maybeSingle()
  if (!pendiente) return paginaError()

  const p = pendiente as { user_id: string; proveedor: Proveedor; plataforma: Plataforma; code_verifier: string | null; retorno: string }
  const volver = (ok: boolean, motivo?: MotivoVuelta) => respuestaVuelta(p.retorno, p.plataforma, ok, motivo)

  if (url.searchParams.get('error')) return volver(false, 'denegado')
  const code = url.searchParams.get('code') ?? ''
  if (!code) return volver(false, 'proveedor')

  try {
    const redirect = callbackUrl()
    if (p.proveedor === 'google') await conectarGoogle(admin, p.user_id, code, redirect)
    else if (p.proveedor === 'tiktok') await conectarTikTok(admin, p.user_id, code, redirect, p.code_verifier ?? '')
    else {
      const motivo = await conectarMeta(admin, p.user_id, code, redirect, p.plataforma)
      if (motivo) return volver(false, motivo)
    }
    return volver(true)
  } catch (e) {
    console.error('[redes-oauth] canje', p.proveedor, e instanceof Error ? `${e.name}: ${e.message}` : String(e))
    if (e instanceof ErrorRedes && (e.codigo === 'permisos' || e.codigo === 'configuracion')) return volver(false, e.codigo)
    return volver(false, 'proveedor')
  }
}

async function conectarGoogle(admin: SupabaseClient, uid: string, code: string, redirect: string): Promise<void> {
  const t = await canjearGoogle(code, redirect)
  const perfil = await perfilGoogle(t.access_token)
  const previa = await leerCuenta(admin, uid, 'youtube')
  await guardarCuenta(admin, {
    user_id: uid,
    plataforma: 'youtube',
    cuenta_id: perfil.sub,
    nombre: perfil.nombre,
    avatar: perfil.avatar,
    access_token: t.access_token,
    // Con `prompt=consent` Google manda refresh token; si no viniera, se conserva el anterior.
    refresh_token: t.refresh_token ?? previa?.refresh_token ?? null,
    token_padre: null,
    expira_en: new Date(Date.now() + t.expires_in * 1000).toISOString(),
    refresh_expira_en: null,
    scopes: t.scope,
    extra: {},
  })
}

async function conectarTikTok(admin: SupabaseClient, uid: string, code: string, redirect: string, verifier: string): Promise<void> {
  const t = await canjearTikTok(code, redirect, verifier)
  const perfil = await perfilTikTok(t.access_token)
  const ahora = Date.now()
  await guardarCuenta(admin, {
    user_id: uid,
    plataforma: 'tiktok',
    cuenta_id: t.open_id || perfil.open_id,
    nombre: perfil.nombre,
    avatar: perfil.avatar,
    access_token: t.access_token,
    refresh_token: t.refresh_token,
    token_padre: null,
    expira_en: new Date(ahora + t.expires_in * 1000).toISOString(),
    refresh_expira_en: new Date(ahora + t.refresh_expires_in * 1000).toISOString(),
    scopes: t.scope,
    extra: {},
  })
}

/** Guarda `facebook` (y `instagram` si la Página elegida tiene cuenta vinculada). Devuelve el motivo si no se pudo lo pedido. */
async function conectarMeta(admin: SupabaseClient, uid: string, code: string, redirect: string, pedida: Plataforma): Promise<MotivoVuelta | null> {
  const { token, expira_en } = await canjearMeta(code, redirect)
  const paginas = await paginasMeta(token)
  if (paginas.length === 0) {
    // `/me/accounts` no ve las Páginas que se administran desde un portafolio de
    // negocio, así que el token se guarda igual: con él, «elegir» puede resolver
    // por id la Página que el usuario indique a mano (ver `paginaMetaPorId`).
    await guardarCuenta(admin, {
      user_id: uid,
      plataforma: 'facebook',
      cuenta_id: '',
      nombre: '',
      avatar: null,
      access_token: token,
      refresh_token: null,
      token_padre: token,
      expira_en,
      refresh_expira_en: null,
      scopes: '',
      extra: { falta_pagina: true, paginas: [] },
    })
    return 'sin-pagina'
  }
  // Para Instagram conviene la primera Página con cuenta vinculada; si no, la primera.
  const elegida = (pedida === 'instagram' ? paginas.find((p) => p.instagram) : null) ?? paginas[0]
  await guardarFilasMeta(admin, uid, token, expira_en, paginas, elegida)
  if (pedida === 'instagram' && !elegida.instagram) return 'sin-instagram'
  return null
}

async function guardarFilasMeta(
  admin: SupabaseClient,
  uid: string,
  tokenUsuario: string,
  expira_en: string | null,
  paginas: PaginaMeta[],
  elegida: PaginaMeta,
): Promise<void> {
  const resumen = paginas.map((p) => ({
    id: p.id,
    nombre: p.nombre,
    avatar: p.avatar,
    instagram: p.instagram ? { id: p.instagram.id, username: p.instagram.username } : null,
  }))
  await guardarCuenta(admin, {
    user_id: uid,
    plataforma: 'facebook',
    cuenta_id: elegida.id,
    nombre: elegida.nombre,
    avatar: elegida.avatar,
    access_token: elegida.token,
    refresh_token: null,
    token_padre: tokenUsuario,
    expira_en,
    refresh_expira_en: null,
    scopes: '',
    extra: { page_id: elegida.id, paginas: resumen },
  })
  if (elegida.instagram) {
    await guardarCuenta(admin, {
      user_id: uid,
      plataforma: 'instagram',
      cuenta_id: elegida.instagram.id,
      nombre: elegida.instagram.username,
      avatar: elegida.instagram.avatar,
      access_token: elegida.token,
      refresh_token: null,
      token_padre: tokenUsuario,
      expira_en,
      refresh_expira_en: null,
      scopes: '',
      extra: { page_id: elegida.id, username: elegida.instagram.username, paginas: resumen },
    })
  } else {
    await borrarCuenta(admin, uid, ['instagram'])
  }
}

// ─── la vuelta ───────────────────────────────────────────────────────────────

function respuestaVuelta(retorno: string, plataforma: Plataforma, ok: boolean, motivo?: MotivoVuelta): Response {
  const q = new URLSearchParams({ ok: ok ? '1' : '0', plataforma })
  if (motivo) q.set('error', motivo)
  if (retorno === 'app') return redirigir(`${ESQUEMA_APP}?${q}`)
  const sep = retorno.indexOf(':')
  const origen = retorno.slice(sep + 1)
  // Emergente y pestaña vuelven IGUAL, por 302 a la app. Se intentó devolver una
  // página con `postMessage`, pero Supabase reescribe las cabeceras de las Edge
  // Functions (`Content-Type: text/plain` + `nosniff` + CSP con `sandbox`) para
  // que nadie sirva HTML desde `*.supabase.co`: el navegador pintaba el HTML como
  // texto y el script no llegaba a ejecutarse nunca. El 302 no le afecta, y ya en
  // nuestro origen la app sí puede avisar a quien abrió la emergente.
  const qp = new URLSearchParams({ redes: ok ? 'ok' : 'error', plataforma })
  if (motivo) qp.set('motivo', motivo)
  return redirigir(`${origen}/?${qp}`)
}

function redirigir(destino: string): Response {
  return new Response(null, { status: 302, headers: { Location: destino, 'Cache-Control': 'no-store' } })
}

const CABECERAS_HTML = {
  'Content-Type': 'text/html; charset=utf-8',
  'Cache-Control': 'no-store',
  'Referrer-Policy': 'no-referrer',
  'Content-Security-Policy': "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'",
}

const ESTILO = 'body{margin:0;min-height:100vh;display:grid;place-items:center;font:15px system-ui,sans-serif;background:#0f1115;color:#eee;text-align:center}p{opacity:.7}'

/** `state` inválido o caducado: no se sabe a dónde volver, así que solo se avisa. */
function paginaError(): Response {
  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Mind Planner Home</title><style>${ESTILO}</style></head><body>
<div><h1>Enlace caducado · Link expired</h1><p>Vuelve a la app e inténtalo de nuevo · Go back to the app and try again</p></div></body></html>`
  return new Response(html, { status: 400, headers: CABECERAS_HTML })
}

// ─── estado / elegir / desconectar ───────────────────────────────────────────

async function estado(admin: SupabaseClient, uid: string) {
  const todas = await listarCuentasPublicas(admin, uid)
  // La fila «a la espera de Página» solo guarda el token: no es una cuenta usable,
  // así que no se lista; el aviso es lo que hace a la app pedir la Página.
  const cuentas = todas.filter((c) => !c.extra.falta_pagina)
  const avisos: Record<string, string> = {}
  if (todas.some((c) => c.extra.falta_pagina)) avisos.falta_pagina = 'facebook'
  if (!bandera('REDES_YT_AUDITADO')) avisos.youtube = 'privado'
  if (!bandera('REDES_TIKTOK_AUDITADO')) avisos.tiktok = 'solo-yo'
  if (!bandera('REDES_META_LIVE')) avisos.meta = 'modo-desarrollo'
  // Cuántas subidas a YouTube le quedan HOY a toda la app (lectura, sin consumir).
  const { data: rl } = await admin
    .from('rate_limits')
    .select('cuenta, ventana_inicio')
    .eq('uid', UID_GLOBAL)
    .eq('bucket', 'youtube-global')
    .maybeSingle()
  let usadas = 0
  if (rl && Date.now() - new Date(String(rl.ventana_inicio)).getTime() < 86_400_000) usadas = Number(rl.cuenta ?? 0)
  return { cuentas, avisos, youtube_restantes_hoy: Math.max(0, MAX_YT_DIA - usadas) }
}

async function elegir(admin: SupabaseClient, uid: string, cuerpo: Record<string, unknown>): Promise<{ ok: true }> {
  const plataforma = cuerpo.plataforma
  const pageId = typeof cuerpo.page_id === 'string' ? cuerpo.page_id : ''
  // Del listado siempre llega un id numérico; a mano se admite el nombre de usuario
  // de la Página, que la Graph API también resuelve. Sin `/` ni `?`: es un tramo de ruta.
  if ((plataforma !== 'facebook' && plataforma !== 'instagram') || !/^[A-Za-z0-9._-]{1,80}$/.test(pageId)) {
    throw new ErrorRedes('peticion-invalida', 'Elige una Página válida.')
  }
  const cuenta = (await leerCuenta(admin, uid, 'facebook')) ?? (await leerCuenta(admin, uid, 'instagram'))
  if (!cuenta?.token_padre) throw new ErrorRedes('sin-cuenta', 'Conecta Facebook antes de elegir una Página.')
  // Los tokens de Página no se guardan todos: se vuelven a pedir con el token de usuario.
  const paginas = await paginasMeta(cuenta.token_padre)
  // Si no está en el listado puede seguir siendo suya: las Páginas de un portafolio
  // de negocio no salen en `/me/accounts`, pero sí responden por id.
  const elegida = paginas.find((p) => p.id === pageId) ?? (await paginaMetaPorId(cuenta.token_padre, pageId))
  if (!elegida) throw new ErrorRedes('peticion-invalida', 'Esa Página ya no está en tu cuenta.')
  const todas = paginas.some((p) => p.id === elegida.id) ? paginas : [...paginas, elegida]
  await guardarFilasMeta(admin, uid, cuenta.token_padre, cuenta.expira_en, todas, elegida)
  return { ok: true }
}

async function desconectar(admin: SupabaseClient, uid: string, cuerpo: Record<string, unknown>): Promise<{ ok: true }> {
  const plataforma = cuerpo.plataforma
  if (!esPlataforma(plataforma)) throw new ErrorRedes('plataforma', 'Red desconocida.')
  const cuenta = await leerCuenta(admin, uid, plataforma)
  if (cuenta) {
    // Revocación best-effort: la fila se borra igual.
    if (plataforma === 'youtube') await revocarGoogle(cuenta.refresh_token ?? cuenta.access_token)
    else if (plataforma === 'tiktok') await revocarTikTok(cuenta.access_token)
  }
  // Facebook e Instagram comparten el OAuth: se van juntas.
  await borrarCuenta(admin, uid, plataforma === 'facebook' || plataforma === 'instagram' ? ['facebook', 'instagram'] : [plataforma])
  return { ok: true }
}
