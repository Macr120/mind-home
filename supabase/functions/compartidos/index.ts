/**
 * Medios COMPARTIDOS en Cloudflare R2: adjuntos del buzón, archivos de los
 * espacios y el plano de la casa de una partida (28-sep-2026). Antes vivían en
 * tres buckets de Supabase Storage, cuyo tráfico de salida se paga; en R2 bajar
 * es gratis. Supabase decide QUIÉN; los bytes van directo del navegador a R2
 * con URLs firmadas.
 *
 * La clave en R2 es `compartido/<ambito>/<ruta>`, con la MISMA ruta relativa que
 * tenían en Storage (`<hilo>/<mensaje>/<archivo>`, `<espacio>/<resto>`,
 * `<partida>/casa.json.gz`): el primer segmento es el hilo, espacio o sala, y
 * sobre él se comprueba el permiso con las mismas funciones que usaban las
 * policies de los buckets, llamadas con el JWT del usuario.
 *
 * Acciones (POST `{accion, ambito, …}`):
 * - `subir {ruta, bytes, mime}` → `{url}` para un PUT (5 min).
 * - `confirmar {ruta}` → mide el objeto y lo borra si pasa del tope del ámbito.
 * - `bajar {rutas[], migrar?}` → `{urls}`. Con `migrar` copia antes desde el
 *   bucket viejo lo que aún no esté en R2 (lo pide el cliente tras un 404).
 * - `borrar {rutas[]? | prefijo?}` → borra en R2 (y en el bucket viejo).
 */
import { json, preflight, corsDe } from '../_shared/cors.ts'
import { clienteAdmin, clienteUsuario, usuarioDe } from '../_shared/auth.ts'
import { dentroDeLimite } from '../_shared/limite.ts'
import { borrarObjetos, firmarGet, firmarPut, listarPrefijo, r2Configurado, subirObjeto, tamanoDe } from '../_shared/r2.ts'

type Ambito = 'buzon' | 'espacio' | 'partida'
type Operacion = 'leer' | 'escribir' | 'borrar'

/** Lo mismo que aceptaban los buckets. */
const AMBITOS: Record<Ambito, { bucket: string; tope: number; mimes?: Set<string> }> = {
  buzon: {
    bucket: 'buzon-adjuntos',
    tope: 20 * 1024 * 1024,
    mimes: new Set([
      'image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'application/json',
      'audio/mpeg', 'audio/mp4', 'audio/aac', 'audio/ogg', 'audio/webm', 'audio/wav', 'audio/x-wav',
      'video/mp4', 'video/webm', 'video/quicktime',
    ]),
  },
  espacio: { bucket: 'espacio-archivos', tope: 50 * 1024 * 1024 },
  partida: { bucket: 'partida-casa', tope: 4 * 1024 * 1024, mimes: new Set(['application/gzip']) },
}

/**
 * La función SQL que decide cada permiso (las de las policies de Storage). En
 * la partida: leer cualquier miembro, subir el anfitrión de la sala abierta y
 * borrar quien fue anfitrión (también con la sala ya cerrada).
 */
const PERMISO: Record<Ambito, Record<Operacion, [string, string]>> = {
  buzon: {
    leer: ['buzon_es_miembro', 'p_hilo'],
    escribir: ['buzon_es_miembro', 'p_hilo'],
    borrar: ['buzon_es_miembro', 'p_hilo'],
  },
  espacio: {
    leer: ['espacio_es_miembro', 'p_espacio'],
    escribir: ['espacio_puede_editar', 'p_espacio'],
    borrar: ['espacio_puede_editar', 'p_espacio'],
  },
  partida: {
    leer: ['partida_es_miembro', 'p_partida'],
    escribir: ['partida_es_anfitrion', 'p_partida'],
    borrar: ['partida_fui_anfitrion', 'p_partida'],
  },
}

/** `<uuid>/<resto>`: sin `..`, `//` ni barra final. */
const RUTA = /^[0-9a-f-]{36}(\/[\w.\-]{1,120}){0,4}$/
const rutaValida = (r: unknown): r is string =>
  typeof r === 'string' && RUTA.test(r) && !r.includes('..') && !r.includes('//')
const claveDe = (ambito: Ambito, ruta: string) => `compartido/${ambito}/${ruta}`
const raizDe = (ruta: string) => ruta.split('/')[0]

