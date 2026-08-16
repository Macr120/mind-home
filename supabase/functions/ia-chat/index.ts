/**
 * Proxy de chat IA con cuota por usuario, prompt caching y RESPALDO.
 *
 * Flujo: JWT → consumir_cuota_ia (cliente admin, emite RESERVA) → proveedor →
 * registrar tokens reales → responder. Si el proveedor falla, entra el
 * respaldo; si fallan los dos, la reserva autoriza devolver el crédito UNA
 * sola vez. Las RPCs de cuota son exclusivas de service_role
 * (20260803000001): el uid viaja como parámetro tras validar el JWT. Errores
 * tipados para el cliente: sin-sesion 401 · cuota-agotada 429 · proveedor 502
 * · peticion-invalida 400.
 *
 * El precio en créditos lo fija la OPERACIÓN (`op`), no el tamaño del texto que
 * mande el cliente: cada op trae su tope de `max_tokens` de SALIDA y el
 * servidor lo impone (ver TOPES), y la ENTRADA se acota con LIMITES (system,
 * nº/tamaño de mensajes, imagen). La tabla de precios vive en SQL
 * (`costo_op`); aquí solo se valida el nombre y se aplican los topes.
 *
 * Proveedores: Anthropic (principal) y Gemini (respaldo). El secreto
 * `IA_CHAT_GEMINI_PCT` manda ese % del tráfico rápido a Gemini de entrada para
 * medir su costo real en `uso_ia` (columnas *_gemini); con 0 (por defecto)
 * Gemini solo actúa como respaldo. El perfil `calidad` nunca se muestrea: su
 * geometría 3D depende del razonamiento afinado de Anthropic.
 *
 * Caching (solo Anthropic, GA, sin header beta): hasta 3 breakpoints
 * `cache_control` — la tool que el cliente marque con `cache: true` (fin del
 * bloque estático TOOLS_EDITOR, prefijo compartido entre TODOS los usuarios),
 * el system (tools+system por usuario) y el último mensaje (conversación
 * incremental). Bajo el mínimo cacheable del modelo el marcador es un no-op
 * sin costo. Gemini no lo replica: cachea de forma implícita, así que un
 * respaldo prolongado sale más caro de lo que modela docs/COSTOS.md.
 */
import { preflight, json, corsDe } from '../_shared/cors.ts'
import { clienteUsuario, clienteAdmin, usuarioDe } from '../_shared/auth.ts'
import { costoTokensUsd } from '../_shared/costoUsd.ts'

const MODELO = 'claude-haiku-4-5'
/**
 * Perfil `calidad`: modelo mayor con razonamiento adaptativo y esfuerzo bajo,
 * para las tareas donde el modelo rápido se queda corto (geometría 3D: con
 * Haiku el objeto sale como un bloque amorfo). Entre el precio por token y los
 * ~3k tokens de razonamiento sale ~10× un chat: consume la cuota como 'modelo3d'.
 */
const MODELO_CALIDAD = 'claude-sonnet-5'
const MODELO_GEMINI = Deno.env.get('GEMINI_TEXT_MODEL') ?? 'gemini-3.1-flash-lite'
const MODELO_GEMINI_CALIDAD = Deno.env.get('GEMINI_TEXT_MODEL_CALIDAD') ?? 'gemini-3.1-flash'
/** % del tráfico rápido que arranca en Gemini para medir su costo (0–100). */
const MUESTREO_GEMINI = Number(Deno.env.get('IA_CHAT_GEMINI_PCT') ?? '0')
const CACHE = { type: 'ephemeral' } as const
/**
 * TTL del bloque de tools (TOOLS_EDITOR, prefijo compartido entre TODOS los
 * usuarios). `IA_CHAT_TTL_TOOLS=1h` lo sube de 5 min a 1 hora sin redeploy:
 * la escritura cuesta 2× (vs 1.25×), así que solo conviene con tráfico global
 * sostenido pero espaciado >5 min — vigilar el hit-rate (docs/COSTOS.md) antes
 * de encenderlo. Es GA: no requiere header beta.
 */
const CACHE_TOOLS =
  Deno.env.get('IA_CHAT_TTL_TOOLS') === '1h' ? ({ type: 'ephemeral', ttl: '1h' } as const) : CACHE

