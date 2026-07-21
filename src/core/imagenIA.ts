import { getIaKey } from './chat/ia'
import { iaHabilitada } from './edicion'
import { usarViaCuenta, iaImagenCuenta } from './cuenta/api'

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
  { id: 'openai', nombre: 'OpenAI', emoji: '🟢', modelo: 'gpt-image-1', keyProv: 'chatgpt' },
  { id: 'gemini', nombre: 'Gemini', emoji: '♊', modelo: 'gemini-2.5-flash-image', keyProv: 'gemini' },
]

const LS_PROV_IMG = 'mh.imgProveedor'

export function getProveedorImagen(): ProveedorImagen {
  const id = localStorage.getItem(LS_PROV_IMG) as ProveedorImagenId | null
  const elegido = PROVEEDORES_IMAGEN.find((p) => p.id === id)
  if (elegido) return elegido
  // Sin preferencia: el primero que tenga clave (prioriza OpenAI).
  return PROVEEDORES_IMAGEN.find((p) => getIaKey(p.keyProv).length > 0) ?? PROVEEDORES_IMAGEN[0]
}

export function setProveedorImagen(id: ProveedorImagenId) {
  localStorage.setItem(LS_PROV_IMG, id)
}

/** ¿Se puede generar imágenes ahora con el proveedor elegido? */
export function imagenIaActiva(): boolean {
  if (!iaHabilitada()) return false // Gratis: la IA es exclusiva de Pro
  if (usarViaCuenta()) return navigator.onLine // Pro: proxy con clave del servidor
  return getIaKey(getProveedorImagen().keyProv).length > 0 && navigator.onLine
}

/** Redimensiona una imagen a máx `max`px (JPEG) para guardarla como miniatura. */
export async function comprimirImagen(entrada: Blob, max = 512): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(entrada)
    const escala = Math.min(1, max / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bitmap.width * escala)
    canvas.height = Math.round(bitmap.height * escala)
    canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    bitmap.close()
    return await new Promise((res) => canvas.toBlob((b) => res(b ?? entrada), 'image/jpeg', 0.82))
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

async function generarOpenAI(prompt: string, modelo: string, key: string): Promise<Blob> {
  const res = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({ model: modelo, prompt, n: 1, size: '1024x1024' }),
  })
  if (!res.ok) throw new Error(`OpenAI ${res.status}: ${(await res.text()).slice(0, 200)}`)
  const data = (await res.json()) as { data?: { b64_json?: string }[] }
  const b64 = data.data?.[0]?.b64_json
  if (!b64) throw new Error('OpenAI no devolvió imagen')
  return base64ABlob(b64)
}

async function generarGemini(prompt: string, modelo: string, key: string): Promise<Blob> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent?key=${encodeURIComponent(key)}`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseModalities: ['IMAGE'] },
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
 * Genera una imagen a partir de un prompt con el proveedor elegido y la
 * devuelve ya comprimida. Lanza si falta la API key o el proveedor falla.
 */
export async function generarImagen(prompt: string, max = 512): Promise<Blob> {
  // Vía cuenta (Pro): Edge Function con la clave del servidor y cuota mensual.
  if (usarViaCuenta()) {
    const r = await iaImagenCuenta(prompt)
    return comprimirImagen(base64ABlob(r.base64, r.mime), max)
  }
  const prov = getProveedorImagen()
  const key = getIaKey(prov.keyProv)
  if (!key) throw new Error(`Falta la API key de ${prov.nombre}`)
  const blob =
    prov.id === 'openai'
      ? await generarOpenAI(prompt, prov.modelo, key)
      : await generarGemini(prompt, prov.modelo, key)
  return comprimirImagen(blob, max)
}
