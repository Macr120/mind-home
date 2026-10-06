/**
 * Boletín diario por correo (migración 20261005000002): a quien aceptó le
 * llega cada día un consejo breve de salud mental más las promociones y
 * noticias vigentes de `boletin_avisos`.
 *
 * - Una edición por día e idioma, generada con Claude (Haiku) y guardada en
 *   `boletin_ediciones`: un reintento reusa la misma, y los títulos de los
 *   últimos días entran al prompt para no repetir tema.
 * - Envío por Resend en lotes de 100 con `List-Unsubscribe` (baja de un clic,
 *   función `boletin-baja`). Marca `ultimo_envio` por lote: si se corta por
 *   tiempo, la siguiente pasada del cron sigue donde se quedó.
 *
 * Se despliega con `verify_jwt = false`: la llama el cron de la base y se
 * autentica con Authorization contra BOLETIN_AUTH (patrón de `almacen-purga`).
 *
 *   POST …/boletin-diario                         → {enviados, idiomas, fallos}
 *   POST …/boletin-diario {prueba:"a@b.com", idioma:"es"} → manda la edición de
 *        hoy solo a esa dirección, sin marcar a nadie.
 *
 * Secretos: BOLETIN_AUTH, RESEND_API_KEY, BOLETIN_DE («MindHaOS <hola@…>»,
 * dominio verificado en Resend), ANTHROPIC_API_KEY. Sin alguno → 503.
 */
import { clienteAdmin } from '../_shared/auth.ts'
import { json } from '../_shared/cors.ts'
import { DIRECCION, textosDe } from '../_shared/boletinTextos.ts'

const LOTE_RESEND = 100
const TANDA_BD = 500
/** Margen bajo el límite de pared de las Edge Functions (150 s en Free). */
const PRESUPUESTO_MS = 110_000

interface Aviso {
  tipo: 'promo' | 'noticia'
  titulo: string
  texto: string
  url: string | null
}

interface Edicion {
  asunto: string
  titulo: string
  parrafos: string[]
  practica: string
  avisos: { tipo: Aviso['tipo']; titulo: string; texto: string; url: string | null }[]
}

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

let haiku: string | null = null

/** El Haiku más nuevo (mismo criterio que `ia-chat`), con respaldo fijo. */
async function modeloHaiku(key: string): Promise<string> {
  if (haiku) return haiku
  try {
    const r = await fetch('https://api.anthropic.com/v1/models?limit=100', {
      headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01' },
      signal: AbortSignal.timeout(3000),
    })
    const { data } = (await r.json()) as { data?: { id: string }[] }
    haiku = data?.find((m) => m.id.startsWith('claude-haiku-'))?.id ?? 'claude-haiku-4-5'
  } catch {
    haiku = 'claude-haiku-4-5'
  }
  return haiku
}

async function generarEdicion(idioma: string, avisos: Aviso[], previos: string[]): Promise<Edicion> {
  const key = Deno.env.get('ANTHROPIC_API_KEY')!
  const lengua = textosDe(idioma).nombre
  const prompt = `Escribe el boletín diario de MindHaOS, una app de bienestar y organización personal, COMPLETO en ${lengua}.

Contenido principal: un consejo breve y práctico de salud mental para hoy (hábitos, estrés, sueño, ansiedad cotidiana, relaciones, autocompasión, atención plena…). Tono cálido y cercano, basado en evidencia, sin diagnósticos, sin promesas médicas y sin mencionar medicamentos. Entre 120 y 200 palabras en total.
${previos.length ? `No repitas estos temas de los días anteriores: ${previos.join(' | ')}.` : ''}
${avisos.length ? `Traduce además al ${lengua} estos avisos, en el mismo orden y sin añadir nada (si ya están en ${lengua}, déjalos igual):\n${JSON.stringify(avisos.map((a) => ({ titulo: a.titulo, texto: a.texto })))}` : ''}

Responde SOLO con JSON válido, sin texto alrededor:
{"asunto": "asunto del correo, máx. 60 caracteres", "titulo": "título del consejo", "parrafos": ["…", "…"], "practica": "un ejercicio concreto de 1 a 3 minutos para hoy", "avisos": [{"titulo": "…", "texto": "…"}]}`

  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({
      model: await modeloHaiku(key),
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }],
    }),
    signal: AbortSignal.timeout(60_000),
  })
  if (!r.ok) throw new Error(`anthropic ${r.status} — ${await r.text()}`)
  const res = (await r.json()) as { content?: { type: string; text?: string }[] }
  const texto = res.content?.find((c) => c.type === 'text')?.text ?? ''
  const crudo = JSON.parse(texto.slice(texto.indexOf('{'), texto.lastIndexOf('}') + 1)) as Partial<Edicion>
  if (!crudo.asunto || !crudo.titulo || !Array.isArray(crudo.parrafos) || !crudo.parrafos.length) {
    throw new Error('edicion-incompleta')
  }
  return {
    asunto: String(crudo.asunto).slice(0, 120),
    titulo: String(crudo.titulo),
    parrafos: crudo.parrafos.map(String),
    practica: String(crudo.practica ?? ''),
    // El tipo y la URL no pasan por la IA: se toman del original.
    avisos: avisos.map((a, i) => ({
      tipo: a.tipo,
      url: a.url,
      titulo: String(crudo.avisos?.[i]?.titulo ?? a.titulo),
      texto: String(crudo.avisos?.[i]?.texto ?? a.texto),
    })),
  }
}

