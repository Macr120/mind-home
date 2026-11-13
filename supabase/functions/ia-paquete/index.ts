/**
 * Paquetes de IA del Studio de video: UNA tarifa simple por duración —«1
 * crédito por cada 25 s de video» (3 si el doblaje lleva voz IA)— en vez de
 * cobrar cada transcripción, traducción, decisión y voz por separado.
 *
 * - `comprar` { op, tramos }: cobra `tramos × tarifa` de una vez (una reserva
 *   de `consumir_cuota_ia` por tramo: misma cuota, deuda, techo y recargas que
 *   cualquier llamada) y devuelve un PASE firmado que `ia-voz`, `ia-chat` e
 *   `ia-tts` aceptan sin volver a cobrar, hasta los topes de la operación. Si
 *   falta crédito a la mitad, se reintegra lo cobrado y no hay pase.
 * - `devolver` { pase, usados, reservas }: al terminar, reintegra los tramos no
 *   usados (los mudos no se escuchan ni se doblan). Una sola vez por pase y
 *   nunca por debajo de lo que el contador del servidor ya vio usar.
 *
 * El cliente decide cuántos tramos pide (no sabe mentir a su favor: pedir
 * menos solo le da menos llamadas cubiertas; lo que no cubre el pase se cobra
 * normal).
 */
import { preflight, json, corsDe } from '../_shared/cors.ts'
import { clienteUsuario, clienteAdmin, usuarioDe } from '../_shared/auth.ts'
import { dentroDeLimite } from '../_shared/limite.ts'
import { bucketPase, firmarPase, leerPase, usosDelPase, VIDA_PASE_MS, type Pase } from '../_shared/pase.ts'

/** ~4 h de video. */
const MAX_TRAMOS = 600

interface Tarifa {
  /** Créditos por tramo de 25 s. */
  tarifa: number
  /** Op de `costo_op` que vale exactamente `tarifa` (una reserva por tramo). */
  tipo: 'voz' | 'tts'
  /** Llamadas cubiertas por tipo para `n` tramos (holgura de 2 para reintentos). */
  topes: (n: number) => Record<string, number>
}

const TARIFAS: Record<string, Tarifa> = {
  // Escuchar cada tramo + la decisión de la IA (visión, o texto si el modelo no ve).
  'video.editar': { tarifa: 1, tipo: 'voz', topes: (n) => ({ voz: n + 2, vision: 3, texto: 3 }) },
  'video.clipear': { tarifa: 1, tipo: 'voz', topes: (n) => ({ voz: n + 2, vision: 3, texto: 3 }) },
  // Escuchar + traducir (lotes de ~4 tramos; por frases, algún lote más).
  'video.traducir': { tarifa: 1, tipo: 'voz', topes: (n) => ({ voz: n + 2, texto: Math.ceil(n / 3) + 2 }) },
  // Lo mismo + la voz IA FRASE POR FRASE (varias por tramo y un reintento a otra velocidad si no
  // cabe en su hueco). La voz IA cuesta por caracteres, no por llamada: partirla no encarece.
  'video.traducir.voz': { tarifa: 3, tipo: 'tts', topes: (n) => ({ voz: n + 2, texto: Math.ceil(n / 3) + 2, tts: n * 6 + 2 }) },
}

