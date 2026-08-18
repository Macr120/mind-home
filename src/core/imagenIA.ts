import {
  getBase,
  getIaKey,
  getModelo,
  hayProveedorMedia,
  localHaceImagen,
  PROVEEDORES,
  type ProveedorMediaId,
} from './chat/ia'
import { iaHabilitada } from './edicion'
import { usarViaCuenta, iaImagenCuenta, ErrorIA } from './cuenta/api'
import { hayBackend } from './cuenta/supabase'
import { leerCalidadImagen, type CalidadImagen } from './cuenta/calidadImagen'
import { useGastoByok } from './cuenta/gastoByok'
import { costoImagenByok } from './cuenta/tarifasByok'
import { useCuotaAgotada } from './state/avisosPlanStore'
import { tGlobal } from './i18n/useT'

/**
 * Motor de generación de imágenes con IA, compartido por las apps.
 *
 * Mismo patrón que `chat/ia.ts`: llamada directa desde el navegador con la API
 * key del usuario (la que el chat guarda en localStorage vía `getIaKey`). Solo
 * OpenAI y Gemini generan imágenes (`ProveedorMediaId`), así que quien sirve la
 * imagen puede no ser el proveedor de texto — ver `proveedorImagen()`.
 *
 * Aquí vive lo genérico (proveedores, transporte y compresión); cada app pone
 * su propio PROMPT y decide dónde guarda el Blob resultante.
 */

/**
 * Quién puede generar imágenes en BYOK: los dos de siempre por internet, más
 * Ollama cuando el modelo elegido declara la capacidad `image` (los locales tipo
 * x/z-image-turbo o x/flux2-klein), que sirve la misma API que OpenAI.
 */
export type ProveedorImagenId = ProveedorMediaId | 'local'

/** Modelo de imagen por proveedor (la clave es la misma del chat). */
const MODELO_IMAGEN: Record<ProveedorMediaId, string> = {
  chatgpt: 'gpt-image-1-mini',
  gemini: 'gemini-3.1-flash-lite-image',
}

/**
 * Proporción de la imagen. Los proveedores generan a un tamaño fijo y cobran
 * plano, así que pedir el aspecto correcto ahorra los píxeles que el recorte
 * tiraría (un fondo panorámico nace 16:9 en vez de recortarse de un cuadrado).
 */
export type AspectoImagen = '1:1' | '16:9' | '9:16' | '4:3' | '3:4'

const LS_PROV_IMAGEN = 'mh.iaProvImagen'

/** Preferencia explícita del proveedor de imagen (fila «Imagen» del panel de IA). */
export function getProvImagen(): ProveedorImagenId | null {
  const id = localStorage.getItem(LS_PROV_IMAGEN)
  return id === 'chatgpt' || id === 'gemini' || id === 'local' ? id : null
}

export function setProvImagen(id: ProveedorImagenId) {
  localStorage.setItem(LS_PROV_IMAGEN, id)
}

/** ¿Ese proveedor puede generar imágenes ahora mismo? (clave puesta, o modelo local capaz). */
function listoParaImagen(id: ProveedorImagenId): boolean {
  return id === 'local' ? localHaceImagen() : getIaKey(id).length > 0
}

/**
 * ¿Quién genera la imagen en BYOK? La preferencia guardada manda mientras siga
 * siendo posible; sin preferencia, la calidad elige (rápida→OpenAI,
 * buena→Gemini) entre los que tengan clave, y Ollama queda de último recurso
 * (es gratis, pero solo si el modelo elegido genera imágenes).
 */
export function proveedorImagen(calidad: CalidadImagen = leerCalidadImagen()): ProveedorImagenId | null {
  const pref = getProvImagen()
  if (pref && listoParaImagen(pref)) return pref
  const orden: ProveedorImagenId[] =
    calidad === 'buena' ? ['gemini', 'chatgpt', 'local'] : ['chatgpt', 'gemini', 'local']
  return orden.find(listoParaImagen) ?? null
}

/**
 * ¿Se puede generar imágenes ahora? Mismo criterio que `iaActiva()`: sin
 * transporte propio la superficie sigue viva mientras haya backend, porque al
 * pulsar sale el modal de recarga en vez de un error.
 */
