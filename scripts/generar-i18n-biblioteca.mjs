/**
 * Emite las claves i18n del índice enciclopédico (`biblioteca/pilares.ts`)
 * para `dict.en.ts`: `biblioteca.nodo.<id>` (título) y `biblioteca.nodoDesc.<id>`
 * (descripción), con el TEXTO ESPAÑOL como valor. La sesión redacta el inglés
 * encima y pega el bloque; los otros 14 idiomas llegan por `sacar-dict`.
 *
 * Con `--faltantes` solo lista lo que aún no está en dict.en.ts (0 = completo).
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import path from 'node:path'

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const PILARES_TS = path.join(RAIZ, 'src', 'rooms', 'biblioteca', 'pilares.ts')
const DICT_EN = path.join(RAIZ, 'src', 'core', 'i18n', 'dict.en.ts')
const soloFaltantes = process.argv.includes('--faltantes')

const { PILARES } = await import(pathToFileURL(PILARES_TS).href)

const esc = (t) => t.replace(/\\/g, '\\\\').replace(/'/g, "\\'")
const claves = []
const ids = new Set()
const poner = (id, titulo, descripcion) => {
  if (ids.has(id)) {
    console.error(`Id repetido en pilares.ts: «${id}»`)
    process.exit(1)
  }
  ids.add(id)
  claves.push([`biblioteca.nodo.${id}`, titulo])
  if (descripcion) claves.push([`biblioteca.nodoDesc.${id}`, descripcion])
}
for (const p of PILARES) {
  poner(p.id, p.titulo, p.descripcion)
  for (const r of p.ramas) {
    poner(r.id, r.titulo, '')
    for (const t of r.temas) poner(t.id, t.titulo, t.descripcion)
  }
}

if (soloFaltantes) {
  const en = readFileSync(DICT_EN, 'utf8')
  const faltan = claves.filter(([k]) => !en.includes(`'${k}':`))
  for (const [k, v] of faltan) console.log(`  '${k}': '${esc(v)}',`)
  console.error(`${faltan.length} de ${claves.length} claves faltan en dict.en.ts`)
  process.exit(faltan.length ? 1 : 0)
}

console.log('  // ─── Índice enciclopédico de fábrica (pilares, ramas y temas por id) ───')
for (const [k, v] of claves) console.log(`  '${k}': '${esc(v)}',`)
console.error(`${claves.length} claves (${ids.size} nodos)`)
