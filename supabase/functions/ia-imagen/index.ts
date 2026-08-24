/**
 * Proxy de generación de imágenes con cuota por usuario y CADENA de
 * proveedores: se intenta uno por uno hasta que alguno devuelve imagen.
 * Mismos errores tipados que ia-chat. Devuelve base64 + mime + proveedor.
 *
 * DOS CALIDADES, que el cliente elige en Configuraciones:
 * - `rapida` (por defecto) → gpt-image-1-mini, $0.005/imagen, op `imagen` = 3 créditos.
 * - `buena` → Gemini 3.1 Flash Lite Image, $0.0336/imagen, op `imagen_alta` = 10.
 * Cada una tiene su propio orden de cadena, así que el respaldo de una es el
 * principal de la otra. Ojo con el margen: si la calidad rápida cae a Gemini,
 * la imagen se sirve por más de lo que se cobró (ver docs/COSTOS.md).
 *
 * `prov` ('openai' | 'gemini') pone delante al proveedor que el usuario eligió
 * en el panel de IA; el resto de la cadena queda detrás como respaldo.
 *
 * La cuota se cobra UNA vez para toda la cadena (el usuario paga la imagen, no
 * los intentos) y se devuelve solo si fallan todos.
 *
 * Secretos: `IMG_CADENA_RAPIDA` / `IMG_CADENA_ALTA` (orden por calidad),
 * `GEMINI_API_KEY`, `GEMINI_IMAGE_MODEL`, `OPENAI_API_KEY`, `OPENAI_IMAGE_MODEL`,
 * `OPENAI_IMAGE_QUALITY`. Un proveedor sin clave se salta sin contar como fallo.
 */
import { preflight, json, corsDe } from '../_shared/cors.ts'
import { clienteUsuario, clienteAdmin, usuarioDe } from '../_shared/auth.ts'
import { COSTO_FIJO } from '../_shared/costoUsd.ts'

function cadena(valor: string | undefined, porDefecto: string): string[] {
  return (valor ?? porDefecto)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

/** La barata primero en `rapida`; la buena primero en `alta`. */
const CADENA_RAPIDA = cadena(Deno.env.get('IMG_CADENA_RAPIDA'), 'openai,gemini')
const CADENA_ALTA = cadena(Deno.env.get('IMG_CADENA_ALTA'), 'gemini,openai')

// gemini-2.5-flash-image se apagó: el lite genera a 1K con precio plano y es el
// más barato de la familia. Sobreescribible por secreto, sin redeploy.
const MODELO_GEMINI = Deno.env.get('GEMINI_IMAGE_MODEL') ?? 'gemini-3.1-flash-lite-image'
const MODELO_OPENAI = Deno.env.get('OPENAI_IMAGE_MODEL') ?? 'gpt-image-1-mini'
/** `low` basta: el cliente reescala a 512–1024 px de todos modos. */
const CALIDAD_OPENAI = Deno.env.get('OPENAI_IMAGE_QUALITY') ?? 'low'

/** Corta el intento para que el respaldo entre en vez de colgarse esperando. */
const TIMEOUT_MS = 60_000

/**
 * Límites de ENTRADA: el precio por op solo cubre la imagen generada; sin
 * estos topes un prompt o una referencia gigantes costarían más de lo cobrado.
 */
const MAX_PROMPT = 4_000 // chars
const MAX_REF_B64 = 3_000_000 // ~2.2 MB reales; el cliente comprime antes de subir
const MIMES_REF = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])

interface Imagen {
  base64: string
  mime: string
}

/** Aspectos que aceptan los dos proveedores; cualquier otro cae a cuadrado. */
const ASPECTOS = ['1:1', '16:9', '9:16', '4:3', '3:4'] as const
type Aspecto = (typeof ASPECTOS)[number]

const SIZE_OPENAI: Record<Aspecto, string> = {
  '1:1': '1024x1024',
  '16:9': '1536x1024',
  '4:3': '1536x1024',
  '9:16': '1024x1536',
  '3:4': '1024x1536',
}