/**
 * Tope de `max_tokens` por operación: es lo que hace honesta a la tabla de
 * precios. Las claves son las de `costo_op()` en SQL — si se agrega una op hay
 * que tocar los dos lados (y el espejo de `src/core/cuenta/costos.ts`).
 */
const TOPES: Record<string, number> = {
  // Menor que texto_largo A PROPÓSITO: chat cuesta 1 crédito y texto_largo 4;
  // con el mismo tope (4096) declarar 'chat' daba la misma salida al 25% del
  // precio. 2048 deja holgura para varios tool_use encadenados del editor.
  chat: 2048,
  texto: 1500, // apps: recetas, macros, charlas, resúmenes
  vision: 1500, // texto + imagen de entrada
  texto_largo: 4096, // planes IA, mapas conceptuales, tarjetas, efemérides
  modelo3d: 8192, // Sonnet 5 con razonamiento
  pdf: 1500, // chat con PDF adjunto (misma salida que vision; lo caro es la entrada)
}
const OP_POR_DEFECTO = 'chat'

/**
 * Límites de ENTRADA. La tarifa por op solo acota la SALIDA (max_tokens); la
 * entrada la paga la clave del servidor, así que sin estos topes un cliente
 * con 1 crédito podía mandar un contexto gigante y costar mucho más de lo
 * cobrado.
 *
 * Son la ÚNICA palanca que hace estructural el techo de COGS: la tarifa por
 * crédito no lo cierra por sí sola. Con los valores anteriores (30 × 20 000 +
 * system de 40 000) cabían ~160 000 tokens —unos $0.16 en Haiku— en una llamada
 * que cobra 1 crédito ($0.005). Estos lo dejan en ~60 000 (~$0.06).
 *
 * Medido sobre los llamadores reales antes de apretar: el chat de la casa manda
 * 12 mensajes (`ChatBox.tsx`) y su system ronda los 4 500 chars; las charlas de
 * Biblioteca e Idiomas mandan `historial.slice(-20)`, así que `mensajes` va a 24
 * y no a 20 — dejarlo justo en el máximo de un llamador real no deja margen para
 * que nadie amplíe esa ventana sin romper producción.
 */
const LIMITES = {
  system: 24_000, // chars (~6k tokens); el real más gordo son ~4.5k
  mensajes: 24, // las charlas de biblioteca/idiomas mandan 20
  texto: 10_000, // chars por mensaje (~2.5k tokens): cabe pegar un texto largo
  tools: 80, // TOOLS_EDITOR son ~56
  imagenB64: 3_000_000, // ~2.2 MB reales; el cliente comprime a 1280px JPEG
  // ~2 MB reales (≈30–40 páginas): cada página cuesta ~1.5–3k tokens de entrada,
  // así que este tope es el que mantiene la op `pdf` (4 créditos) dentro de COGS.
  pdfB64: 2_800_000,
} as const
const MIMES_IMAGEN = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])

/** Motivo del rechazo, o null si la petición cabe en los límites. */
function entradaInvalida(body: BodyIn, mensajes: MensajeIn[]): string | null {
  if ((body.system?.length ?? 0) > LIMITES.system) return 'System demasiado largo.'
  if (mensajes.length > LIMITES.mensajes) return 'Demasiados mensajes.'
  if ((body.tools?.length ?? 0) > LIMITES.tools) return 'Demasiadas tools.'
  for (const m of mensajes) {
    if (typeof m.texto !== 'string' || m.texto.length > LIMITES.texto) {
      return 'Mensaje demasiado largo.'
    }
    if (m.imagen) {
      if (typeof m.imagen.base64 !== 'string') return 'Imagen demasiado grande.'
      if (m.imagen.mediaType === 'application/pdf') {
        if (m.imagen.base64.length > LIMITES.pdfB64) return 'PDF demasiado grande.'
      } else {
        if (m.imagen.base64.length > LIMITES.imagenB64) return 'Imagen demasiado grande.'
        if (!MIMES_IMAGEN.has(m.imagen.mediaType)) return 'Formato de imagen no soportado.'
      }
    }
  }
  return null
}

interface MensajeIn {
  rol: 'usuario' | 'asistente'
  texto: string
  imagen?: { base64: string; mediaType: string }
}

interface ToolIn {
  name: string
  description: string
  schema: Record<string, unknown>
  cache?: boolean
}

