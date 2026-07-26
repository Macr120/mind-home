/**
 * Genera con Gemini las fotos preguardadas de las recetas y dietas de ejemplo.
 *
 * Lee los ejemplos de `src/rooms/cocina/ejemplos.ts` y los prompts de
 * `src/rooms/cocina/promptsFoto.ts` (los mismos que usa el botón «Generar con
 * IA» de la app), comprime cada imagen a WebP y la deja en `public/cocina/`. Al
 * terminar reescribe el manifiesto `src/rooms/cocina/imagenesPreset.ts`, que es
 * lo que la app consulta para saber qué ejemplos traen foto de fábrica.
 *
 * La clave sale de `GEMINI_API_KEY` (variable de entorno o línea en `.env.local`,
 * que está fuera de git).
 *
 *   node scripts/generar-imagenes-cocina.mjs                  # solo las que faltan
 *   node scripts/generar-imagenes-cocina.mjs --solo=pizza
 *   node scripts/generar-imagenes-cocina.mjs --forzar --limite=3
 *   node scripts/generar-imagenes-cocina.mjs --manifiesto     # sin generar, solo el .ts
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import path from 'node:path'
import sharp from 'sharp'

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const DIR_IMG = path.join(RAIZ, 'public', 'cocina')
const EJEMPLOS_TS = path.join(RAIZ, 'src', 'rooms', 'cocina', 'ejemplos.ts')
const PROMPTS_TS = path.join(RAIZ, 'src', 'rooms', 'cocina', 'promptsFoto.ts')
const MANIFIESTO_TS = path.join(RAIZ, 'src', 'rooms', 'cocina', 'imagenesPreset.ts')

const MODELO = 'gemini-2.5-flash-image'
const CONCURRENCIA = 3
const REINTENTOS = 3
const ANCHO = 768

const args = process.argv.slice(2)
const flag = (n) => args.some((a) => a === `--${n}`)
const valor = (n) => args.find((a) => a.startsWith(`--${n}=`))?.split('=').slice(1).join('=')

// --- Ejemplos -------------------------------------------------------------

/** Lee los ejemplos y los prompts del propio .ts (Node ≥22 quita los tipos). */
async function leerEjemplos() {
  const datos = await import(pathToFileURL(EJEMPLOS_TS).href)
  const prompts = await import(pathToFileURL(PROMPTS_TS).href)
  return [
    ...datos.RECETAS_EJEMPLO.map((r) => ({
      tipo: 'receta',
      nombre: r.nombre,
      slug: datos.slugCocina(r.nombre),
      prompt: prompts.promptReceta(r),
    })),
    ...datos.DIETAS_EJEMPLO.map((d) => ({
      tipo: 'dieta',
      nombre: d.nombre,
      slug: `dieta-${datos.slugCocina(d.nombre)}`,
      prompt: prompts.promptDieta(d),
    })),
  ]
}

// --- Gemini ---------------------------------------------------------------