function base64ABytes(b64: string): Uint8Array {
  const bin = atob(b64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return bytes
}

async function porGemini(prompt: string, ref: Imagen | null, aspecto: Aspecto): Promise<Imagen> {
  const key = Deno.env.get('GEMINI_API_KEY') ?? ''
  if (!key) throw new Error('sin clave')
  const resp = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODELO_GEMINI}:generateContent`,
    {
      method: 'POST',
      headers: { 'x-goog-api-key': key, 'content-type': 'application/json' },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      body: JSON.stringify({
        contents: [
          {
            parts: ref
              ? [{ text: prompt }, { inlineData: { mimeType: ref.mime, data: ref.base64 } }]
              : [{ text: prompt }],
          },
        ],
        generationConfig: {
          responseModalities: ['IMAGE'],
          // El modelo lite solo genera a 1K y cobra plano: pedir el aspecto
          // correcto evita pagar píxeles que luego se recortan.
          imageConfig: { aspectRatio: aspecto, imageSize: '1K' },
        },
      }),
    },
  )
  if (!resp.ok) throw new Error(`http ${resp.status}`)
  interface Parte {
    inlineData?: { data?: string; mimeType?: string }
  }
  const data = (await resp.json()) as { candidates?: { content?: { parts?: Parte[] } }[] }
  const img = (data.candidates?.[0]?.content?.parts ?? []).find((p) => p.inlineData?.data)?.inlineData
  if (!img?.data) throw new Error('sin imagen')
  return { base64: img.data, mime: img.mimeType || 'image/png' }
}

async function porOpenAI(prompt: string, ref: Imagen | null, aspecto: Aspecto): Promise<Imagen> {
  const key = Deno.env.get('OPENAI_API_KEY') ?? ''
  if (!key) throw new Error('sin clave')
  const size = SIZE_OPENAI[aspecto]
  // Con referencia se usa el endpoint de edición (multipart), no el de generación.
  const opciones: RequestInit = ref
    ? {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}` },
        body: (() => {
          const fd = new FormData()
          fd.append('model', MODELO_OPENAI)
          fd.append('prompt', prompt)
          fd.append('size', size)
          fd.append('quality', CALIDAD_OPENAI)
          const ext = ref.mime === 'image/webp' ? 'webp' : ref.mime === 'image/png' ? 'png' : 'jpg'
          fd.append('image', new File([base64ABytes(ref.base64)], `referencia.${ext}`, { type: ref.mime }))
          return fd
        })(),
      }
    : {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}`, 'content-type': 'application/json' },
        body: JSON.stringify({ model: MODELO_OPENAI, prompt, n: 1, size, quality: CALIDAD_OPENAI }),
      }
  const url = ref
    ? 'https://api.openai.com/v1/images/edits'
    : 'https://api.openai.com/v1/images/generations'
  const resp = await fetch(url, { ...opciones, signal: AbortSignal.timeout(TIMEOUT_MS) })
  if (!resp.ok) throw new Error(`http ${resp.status}`)
  const data = (await resp.json()) as { data?: { b64_json?: string }[] }
  const b64 = data.data?.[0]?.b64_json
  if (!b64) throw new Error('sin imagen')
  return { base64: b64, mime: 'image/png' }
}

const ADAPTADORES: Record<string, (p: string, r: Imagen | null, a: Aspecto) => Promise<Imagen>> = {
  gemini: porGemini,
  openai: porOpenAI,
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
  // Las RPCs de cuota son exclusivas de service_role (20260803000001).
  const admin = clienteAdmin()

  let prompt: string
  let aspecto: Aspecto = '1:1'
  /** Calidad elegida por el usuario; decide precio Y orden de la cadena. */
  let alta = false
  /** Foto de referencia opcional: el modelo parte de ella en vez de generar de cero. */
  let referencia: Imagen | null = null
  /** Proveedor preferido del usuario (fila «Imagen» del panel de IA en Créditos). */
  let preferido: 'openai' | 'gemini' | null = null
  try {
    const body = (await req.json()) as {
      prompt?: unknown
      imagen?: unknown
      aspecto?: unknown
      calidad?: unknown
      prov?: unknown
    }
    prompt = typeof body.prompt === 'string' ? body.prompt.trim() : ''
    if (ASPECTOS.includes(body.aspecto as Aspecto)) aspecto = body.aspecto as Aspecto
    // Un cliente viejo no manda `calidad`: cae en la rápida, que es la barata.
    if (body.calidad === 'buena') alta = true
    if (body.prov === 'openai' || body.prov === 'gemini') preferido = body.prov
    const img = body.imagen as { base64?: unknown; mime?: unknown } | undefined
    if (img && typeof img.base64 === 'string' && img.base64) {
      referencia = {
        base64: img.base64,
        mime: typeof img.mime === 'string' && img.mime ? img.mime : 'image/jpeg',
      }
    }
  } catch {
    return json({ error: 'peticion-invalida', mensaje: 'JSON inválido.' }, 400, cors)
  }
  if (!prompt) return json({ error: 'peticion-invalida', mensaje: 'Sin prompt.' }, 400, cors)
  if (prompt.length > MAX_PROMPT) {
    return json({ error: 'peticion-invalida', mensaje: 'Prompt demasiado largo.' }, 400, cors)
  }
  if (referencia) {
    if (referencia.base64.length > MAX_REF_B64) {
      return json({ error: 'peticion-invalida', mensaje: 'Imagen de referencia demasiado grande.' }, 400, cors)
    }
    if (!MIMES_REF.has(referencia.mime)) {
      return json({ error: 'peticion-invalida', mensaje: 'Formato de imagen no soportado.' }, 400, cors)
    }
  }

  const op = alta ? 'imagen_alta' : 'imagen'
  // La preferencia del usuario solo REORDENA: el otro proveedor sigue de
  // respaldo. Que elija el caro en la calidad rápida no rompe el margen: los
  // créditos siguen al gasto real (20260820000002), así que esa imagen se cobra
  // por lo que cuesta aunque su tarifa nominal diga 3.
  const base = alta ? CADENA_ALTA : CADENA_RAPIDA
  const CADENA = preferido ? [preferido, ...base.filter((id) => id !== preferido)] : base

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

  let imagen: Imagen | null = null
  let proveedor = ''
  const fallos: string[] = []
  for (const id of CADENA) {
    const adaptador = ADAPTADORES[id]
    if (!adaptador) continue
    try {
      imagen = await adaptador(prompt, referencia, aspecto)
      proveedor = id
      break
    } catch (e) {
      fallos.push(`${id}: ${e instanceof Error ? e.message : 'error'}`)
    }
  }

  if (!imagen) {
    // La reserva emitida al cobrar es lo que autoriza la devolución (un solo uso).
    await admin.rpc('devolver_cuota_ia', { p_uid: usuario.id, p_tipo: op, p_reserva: cuota.reserva })
    console.error(`ia-imagen: cadena agotada — ${fallos.join(' | ')}`)
    return json({ error: 'proveedor', mensaje: 'El proveedor de imágenes no respondió.' }, 502, cors)
  }
  // El respaldo funcionó: queda en el log para vigilar la salud del principal.
  // En calidad rápida, además, es la señal de que esa imagen se sirvió por
  // encima de lo cobrado (Gemini cuesta más que los 3 créditos que se pagaron).
  if (fallos.length) console.warn(`ia-imagen: respaldo ${proveedor} (${op}) tras ${fallos.join(' | ')}`)

  // Sin tokens que contar, pero sí la llamada y el proveedor: es lo que separa
  // el costo de Gemini del de OpenAI en `uso_ia_ops` (antes solo se podía
  // inferir del contador agregado `uso_ia.imagenes`).
  // Se completa aunque el cliente corte tras responder el proveedor (M4); fallback a await.
  // El `.then()` dispara la petición (el builder de `rpc` es perezoso) y saca el
  // error al log; ver la nota larga en `ia-chat/index.ts`.
  const registro = admin
    .rpc('registrar_uso_ia', {
      p_uid: usuario.id,
      p_entrada: 0,
      p_salida: 0,
      p_cache_crear: 0,
      p_cache_leer: 0,
      p_proveedor: proveedor,
      p_tipo: op,
      // Costo fijo por PROVEEDOR servido (no por calidad pedida): así el bucket
      // acota también la rápida servida por Gemini a pérdida.
      p_usd: proveedor === 'gemini' ? COSTO_FIJO.imagenGemini : COSTO_FIJO.imagenOpenai,
    })
    .then(({ error }) => {
      if (error) console.error('ia-imagen: registrar_uso_ia falló —', error.message)
    })
  if (typeof EdgeRuntime !== 'undefined') EdgeRuntime.waitUntil(registro)
  else await registro

  return json(
    {
      base64: imagen.base64,
      mime: imagen.mime,
      proveedor,
      uso: {
        usadas: cuota.usadas,
        limite: cuota.limite,
        extra: cuota.extra ?? 0,
        costo: cuota.costo,
      },
    },
    200,
    cors,
  )
})
