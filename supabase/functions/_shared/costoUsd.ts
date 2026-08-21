/**
 * Costo REAL en USD de cada llamada, para el bucket de `uso_ia.usd`
 * (migración 20260815000002). El crédito solo tarifa la SALIDA; esto mide lo
 * que de verdad cobra el proveedor (entrada + salida + caché) y alimenta el
 * techo de `consumir_cuota_ia` (motivo 'techo').
 *
 * Tarifas por millón de tokens (docs/COSTOS.md § Precios de proveedor). La
 * escritura de caché se asume a 1.25× (TTL 5 min); con `IA_CHAT_TTL_TOOLS=1h`
 * sería 2× — se acepta el redondeo a la baja porque ese switch está apagado
 * por defecto y el bloque afectado es solo TOOLS_EDITOR.
 */

type Tarifa = { entrada: number; salida: number; cacheCrear: number; cacheLeer: number }

const TARIFAS: Record<string, Tarifa> = {
  'claude-haiku': { entrada: 1.0, salida: 5.0, cacheCrear: 1.25, cacheLeer: 0.1 },
  // Precio PLENO de Sonnet 5: el introductorio ($2/$10) vence el 31-ago-2026.
  'claude-sonnet': { entrada: 3.0, salida: 15.0, cacheCrear: 3.75, cacheLeer: 0.3 },
  'gemini-lite': { entrada: 0.25, salida: 1.5, cacheCrear: 0, cacheLeer: 0 },
  'gemini': { entrada: 0.3, salida: 2.5, cacheCrear: 0, cacheLeer: 0 },
  // OpenAI (ago 2026, verificado en developers.openai.com/api/docs/pricing).
  // NO cobra la escritura del caché —a diferencia de Anthropic, que pide
  // 1.25×— y la lectura sale a 0.1× de la entrada.
  'gpt-luna': { entrada: 0.2, salida: 1.2, cacheCrear: 0, cacheLeer: 0.02 },
  'gpt-mini': { entrada: 0.25, salida: 2.0, cacheCrear: 0, cacheLeer: 0.025 },
  'gpt-nano': { entrada: 0.05, salida: 0.4, cacheCrear: 0, cacheLeer: 0.005 },
}

function tarifaDe(modelo: string): Tarifa {
  if (modelo.startsWith('claude-sonnet')) return TARIFAS['claude-sonnet']
  if (modelo.startsWith('claude')) return TARIFAS['claude-haiku']
  // Ojo con el orden: la familia gpt se resuelve ANTES del `includes('lite')`
  // de Gemini. Un modelo gpt desconocido (el secreto `OPENAI_TEXT_MODEL` es
  // sobreescribible sin redeploy) se tarifa como `mini`, que es el escalón
  // caro de los tres baratos: el bucket prefiere pasarse a quedarse corto.
  if (modelo.startsWith('gpt')) {
    if (modelo.includes('luna')) return TARIFAS['gpt-luna']
    if (modelo.includes('nano')) return TARIFAS['gpt-nano']
    return TARIFAS['gpt-mini']
  }
  if (modelo.includes('lite')) return TARIFAS['gemini-lite']
  return TARIFAS['gemini']
}

/** USD de una llamada de texto a partir de sus tokens. */
export function costoTokensUsd(
  modelo: string,
  uso: { entrada: number; salida: number; cacheCrear?: number; cacheLeer?: number },
): number {
  const t = tarifaDe(modelo)
  return (
    (Math.max(uso.entrada, 0) * t.entrada +
      Math.max(uso.salida, 0) * t.salida +
      Math.max(uso.cacheCrear ?? 0, 0) * t.cacheCrear +
      Math.max(uso.cacheLeer ?? 0, 0) * t.cacheLeer) /
    1_000_000
  )
}

/**
 * Ops sin tokens: costo fijo por llamada. La imagen depende del PROVEEDOR
 * servido, no de la calidad pedida: el respaldo Gemini de la calidad rápida
 * cuesta $0.0336 cobrando 3 créditos — el bucket es quien acota esa pérdida.
 */
export const COSTO_FIJO = {
  imagenOpenai: 0.005, // gpt-image-1-mini low 1024²
  imagenGemini: 0.0336, // gemini-3.1-flash-lite-image, tamaño único 1K
  voz: 0.003, // whisper-1, tope 30 s
  vozGemini: 0.001, // gemini-flash-latest, 32 tok/s de audio a $1/1M → 30 s ≈ $0.00096
  tts: 0.015, // tts-1, tope 1000 caracteres
} as const

/**
 * TTS de Gemini: cobra el audio por TOKENS de salida (25 tok/s a $10/1M en
 * `gemini-2.5-flash-preview-tts`). Como devuelve PCM crudo, la duración se sabe
 * exacta —bytes / (rate × 2)— y no hay que estimarla por caracteres.
 */
export function costoTtsGeminiUsd(segundos: number): number {
  return (Math.max(segundos, 0) * 25 * 10) / 1_000_000
}