/** La de hoy en ese idioma: la guardada o una nueva (la primera que se guarda gana). */
async function edicionDeHoy(
  admin: ReturnType<typeof clienteAdmin>,
  fecha: string,
  idioma: string,
  avisos: Aviso[],
): Promise<Edicion> {
  const guardada = await admin
    .from('boletin_ediciones')
    .select('contenido')
    .eq('fecha', fecha)
    .eq('idioma', idioma)
    .maybeSingle()
  if (guardada.data) return guardada.data.contenido as Edicion

  const { data: previas } = await admin
    .from('boletin_ediciones')
    .select('contenido')
    .eq('idioma', idioma)
    .order('fecha', { ascending: false })
    .limit(14)
  const titulos = (previas ?? []).map((p) => (p.contenido as Edicion).titulo)
  const nueva = await generarEdicion(idioma, avisos, titulos)
  await admin
    .from('boletin_ediciones')
    .upsert({ fecha, idioma, asunto: nueva.asunto, contenido: nueva }, { onConflict: 'fecha,idioma', ignoreDuplicates: true })
  const final = await admin.from('boletin_ediciones').select('contenido').eq('fecha', fecha).eq('idioma', idioma).single()
  return (final.data?.contenido as Edicion) ?? nueva
}

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

function armarCorreo(e: Edicion, idioma: string, urlBaja: string): { html: string; text: string } {
  const tx = textosDe(idioma)
  const dir = idioma === 'ar' ? 'rtl' : 'ltr'
  const avisosHtml = e.avisos
    .map(
      (a) => `<div style="margin:16px 0;padding:12px 14px;border-radius:10px;background:#f3f0ff">
  <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#6d5bd0">${esc(a.tipo === 'promo' ? tx.promo : tx.noticia)}</div>
  <div style="font-weight:700;margin:4px 0">${a.url ? `<a href="${esc(a.url)}" style="color:#1d1b2e">${esc(a.titulo)}</a>` : esc(a.titulo)}</div>
  <div style="font-size:14px">${esc(a.texto)}</div>
</div>`,
    )
    .join('')
  const html = `<!doctype html><html lang="${idioma}" dir="${dir}"><body style="margin:0;background:#f6f6f9;font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#1d1b2e">
<div style="max-width:560px;margin:0 auto;padding:24px 18px">
  <div style="font-weight:800;font-size:15px;color:#6d5bd0;margin-bottom:12px">MindHaOS</div>
  <div style="background:#fff;border-radius:14px;padding:20px 22px;line-height:1.55;font-size:15px">
    <h1 style="font-size:20px;margin:0 0 12px">${esc(e.titulo)}</h1>
    ${e.parrafos.map((p) => `<p style="margin:0 0 12px">${esc(p)}</p>`).join('')}
    ${e.practica ? `<p style="margin:14px 0 0;padding:12px 14px;border-radius:10px;background:#eefaf3">${esc(e.practica)}</p>` : ''}
    ${avisosHtml}
  </div>
  <p style="font-size:12px;color:#6b6880;margin:16px 4px 4px">${esc(tx.crisis)}</p>
  <p style="font-size:12px;color:#6b6880;margin:4px">${esc(tx.pie)} <a href="${esc(urlBaja)}" style="color:#6b6880">${esc(tx.baja)}</a></p>
  <p style="font-size:12px;color:#6b6880;margin:4px">${esc(DIRECCION)}</p>
</div></body></html>`
  const text = [
    e.titulo,
    '',
    ...e.parrafos,
    e.practica ? `\n${e.practica}` : '',
    ...e.avisos.map((a) => `\n[${a.tipo === 'promo' ? tx.promo : tx.noticia}] ${a.titulo}\n${a.texto}${a.url ? `\n${a.url}` : ''}`),
    '',
    '—',
    tx.crisis,
    `${tx.pie} ${tx.baja}: ${urlBaja}`,
    DIRECCION,
  ].join('\n')
  return { html, text }
}

