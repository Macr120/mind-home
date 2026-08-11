import { usarViaCuenta } from './api'
import { leerCalidadImagen, type CalidadImagen } from './calidadImagen'

/** Operaciones que cobra el proxy. Mismos nombres que `costo_op()` en SQL. */
export type OpIA =
  | 'chat'
  | 'texto'
  | 'texto_largo'
  | 'vision'
  | 'modelo3d'
  | 'imagen'
  | 'imagen_alta'
  | 'voz'
  | 'tts'

/**
 * Lo que cuesta cada operación en créditos. ESPEJO de `costo_op()` (migraciones
 * 20260802000001, 20260802000002 y 20260802000003): quien cobra es el servidor;
 * esto solo sirve para decirle el precio al usuario ANTES de pedir. Si cambia
 * allá, cambia aquí.
 *
 * Ancla: 1 crédito ≈ $0.005 USD de costo real. Lo que separa las tarifas de
 * texto es la SALIDA, que en Haiku 4.5 cuesta 5× la entrada: un plan de metas de
 * 3000 tokens no puede valer lo mismo que un latido de 100. Y `modelo3d` corre
 * en Sonnet 5 con razonamiento, que sale ~10× un chat. La deriva completa y la
 * tabla por cuarto: docs/COSTOS.md.
 */
export const CREDITOS: Record<OpIA, number> = {
  chat: 1,
  texto: 1,
  vision: 1,
  texto_largo: 4, // medido: $0.0225 el plan IA (4.5 créditos), $0.004–0.010 las formas cortas
  modelo3d: 10,
  imagen: 3, // gpt-image-1-mini low (~$0.005) — calidad rápida, la de por defecto
  imagen_alta: 10, // Gemini 3.1 Flash Lite Image (~$0.0336) — calidad buena
  voz: 1, // Whisper (~$0.006/min, tope 30s de grabación) — dictado sin SpeechRecognition
  tts: 3, // OpenAI tts-1 (~$15/1M car., tope 1000 car.) — voz con IA del asistente
}

/** Salida máxima de una op `texto`; pedir más la convierte en `texto_largo`. */
export const TOPE_TEXTO = 1500

/** Créditos de una operación repetida `veces`. */
export function costoOp(op: OpIA, veces = 1): number {
  return CREDITOS[op] * veces
}

/** La op de imagen que se cobrará con la calidad dada (o la preferida). */
export function opImagen(calidad: CalidadImagen = leerCalidadImagen()): OpIA {
  return calidad === 'buena' ? 'imagen_alta' : 'imagen'
}

/**
 * Tarifa de una llamada de texto según lo que pida de salida. El proxy aplica el
 * mismo corte y ADEMÁS recorta `max_tokens` al tope de la op, así que pedir poco
 * para pagar menos solo consigue una respuesta más corta.
 */
export function opDeTexto(maxTokens: number): OpIA {
  return maxTokens > TOPE_TEXTO ? 'texto_largo' : 'texto'
}

/**
 * ¿Tiene sentido enseñar el precio? Solo con la IA por cuenta: en BYOK
 * (clave propia del navegador) no hay créditos que gastar.
 */
export function hayCreditos(): boolean {
  return usarViaCuenta()
}
