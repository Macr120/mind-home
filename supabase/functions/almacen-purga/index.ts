/**
 * Purga de la nube: a los 90 días de quedarse sin plan, borra de R2 la carpeta
 * del usuario, suelta su cuota y tombstonea sus archivos del cuarto Archivo
 * (migración 20260926000001). Hasta entonces la cuenta está en solo lectura.
 *
 * Se despliega con `verify_jwt = false` porque la llama el cron de la base, sin
 * JWT; se autentica con el header Authorization contra ALMACEN_PURGA_AUTH
 * (mismo patrón que `redes-mantenimiento`).
 *
 *   POST …/almacen-purga               → {purgados, fallos}
 *   POST …/almacen-purga {simular:true} → {purgaria: [{uid, objetos}]} sin borrar
 */
import { clienteAdmin } from '../_shared/auth.ts'
import { json } from '../_shared/cors.ts'
import { borrarObjetos, listarPrefijo, r2Configurado } from '../_shared/r2.ts'

/** Tope por ejecución: el cron es diario y la cola se drena sola. */
const MAX_POR_TANDA = 200

/** Comparación en tiempo constante por SHA-256 (mismo helper que `redes-mantenimiento`). */
async function autorizado(auth: string, secreto: string): Promise<boolean> {
  if (!secreto) return false
  const sha = (s: string) => crypto.subtle.digest('SHA-256', new TextEncoder().encode(s))
  const [a, b] = await Promise.all([sha(auth), sha(secreto)])
  const va = new Uint8Array(a)
  const vb = new Uint8Array(b)
  let dif = 0
  for (let i = 0; i < va.length; i++) dif |= va[i] ^ vb[i]
  return dif === 0
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'peticion-invalida' }, 400)
  if (!(await autorizado(req.headers.get('Authorization') ?? '', Deno.env.get('ALMACEN_PURGA_AUTH') ?? ''))) {
    return json({ error: 'no-autorizado' }, 401)
  }
  if (!r2Configurado()) return json({ error: 'sin-almacen' }, 503)

  // Cuerpo opcional: el cron manda `{}` y no simula.
  const cuerpo = (await req.json().catch(() => ({}))) as { simular?: unknown }
  const simular = cuerpo.simular === true

  const admin = clienteAdmin()
  const { data, error } = await admin.rpc('almacen_purgables', { p_limite: MAX_POR_TANDA })
  if (error) return json({ error: 'bd', mensaje: error.message }, 500)
  const uids = (data ?? []) as string[]

  if (simular) {
    const purgaria = []
    for (const uid of uids) purgaria.push({ uid, objetos: (await listarPrefijo(`${uid}/`)).length })
    return json({ purgaria })
  }

  let purgados = 0
  const fallos: string[] = []
  for (const uid of uids) {
    try {
      // Primero R2: si falla, la fila sigue y mañana se reintenta.
      await borrarObjetos(await listarPrefijo(`${uid}/`))
      const { error: e } = await admin.rpc('almacen_purgar', { p_uid: uid })
      if (e) throw new Error(e.message)
      purgados++
    } catch (e) {
      console.error('[almacen-purga]', uid, e)
      fallos.push(uid)
    }
  }
  return json({ purgados, fallos })
})
