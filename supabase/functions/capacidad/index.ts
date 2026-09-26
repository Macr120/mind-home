/**
 * Capacidad: la parte de la medición que la base no ve sola, y lo que se hace
 * con ella (migración 20260928000002). La llama cada hora el cron
 * `capacidad-hora`, cinco minutos después de `capacidad-medir`.
 *
 * 1. CPU, RAM y conexiones del servidor, de la Metrics API de Supabase
 *    (Prometheus, autenticada con service_role). La CPU sale de la diferencia
 *    con la muestra anterior: `cpu_pct` es la media de la última hora y se
 *    guarda el máximo del día.
 * 2. Correo de alerta (Resend) si algo está en amarillo o rojo: uno al día como
 *    mucho, más los avisos de la subida de compute.
 * 3. Subida automática de compute, SOLO en plan Pro: si CPU o RAM siguen en rojo
 *    tres días seguidos, se programa un escalón (aviso 24 h antes; el dueño la
 *    puede cancelar desde su panel) y se aplica entre las 09 y las 10 UTC, como
 *    mucho una vez por semana y nunca por encima de COMPUTE_TECHO. Nunca baja
 *    sola ni toca el plan de facturación. Con COMPUTE_SIMULAR distinto de '0'
 *    (el valor por defecto) solo dice lo que haría.
 *
 * Secretos: CAPACIDAD_AUTH (el cron), RESEND_API_KEY + ALERTA_PARA + ALERTA_DE
 * (correo; sin ellos no se manda), SUPABASE_PAT (Management API; sin él no hay
 * subida), COMPUTE_TECHO (por defecto ci_medium) y COMPUTE_SIMULAR.
 *
 *   POST …/capacidad                        → resumen de lo hecho
 *   POST …/capacidad {probarCorreo: true}   → además manda un correo de prueba
 */
import { clienteAdmin } from '../_shared/auth.ts'
import { json } from '../_shared/cors.ts'

const ESCALONES = ['ci_micro', 'ci_small', 'ci_medium', 'ci_large', 'ci_xlarge', 'ci_2xlarge', 'ci_4xlarge']
const DIAS_SOSTENIDO = 3
const DIAS_ENTRE_SUBIDAS = 7
const HORA_SUBIDA_UTC = 9

interface Semaforo {
  metrica: string
  valor: number | null
  amarillo: number
  rojo: number
  color: 'verde' | 'amarillo' | 'rojo' | 'gris'
  accion: string
}

interface Estado {
  plan: 'free' | 'pro'
  ultimo_correo: string | null
  subida_pendiente: string | null
  subida_desde: string | null
  subida_cancelada: boolean
  ultima_subida: string | null
  cpu_prev: { idle: number; total: number } | null
}

/** Comparación en tiempo constante por SHA-256 (mismo helper que `almacen-purga`). */
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

const hoyUtc = () => new Date().toISOString().slice(0, 10)
const ref = () => new URL(Deno.env.get('SUPABASE_URL')!).hostname.split('.')[0]

// ─── 1. Metrics API ──────────────────────────────────────────────────────────

/** Suma de todas las series de una métrica Prometheus que cumplan el filtro de etiquetas. */
function sumar(texto: string, nombre: string, filtro?: (etiquetas: string) => boolean): number | null {
  let total = 0
  let hay = false
  for (const linea of texto.split('\n')) {
    if (!linea.startsWith(nombre)) continue
    const m = /^([a-zA-Z_:][\w:]*)(\{[^}]*\})?\s+([-\d.eE+]+)/.exec(linea)
    if (!m || m[1] !== nombre) continue
    if (filtro && !filtro(m[2] ?? '')) continue
    total += Number(m[3])
    hay = true
  }
  return hay ? total : null
}

async function medirServidor(estado: Estado): Promise<{ cpu: number | null; ram: number | null; conexiones: number | null; cpuPrev: Estado['cpu_prev'] }> {
  const clave = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const r = await fetch(`${Deno.env.get('SUPABASE_URL')}/customer/v1/privileged/metrics`, {
    headers: { Authorization: `Basic ${btoa(`service_role:${clave}`)}` },
  })
  if (!r.ok) throw new Error(`metrics ${r.status}`)
  const texto = await r.text()

  const idle = sumar(texto, 'node_cpu_seconds_total', (e) => e.includes('mode="idle"'))
  const total = sumar(texto, 'node_cpu_seconds_total')
  let cpu: number | null = null
  const cpuPrev = idle != null && total != null ? { idle, total } : null
  if (cpuPrev && estado.cpu_prev && cpuPrev.total > estado.cpu_prev.total) {
    const dTotal = cpuPrev.total - estado.cpu_prev.total
    const dIdle = cpuPrev.idle - estado.cpu_prev.idle
    cpu = Math.round(1000 * (1 - dIdle / dTotal)) / 10
  }

  const disp = sumar(texto, 'node_memory_MemAvailable_bytes')
  const memTotal = sumar(texto, 'node_memory_MemTotal_bytes')
  const ram = disp != null && memTotal ? Math.round(1000 * (1 - disp / memTotal)) / 10 : null
  const conexiones = sumar(texto, 'pg_stat_database_num_backends')
  return { cpu, ram, conexiones, cpuPrev }
}

