/**
 * Saca los logos SVG de la sección de IA de la web (`web/index.html`, #ia) y
 * escribe `src/core/ui/queEs/logos.ts`, que usa el recorrido «¿Qué es Mind
 * Planner Home?» dentro de la app.
 *
 * Se generan en vez de copiarse a mano: son paths largos y una errata no se
 * vería hasta pintarlos. Al cambiar un logo en la web, volver a correr:
 *
 *   node scripts/generar-logos-ia.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const html = readFileSync(path.join(RAIZ, 'web', 'index.html'), 'utf8')

// Cada <li> de .logos-ia es «<svg …>…</svg>Nombre».
const listas = [...html.matchAll(/<ul class="logos-ia">([\s\S]*?)<\/ul>/g)].map((m) => m[1])
if (listas.length !== 2) throw new Error(`esperaba 2 listas de logos, hay ${listas.length}`)

const items = (bloque) =>
  [...bloque.matchAll(/<li>\s*<svg class="logo-ia"[^>]*>([\s\S]*?)<\/svg>([^<]+)<\/li>/g)].map((m) => ({
    d: m[1].match(/ d="([^"]+)"/)[1],
    nombre: m[2].trim(),
  }))

const nube = items(listas[0])
const local = items(listas[1])
// El logo de Ollama va en el <h3> de la vía local, no en la lista.
const ollama = html.match(/<svg class="logo-ia grande"[^>]*><path d="([^"]+)"/)[1]

const linea = ({ d, nombre }) => `  { nombre: '${nombre}', d: '${d}' },`

const salida = `/**
 * Logos de los proveedores y modelos de IA, los mismos que pinta la web
 * (\`web/index.html\`, sección #ia). Son MARCAS, no iconos de interfaz: van en
 * SVG en línea y NO por el catálogo \`<Icono>\`, igual que los de Google y Apple
 * en el formulario de acceso.
 *
 * GENERADO por \`scripts/generar-logos-ia.mjs\`: no editar a mano.
 */

export interface Logo {
  nombre: string
  d: string
}

/** Los tres proveedores de nube que la casa sabe usar. */
export const LOGOS_NUBE: Logo[] = [
${nube.map(linea).join('\n')}
]

/** Modelos que corren en tu máquina con Ollama. */
export const LOGOS_LOCAL: Logo[] = [
${local.map(linea).join('\n')}
]

/** La llama de Ollama, que encabeza la vía local. */
export const LOGO_OLLAMA =
  '${ollama}'
`

writeFileSync(path.join(RAIZ, 'src', 'core', 'ui', 'queEs', 'logos.ts'), salida)
console.log(`nube: ${nube.map((l) => l.nombre).join(', ')}`)
console.log(`local: ${local.map((l) => l.nombre).join(', ')}`)