async function enviarLote(
  correos: { to: string; subject: string; html: string; text: string; urlBaja: string }[],
): Promise<boolean> {
  const r = await fetch('https://api.resend.com/emails/batch', {
    method: 'POST',
    headers: { Authorization: `Bearer ${Deno.env.get('RESEND_API_KEY')}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(
      correos.map((c) => ({
        from: Deno.env.get('BOLETIN_DE'),
        to: [c.to],
        subject: c.subject,
        html: c.html,
        text: c.text,
        headers: {
          'List-Unsubscribe': `<${c.urlBaja}>`,
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        },
      })),
    ),
  })
  if (!r.ok) console.error(`boletin: resend ${r.status} — ${await r.text()}`)
  return r.ok
}

Deno.serve(async (req) => {
  const inicio = Date.now()
  if (req.method !== 'POST') return json({ error: 'peticion-invalida' }, 400)
  if (!(await autorizado(req.headers.get('Authorization') ?? '', Deno.env.get('BOLETIN_AUTH') ?? ''))) {
    return json({ error: 'no-autorizado' }, 401)
  }
  if (!Deno.env.get('RESEND_API_KEY') || !Deno.env.get('BOLETIN_DE') || !Deno.env.get('ANTHROPIC_API_KEY')) {
    return json({ error: 'sin-configurar' }, 503)
  }

  const cuerpo = (await req.json().catch(() => ({}))) as { prueba?: unknown; idioma?: unknown }
  const admin = clienteAdmin()
  const fecha = new Date().toISOString().slice(0, 10)
  const urlBase = `${Deno.env.get('SUPABASE_URL')}/functions/v1/boletin-baja?t=`

  const { data: filasAvisos } = await admin
    .from('boletin_avisos')
    .select('tipo, titulo, texto, url')
    .lte('desde', fecha)
    .gte('hasta', fecha)
    .order('id')
  const avisos = (filasAvisos ?? []) as Aviso[]
  const ediciones = new Map<string, Edicion>()
  const fallos: string[] = []

  const edicion = async (idioma: string): Promise<Edicion | null> => {
    if (ediciones.has(idioma)) return ediciones.get(idioma)!
    try {
      const e = await edicionDeHoy(admin, fecha, idioma, avisos)
      ediciones.set(idioma, e)
      return e
    } catch (err) {
      // Sin edición ese idioma no se manda hoy (mejor nada que un correo roto).
      fallos.push(`${idioma}: ${err instanceof Error ? err.message : err}`)
      return null
    }
  }

  // Envío de prueba: solo a esa dirección, con un enlace de baja que no toca a nadie.
  if (typeof cuerpo.prueba === 'string') {
    const idioma = typeof cuerpo.idioma === 'string' ? cuerpo.idioma : 'es'
    const e = await edicion(idioma)
    if (!e) return json({ error: 'edicion', fallos }, 500)
    const urlBaja = `${urlBase}00000000-0000-0000-0000-000000000000`
    const ok = await enviarLote([{ to: cuerpo.prueba, subject: e.asunto, urlBaja, ...armarCorreo(e, idioma, urlBaja) }])
    return json({ ok, asunto: e.asunto })
  }

  let enviados = 0
  const omitidos = new Set<string>()
  while (Date.now() - inicio < PRESUPUESTO_MS) {
    const { data, error } = await admin.rpc('boletin_destinatarios', { p_limite: TANDA_BD })
    if (error) return json({ error: 'bd', mensaje: error.message, enviados }, 500)
    const filas = ((data ?? []) as { user_id: string; correo: string; idioma: string; token: string }[]).filter(
      (f) => !omitidos.has(f.user_id),
    )
    if (!filas.length) break

    for (let i = 0; i < filas.length && Date.now() - inicio < PRESUPUESTO_MS; i += LOTE_RESEND) {
      const lote = filas.slice(i, i + LOTE_RESEND)
      const correos = []
      const uids: string[] = []
      for (const f of lote) {
        const e = await edicion(f.idioma)
        if (!e) {
          omitidos.add(f.user_id)
          continue
        }
        const urlBaja = urlBase + f.token
        correos.push({ to: f.correo, subject: e.asunto, urlBaja, ...armarCorreo(e, f.idioma, urlBaja) })
        uids.push(f.user_id)
      }
      if (!correos.length) continue
      if (!(await enviarLote(correos))) {
        // Resend caído o sin cupo: se para y la próxima pasada lo reintenta.
        return json({ error: 'resend', enviados, fallos }, 502)
      }
      await admin.from('boletin_suscripciones').update({ ultimo_envio: fecha }).in('user_id', uids)
      enviados += uids.length
      // Límite de Resend: 2 peticiones por segundo.
      await new Promise((r) => setTimeout(r, 600))
    }
  }

  return json({ enviados, idiomas: [...ediciones.keys()], fallos })
})
