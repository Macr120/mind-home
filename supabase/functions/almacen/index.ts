/**
 * Almacén de archivos en Cloudflare R2 con cuota por nivel (migración
 * 20260925000001). Supabase decide QUIÉN y CUÁNTO; los bytes van directo del
 * navegador a R2 con URLs firmadas de 15 min.
 *
 * Acciones (POST `{accion, …}`):
 * - `subir {clave, bytes, mime}` → reserva cuota y devuelve `{url}` para un PUT.
 * - `confirmar {clave}` → mide el objeto real en R2 y cierra la reserva.
 * - `bajar {claves[]}` → `{urls: {clave: url}}`; no exige Pro (quien canceló
 *   sigue pudiendo bajar lo suyo). `nombre` opcional fuerza la descarga.
 * - `borrar {claves[]?, prefijo?}` → suelta la cuota y borra en R2.
 * - `uso` → `{usados, cuota}` (cuota null = sin tope).
 * - `compartir {clave, nombre, dias}` → `{token, expira}`: enlace público
 *   (mindhaos.com/d/<token>, lo sirve `archivo-publico`) de 1, 7 o 30 días.
 *   Solo con plan; como mucho 100 vivos por usuario.
 * - `enlaces {clave?}` → los enlaces vivos del usuario (de un archivo, si se pide).
 * - `revocar {token? | claves[]?}` → mata un enlace, o todos los de esas claves.
 *
 * Fallos de negocio → 200 `{ok:false, motivo}` ('sin-pro' | 'cuota' | 'grande'),
 * como `canjear-cupon`. Las claves son RELATIVAS y aquí se les antepone el uid.
 */
import { json, preflight, corsDe } from '../_shared/cors.ts'
import { clienteUsuario, usuarioDe, clienteAdmin } from '../_shared/auth.ts'
import { borrarObjetos, firmarGet, firmarPut, r2Configurado, tamanoDe } from '../_shared/r2.ts'

/** `sync/…` (blobs del sync) o `archivo/…` (cuarto Archivo); sin `..` ni `//`. */
const CLAVE = /^(sync|archivo)\/[\w.\-/]{1,380}$/
const claveValida = (c: unknown): c is string =>
  typeof c === 'string' && CLAVE.test(c) && !c.includes('..') && !c.includes('//') && !c.endsWith('/')

interface Cuerpo {
  accion?: string
  clave?: unknown
  claves?: unknown
  prefijo?: unknown
  bytes?: unknown
  mime?: unknown
  nombre?: unknown
  dias?: unknown
  token?: unknown
}

/** Enlaces vivos por usuario: más ya no es compartir, es hacer de CDN. */
const MAX_ENLACES = 100

/** 16 bytes al azar en base64url: 22 caracteres imposibles de adivinar. */
const tokenNuevo = () =>
  btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(16))))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')

