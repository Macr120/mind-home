import type { ExpresionId } from '../house/apariencia'
import type { EventoTipo } from './mascotas'

/**
 * Reacciones emocionales del personaje al conversar (chat de la casa y Chat AR).
 * Aquí vive SOLO la lógica pura (catálogo, marcador de la IA y heurística);
 * nada de three/react: este módulo lo importa `ia.ts` y no debe arrastrar 3D al
 * chunk del chat. El estado efímero está en `state/emocionesStore.ts` y el
 * gesto corporal en `house/GestoEmocion.tsx`.
 */

export type EmocionId = 'felicidad' | 'enojo' | 'sorpresa' | 'aprobacion' | 'gusto' | 'tristeza'

export const EMOCIONES: Record<EmocionId, { emoji: string }> = {
  felicidad: { emoji: '😄' },
  enojo: { emoji: '😡' },
  sorpresa: { emoji: '😮' },
  aprobacion: { emoji: '👍' },
  gusto: { emoji: '🥰' },
  tristeza: { emoji: '😢' },
}

/** Expresión facial que acompaña a cada emoción (solo cuerpos con rostro dibujado). */
export const EXPRESION_DE_EMOCION: Record<EmocionId, ExpresionId> = {
  felicidad: 'feliz',
  enojo: 'enojado',
  sorpresa: 'sorpresa',
  aprobacion: 'guino',
  gusto: 'ternura',
  tristeza: 'triste',
}

/** Línea de system: la IA etiqueta su propia reacción sin gastar créditos extra. */
export const INSTRUCCION_EMOCION =
  'Termina SIEMPRE tu respuesta con un marcador [[emocion:x]] donde x es una de: felicidad, enojo, sorpresa, ' +
  'aprobacion, gusto, tristeza (sin acentos), la que mejor refleje tu reacción al mensaje del usuario. ' +
  'El marcador se quita antes de mostrar tu respuesta; no lo menciones ni lo expliques.'

// Tolerante a acentos, mayúsculas y posición (algunos modelos lo ponen al inicio).
const RE_MARCADOR = /\[\[\s*emoci[oó]n\s*:\s*([a-záéíóú]+)\s*\]\]/gi

const NORMALIZA: Record<string, EmocionId> = {
  felicidad: 'felicidad',
  enojo: 'enojo',
  sorpresa: 'sorpresa',
  aprobacion: 'aprobacion',
  aprobación: 'aprobacion',
  gusto: 'gusto',
  tristeza: 'tristeza',
}

/**
 * Quita el marcador `[[emocion:x]]` de la respuesta (esté donde esté) y devuelve
 * el texto limpio + la emoción; si el modelo no lo puso, cae a la heurística.
 */
export function extraerEmocion(texto: string): { texto: string; emocion: EmocionId | null } {
  let emocion: EmocionId | null = null
  const limpio = texto
    .replace(RE_MARCADOR, (_, id: string) => {
      emocion = NORMALIZA[id.toLowerCase()] ?? emocion
      return ''
    })
    .trim()
  return { texto: limpio, emocion: emocion ?? detectarEmocion(limpio) }
}

// Heurística por emojis (independiente del idioma): el orden importa, gana la primera señal.
const SENALES: [EmocionId, RegExp][] = [
  ['tristeza', /[😢😭😞😔💔😿]/u],
  ['enojo', /[😡😠💢]/u],
  ['sorpresa', /[😮😲😯🤯]/u],
  ['gusto', /[🥰😍❤💖]/u],
  ['felicidad', /[😄😃😀😁🎉🥳🙌]/u],
  ['aprobacion', /[👍✅✔💪😉]/u],
]

/** Emoción sugerida por el propio texto (emojis); null = sin señal, no reaccionar. */
export function detectarEmocion(texto: string): EmocionId | null {
  for (const [emocion, re] of SENALES) if (re.test(texto)) return emocion
  return null
}

/** Emoción con la que reacciona la capa sin IA (dispatcher/frases enlatadas) según el evento. */
export const EMOCION_POR_EVENTO: Record<EventoTipo, EmocionId> = {
  agregar: 'felicidad',
  quitar: 'sorpresa',
  capturado: 'aprobacion',
  clasificado: 'aprobacion',
  sinClasificar: 'tristeza',
  objeto: 'felicidad',
  recordado: 'gusto',
}