interface BodyIn {
  system?: string
  mensajes?: MensajeIn[]
  tools?: ToolIn[]
  maxTokens?: number
  perfil?: 'rapido' | 'calidad'
  /** Operación que se cobra (ver TOPES). Desconocida o ausente → 'chat'. */
  op?: string
}

/** Lo que devuelve cualquier proveedor, ya normalizado. */
interface Salida {
  texto: string | null
  llamadas: { name: string; input: Record<string, unknown> }[]
  entrada: number
  salida: number
  cacheCrear: number
  cacheLeer: number
}

async function porAnthropic(
  body: BodyIn,
  mensajes: MensajeIn[],
  calidad: boolean,
  maxTokens: number,
): Promise<Salida> {
  const key = Deno.env.get('ANTHROPIC_API_KEY') ?? ''
  if (!key) throw new Error('sin clave')

  const contenido = (m: MensajeIn): string | Record<string, unknown>[] =>
    m.imagen
      ? [
          {
            type: m.imagen.mediaType === 'application/pdf' ? 'document' : 'image',
            source: { type: 'base64', media_type: m.imagen.mediaType, data: m.imagen.base64 },
          },
          { type: 'text', text: m.texto },
        ]
      : m.texto

  const messages = mensajes.map((m) => ({
    role: m.rol === 'usuario' ? 'user' : 'assistant',
    content: contenido(m),
  }))

  // Breakpoint de conversación: ancla el hilo completo para que el siguiente
  // turno lo relea del caché. Solo en multi-turno: un one-shot pagaría la
  // prima de escritura (1.25×) por un prefijo que jamás se vuelve a leer.
  if (mensajes.length >= 2) {
    const ult = messages[messages.length - 1]
    if (typeof ult.content === 'string') {
      ult.content = [{ type: 'text', text: ult.content, cache_control: CACHE }]
    } else {
      const fin = ult.content.length - 1
      ult.content[fin] = { ...ult.content[fin], cache_control: CACHE }
    }
  }

  const payload = {
    model: calidad ? MODELO_CALIDAD : MODELO,
    max_tokens: maxTokens,
    // Razonar antes de responder es lo que endereza la geometría 3D, pero el
    // esfuerzo va en `low`: medido en scripts/bench3d.mjs da ~10s por objeto
    // contra ~19s de `high` (hasta 40s) con la misma silueta y sin piezas
    // hundidas. El detalle extra se pide con el estilo 'detallado'.
    ...(calidad ? { thinking: { type: 'adaptive' }, output_config: { effort: 'low' } } : {}),
    // System como bloque para poder anclarlo: cachea tools+system juntos.
    system: body.system ? [{ type: 'text', text: body.system, cache_control: CACHE }] : undefined,
    messages,
    tools: body.tools?.length
      ? body.tools.map((t) => ({
          name: t.name,
          description: t.description,
          input_schema: t.schema,
          ...(t.cache ? { cache_control: CACHE_TOOLS } : {}),
        }))
      : undefined,
  }

  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    signal: AbortSignal.timeout(calidad ? 120_000 : 60_000),
    body: JSON.stringify(payload),
  })
  if (!resp.ok) throw new Error(`http ${resp.status}`)

  interface Bloque {
    type: string
    text?: string
    name?: string
    input?: Record<string, unknown>
  }
  const data = (await resp.json()) as {
    content?: Bloque[]
    usage?: {
      input_tokens?: number
      output_tokens?: number
      cache_creation_input_tokens?: number
      cache_read_input_tokens?: number
    }
  }
  const bloques = Array.isArray(data.content) ? data.content : []
  return {
    texto:
      bloques
        .filter((b) => b.type === 'text')
        .map((b) => b.text ?? '')
        .join('\n') || null,
    llamadas: bloques
      .filter((b) => b.type === 'tool_use' && b.name)
      .map((b) => ({ name: b.name ?? '', input: b.input ?? {} })),
    entrada: Number(data.usage?.input_tokens ?? 0),
    salida: Number(data.usage?.output_tokens ?? 0),
    cacheCrear: Number(data.usage?.cache_creation_input_tokens ?? 0),
    cacheLeer: Number(data.usage?.cache_read_input_tokens ?? 0),
  }
}

/**
 * Gemini solo acepta un subconjunto de JSON Schema y rechaza la petición
 * entera si aparece una clave que no conoce. Se copia lo que sí entiende.
 */