// ─── 2. Correo ───────────────────────────────────────────────────────────────

async function correo(asunto: string, cuerpo: string): Promise<boolean> {
  const clave = Deno.env.get('RESEND_API_KEY')
  const para = Deno.env.get('ALERTA_PARA')
  const de = Deno.env.get('ALERTA_DE')
  if (!clave || !para || !de) return false
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${clave}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: de, to: [para], subject: asunto, text: cuerpo }),
  })
  if (!r.ok) console.error(`capacidad: resend ${r.status} — ${await r.text()}`)
  return r.ok
}

const ACCIONES: Record<string, string> = {
  'contratar-pro': 'Contrata Supabase Pro ($25/mes) y cambia el panel a «Pro».',
  'realtime-extra': 'Pasar de 500 conexiones se cobra solo (≈$10 por cada 1.000 extra).',
  retencion: 'Revisar la retención de datos antes de llegar a 8 GB.',
  'medios-r2': 'Adelantar la mudanza de los medios del buzón y los espacios a R2.',
  'subir-compute': 'Subir el compute un escalón (automático si se sostiene 3 días).',
}

function resumen(semaforo: Semaforo[]): string {
  return semaforo
    .filter((s) => s.color === 'amarillo' || s.color === 'rojo')
    .map((s) => `• ${s.metrica}: ${s.valor} (amarillo ${s.amarillo}, rojo ${s.rojo}) — ${s.color.toUpperCase()}\n  ${ACCIONES[s.accion] ?? s.accion}`)
    .join('\n')
}

// ─── 3. Compute ──────────────────────────────────────────────────────────────

async function management(ruta: string, init: RequestInit = {}): Promise<Response> {
  return await fetch(`https://api.supabase.com/v1/projects/${ref()}${ruta}`, {
    ...init,
    headers: { Authorization: `Bearer ${Deno.env.get('SUPABASE_PAT')}`, 'Content-Type': 'application/json' },
  })
}

async function computeActual(): Promise<string | null> {
  const r = await management('/billing/addons')
  if (!r.ok) throw new Error(`addons ${r.status}`)
  const d = (await r.json()) as { selected_addons?: { type: string; variant?: { id?: string } }[] }
  return d.selected_addons?.find((a) => a.type === 'compute_instance')?.variant?.id ?? 'ci_micro'
}

/** ¿CPU o RAM en rojo los últimos N días (incluido hoy)? */
async function rojoSostenido(admin: ReturnType<typeof clienteAdmin>, semaforo: Semaforo[]): Promise<boolean> {
  const desde = new Date(Date.now() - (DIAS_SOSTENIDO - 1) * 86_400_000).toISOString().slice(0, 10)
  for (const metrica of ['cpu_pct', 'ram_pct']) {
    const u = semaforo.find((s) => s.metrica === metrica)
    if (!u) continue
    const { data } = await admin.from('capacidad_metricas').select('dia, valor').eq('metrica', metrica).gte('dia', desde)
    const dias = (data ?? []).filter((f) => Number(f.valor) >= u.rojo)
    if (dias.length >= DIAS_SOSTENIDO) return true
  }
  return false
}