export function imagenIaActiva(): boolean {
  if (!iaHabilitada()) return false
  if (usarViaCuenta()) return navigator.onLine // proxy con clave del servidor
  if (localHaceImagen()) return true // Ollama es localhost: ni clave ni internet
  if (hayProveedorMedia()) return navigator.onLine
  return hayBackend() && navigator.onLine
}

/**
 * Formato de guardado: WebP pesa ~30% menos que JPEG a igual calidad, y estos
 * blobs viven en IndexedDB y viajan al Storage de la cuenta (el egress se
 * paga). Se resuelve una vez con un canvas de 1px.
 */
let formatoGuardado: string | null = null
function formatoSalida(): string {
  if (!formatoGuardado) {
    const c = document.createElement('canvas')
    c.width = c.height = 1
    formatoGuardado = c.toDataURL('image/webp').startsWith('data:image/webp')
      ? 'image/webp'
      : 'image/jpeg'
  }
  return formatoGuardado
}

/** Redimensiona una imagen a máx `max`px para guardarla como miniatura. */
export async function comprimirImagen(entrada: Blob, max = 512): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(entrada)
    const escala = Math.min(1, max / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bitmap.width * escala)
    canvas.height = Math.round(bitmap.height * escala)
    canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    bitmap.close()
    return await new Promise((res) => canvas.toBlob((b) => res(b ?? entrada), formatoSalida(), 0.82))
  } catch {
    return entrada // formato no soportado por canvas: se guarda tal cual
  }
}

function base64ABlob(b64: string, tipo = 'image/png'): Blob {
  const bin = atob(b64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return new Blob([bytes], { type: tipo })
}

/** Blob → base64 pelado (sin el prefijo `data:`), para mandarlo en el JSON del proveedor. */
export function blobABase64(blob: Blob): Promise<string> {
  return new Promise((res, rej) => {
    const fr = new FileReader()
    fr.onerror = () => rej(new Error('No se pudo leer la imagen'))
    fr.onload = () => res(String(fr.result).split(',')[1] ?? '')
    fr.readAsDataURL(blob)
  })
}

/** Tamaños que acepta OpenAI, por aspecto. */
const SIZE_OPENAI: Record<AspectoImagen, string> = {
  '1:1': '1024x1024',
  '16:9': '1536x1024',
  '4:3': '1536x1024',
  '9:16': '1024x1536',
  '3:4': '1024x1536',
}

/**
 * Endpoints `images/generations` y `images/edits` de OpenAI. Ollama sirve los
 * MISMOS para sus modelos de imagen, así que solo cambia la base (y allí se
 * omiten `size`/`quality`, que son propios de OpenAI, y la clave es opcional).
 */
async function generarOpenAI(
  prompt: string,
  modelo: string,
  key: string,
  aspecto: AspectoImagen,
  referencia?: Blob,
  base = 'https://api.openai.com/v1',
): Promise<Blob> {
  const esOpenAI = base.startsWith('https://api.openai.com')
  const size = SIZE_OPENAI[aspecto]
  const auth: Record<string, string> = key ? { Authorization: `Bearer ${key}` } : {}
  // Con foto de referencia se usa el endpoint de edición (multipart), no el de generación.
  const res = referencia
    ? await fetch(`${base}/images/edits`, {
        method: 'POST',
        headers: auth,
        body: (() => {
          const fd = new FormData()
          fd.append('model', modelo)
          fd.append('prompt', prompt)
          if (esOpenAI) {
            fd.append('size', size)
            fd.append('quality', 'low')
          }
          fd.append('image', new File([referencia], 'referencia.png', { type: referencia.type || 'image/png' }))
          return fd
        })(),
      })
    : await fetch(`${base}/images/generations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...auth },
        // `low` basta: la imagen se reescala a 512–1024 px al guardarla.
        body: JSON.stringify({ model: modelo, prompt, n: 1, ...(esOpenAI ? { size, quality: 'low' } : {}) }),
      })
  if (!res.ok) throw new Error(`${esOpenAI ? 'OpenAI' : 'Ollama'} ${res.status}: ${(await res.text()).slice(0, 200)}`)
  const data = (await res.json()) as { data?: { b64_json?: string }[] }
  const b64 = data.data?.[0]?.b64_json
  if (!b64) throw new Error('No devolvió imagen')
  return base64ABlob(b64)
}

async function generarGemini(
  prompt: string,
  modelo: string,
  key: string,
  aspecto: AspectoImagen,
  referencia?: Blob,
): Promise<Blob> {
  const partes: Record<string, unknown>[] = [{ text: prompt }]
  if (referencia) {
    partes.push({
      inlineData: {
        mimeType: referencia.type || 'image/png',
        data: await blobABase64(referencia),
      },
    })
  }
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent?key=${encodeURIComponent(key)}`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: partes }],
      generationConfig: {
        responseModalities: ['IMAGE'],
        imageConfig: { aspectRatio: aspecto, imageSize: '1K' },
      },
    }),
  })
  if (!res.ok) throw new Error(`Gemini ${res.status}: ${(await res.text()).slice(0, 200)}`)
  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { inlineData?: { data?: string; mimeType?: string } }[] } }[]
  }
  const parts = data.candidates?.[0]?.content?.parts ?? []
  const img = parts.find((p) => p.inlineData?.data)?.inlineData
  if (!img?.data) throw new Error('Gemini no devolvió imagen')
  return base64ABlob(img.data, img.mimeType || 'image/png')
}

