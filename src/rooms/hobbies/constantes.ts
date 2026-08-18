/** El violeta del cuarto (mismo hex que el `color` de rooms/hobbies/index.tsx). */
export const COLOR_FABRICA = '#8b5cf6'
/**
 * Con el que se pinta la app: el color del CUARTO abierto (lo baja `RoomOverlay` en
 * `--ui-app`) y, fuera de él, el de fábrica. Es una variable CSS, no un hex: para
 * mezclarlo usa `color-mix`, no interpolación de alfa.
 */
export const COLOR = `var(--ui-app, ${COLOR_FABRICA})`
