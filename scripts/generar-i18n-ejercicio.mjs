/**
 * Emite el bloque de claves i18n del catálogo de Ejercicio para `dict.en.ts`.
 *
 * Lee los ejercicios de `catalogo.ts` y las rutinas de fábrica de `rutinas.ts`
 * (del propio .ts, como `generar-imagenes-ejercicios.mjs`) y saca a stdout las
 * claves `ejercicio.ej/ejDesc/ejTiempo/dificultad/rut/rutDesc.*` con el TEXTO
 * ESPAÑOL como valor. La sesión que lo corre redacta el inglés encima y pega el
 * bloque en `dict.en.ts` (tras `ejercicio.grupo.core`); los otros 14 idiomas
 * llegan por el flujo normal de `traducir-a-mano.mjs sacar-dict`.
 *
 * Con `--faltantes` compara contra `dict.en.ts` y solo lista las claves que aún
 * no están (0 líneas = cobertura completa; también valida que no haya slugs
 * repetidos, así que sirve de check en frío tras añadir ejercicios).
 *
 *   node scripts/generar-i18n-ejercicio.mjs              # bloque completo
 *   node scripts/generar-i18n-ejercicio.mjs --faltantes  # solo lo que falta en dict.en.ts
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import path from 'node:path'

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const CATALOGO_TS = path.join(RAIZ, 'src', 'rooms', 'ejercicio', 'catalogo.ts')
const RUTINAS_TS = path.join(RAIZ, 'src', 'rooms', 'ejercicio', 'rutinas.ts')
const DICT_EN = path.join(RAIZ, 'src', 'core', 'i18n', 'dict.en.ts')

const soloFaltantes = process.argv.includes('--faltantes')

const cat = await import(pathToFileURL(CATALOGO_TS).href)
const { RUTINAS } = await import(pathToFileURL(RUTINAS_TS).href)
const { slugTexto } = cat

// ─── Ejercicios (deduplicados por nombre entre modalidades) ────────────────
const ejercicios = new Map()
for (const grupos of [cat.CATALOGO_FUERZA, cat.CATALOGO_CARDIO, cat.CATALOGO_FLEX]) {
  for (const g of grupos) {
    for (const e of g.ejercicios) {
      if (!ejercicios.has(e.nombre)) ejercicios.set(e.nombre, e)
    }
  }
}

// Colisiones de slug = dos nombres distintos con la misma clave: abortar.
const porSlug = new Map()
for (const nombre of ejercicios.keys()) {
  const s = slugTexto(nombre)
  if (porSlug.has(s)) {
    console.error(`Slug repetido «${s}»: «${porSlug.get(s)}» y «${nombre}»`)
    process.exit(1)
  }
  porSlug.set(s, nombre)
}

const rutinas = [...RUTINAS.fuerza, ...RUTINAS.resistencia, ...RUTINAS.flexibilidad]
for (const r of rutinas) {
  const s = slugTexto(r.nombre)
  // Las rutinas viven en su propio prefijo: solo chocan entre ellas.
  const previa = rutinas.find((x) => x !== r && slugTexto(x.nombre) === s)
  if (previa) {
    console.error(`Slug de rutina repetido «${s}»: «${previa.nombre}» y «${r.nombre}»`)
    process.exit(1)
  }
}

// ─── Claves ────────────────────────────────────────────────────────────────
const esc = (t) => t.replace(/\\/g, '\\\\').replace(/'/g, "\\'")
const claves = []
const poner = (clave, texto) => claves.push([clave, texto])

for (const [nombre, e] of ejercicios) {
  poner(`ejercicio.ej.${slugTexto(nombre)}`, nombre)
}
for (const [nombre, e] of ejercicios) {
  if (e.descripcion) poner(`ejercicio.ejDesc.${slugTexto(nombre)}`, e.descripcion)
}
for (const [nombre, e] of ejercicios) {
  if (e.tiempo) poner(`ejercicio.ejTiempo.${slugTexto(nombre)}`, e.tiempo)
}
poner('ejercicio.dificultad.baja', 'Baja')
poner('ejercicio.dificultad.media', 'Media')
poner('ejercicio.dificultad.alta', 'Alta')
poner('ejercicio.dificultad.mediaAlta', 'Media / Alta')
for (const r of rutinas) poner(`ejercicio.rut.${slugTexto(r.nombre)}`, r.nombre)
for (const r of rutinas) poner(`ejercicio.rutDesc.${slugTexto(r.nombre)}`, r.descripcion)

if (soloFaltantes) {
  const en = readFileSync(DICT_EN, 'utf8')
  const faltan = claves.filter(([k]) => !en.includes(`'${k}':`))
  for (const [k, v] of faltan) console.log(`  '${k}': '${esc(v)}',`)
  console.error(`${faltan.length} de ${claves.length} claves faltan en dict.en.ts`)
  process.exit(faltan.length ? 1 : 0)
}

console.log('  // ─── Catálogo de ejercicios y rutinas de fábrica (por slug de su nombre español) ───')
for (const [k, v] of claves) console.log(`  '${k}': '${esc(v)}',`)
console.error(`${claves.length} claves (${ejercicios.size} ejercicios, ${rutinas.length} rutinas)`)