function apiKey() {
  if (process.env.GEMINI_API_KEY) return process.env.GEMINI_API_KEY
  const env = path.join(RAIZ, '.env.local')
  const linea = existsSync(env) && readFileSync(env, 'utf8').match(/^GEMINI_API_KEY=(.+)$/m)
  if (linea) return linea[1].trim().replace(/^["']|["']$/g, '')
  throw new Error('Falta GEMINI_API_KEY (ponla en .env.local o expórtala en la terminal)')
}

async function pedirImagen(texto, key) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODELO}:generateContent`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
    body: JSON.stringify({
      contents: [{ parts: [{ text: texto }] }],
      generationConfig: { responseModalities: ['IMAGE'] },
    }),
  })
  if (!res.ok) {
    const detalle = (await res.text()).slice(0, 300)
    const err = new Error(`Gemini ${res.status}: ${detalle}`)
    err.reintentable = res.status === 429 || res.status >= 500
    throw err
  }
  const data = await res.json()
  const partes = data.candidates?.[0]?.content?.parts ?? []
  const b64 = partes.find((p) => p.inlineData?.data)?.inlineData?.data
  if (!b64) throw new Error('Gemini no devolvió imagen')
  return Buffer.from(b64, 'base64')
}

const espera = (ms) => new Promise((r) => setTimeout(r, ms))

async function generarUna(item, key) {
  for (let intento = 1; ; intento++) {
    try {
      const png = await pedirImagen(item.prompt, key)
      const webp = await sharp(png)
        .resize(ANCHO, ANCHO, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 78 })
        .toBuffer()
      writeFileSync(path.join(DIR_IMG, `${item.slug}.webp`), webp)
      return webp.length
    } catch (e) {
      if (intento > REINTENTOS || (e.reintentable === false && intento > 1)) throw e
      await espera(1500 * intento * intento)
    }
  }
}

// --- Manifiesto -----------------------------------------------------------

/** Reescribe el .ts que la app importa, con las imágenes que hay ahora en disco. */
function escribirManifiesto(items) {
  const enDisco = new Set(
    existsSync(DIR_IMG) ? readdirSync(DIR_IMG).filter((f) => f.endsWith('.webp')).map((f) => f.slice(0, -5)) : [],
  )
  const fila = (i) => `  ${JSON.stringify(i.nombre)}: '${i.slug}',`
  const recetas = items.filter((i) => i.tipo === 'receta' && enDisco.has(i.slug)).map(fila).join('\n')
  const dietas = items.filter((i) => i.tipo === 'dieta' && enDisco.has(i.slug)).map(fila).join('\n')
  writeFileSync(
    MANIFIESTO_TS,
    `/**
 * Fotos que la app ya trae de fábrica para las recetas y dietas de ejemplo,
 * por nombre. Los archivos viven en \`public/cocina/\`.
 *
 * GENERADO por \`scripts/generar-imagenes-cocina.mjs\` — no lo edites a mano.
 */

const RECETAS: Record<string, string> = {
${recetas}
}

const DIETAS: Record<string, string> = {
${dietas}
}

const url = (slug: string | undefined) =>
  slug ? \`\${import.meta.env.BASE_URL}cocina/\${slug}.webp\` : null

/** URL de la foto preguardada de una receta de ejemplo, o null si no trae. */
export function urlImagenReceta(nombre: string): string | null {
  return url(RECETAS[nombre])
}

/** URL de la portada preguardada de una dieta de ejemplo, o null si no trae. */
export function urlImagenDieta(nombre: string): string | null {
  return url(DIETAS[nombre])
}
`,
    'utf8',
  )
  const n = (s) => (s ? s.split('\n').length : 0)
  console.log(`Manifiesto: ${n(recetas)} recetas + ${n(dietas)} dietas en imagenesPreset.ts`)
}

// --- Main -----------------------------------------------------------------

const items = await leerEjemplos()
mkdirSync(DIR_IMG, { recursive: true })

if (flag('manifiesto')) {
  escribirManifiesto(items)
  process.exit(0)
}

const filtros = (valor('solo')?.toLowerCase().split(',') ?? []).map((f) => f.trim()).filter(Boolean)
let pendientes = items.filter((i) => {
  if (filtros.length && !filtros.some((f) => i.slug.includes(f) || i.nombre.toLowerCase().includes(f))) return false
  return flag('forzar') || !existsSync(path.join(DIR_IMG, `${i.slug}.webp`))
})
const limite = Number(valor('limite') || 0)
if (limite > 0) pendientes = pendientes.slice(0, limite)

console.log(`Ejemplos: ${items.length} · a generar: ${pendientes.length}`)
if (pendientes.length === 0) {
  escribirManifiesto(items)
  process.exit(0)
}

const key = apiKey()
const fallidos = []
let hechas = 0
let bytes = 0

const cola = [...pendientes]
await Promise.all(
  Array.from({ length: CONCURRENCIA }, async () => {
    for (let item = cola.shift(); item; item = cola.shift()) {
      try {
        bytes += await generarUna(item, key)
        hechas++
        console.log(`  [${hechas}/${pendientes.length}] ${item.nombre} → ${item.slug}.webp`)
      } catch (e) {
        fallidos.push(item.nombre)
        console.warn(`  ✗ ${item.nombre}: ${e.message}`)
      }
    }
  }),
)

console.log(`\nListas: ${hechas} · fallaron: ${fallidos.length} · peso: ${(bytes / 1024 / 1024).toFixed(1)} MB`)
if (fallidos.length) console.log('Fallaron:', fallidos.join(' | '))
escribirManifiesto(items)