/**
 * Genera una imagen a partir de un prompt y la devuelve ya comprimida. Con
 * `referencia` (una foto del usuario) el proveedor la toma como base en vez de
 * partir de cero. Lanza si falta la API key o el proveedor falla.
 *
 * `calidad` decide precio (y proveedor si no hay preferencia): `rapida`
 * (gpt-image-1-mini, 3 créditos) o `buena` (Gemini, 10). Se lee UNA vez aquí y
 * viaja con la petición, para que cambiarla a mitad de un lote no re-precie lo
 * ya encolado.
 *
 * Vía cuenta el respaldo entre proveedores lo resuelve la Edge Function; en
 * BYOK resuelve `proveedorImagen()` (preferencia del panel → calidad), sin cadena.
 */
export async function generarImagen(
  prompt: string,
  max = 512,
  referencia?: Blob,
  aspecto: AspectoImagen = '1:1',
  calidad: CalidadImagen = leerCalidadImagen(),
): Promise<Blob> {
  // La referencia viaja en el cuerpo de la petición: se reduce antes para no mandar megas.
  const ref = referencia ? await comprimirImagen(referencia, 768) : undefined
  // Vía cuenta: Edge Function con la clave del servidor y cuota.
  if (usarViaCuenta()) {
    const r = await iaImagenCuenta(
      prompt,
      ref ? { base64: await blobABase64(ref), mime: ref.type || 'image/jpeg' } : undefined,
      aspecto,
      calidad,
    )
    return comprimirImagen(base64ABlob(r.base64, r.mime), max)
  }
  // BYOK. Sin ningún proveedor de imagen con clave no hay forma de pagar:
  // el modal de recarga es mejor respuesta que un error de red.
  const provId = proveedorImagen(calidad)
  if (!provId) {
    useCuotaAgotada.getState().abrir()
    throw new ErrorIA('cuota-agotada', tGlobal('cuenta.creditos.faltan', 'Te quedaste sin créditos de IA.'))
  }
  const key = getIaKey(provId)
  let blob: Blob
  if (provId === 'local') {
    // Ollama: mismo protocolo que OpenAI contra el servidor del usuario, con el
    // modelo de imagen que él eligió como cerebro (x/z-image-turbo, flux…).
    const local = PROVEEDORES.find((p) => p.id === 'local') as (typeof PROVEEDORES)[number]
    blob = await generarOpenAI(prompt, getModelo(local), key, aspecto, ref, getBase(local))
  } else if (provId === 'chatgpt') {
    blob = await generarOpenAI(prompt, MODELO_IMAGEN.chatgpt, key, aspecto, ref)
  } else {
    blob = await generarGemini(prompt, MODELO_IMAGEN.gemini, key, aspecto, ref)
  }
  useGastoByok.getState().sumar('imagen', costoImagenByok(provId))
  return comprimirImagen(blob, max)
}
