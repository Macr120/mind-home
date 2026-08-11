/**
 * Tarifas de los proveedores BYOK (clave propia del usuario), para estimar lo
 * que le cuesta CADA llamada en la cuenta real del proveedor — no tiene nada
 * que ver con los créditos de `costos.ts` (esos son de la vía cuenta/proxy).
 *
 * Precios verificados por búsqueda web (ago 2026) salvo donde se indica lo
 * contrario. Claude y los precios de imagen/audio ya estaban validados en
 * `docs/COSTOS.md`/`scripts/medir-costos.mjs`; se repiten aquí porque ese
 * script no es importable desde el cliente.
 */

/** USD por 1M tokens. Ollama (local) no entra: es gratis. */
export const TARIFA_TEXTO: Record<string, { entrada: number; salida: number }> = {
  'claude-haiku-4-5': { entrada: 1.0, salida: 5.0 },
  'claude-sonnet-5': { entrada: 3.0, salida: 15.0 },
  // Alias "latest": aproximado a Gemini 2.5 Flash (ago 2026). Puede desactualizarse
  // sin aviso si Google mueve el alias a otro modelo.
  'gemini-flash-latest': { entrada: 0.3, salida: 2.5 },
  'gpt-5-mini': { entrada: 0.25, salida: 2.0 },
  // DeepSeek retiró el nombre 'deepseek-chat' el 24-jul-2026; el sucesor
  // 'deepseek-v4-flash' (modo no-thinking) mantiene la misma tarifa.
  'deepseek-v4-flash': { entrada: 0.14, salida: 0.28 },
}

export interface UsoTexto {
  entrada: number
  salida: number
  /** Solo Claude: tokens de escritura/lectura de caché (multiplicadores propios). */
  cacheCrear?: number
  cacheLeer?: number
}

/** Costo en USD de una llamada de texto. Modelo sin tarifa (Ollama) → 0. */
export function costoTexto(modelo: string, uso: UsoTexto): number {
  const t = TARIFA_TEXTO[modelo]
  if (!t) return 0
  const cacheCrear = (uso.cacheCrear ?? 0) * t.entrada * 1.25 // TTL 5 min
  const cacheLeer = (uso.cacheLeer ?? 0) * t.entrada * 0.1
  return (uso.entrada * t.entrada + uso.salida * t.salida + cacheCrear + cacheLeer) / 1e6
}

const PRECIO_IMAGEN: Record<'openai' | 'gemini', number> = {
  openai: 0.005, // gpt-image-1-mini low
  gemini: 0.0336, // Gemini 3.1 Flash Lite Image
}

/** Costo fijo por imagen: ninguno de los dos proveedores devuelve tokens de uso. */
export function costoImagenByok(provId: 'openai' | 'gemini'): number {
  return PRECIO_IMAGEN[provId]
}

const PRECIO_TTS_1M_CAR = 15 // OpenAI tts-1

export function costoTts(caracteres: number): number {
  return (caracteres / 1e6) * PRECIO_TTS_1M_CAR
}

const PRECIO_WHISPER_MIN = 0.006

export function costoVoz(segundos: number): number {
  return (segundos / 60) * PRECIO_WHISPER_MIN
}
