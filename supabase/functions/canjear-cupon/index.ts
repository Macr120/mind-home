/**
 * Canje de cupones de acceso (testers y dueño): valida el JWT del usuario y
 * llama a la RPC `canjear_cupon` con service_role (la RPC está revocada de
 * authenticated, patrón 20260803000001). El canje equivale a comprar el
 * unlock: `perfiles.unlock` + plan trial según el cupón.
 *
 * Los fallos de cupón (inexistente/agotado/ya canjeado) responden 200 con
 * `{ ok: false, resultado }`: no son errores de la llamada y así el cliente
 * no tiene que desempacar un FunctionsHttpError para distinguirlos.
 *
 * Se despliega con verify_jwt (por defecto): canjear exige sesión, lo que
 * encarece adivinar códigos a fuerza bruta (además son largos y aleatorios).
 */
import { json, preflight, corsDe } from '../_shared/cors.ts'
import { clienteUsuario, usuarioDe, clienteAdmin } from '../_shared/auth.ts'

Deno.serve(async (req) => {
  const pf = preflight(req)
  if (pf) return pf
  const cors = corsDe(req)
  if (req.method !== 'POST') return json({ error: 'peticion-invalida' }, 400, cors)

  const usuario = await usuarioDe(clienteUsuario(req))
  if (!usuario) return json({ error: 'sin-sesion' }, 401, cors)

  let codigo = ''
  try {
    codigo = String(((await req.json()) as { codigo?: unknown }).codigo ?? '').trim()
  } catch {
    // JSON inválido: cae al guard de abajo.
  }
  if (!codigo || codigo.length > 40) return json({ error: 'peticion-invalida' }, 400, cors)

  const { data, error } = await clienteAdmin().rpc('canjear_cupon', {
    p_uid: usuario.id,
    p_codigo: codigo,
  })
  if (error) return json({ error: 'bd' }, 500, cors)

  const resultado = String(data)
  return json({ ok: resultado === 'ok', resultado }, 200, cors)
})