Deno.serve(async (req) => {
  const pf = preflight(req)
  if (pf) return pf
  const cors = corsDe(req)
  if (req.method !== 'POST') return json({ error: 'peticion-invalida' }, 400, cors)
  if (!r2Configurado()) return json({ error: 'sin-almacen' }, 503, cors)

  const usuario = await usuarioDe(clienteUsuario(req))
  if (!usuario) return json({ error: 'sin-sesion' }, 401, cors)
  const uid = usuario.id
  const abs = (c: string) => `${uid}/${c}`

  let b: Cuerpo = {}
  try {
    b = (await req.json()) as Cuerpo
  } catch {
    return json({ error: 'peticion-invalida' }, 400, cors)
  }
  const admin = clienteAdmin()

  try {
    switch (b.accion) {
      case 'subir': {
        const bytes = Number(b.bytes)
        const mime = typeof b.mime === 'string' ? b.mime.slice(0, 120) : ''
        if (!claveValida(b.clave) || !Number.isFinite(bytes) || bytes < 0) break
        // Reservas abandonadas (subida cortada, pestaña cerrada): fuera de R2 y de la cuota.
        const venc = await admin.rpc('almacen_vencidos', { p_uid: uid })
        if (venc.error) throw venc.error
        await borrarObjetos(((venc.data ?? []) as string[]).map(abs))

        const res = await admin.rpc('almacen_reservar', {
          p_uid: uid,
          p_clave: b.clave,
          p_bytes: Math.round(bytes),
          p_mime: mime,
        })
        if (res.error) throw res.error
        if (res.data !== 'ok') return json({ ok: false, motivo: res.data }, 200, cors)
        return json({ ok: true, url: await firmarPut(abs(b.clave)) }, 200, cors)
      }

      case 'confirmar': {
        if (!claveValida(b.clave)) break
        const real = await tamanoDe(abs(b.clave))
        if (real == null) {
          await admin.rpc('almacen_liberar', { p_uid: uid, p_claves: [b.clave] })
          return json({ ok: false, motivo: 'sin-objeto' }, 200, cors)
        }
        const res = await admin.rpc('almacen_confirmar', { p_uid: uid, p_clave: b.clave, p_bytes: real })
        if (res.error) throw res.error
        if (res.data !== 'ok') {
          // Subió más de lo que declaró y no cabe: el objeto no se queda.
          await borrarObjetos([abs(b.clave)])
          return json({ ok: false, motivo: res.data === 'sin-reserva' ? 'sin-objeto' : 'cuota' }, 200, cors)
        }
        return json({ ok: true, bytes: real }, 200, cors)
      }

      case 'bajar': {
        const claves = Array.isArray(b.claves) ? b.claves : []
        if (!claves.length || claves.length > 200 || !claves.every(claveValida)) break
        const nombre = typeof b.nombre === 'string' && claves.length === 1 ? b.nombre.slice(0, 200) : undefined
        const urls: Record<string, string> = {}
        for (const c of claves) urls[c] = await firmarGet(abs(c), 900, nombre)
        return json({ ok: true, urls }, 200, cors)
      }

      case 'borrar': {
        const claves = Array.isArray(b.claves) ? b.claves : []
        const prefijo = typeof b.prefijo === 'string' ? b.prefijo : null
        if (claves.length > 500 || !claves.every(claveValida)) break
        if (prefijo !== null && !claveValida(prefijo)) break
        if (!claves.length && !prefijo) break
        const res = await admin.rpc('almacen_liberar', { p_uid: uid, p_claves: claves, p_prefijo: prefijo })
        if (res.error) throw res.error
        // Las claves pedidas se borran aunque no tuvieran fila (objeto huérfano).
        const soltadas = new Set<string>([...(res.data as string[] ?? []), ...(claves as string[])])
        await borrarObjetos([...soltadas].map(abs))
        return json({ ok: true }, 200, cors)
      }

      case 'compartir': {
        const dias = [1, 7, 30].includes(Number(b.dias)) ? Number(b.dias) : 7
        const nombre = typeof b.nombre === 'string' ? b.nombre.trim().slice(0, 200) : ''
        if (!claveValida(b.clave) || !nombre) break
        // Compartir es del plan: en solo lectura se baja lo propio, no se reparte.
        const cuota = await admin.rpc('cuota_almacen', { p_uid: uid })
        if (cuota.error) throw cuota.error
        if (cuota.data === 0) return json({ ok: false, motivo: 'sin-pro' }, 200, cors)
        const obj = await admin
          .from('almacen_objetos')
          .select('mime, bytes')
          .eq('user_id', uid)
          .eq('clave', b.clave)
          .eq('estado', 'listo')
          .maybeSingle()
        if (obj.error) throw obj.error
        if (!obj.data) return json({ ok: false, motivo: 'sin-objeto' }, 200, cors)
        const ahora = new Date().toISOString()
        const vivos = await admin
          .from('enlaces_archivo')
          .select('token', { count: 'exact', head: true })
          .eq('user_id', uid)
          .eq('revocado', false)
          .gt('expira_en', ahora)
        if (vivos.error) throw vivos.error
        if ((vivos.count ?? 0) >= MAX_ENLACES) return json({ ok: false, motivo: 'enlaces' }, 200, cors)
        const token = tokenNuevo()
        const expira = new Date(Date.now() + dias * 86_400_000).toISOString()
        const ins = await admin.from('enlaces_archivo').insert({
          token,
          user_id: uid,
          clave: b.clave,
          nombre,
          mime: obj.data.mime,
          bytes: obj.data.bytes,
          expira_en: expira,
        })
        if (ins.error) throw ins.error
        return json({ ok: true, token, expira }, 200, cors)
      }

      case 'enlaces': {
        let q = admin
          .from('enlaces_archivo')
          .select('token, clave, nombre, expira_en, descargas')
          .eq('user_id', uid)
          .eq('revocado', false)
          .gt('expira_en', new Date().toISOString())
          .order('creado_en', { ascending: false })
          .limit(MAX_ENLACES)
        if (claveValida(b.clave)) q = q.eq('clave', b.clave)
        const res = await q
        if (res.error) throw res.error
        return json({ ok: true, enlaces: res.data ?? [] }, 200, cors)
      }

      case 'revocar': {
        const token = typeof b.token === 'string' && /^[\w-]{16,40}$/.test(b.token) ? b.token : null
        const claves = Array.isArray(b.claves) && b.claves.length <= 500 && b.claves.every(claveValida) ? (b.claves as string[]) : []
        if (!token && !claves.length) break
        const q = admin.from('enlaces_archivo').update({ revocado: true }).eq('user_id', uid)
        const res = token ? await q.eq('token', token) : await q.in('clave', claves)
        if (res.error) throw res.error
        return json({ ok: true }, 200, cors)
      }

      case 'uso': {
        const res = await admin.rpc('almacen_uso', { p_uid: uid })
        if (res.error) throw res.error
        return json({ ok: true, ...(res.data as object) }, 200, cors)
      }
    }
  } catch (e) {
    console.error('[almacen]', b.accion, e)
    return json({ error: 'almacen' }, 500, cors)
  }
  return json({ error: 'peticion-invalida' }, 400, cors)
})
