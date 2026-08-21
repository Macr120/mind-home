/**
 * Genera con Gemini las fotos preguardadas de las recetas y dietas de ejemplo,
 * y también las portadas de las dos dietas del año demo (Pep@).
 *
 * Lee los ejemplos de `src/rooms/cocina/ejemplos.ts`, las dietas del demo de
 * `src/rooms/cocina/demo.recetas.data.ts` y los prompts de
 * `src/rooms/cocina/promptsFoto.ts` (los mismos que usa el botón «Generar con
 * IA» de la app), comprime cada imagen a WebP y la deja en `public/cocina/`. Al
 * terminar reescribe el manifiesto `src/rooms/cocina/imagenesPreset.ts`, que es
 * lo que la app consulta para saber qué ejemplos (y qué dietas del demo) traen
 * foto de fábrica.
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
const DEMO_RECETAS_TS = path.join(RAIZ, 'src', 'rooms', 'cocina', 'demo.recetas.data.ts')
const MANIFIESTO_TS = path.join(RAIZ, 'src', 'rooms', 'cocina', 'imagenesPreset.ts')

const MODELO = 'gemini-2.5-flash-image'
const CONCURRENCIA = 3
const REINTENTOS = 3
const ANCHO = 768

const args = process.argv.slice(2)
const flag = (n) => args.some((a) => a === `--${n}`)
const valor = (n) => args.find((a) => a.startsWith(`--${n}=`))?.split('=').slice(1).join('=')

// --- Ejemplos -------------------------------------------------------------

/**
 * Lee los ejemplos, los prompts y las dietas del año demo (Node ≥22 quita los
 * tipos). Cada item lleva TODOS los nombres bajo los que hay que registrarlo en
 * el manifiesto: los ejemplos de fábrica solo tienen uno, pero las dietas del
 * demo tienen dos (una foto sirve para el nombre en español y en inglés).
 */
async function leerEjemplos() {
  const datos = await import(pathToFileURL(EJEMPLOS_TS).href)
  const prompts = await import(pathToFileURL(PROMPTS_TS).href)
  const demo = await import(pathToFileURL(DEMO_RECETAS_TS).href)

  // Las dietas que Pep@ guarda en el año demo (`rooms/cocina/demo.ts`), NO las
  // de fábrica: se generan por separado porque el ES y el EN traen nombres
  // distintos para la MISMA foto (mismo índice en los dos arreglos paralelos).
  const dietasEs = demo.DEMO_COCINA_RECETAS.es.dietas
  const dietasEn = demo.DEMO_COCINA_RECETAS.en.dietas
  const dietasDemo = dietasEs.map((d, i) => ({
    tipo: 'dieta',
    nombres: [d.nombre, dietasEn[i].nombre],
    slug: `dieta-${datos.slugCocina(d.nombre)}`,
    prompt: prompts.promptDieta(d),
  }))

  return [
    ...datos.RECETAS_EJEMPLO.map((r) => ({
      tipo: 'receta',
      nombres: [r.nombre],
      clave: r.clave,
      slug: datos.slugCocina(r.nombre),
      prompt: prompts.promptReceta(r),
    })),
    ...datos.DIETAS_EJEMPLO.map((d) => ({
      tipo: 'dieta',
      nombres: [d.nombre],
      clave: d.clave,
      slug: `dieta-${datos.slugCocina(d.nombre)}`,
      prompt: prompts.promptDieta(d),
    })),
    ...dietasDemo,
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
  // Un item puede registrar más de un nombre (las dietas del demo: ES + EN
  // apuntando a la misma foto), así que cada uno aporta una o varias filas.
  const filas = (i) =>
    [...i.nombres, ...(i.clave ? [i.clave] : [])].map((n) => `  ${JSON.stringify(n)}: '${i.slug}',`)
  const recetas = items.filter((i) => i.tipo === 'receta' && enDisco.has(i.slug)).flatMap(filas).join('\n')
  const dietas = items.filter((i) => i.tipo === 'dieta' && enDisco.has(i.slug)).flatMap(filas).join('\n')
  writeFileSync(
    MANIFIESTO_TS,
    `/**
 * Fotos que la app ya trae de fábrica para las recetas y dietas de ejemplo, y
 * para las dos dietas del año demo (con su nombre en ES y en EN), por nombre.
 * Los archivos viven en \`public/cocina/\`.
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

/** La clave de siembra de la fila (\`seed-<prefijo>-<clave>\`), si es sembrada. */
const claveSeed = (uid: string | undefined, prefijo: string) =>
  uid?.startsWith(\`seed-\${prefijo}-\`) ? uid.slice(\`seed-\${prefijo}-\`.length) : undefined

/**
 * URL de la foto preguardada de una receta de ejemplo, o null si no trae.
 * Resuelve por la CLAVE del uid de siembra primero (la fila puede estar
 * traducida) y por nombre como respaldo (recetas del demo, ES/EN).
 */
export function urlImagenReceta(r: { nombre: string; uid?: string }): string | null {
  const clave = claveSeed(r.uid, 'recetas')
  return url((clave && RECETAS[clave]) || RECETAS[r.nombre])
}

/** URL de la portada preguardada de una dieta de ejemplo, o null si no trae. */
export function urlImagenDieta(d: { nombre: string; uid?: string }): string | null {
  const clave = claveSeed(d.uid, 'dietasGuardadas')
  return url((clave && DIETAS[clave]) || DIETAS[d.nombre])
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
  if (
    filtros.length &&
    !filtros.some((f) => i.slug.includes(f) || i.nombres.some((n) => n.toLowerCase().includes(f)))
  )
    return false
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
        console.log(`  [${hechas}/${pendientes.length}] ${item.nombres.join(' / ')} → ${item.slug}.webp`)
      } catch (e) {
        fallidos.push(item.nombres[0])
        console.warn(`  ✗ ${item.nombres[0]}: ${e.message}`)
      }
    }
  }),
)

console.log(`\nListas: ${hechas} · fallaron: ${fallidos.length} · peso: ${(bytes / 1024 / 1024).toFixed(1)} MB`)
if (fallidos.length) console.log('Fallaron:', fallidos.join(' | '))
escribirManifiesto(items)
