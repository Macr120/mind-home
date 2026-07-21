import type { CSSProperties } from 'react'

/**
 * Pasa un color de datos (color del cuarto, de categoría…) a la clase
 * `.texto-vivo` vía la variable `--c`: en oscuro se muestra tal cual y en
 * claro se entinta para ser legible (ver index.css).
 */
export const vivo = (color: string) => ({ '--c': color }) as CSSProperties
