import { getIaKey } from './chat/ia'
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
 * OpenAI y Gemini generan imágenes, así que el proveedor se elige aparte del
 * proveedor de texto.
 *
 * Aquí vive lo genérico (proveedores, transporte y compresión); cada app pone
 * su propio PROMPT y decide dónde guarda el Blob resultante.
 */

export type ProveedorImagenId = 'openai' | 'gemini'

export interface ProveedorImagen {
  id: ProveedorImagenId
  nombre: string
  emoji: string
  modelo: string
  /** Proveedor de `ia.ts` del que se toma la API key (comparte clave con el chat). */
  keyProv: 'chatgpt' | 'gemini'
}

export const PROVEEDORES_IMAGEN: ProveedorImagen[] = [
  { id: 'openai', nombre: 'OpenAI', emoji: '🟢', modelo: 'gpt-image-1-mini', keyProv: 'chatgpt' },
  { id: 'gemini', nombre: 'Gemini', emoji: '♊', modelo: 'gemini-3.1-flash-lite-image', keyProv: 'gemini' },
]

/**
 * Proporción de la imagen. Los proveedores generan a un tamaño fijo y cobran
 * plano, así que pedir el aspecto correcto ahorra los píxeles que el recorte
 * tiraría (un fondo panorámico nace 16:9 en vez de recortarse de un cuadrado).
 */
export type AspectoImagen = '1:1' | '16:9' | '9:16' | '4:3' | '3:4'

const LS_PROV_IMG = 'mh.imgProveedor'

export function getProveedorImagen(): ProveedorImagen {
  const id = localStorage.getItem(LS_PROV_IMG) as ProveedorImagenId | null
  const elegido = PROVEEDORES_IMAGEN.find((p) => p.id === id)
  if (elegido) return elegido
  // Sin preferencia: el primero que tenga clave (prioriza OpenAI).
  return PROVEEDORES_IMAGEN.find((p) => getIaKey(p.keyProv).length > 0) ?? PROVEEDORES_IMAGEN[0]
}

/**
 * ¿Se puede generar imágenes ahora? Mismo criterio que `iaActiva()`: sin
 * transporte propio la superficie sigue viva mientras haya backend, porque al
 * pulsar sale el modal de recarga en vez de un error.
 */
export function imagenIaActiva(): boolean {
  if (!iaHabilitada()) return false
  if (usarViaCuenta()) return navigator.onLine // proxy con clave del servidor
  if (getIaKey(getProveedorImagen().keyProv).length > 0) return navigator.onLine
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

async function generarOpenAI(
  prompt: string,
  modelo: string,
  key: string,
  aspecto: AspectoImagen,
  referencia?: Blob,
): Promise<Blob> {
  const size = SIZE_OPENAI[aspecto]
  // Con foto de referencia se usa el endpoint de edición (multipart), no el de generación.
  const res = referencia
    ? await fetch('https://api.openai.com/v1/images/edits', {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}` },
        body: (() => {
          const fd = new FormData()
          fd.append('model', modelo)
          fd.append('prompt', prompt)
          fd.append('size', size)
          fd.append('quality', 'low')
          fd.append('image', new File([referencia], 'referencia.png', { type: referencia.type || 'image/png' }))
          return fd
        })(),
      })
    : await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
        // `low` basta: la imagen se reescala a 512–1024 px al guardarla.
        body: JSON.stringify({ model: modelo, prompt, n: 1, size, quality: 'low' }),
      })
  if (!res.ok) throw new Error(`OpenAI ${res.status}: ${(await res.text()).slice(0, 200)}`)
  const data = (await res.json()) as { data?: { b64_json?: string }[] }
  const b64 = data.data?.[0]?.b64_json
  if (!b64) throw new Error('OpenAI no devolvió imagen')
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
 * `calidad` decide proveedor Y precio: `rapida` (gpt-image-1-mini, 3 créditos) o
 * `buena` (Gemini, 10). Se lee UNA vez aquí y viaja con la petición, para que
 * cambiarla a mitad de un lote no re-precie lo ya encolado.
 *
 * Vía cuenta el respaldo entre proveedores lo resuelve la Edge Function; en
 * BYOK (desarrollo) la calidad elige el proveedor directamente, sin cadena.
 */
export async function generarImagen(
  prompt: string,
  max = 512,
  referencia?: Blob,
  aspecto: AspectoImagen = '1:1',
  calidad: CalidadImagen = leerCalidadImagen(),
): Promise<Blob> {
  // Sin cuenta con créditos ni clave propia no hay forma de pagar la imagen:
  // el modal de recarga es mejor respuesta que un error de red.
  if (!usarViaCuenta() && !getIaKey(getProveedorImagen().keyProv)) {
    useCuotaAgotada.getState().abrir()
    throw new ErrorIA('cuota-agotada', tGlobal('cuenta.creditos.faltan', 'Te quedaste sin créditos de IA.'))
  }
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
  // BYOK: la calidad manda sobre la preferencia guardada, para que el proveedor
  // coincida con el precio que se anunció.
  const preferido = PROVEEDORES_IMAGEN.find((p) => (calidad === 'buena' ? p.id === 'gemini' : p.id === 'openai'))
  const prov = preferido && getIaKey(preferido.keyProv) ? preferido : getProveedorImagen()
  const key = getIaKey(prov.keyProv)
  if (!key) throw new Error(`Falta la API key de ${prov.nombre}`)
  const blob =
    prov.id === 'openai'
      ? await generarOpenAI(prompt, prov.modelo, key, aspecto, ref)
      : await generarGemini(prompt, prov.modelo, key, aspecto, ref)
  useGastoByok.getState().sumar('imagen', costoImagenByok(prov.id))
  return comprimirImagen(blob, max)
}