const CLAVES_SCHEMA = new Set([
  'type',
  'description',
  'enum',
  'items',
  'properties',
  'required',
  'nullable',
  'minimum',
  'maximum',
])

function limpiarSchema(valor: unknown): unknown {
  if (Array.isArray(valor)) return valor.map(limpiarSchema)
  if (!valor || typeof valor !== 'object') return valor
  const salida: Record<string, unknown> = {}
  for (const [clave, v] of Object.entries(valor as Record<string, unknown>)) {
    if (!CLAVES_SCHEMA.has(clave)) continue
    // Los nombres dentro de `properties` son campos del usuario, no palabras
    // del esquema: se conservan todos y se limpia su contenido.
    salida[clave] =
      clave === 'properties' && v && typeof v === 'object'
        ? Object.fromEntries(
            Object.entries(v as Record<string, unknown>).map(([n, s]) => [n, limpiarSchema(s)]),
          )
        : limpiarSchema(v)
  }
  return salida
}

async function porGemini(
  body: BodyIn,
  mensajes: MensajeIn[],
  calidad: boolean,
  maxTokens: number,
): Promise<Salida> {
  const key = Deno.env.get('GEMINI_API_KEY') ?? ''
  if (!key) throw new Error('sin clave')
  const modelo = calidad ? MODELO_GEMINI_CALIDAD : MODELO_GEMINI

  const contents = mensajes.map((m) => {
    const parts: Record<string, unknown>[] = []
    if (m.imagen) {
      parts.push({ inlineData: { mimeType: m.imagen.mediaType, data: m.imagen.base64 } })
    }
    // Gemini rechaza las partes de texto vacías.
    if (m.texto.trim()) parts.push({ text: m.texto })
    if (!parts.length) parts.push({ text: '.' })
    return { role: m.rol === 'usuario' ? 'user' : 'model', parts }
  })

  const resp = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent`,
    {
      method: 'POST',
      headers: { 'x-goog-api-key': key, 'content-type': 'application/json' },
      signal: AbortSignal.timeout(calidad ? 120_000 : 60_000),
      body: JSON.stringify({
        systemInstruction: body.system ? { parts: [{ text: body.system }] } : undefined,
        contents,
        tools: body.tools?.length
          ? [
              {
                functionDeclarations: body.tools.map((t) => ({
                  name: t.name,
                  description: t.description,
                  parameters: limpiarSchema(t.schema),
                })),
              },
            ]
          : undefined,
        generationConfig: { maxOutputTokens: maxTokens },
      }),
    },
  )
  if (!resp.ok) throw new Error(`http ${resp.status}`)

  interface Parte {
    text?: string
    functionCall?: { name?: string; args?: Record<string, unknown> }
  }
  const data = (await resp.json()) as {
    candidates?: { content?: { parts?: Parte[] } }[]
    usageMetadata?: {
      promptTokenCount?: number
      candidatesTokenCount?: number
      cachedContentTokenCount?: number
    }
  }
  const partes = data.candidates?.[0]?.content?.parts ?? []
  return {
    texto:
      partes
        .filter((p) => p.text)
        .map((p) => p.text ?? '')
        .join('\n') || null,
    llamadas: partes
      .filter((p) => p.functionCall?.name)
      .map((p) => ({ name: p.functionCall?.name ?? '', input: p.functionCall?.args ?? {} })),
    entrada: Number(data.usageMetadata?.promptTokenCount ?? 0),
    salida: Number(data.usageMetadata?.candidatesTokenCount ?? 0),
    cacheCrear: 0,
    // Caché implícito de Gemini: se informa como lectura para el hit-rate.
    cacheLeer: Number(data.usageMetadata?.cachedContentTokenCount ?? 0),
  }
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
  // Las RPCs de cuota son exclusivas de service_role (20260803000001): se
  // llaman con el cliente admin pasando el uid ya validado por el JWT.
  const admin = clienteAdmin()

  let body: BodyIn
  try {
    body = await req.json()
  } catch {
    return json({ error: 'peticion-invalida', mensaje: 'JSON inválido.' }, 400, cors)
  }
  const mensajes = Array.isArray(body.mensajes) ? body.mensajes : []
  if (!mensajes.length) {
    return json({ error: 'peticion-invalida', mensaje: 'Sin mensajes.' }, 400, cors)
  }
  const invalida = entradaInvalida(body, mensajes)
  if (invalida) return json({ error: 'peticion-invalida', mensaje: invalida }, 400, cors)

  const calidad = body.perfil === 'calidad'
  // El perfil `calidad` manda: cuesta lo que cuesta Sonnet 5 aunque el cliente
  // declare otra cosa. Una op desconocida cae al piso ('chat'), no a un error:
  // así un cliente viejo que aún no manda `op` sigue funcionando. Y un PDF
  // adjunto también manda: su entrada es la gorda, declare lo que declare el cliente.
  const conPdf = mensajes.some((m) => m.imagen?.mediaType === 'application/pdf')
  const op = calidad ? 'modelo3d' : conPdf ? 'pdf' : body.op && body.op in TOPES ? body.op : OP_POR_DEFECTO
  const maxTokens = Math.max(1, Math.min(TOPES[op], body.maxTokens ?? 1500))

  const { data: cuota, error: errCuota } = await admin.rpc('consumir_cuota_ia', {
    p_uid: usuario.id,
    p_tipo: op,
  })
  if (errCuota) {
    return json({ error: 'proveedor', mensaje: 'No se pudo verificar la cuota.' }, 502, cors)
  }
  if (!cuota?.permitido) {
    // 'sin-pro' ya no lo devuelve el SQL vigente; queda por si el proxy nuevo
    // corre contra una BD sin migrar durante la ventana de despliegue.
    if (cuota?.motivo === 'sin-pro') {
      return json({ error: 'sin-pro', mensaje: 'La IA es parte del plan Pro.' }, 403, cors)
    }
    if (cuota?.motivo === 'techo') {
      return json({ error: 'techo', mensaje: 'Alcanzaste el límite de uso del mes.' }, 429, cors)
    }
    return json({ error: 'cuota-agotada', mensaje: 'Te quedaste sin créditos de IA.' }, 429, cors)
  }

  // El muestreo solo reordena la cadena: el otro proveedor sigue de respaldo.
  const geminiPrimero = !calidad && MUESTREO_GEMINI > 0 && Math.random() * 100 < MUESTREO_GEMINI
  const cadena: ('anthropic' | 'gemini')[] = geminiPrimero
    ? ['gemini', 'anthropic']
    : ['anthropic', 'gemini']

  let salida: Salida | null = null
  let proveedor = ''
  const fallos: string[] = []
  for (const id of cadena) {
    try {
      salida =
        id === 'anthropic'
          ? await porAnthropic(body, mensajes, calidad, maxTokens)
          : await porGemini(body, mensajes, calidad, maxTokens)
      proveedor = id
      break
    } catch (e) {
      fallos.push(`${id}: ${e instanceof Error ? e.message : 'error'}`)
    }
  }

  if (!salida) {
    // La reserva emitida al cobrar es lo que autoriza la devolución (un solo uso).
    await admin.rpc('devolver_cuota_ia', { p_uid: usuario.id, p_tipo: op, p_reserva: cuota.reserva })
    console.error(`ia-chat: cadena agotada — ${fallos.join(' | ')}`)
    return json({ error: 'proveedor', mensaje: 'El proveedor de IA no respondió.' }, 502, cors)
  }
  if (fallos.length) console.warn(`ia-chat: respaldo ${proveedor} tras ${fallos.join(' | ')}`)

  const modeloServido =
    proveedor === 'anthropic'
      ? calidad
        ? MODELO_CALIDAD
        : MODELO
      : calidad
        ? MODELO_GEMINI_CALIDAD
        : MODELO_GEMINI
  await admin.rpc('registrar_uso_ia', {
    p_uid: usuario.id,
    p_entrada: salida.entrada,
    p_salida: salida.salida,
    p_cache_crear: salida.cacheCrear,
    p_cache_leer: salida.cacheLeer,
    p_proveedor: proveedor,
    p_tipo: op,
    p_usd: costoTokensUsd(modeloServido, salida),
  })

  return json(
    {
      texto: salida.texto,
      llamadas: salida.llamadas,
      proveedor,
      uso: {
        entrada: salida.entrada,
        salida: salida.salida,
        usadas: cuota.usadas,
        limite: cuota.limite,
        extra: cuota.extra ?? 0,
        costo: cuota.costo ?? 1,
      },
    },
    200,
    cors,
  )
})