Deno.serve(async (req) => {
  const pf = preflight(req)
  if (pf) return pf
  const cors = corsDe(req)
  if (req.method !== 'POST') return json({ error: 'peticion-invalida' }, 400, cors)
  if (!r2Configurado()) return json({ error: 'sin-almacen' }, 503, cors)

  const deUsuario = clienteUsuario(req)
  const usuario = await usuarioDe(deUsuario)
  if (!usuario) return json({ error: 'sin-sesion' }, 401, cors)

  let b: Record<string, unknown> = {}
  try {
    b = (await req.json()) as Record<string, unknown>
  } catch {
    return json({ error: 'peticion-invalida' }, 400, cors)
  }
  const ambito = b.ambito as Ambito
  if (!(ambito in AMBITOS)) return json({ error: 'peticion-invalida' }, 400, cors)
  const conf = AMBITOS[ambito]
  const admin = clienteAdmin()

  // Un permiso por raíz y operación: una página del buzón trae muchos
  // adjuntos del mismo hilo.
  const vistos = new Map<string, boolean>()
  const puede = async (op: Operacion, ruta: string): Promise<boolean> => {
    const [fn, param] = PERMISO[ambito][op]
    const k = `${op}|${raizDe(ruta)}`
    if (!vistos.has(k)) {
      const { data, error } = await deUsuario.rpc(fn, { [param]: raizDe(ruta) })
      vistos.set(k, !error && data === true)
    }
    return vistos.get(k) === true
  }

  try {
    switch (b.accion) {
      case 'subir': {
        const bytes = Number(b.bytes)
        const mime = typeof b.mime === 'string' ? b.mime : ''
        if (!rutaValida(b.ruta) || !Number.isFinite(bytes) || bytes < 0) break
        if (bytes > conf.tope) return json({ ok: false, motivo: 'grande' }, 200, cors)
        if (conf.mimes && !conf.mimes.has(mime)) return json({ ok: false, motivo: 'formato' }, 200, cors)
        if (!(await puede('escribir', b.ruta))) return json({ error: 'sin-permiso' }, 403, cors)
        if (!(await dentroDeLimite(admin, usuario.id, 'compartidos', 120, 600))) {
          return json({ error: 'limite' }, 429, cors)
        }
        return json({ ok: true, url: await firmarPut(claveDe(ambito, b.ruta), 300) }, 200, cors)
      }

      case 'confirmar': {
        if (!rutaValida(b.ruta)) break
        if (!(await puede('escribir', b.ruta))) return json({ error: 'sin-permiso' }, 403, cors)
        const real = await tamanoDe(claveDe(ambito, b.ruta))
        if (real == null) return json({ ok: false, motivo: 'sin-objeto' }, 200, cors)
        if (real > conf.tope) {
          await borrarObjetos([claveDe(ambito, b.ruta)])
          return json({ ok: false, motivo: 'grande' }, 200, cors)
        }
        return json({ ok: true, bytes: real }, 200, cors)
      }

      case 'bajar': {
        const rutas = Array.isArray(b.rutas) ? b.rutas : []
        if (!rutas.length || rutas.length > 200 || !rutas.every(rutaValida)) break
        const urls: Record<string, string> = {}
        for (const r of rutas as string[]) {
          if (!(await puede('leer', r))) continue
          if (b.migrar === true && (await tamanoDe(claveDe(ambito, r))) == null) {
            // Aún en el bucket viejo: se muda a R2 al primer acceso.
            const { data } = await admin.storage.from(conf.bucket).download(r)
            if (!data) continue
            await subirObjeto(claveDe(ambito, r), data)
          }
          urls[r] = await firmarGet(claveDe(ambito, r), 900)
        }
        return json({ ok: true, urls }, 200, cors)
      }

      case 'borrar': {
        const rutas = Array.isArray(b.rutas) ? b.rutas : []
        const prefijo = rutaValida(b.prefijo) ? b.prefijo : null
        if (rutas.length > 200 || !rutas.every(rutaValida) || (!rutas.length && !prefijo)) break
        const todas = [...(rutas as string[]), ...(prefijo ? [prefijo] : [])]
        for (const r of todas) if (!(await puede('borrar', r))) return json({ error: 'sin-permiso' }, 403, cors)
        const claves = (rutas as string[]).map((r) => claveDe(ambito, r))
        if (prefijo) claves.push(...(await listarPrefijo(`${claveDe(ambito, prefijo)}/`)))
        await borrarObjetos(claves)
        // Lo que quede en el bucket viejo con esas rutas, también fuera.
        if (rutas.length) await admin.storage.from(conf.bucket).remove(rutas as string[])
        return json({ ok: true }, 200, cors)
      }
    }
  } catch (e) {
    console.error('[compartidos]', b.accion, e)
    return json({ error: 'almacen' }, 500, cors)
  }
  return json({ error: 'peticion-invalida' }, 400, cors)
})