async function escalar(admin: ReturnType<typeof clienteAdmin>, estado: Estado, semaforo: Semaforo[]): Promise<string> {
  if (estado.plan !== 'pro') return 'en-espera (plan free)'
  if (!Deno.env.get('SUPABASE_PAT')) return 'sin-pat'
  const simular = (Deno.env.get('COMPUTE_SIMULAR') ?? '1') !== '0'
  const techo = Deno.env.get('COMPUTE_TECHO') ?? 'ci_medium'
  const cambiar = (c: Partial<Estado>) => admin.from('capacidad_estado').update(c).eq('id', 1)

  // Cancelada desde el panel: se descarta y cuenta como subida para el enfriamiento.
  if (estado.subida_pendiente && estado.subida_cancelada) {
    await cambiar({ subida_pendiente: null, subida_desde: null, subida_cancelada: false, ultima_subida: new Date().toISOString() })
    return 'cancelada'
  }

  if (estado.subida_pendiente) {
    const madura = Date.now() - Date.parse(estado.subida_desde!) >= 86_400_000
    if (!madura || new Date().getUTCHours() !== HORA_SUBIDA_UTC) return `pendiente ${estado.subida_pendiente}`
    if (!simular) {
      const r = await management('/billing/addons', {
        method: 'PATCH',
        body: JSON.stringify({ addon_type: 'compute_instance', addon_variant: estado.subida_pendiente }),
      })
      if (!r.ok) {
        await correo('MindHaOS · la subida de compute falló', `La API respondió ${r.status}: ${await r.text()}`)
        return `fallo ${r.status}`
      }
    }
    await cambiar({ subida_pendiente: null, subida_desde: null, ultima_subida: new Date().toISOString() })
    await correo(
      `MindHaOS · compute ${simular ? '(simulado) ' : ''}subido a ${estado.subida_pendiente}`,
      simular
        ? `COMPUTE_SIMULAR está activo: NO se cambió nada. Se habría subido a ${estado.subida_pendiente}.`
        : `El servidor ya corre en ${estado.subida_pendiente}. Revisa el costo en el panel de Supabase.`,
    )
    return `${simular ? 'simulada' : 'aplicada'} ${estado.subida_pendiente}`
  }

  const enfriando = estado.ultima_subida && Date.now() - Date.parse(estado.ultima_subida) < DIAS_ENTRE_SUBIDAS * 86_400_000
  if (enfriando || !(await rojoSostenido(admin, semaforo))) return 'sin-cambios'

  const actual = await computeActual()
  const i = ESCALONES.indexOf(actual ?? '')
  const siguiente = i >= 0 ? ESCALONES[i + 1] : undefined
  if (!siguiente || ESCALONES.indexOf(siguiente) > ESCALONES.indexOf(techo)) {
    await correo(
      'MindHaOS · el compute llegó al techo automático',
      `CPU o RAM siguen en rojo ${DIAS_SOSTENIDO} días en ${actual}, y el siguiente escalón pasa de COMPUTE_TECHO (${techo}). Decide a mano en Supabase.`,
    )
    return `techo ${actual}`
  }
  await cambiar({ subida_pendiente: siguiente, subida_desde: new Date().toISOString(), subida_cancelada: false })
  await correo(
    `MindHaOS · mañana sube el compute a ${siguiente}`,
    `CPU o RAM llevan ${DIAS_SOSTENIDO} días en rojo en ${actual}. Mañana entre las ${HORA_SUBIDA_UTC}:00 y las ${HORA_SUBIDA_UTC + 1}:00 UTC se sube a ${siguiente} (la base se reinicia 1–2 minutos). Para evitarlo: Cuenta → Capacidad → «Cancelar la subida».`,
  )
  return `programada ${siguiente}`
}

// ─── entrada ─────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'peticion-invalida' }, 400)
  if (!(await autorizado(req.headers.get('Authorization') ?? '', Deno.env.get('CAPACIDAD_AUTH') ?? ''))) {
    return json({ error: 'no-autorizado' }, 401)
  }
  const cuerpo = (await req.json().catch(() => ({}))) as { probarCorreo?: unknown }
  const admin = clienteAdmin()

  const { data: filaEstado, error: eEstado } = await admin.from('capacidad_estado').select('*').eq('id', 1).single()
  if (eEstado || !filaEstado) return json({ error: 'bd', mensaje: eEstado?.message }, 500)
  const estado = filaEstado as Estado
  const informe: Record<string, unknown> = {}

  try {
    const s = await medirServidor(estado)
    if (s.cpu != null) await admin.rpc('capacidad_guardar', { p_metrica: 'cpu_pct', p_valor: s.cpu, p_maximo: true })
    if (s.ram != null) await admin.rpc('capacidad_guardar', { p_metrica: 'ram_pct', p_valor: s.ram, p_maximo: true })
    if (s.conexiones != null) {
      await admin.rpc('capacidad_guardar', { p_metrica: 'conexiones_bd', p_valor: s.conexiones, p_maximo: true })
    }
    if (s.cpuPrev) await admin.from('capacidad_estado').update({ cpu_prev: s.cpuPrev }).eq('id', 1)
    informe.servidor = { cpu: s.cpu, ram: s.ram, conexiones: s.conexiones }
  } catch (e) {
    informe.servidor = `sin-dato: ${e instanceof Error ? e.message : e}`
  }

  const { data: filas } = await admin.rpc('capacidad_semaforo')
  const semaforo = (filas ?? []) as Semaforo[]
  const colores = Object.fromEntries(semaforo.map((s) => [s.metrica, s.color]))
  const alertas = resumen(semaforo)

  if ((alertas && estado.ultimo_correo !== hoyUtc()) || cuerpo.probarCorreo === true) {
    const enviado = await correo(
      alertas ? `MindHaOS · capacidad: ${semaforo.some((s) => s.color === 'rojo') ? 'ROJO' : 'amarillo'}` : 'MindHaOS · correo de prueba',
      `${alertas || 'Todo en verde.'}\n\nPlan de Supabase en el panel: ${estado.plan}. Detalle en Cuenta → Capacidad.`,
    )
    if (enviado && alertas) await admin.from('capacidad_estado').update({ ultimo_correo: hoyUtc() }).eq('id', 1)
    informe.correo = enviado
  }
  await admin.from('capacidad_estado').update({ colores }).eq('id', 1)

  try {
    informe.compute = await escalar(admin, estado, semaforo)
  } catch (e) {
    informe.compute = `error: ${e instanceof Error ? e.message : e}`
  }
  informe.semaforo = colores
  return json(informe)
})
