/**
 * Descarga pública de un archivo compartido desde el cuarto Archivo
 * (migración 20260927000001). La llama la página mindhaos.com/d/<token>, sin
 * cuenta: por eso va con `verify_jwt = false`, y lo único que abre es el
 * archivo de ESE enlace.
 *
 *   POST {token} → {nombre, bytes, mime, vista, descarga}
 *     `vista` sirve para la vista previa (imagen, video, audio, PDF) y
 *     `descarga` fuerza el guardado con su nombre. Ambas firmadas por 15 min.
 *   404 {motivo:'no-existe'} · 410 {motivo:'vencido'} · 429 {motivo:'tope'}
 *
 * Cada visita cuenta contra el tope diario del enlace (`enlace_visitar`).
 */
import { json, preflight, corsDe } from '../_shared/cors.ts'
import { clienteAdmin } from '../_shared/auth.ts'
import { firmarGet, r2Configurado } from '../_shared/r2.ts'

/** Descargas por día y enlace. */
const TOPE_DIA = 200

const ESTADO: Record<string, number> = { 'no-existe': 404, vencido: 410, tope: 429 }

Deno.serve(async (req) => {
  const pf = preflight(req)
  if (pf) return pf
  const cors = corsDe(req)
  if (req.method !== 'POST') return json({ error: 'peticion-invalida' }, 400, cors)
  if (!r2Configurado()) return json({ error: 'sin-almacen' }, 503, cors)

  let token = ''
  try {
    const b = (await req.json()) as { token?: unknown }
    token = typeof b.token === 'string' ? b.token : ''
  } catch {
    // cuerpo vacío o roto: cae en el token inválido de abajo
  }
  if (!/^[\w-]{16,40}$/.test(token)) return json({ motivo: 'no-existe' }, 404, cors)

  try {
    const res = await clienteAdmin().rpc('enlace_visitar', { p_token: token, p_tope: TOPE_DIA })
    if (res.error) throw res.error
    const e = (res.data as { motivo: string; dueno: string; clave: string; nombre: string; mime: string; bytes: number }[])[0]
    if (!e || e.motivo !== 'ok') {
      const motivo = e?.motivo ?? 'no-existe'
      return json({ motivo }, ESTADO[motivo] ?? 404, cors)
    }
    const abs = `${e.dueno}/${e.clave}`
    return json(
      {
        nombre: e.nombre,
        bytes: Number(e.bytes),
        mime: e.mime,
        vista: await firmarGet(abs),
        descarga: await firmarGet(abs, 900, e.nombre),
      },
      200,
      cors,
    )
  } catch (err) {
    console.error('[archivo-publico]', err)
    return json({ error: 'archivo-publico' }, 500, cors)
  }
})