Deno.serve(async (req) => {
  const pre = preflight(req)
  if (pre) return pre
  const cors = corsDe(req)
  if (req.method !== 'POST') {
    return json({ error: 'peticion-invalida', mensaje: 'Método no soportado.' }, 400, cors)
  }
  const usuario = await usuarioDe(clienteUsuario(req))
  if (!usuario) {
    return json({ error: 'sin-sesion', mensaje: 'Inicia sesión para usar la IA.' }, 401, cors)
  }
  const admin = clienteAdmin()

  let body: { accion?: unknown; op?: unknown; tramos?: unknown; pase?: unknown; usados?: unknown; reservas?: unknown }
  try {
    body = await req.json()
  } catch {
    return json({ error: 'peticion-invalida', mensaje: 'JSON inválido.' }, 400, cors)
  }

  // ─── Devolver lo no usado ────────────────────────────────────────────────
  if (body.accion === 'devolver') {
    const p = await leerPase(body.pase, usuario.id, { aunCaducado: true })
    if (!p) return json({ error: 'peticion-invalida', mensaje: 'Pase inválido.' }, 400, cors)
    // Una sola devolución por pase.
    if (!(await dentroDeLimite(admin, usuario.id, bucketPase(p, 'devuelto'), 1, 24 * 60 * 60, false))) {
      return json({ devueltos: 0 }, 200, cors)
    }
    const usos = await usosDelPase(admin, p)
    const visto = Math.max(
      Math.min(usos.voz ?? 0, p.tramos),
      Math.min(usos.tts ?? 0, p.tramos),
      (usos.texto ?? 0) + (usos.vision ?? 0) > 0 ? 1 : 0,
    )
    const declarados = Math.max(0, Math.min(p.tramos, Math.floor(Number(body.usados) || 0)))
    const aDevolver = p.tramos - Math.max(declarados, visto)
    const reservas = Array.isArray(body.reservas) ? body.reservas.filter((r): r is string => typeof r === 'string').slice(0, aDevolver) : []
    let devueltos = 0
    for (const r of reservas) {
      // Solo borra (y reintegra) una reserva de ESTE usuario y de este tipo: un id ajeno no hace nada.
      const { error } = await admin.rpc('devolver_cuota_ia', { p_uid: usuario.id, p_tipo: p.tipo, p_reserva: r })
      if (!error) devueltos++
    }
    return json({ devueltos: devueltos * p.tarifa }, 200, cors)
  }

  // ─── Comprar ─────────────────────────────────────────────────────────────
  const t = typeof body.op === 'string' ? TARIFAS[body.op] : undefined
  const tramos = Math.floor(Number(body.tramos))
  if (!t || !(tramos >= 1 && tramos <= MAX_TRAMOS)) {
    return json({ error: 'peticion-invalida', mensaje: 'Paquete inválido.' }, 400, cors)
  }
  if (!(await dentroDeLimite(admin, usuario.id, 'paquete', 10, 60))) {
    return json({ error: 'limite', mensaje: 'Vas muy rápido con la IA. Espera unos segundos y reintenta.' }, 429, cors)
  }

  const reservas: string[] = []
  let ultima: { usadas?: number; limite?: number; extra?: number } | null = null
  const deshacer = async () => {
    for (const r of reservas) await admin.rpc('devolver_cuota_ia', { p_uid: usuario.id, p_tipo: t.tipo, p_reserva: r })
  }
  for (let i = 0; i < tramos; i++) {
    const { data: cuota, error } = await admin.rpc('consumir_cuota_ia', { p_uid: usuario.id, p_tipo: t.tipo })
    if (error || !cuota?.permitido) {
      await deshacer()
      if (error) return json({ error: 'proveedor', mensaje: 'No se pudo verificar la cuota.' }, 502, cors)
      if (cuota?.motivo === 'techo') return json({ error: 'techo', mensaje: 'Alcanzaste el límite de uso del mes.' }, 429, cors)
      return json({ error: 'cuota-agotada', mensaje: 'Te quedaste sin créditos de IA.' }, 429, cors)
    }
    reservas.push(cuota.reserva)
    ultima = cuota
  }

  const pase: Pase = {
    id: crypto.randomUUID(),
    uid: usuario.id,
    op: body.op as string,
    tramos,
    tarifa: t.tarifa,
    tipo: t.tipo,
    topes: t.topes(tramos),
    exp: Date.now() + VIDA_PASE_MS,
  }
  return json(
    {
      pase: await firmarPase(pase),
      reservas,
      creditos: tramos * t.tarifa,
      uso: { usadas: ultima?.usadas ?? 0, limite: ultima?.limite ?? 0, extra: ultima?.extra ?? 0, costo: tramos * t.tarifa },
    },
    200,
    cors,
  )
})
