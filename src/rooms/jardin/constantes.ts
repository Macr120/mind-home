export const COLOR_FABRICA = '#4ade80'
/**
 * Con el que se pinta la app: el color del CUARTO abierto (lo baja `RoomOverlay` en
 * `--ui-app`) y, fuera de él, el de fábrica. Es una variable CSS, no un hex: para
 * mezclarlo usa `color-mix`, no interpolación de alfa.
 */
export const COLOR = `var(--ui-app, ${COLOR_FABRICA})`

/** Escala del check-in emocional: índice + 1 = valor guardado (1–5). */
export const ANIMOS = ['😔', '😕', '😐', '🙂', '😊']
