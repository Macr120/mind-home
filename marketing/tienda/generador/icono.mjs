// El icono de la app para el lockup de marca de las láminas.
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const AQUI = dirname(fileURLToPath(import.meta.url))

/**
 * El SVG de `public/icon.svg` tal cual — la misma fuente de la que salen los PNG
 * de las tiendas (`npm run app:iconos`). Se lee en vez de copiarse: hasta el
 * 17 sep 2026 había tres copias a mano del icono oliva y el renombre a MindHaOS
 * las dejó atrás sin que nadie lo notara.
 *
 * El `width`/`height` del propio SVG lo pisa el CSS de `.marca svg`.
 */
export const ICONO = readFileSync(resolve(AQUI, '..', '..', '..', 'public', 'icon.svg'), 'utf8')
