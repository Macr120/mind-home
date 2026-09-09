/**
 * Poda de conexiones inactivas: revalida las credenciales de `redes_cuentas`
 * que llevan más de 30 días sin tocarse y borra las que ya no sirven.
 *
 * Lo pide la auditoría de YouTube API Services (Developer Policies III.E.4):
 * los datos guardados se refrescan o se borran al menos cada 30 días. MPH no
 * almacena API Data de YouTube —solo la credencial OAuth, que la política
 * permite conservar hasta que el usuario revoque—, pero sin esto la fila de
 * quien conecta y NUNCA publica se queda para siempre: `cuentaVigente` solo
 * refresca al publicar.
 *
 * Se despliega con `verify_jwt = false` porque la llama el cron de la base, sin
 * JWT; se autentica con el header Authorization contra REDES_MANTENIMIENTO_AUTH
 * (mismo patrón que `revenuecat-webhook`).
 *
 *   POST …/redes-mantenimiento            → {revisadas, renovadas, borradas, fallos}
 *   POST …/redes-mantenimiento {simular:true} → igual pero SIN borrar nada:
 *     devuelve `borraria` en vez de `borradas`. Para la primera ejecución a
 *     mano, y para mirar qué haría antes de dejarlo suelto en el cron.
 *
 * Secretos: REDES_MANTENIMIENTO_AUTH, REDES_CIFRADO_KEY, GOOGLE_CLIENT_ID/SECRET,
 * TIKTOK_CLIENT_KEY/SECRET (los mismos que ya usa `redes-publicar`).
 */
import { clienteAdmin } from '../_shared/auth.ts'
import { json } from '../_shared/cors.ts'
import { ErrorRedes } from '../_shared/redes/errores.ts'
import { esPlataforma, type Plataforma } from '../_shared/redes/plataformas.ts'
import { borrarCuenta, cuentaVigente } from '../_shared/redes/tokens.ts'

/** Una fila se considera dormida a los 30 días sin refrescarse ni reconectarse. */
const DIAS_INACTIVA = 30

/** Tope por ejecución: el cron es diario, así que la cola se drena sola sin agotar el tiempo de la función. */
const MAX_POR_TANDA = 200

/**
 * Margen absurdo (10 años) para YouTube y TikTok: `cuentaVigente` refresca
 * cuando al token le queda menos que el margen, así que con esto SIEMPRE
 * refresca contra el proveedor, que es justo lo que revalida la credencial.
 * Meta va con el margen normal: su token de Página no se refresca, solo se
 * comprueba que el token padre del que deriva siga vivo.
 */
const FORZAR_REFRESCO_SEG = 10 * 365 * 86_400

/**
 * Comparación en tiempo constante por SHA-256, sin cortocircuito (mismo helper
 * que `revenuecat-webhook`). El guard `!secreto` evita el fail-open si falta la
 * variable de entorno.
 */
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
  if (!(await autorizado(req.headers.get('Authorization') ?? '', Deno.env.get('REDES_MANTENIMIENTO_AUTH') ?? ''))) {
    return json({ error: 'no-autorizado' }, 401)
  }

  // Cuerpo opcional: el cron manda `{}` y no simula.
  const cuerpo = (await req.json().catch(() => ({}))) as { simular?: unknown }
  const simular = cuerpo.simular === true

  const admin = clienteAdmin()
  const corte = new Date(Date.now() - DIAS_INACTIVA * 86_400_000).toISOString()

  const { data, error } = await admin
    .from('redes_cuentas')
    .select('user_id, plataforma')
    .lt('actualizado_en', corte)
    .order('actualizado_en', { ascending: true })
    .limit(MAX_POR_TANDA)
  if (error) return json({ error: 'proveedor', mensaje: `redes_cuentas: ${error.message}` }, 500)

  const filas = (data ?? []) as { user_id: string; plataforma: string }[]
  let renovadas = 0
  let borradas = 0
  let fallos = 0

  for (const fila of filas) {
    if (!esPlataforma(fila.plataforma)) continue
    const plataforma: Plataforma = fila.plataforma
    const esMeta = plataforma === 'facebook' || plataforma === 'instagram'
    try {
      await cuentaVigente(admin, fila.user_id, plataforma, esMeta ? undefined : FORZAR_REFRESCO_SEG)
      // Meta no refresca, así que `cuentaVigente` no ha tocado la fila: se sella
      // a mano o volvería a salir en la tanda de mañana, y de todas las demás.
      if (esMeta && !simular) {
        await admin
          .from('redes_cuentas')
          .update({ actualizado_en: new Date().toISOString() })
          .eq('user_id', fila.user_id)
          .eq('plataforma', plataforma)
      }
      renovadas++
    } catch (e) {
      // 'caducada' y 'sin-cuenta' son el final normal de una conexión muerta:
      // se borra la credencial. Cualquier otro fallo (red, 5xx del proveedor)
      // NO borra nada — se reintenta mañana.
      if (e instanceof ErrorRedes && (e.codigo === 'caducada' || e.codigo === 'sin-cuenta')) {
        if (!simular) await borrarCuenta(admin, fila.user_id, [plataforma])
        borradas++
      } else {
        fallos++
        console.error('[redes-mantenimiento]', plataforma, e instanceof Error ? `${e.name}: ${e.message}` : String(e))
      }
    }
  }

  // `renovadas` en simulación cuenta las que SÍ se refrescaron: refrescar es
  // idempotente e inofensivo, y es justo lo que hay que probar. Lo único que la
  // simulación se salta es borrar.
  return json(
    simular
      ? { simulado: true, revisadas: filas.length, renovadas, borraria: borradas, fallos }
      : { revisadas: filas.length, renovadas, borradas, fallos },
  )
})
