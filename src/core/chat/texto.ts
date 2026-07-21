/**
 * Utilidades de texto para lo que "dice" el asistente fuera del chat completo
 * (burbuja 3D y voz). No es un parser de markdown: cubre lo que suele devolver
 * la IA (negritas, cursivas, código, encabezados, enlaces, viñetas y citas).
 * El hilo de la conversación conserva siempre el texto original.
 */
export function limpiarMarkdown(texto: string): string {
  return texto
    .replace(/```[a-z]*\n?([\s\S]*?)```/gi, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/\*([^*\n]+)\*/g, '$1')
    .replace(/(^|\s)_([^_\n]+)_(?=\s|[.,;:!?]|$)/g, '$1$2')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/^\s*[-*+]\s+/gm, '• ')
    .replace(/^\s*>\s?/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

/** Quita emojis y pictogramas (para que la voz no los lea como "cara sonriente"). */
export function quitarEmojis(texto: string): string {
  return texto
    .replace(/\p{Extended_Pictographic}/gu, '')
    .replace(/[\u{FE0F}\u{200D}]/gu, '')
    .replace(/ {2,}/g, ' ')
    .trim()
}
