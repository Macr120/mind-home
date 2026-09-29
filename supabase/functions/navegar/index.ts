/**
 * Proxy de transporte público (HERE Intermodal Routing) con cuota por usuario
 * (auditoría de precios, 25-sep-2026). El plan Base de HERE regala 2 500
 * búsquedas intermodales al mes PARA TODA LA APP; desde el cliente, esa cuota
 * la agotaban unas decenas de usuarios sin que nadie pagara nada. Aquí cada
 * búsqueda cobra la op `transporte` (1 crédito) y el crédito se devuelve si
 * HERE falla. Mapa, rutas a pie/bici/auto y geocodificación siguen desde el
 * cliente (`rooms/sala/navegacion/here.ts`), con sus cupos de 30 000.
 *
 * El cuerpo trae los parámetros de la petición de HERE (lista blanca abajo);
 * la respuesta es el JSON de HERE tal cual más `uso`, así el cliente reutiliza
 * su normalización (`aItinerario`).
 *
 * Secreto: `HERE_KEY_SERVIDOR` (una app propia en el Access Manager de HERE,
 * aparte de las cuatro de los clientes: HERE pide un App ID por aplicación).
 */
import { preflight, json, corsDe } from '../_shared/cors.ts'
import { clienteUsuario, clienteAdmin, usuarioDe } from '../_shared/auth.ts'
import { dentroDeLimite } from '../_shared/limite.ts'
import { COSTO_FIJO } from '../_shared/costoUsd.ts'

const HERE_KEY = Deno.env.get('HERE_KEY_SERVIDOR') ?? ''
const TIMEOUT_MS = 20_000

/** Lo único que el cliente puede mandarle a HERE (los que usa `planificar()`). */
const PARAMS = new Set([
  'origin',
  'destination',
  'lang',
  'arrivalTime',
  'departureTime',
  'alternatives',
  'return',
  'taxi[enable]',
  'rented[enable]',
  'vehicle[enable]',
  'vehicle[modes]',
])

function paramsValidos(v: unknown): Record<string, string> | null {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return null
  const entradas = Object.entries(v as Record<string, unknown>)
  if (entradas.length > PARAMS.size) return null
  const out: Record<string, string> = {}
  for (const [k, x] of entradas) {
    if (!PARAMS.has(k) || typeof x !== 'string' || x.length > 120) return null
    out[k] = x
  }
  return out.origin && out.destination ? out : null
}

Deno.serve(async (req) => {
  const pre = preflight(req)
  if (pre) return pre
  const cors = corsDe(req)
  if (req.method !== 'POST') {
    return json({ error: 'peticion-invalida', mensaje: 'Método no soportado.' }, 400, cors)
  }
  if (!HERE_KEY) return json({ error: 'proveedor', mensaje: 'Transporte no disponible.' }, 503, cors)

  const usuario = await usuarioDe(clienteUsuario(req))
  if (!usuario) {
    return json({ error: 'sin-sesion', mensaje: 'Inicia sesión para buscar en transporte público.' }, 401, cors)
  }
  // Las RPCs de cuota son exclusivas de service_role (20260803000001).
  const admin = clienteAdmin()

  if (!(await dentroDeLimite(admin, usuario.id, 'navegar', 30, 3600))) {
    return json({ error: 'limite', mensaje: 'Demasiadas búsquedas seguidas. Espera un momento.' }, 429, cors)
  }

  let params: Record<string, string> | null = null
  try {
    params = paramsValidos(((await req.json()) as { params?: unknown }).params)
  } catch {
    return json({ error: 'peticion-invalida', mensaje: 'JSON inválido.' }, 400, cors)
  }
  if (!params) return json({ error: 'peticion-invalida', mensaje: 'Parámetros inválidos.' }, 400, cors)

  const { data: cuota, error: errCuota } = await admin.rpc('consumir_cuota_ia', {
    p_uid: usuario.id,
    p_tipo: 'transporte',
  })
  if (errCuota) {
    return json({ error: 'proveedor', mensaje: 'No se pudo verificar la cuota.' }, 502, cors)
  }
  if (!cuota?.permitido) {
    if (cuota?.motivo === 'techo') {
      return json({ error: 'techo', mensaje: 'Alcanzaste el límite de uso del mes.' }, 429, cors)
    }
    return json({ error: 'cuota-agotada', mensaje: 'Te quedaste sin créditos.' }, 429, cors)
  }

  const u = new URL('https://intermodal.router.hereapi.com/v8/routes')
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v)
  u.searchParams.set('apiKey', HERE_KEY)
  let rutas: unknown = null
  try {
    const resp = await fetch(u, { signal: AbortSignal.timeout(TIMEOUT_MS) })
    if (!resp.ok) throw new Error(`HERE ${resp.status}`)
    rutas = await resp.json()
  } catch (e) {
    // La reserva emitida al cobrar es lo que autoriza la devolución (un solo uso).
    await admin.rpc('devolver_cuota_ia', { p_uid: usuario.id, p_tipo: 'transporte', p_reserva: cuota.reserva })
    console.error(`navegar: HERE falló — ${e instanceof Error ? e.message : 'error'}`)
    return json({ error: 'proveedor', mensaje: 'El servicio de rutas no respondió.' }, 502, cors)
  }

  // El `.then()` dispara la petición (el builder de `rpc` es perezoso); ver ia-voz.
  const registro = admin
    .rpc('registrar_uso_ia', {
      p_uid: usuario.id,
      p_entrada: 0,
      p_salida: 0,
      p_cache_crear: 0,
      p_cache_leer: 0,
      p_proveedor: 'here',
      p_tipo: 'transporte',
      p_usd: COSTO_FIJO.transporte,
    })
    .then(({ error }) => {
      if (error) console.error('navegar: registrar_uso_ia falló —', error.message)
    })
  if (typeof EdgeRuntime !== 'undefined') EdgeRuntime.waitUntil(registro)
  else await registro

  return json(
    {
      rutas,
      uso: { usadas: cuota.usadas, limite: cuota.limite, extra: cuota.extra ?? 0, costo: cuota.costo },
    },
    200,
    cors,
  )
})
