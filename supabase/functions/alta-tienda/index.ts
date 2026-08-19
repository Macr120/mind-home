/**
 * Alta de la compra hecha en la tienda: la app nativa (app de PAGO en Google
 * Play / App Store) la llama al registrar el correo, y la RPC `alta_tienda`
 * concede `perfiles.unlock` + el primer mes, igual que hacía la compra del
 * unlock por RevenueCat. La RPC está revocada de authenticated, así que se
 * llama con service_role tras validar el JWT (patrón 20260803000001).
 *
 * Antes de dar nada se VERIFICA el recibo de la tienda (`_shared/reciboTienda`):
 * Play Integrity con veredicto `LICENSED` en Android, recibo de aplicación en
 * iOS. Sin tienda configurada el alta se RECHAZA — para probar antes de
 * publicar está la bandera `ALTA_TIENDA_SIN_RECIBO=1`.
 *
 * El cliente pide el token de integridad con `sha256(access_token)` como nonce
 * y llama con ese mismo access_token: así el veredicto queda atado a esta
 * sesión y no sirve en otra cuenta ni más tarde.
 *
 * Se despliega con verify_jwt (por defecto): el alta exige sesión.
 */
import { json, preflight, corsDe } from '../_shared/cors.ts'
import { clienteUsuario, usuarioDe, clienteAdmin } from '../_shared/auth.ts'
import { nonceDe, verificarRecibo, sinRecibo, type Tienda } from '../_shared/reciboTienda.ts'

/** Plataformas que venden la app; cualquier otra cosa no da alta. */
const TIENDAS: Tienda[] = ['android', 'ios']

Deno.serve(async (req) => {
  const pf = preflight(req)
  if (pf) return pf
  const cors = corsDe(req)
  if (req.method !== 'POST') return json({ error: 'peticion-invalida' }, 400, cors)

  const usuario = await usuarioDe(clienteUsuario(req))
  if (!usuario) return json({ error: 'sin-sesion' }, 401, cors)

  let tienda = ''
  let token = ''
  try {
    const cuerpo = (await req.json()) as { tienda?: unknown; token?: unknown }
    tienda = String(cuerpo.tienda ?? '').trim()
    token = String(cuerpo.token ?? '').trim()
  } catch {
    // JSON inválido: cae al guard de abajo.
  }
  if (!TIENDAS.includes(tienda as Tienda)) return json({ error: 'peticion-invalida' }, 400, cors)

  const veredicto = await verificarRecibo(tienda as Tienda, token, await nonceDe(req))
  if (!veredicto.ok) {
    console.warn(`[alta-tienda] recibo rechazado (${tienda}): ${veredicto.motivo}`)
    return json({ error: 'recibo', motivo: veredicto.motivo }, 403, cors)
  }
  if (sinRecibo()) console.warn('[alta-tienda] ALTA_TIENDA_SIN_RECIBO=1: alta sin verificar')

  const { data, error } = await clienteAdmin().rpc('alta_tienda', {
    p_uid: usuario.id,
    p_tienda: tienda,
  })
  if (error) return json({ error: 'bd', mensaje: error.message }, 500, cors)

  const resultado = String(data)
  return json({ ok: resultado === 'ok' || resultado === 'ya', resultado }, 200, cors)
})
