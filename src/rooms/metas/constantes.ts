/** El rojo del cuarto de Metas: el mismo con el que el HUD marca lo que te propusiste. */
export const COLOR_FABRICA = '#ef4444'
/**
 * Con el que se pinta la app: el color del CUARTO abierto (lo baja `RoomOverlay` en
 * `--ui-app`) y, fuera de él, el de fábrica. Es una variable CSS, no un hex: para
 * mezclarlo usa `color-mix`, no interpolación de alfa.
 */
export const COLOR = `var(--ui-app, ${COLOR_FABRICA})`
/**
 * Lo PROPUESTO (los planes que la IA todavía no ha pasado al cronograma). Se
 * distingue de una meta tuya sin salirse del color del cuarto: es el mismo tono
 * aclarado, como ya hace `colorPorProfundidad` con las sub-metas. Antes era un
 * violeta fijo repetido en nueve archivos, así que era la única parte de la app
 * que no se enteraba si repintabas el cuarto.
 *
 * La MEZCLA vive en `index.css` (`--color-plan`, dentro de `@theme`) para que
 * Tailwind genere también `text-plan/80`, `bg-plan/15` y compañía; aquí solo se
 * lee, y así no hay dos definiciones que se puedan separar.
 */
export const COLOR_PLAN = 'var(--color-plan)'
