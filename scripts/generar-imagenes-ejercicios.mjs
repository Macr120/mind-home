/**
 * Genera con Gemini las ilustraciones preguardadas del catálogo de Ejercicio.
 *
 * Lee los ejercicios de `src/rooms/ejercicio/catalogo.ts`, pide una imagen por
 * ejercicio, la comprime a WebP y la deja en `public/ejercicios/`. Al terminar
 * reescribe el manifiesto `src/rooms/ejercicio/imagenesPreset.ts`, que es lo que
 * la app consulta para saber qué ejercicios ya traen imagen de fábrica.
 *
 * La clave sale de `GEMINI_API_KEY` (variable de entorno o línea en `.env.local`,
 * que está fuera de git).
 *
 *   node scripts/generar-imagenes-ejercicios.mjs                 # solo los que faltan
 *   node scripts/generar-imagenes-ejercicios.mjs --solo=sentadilla
 *   node scripts/generar-imagenes-ejercicios.mjs --forzar --limite=5
 *   node scripts/generar-imagenes-ejercicios.mjs --manifiesto    # sin generar, solo el .ts
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import path from 'node:path'
import sharp from 'sharp'

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const DIR_IMG = path.join(RAIZ, 'public', 'ejercicios')
const CATALOGO_TS = path.join(RAIZ, 'src', 'rooms', 'ejercicio', 'catalogo.ts')
const MANIFIESTO_TS = path.join(RAIZ, 'src', 'rooms', 'ejercicio', 'imagenesPreset.ts')

const MODELO = 'gemini-2.5-flash-image'
const CONCURRENCIA = 3
const REINTENTOS = 3
const ANCHO = 512

const args = process.argv.slice(2)
const flag = (n) => args.some((a) => a === `--${n}`)
const valor = (n) => args.find((a) => a.startsWith(`--${n}=`))?.split('=').slice(1).join('=')

// --- Catálogo -------------------------------------------------------------

/** Igual que `normalizarEjercicio` de la app: la clave con la que se busca la imagen. */
const claveEjercicio = (nombre) => nombre.trim().toLowerCase()

/** Nombre de archivo ASCII y estable a partir del nombre del ejercicio. */
const slug = (nombre) =>
  nombre
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-+|-+$)/g, '')

/** Lee el catálogo del propio .ts (Node ≥22 quita los tipos) para no duplicar la lista. */
async function leerCatalogo() {
  const mod = await import(pathToFileURL(CATALOGO_TS).href)
  const ejercicios = new Map()
  for (const grupos of [mod.CATALOGO_FUERZA, mod.CATALOGO_CARDIO, mod.CATALOGO_FLEX]) {
    for (const g of grupos) {
      for (const e of g.ejercicios) {
        const clave = claveEjercicio(e.nombre)
        if (!ejercicios.has(clave)) ejercicios.set(clave, { ...e, clave, slug: slug(e.nombre) })
      }
    }
  }
  const porSlug = new Map()
  for (const e of ejercicios.values()) {
    if (porSlug.has(e.slug)) throw new Error(`Slug repetido «${e.slug}»: ${porSlug.get(e.slug)} y ${e.nombre}`)
    porSlug.set(e.slug, e.nombre)
  }
  return [...ejercicios.values()]
}

// --- Gemini ---------------------------------------------------------------

function apiKey() {
  if (process.env.GEMINI_API_KEY) return process.env.GEMINI_API_KEY
  const env = path.join(RAIZ, '.env.local')
  const linea = existsSync(env) && readFileSync(env, 'utf8').match(/^GEMINI_API_KEY=(.+)$/m)
  if (linea) return linea[1].trim().replace(/^["']|["']$/g, '')
  throw new Error('Falta GEMINI_API_KEY (ponla en .env.local o expórtala en la terminal)')
}

/**
 * Nombre técnico en inglés de los ejercicios donde el modelo dibujó otro
 * movimiento (o se lo tomó al pie de la letra, como el «arquero» con arco y
 * flecha). Solo hacen falta para estos: el resto sale bien con la descripción.
 */
const PISTAS = {
  'abducción de cadera': 'seated hip abduction machine: sitting, knees pushing outward against the pads',
  'aperturas con mancuernas': 'dumbbell chest fly: lying on a flat bench, arms opening wide in an arc with elbows slightly bent',
  básquetbol: 'playing basketball on a court, dribbling the ball',
  caminata: 'a person walking calmly at a steady pace, side view, relaxed arms',
  'caminata inclinada': 'a person walking on a treadmill set to an incline, side view',
  'círculos de tobillo': 'seated with one leg lifted, rotating the ankle in circles',
  'curl con barra': 'standing barbell biceps curl',
  'curl concentrado': 'seated concentration curl: sitting on a bench, elbow braced on the inner thigh, curling one dumbbell',
  'curl femoral': 'lying leg curl machine: lying face down, heels curling toward the glutes',
  dominadas: 'pull-up: hanging from a horizontal bar, pulling the body up until the chin passes the bar',
  'elevación de talones unipodal': 'single leg calf raise: standing on one foot, heel lifted high',
  'elevaciones frontales': 'dumbbell front raise: standing, one dumbbell in each hand, arms completely straight with the elbows never bent, lifted forward in front of the body up to shoulder height, palms facing down',
  'elevaciones laterales': 'dumbbell lateral raise: both arms raised out to the sides at shoulder height',
  'estiramiento de aductores': 'seated straddle stretch: legs spread wide apart, torso leaning forward',
  'estiramiento de flexores': 'wrist flexor stretch: one arm extended straight in front at shoulder height with the palm facing forward and the fingers pointing up, the other hand gently pulling those fingers back toward the body',
  'estiramiento de pecho/pectoral': 'standing chest stretch seen from a three-quarter back angle: both hands clasped together behind the lower back, arms straight, shoulder blades squeezed together and chest open',
  'extensión de cuádriceps': 'leg extension machine: seated, knees extending to lift the padded lever',
  'extensión sobre cabeza': 'overhead triceps extension holding ONE dumbbell vertically with both hands BEHIND the head, elbows bent and pointing up to the ceiling, lowering the weight behind the neck',
  'extensión tríceps en polea': 'triceps pushdown on a cable machine: standing in front of a high pulley holding a straight bar, elbows pinned to the sides, pushing the bar down to the thighs',
  'figura 4': 'figure four stretch: lying on the back, one ankle crossed over the opposite knee, pulling the thigh toward the chest',
  'flexión de pie': 'standing forward fold: torso hanging down toward the legs, neck relaxed',
  'flexión y extensión en descarga': 'lying face up on the floor, one knee bending to slide the heel toward the buttock while the foot stays on the floor',
  'fondos en paralelas': 'triceps dip on parallel bars: the body hangs between two parallel bars with the feet off the ground and the elbows bent',
  'fondos entre bancos': 'bench dip: hands gripping the edge of a bench behind the body, hips off the bench, legs extended forward, elbows bending to lower the body',
  'hilo y aguja': 'thread the needle: on all fours, one arm threaded under the body, shoulder resting on the floor',
  'hip thrust': 'barbell hip thrust: the person is on the FLOOR with only the upper back leaning against the side of a bench, knees bent 90 degrees and feet flat on the floor, a barbell resting across the front of the hips, hips pushed up so the body is a straight line from knees to shoulders',
  'inclinación lateral de cuello': 'neck side stretch: head tilted so the ear approaches the shoulder, one hand gently pulling',
  'liberación miofascial con pelota': 'rolling a small hard ball under the arch of the foot',
  mariposa: 'butterfly stretch: seated, soles of the feet together, knees dropping out to the sides',
  'movilidad cervical': 'standing, slowly turning the head to one side, neck mobility',
  pájaros: 'bent over reverse dumbbell fly: torso bent forward, both arms opening out to the sides',
  'patada de tríceps': 'dumbbell triceps kickback: torso bent forward, upper arm parallel to the body, forearm extending back',
  'postura de la paloma': 'pigeon pose: front leg bent on the floor, back leg extended, torso lowering forward',
  'postura gato-vaca': 'cat-cow pose: a single figure on all fours with the back arched upward',
  rana: 'frog stretch: on hands and knees with the knees spread wide apart and the hips pushed backward',
  'respiración profunda': 'standing with one hand on the chest and one on the belly, breathing deeply with the eyes closed',
  'retracción escapular': 'seen from behind, squeezing the shoulder blades together with the elbows pulled back',
  'retracciones de barbilla (chin tucks)': 'chin tuck: seated upright, chin pulled straight back making a double chin, head level',
  'rotación externa con banda': 'band external rotation: elbows bent 90 degrees at the sides, forearms rotating outward against a resistance band',
  'rotaciones de columna': 'seated spinal twist: sitting, torso rotated to one side, hand on the opposite knee',
  'sentadilla frontal': 'front squat: the barbell rests across the front of the shoulders and collarbones with both elbows pointing forward and up and the torso vertical — the bar is NOT behind the neck',
  'sentadillas del arquero': 'cossack squat: legs wide apart, weight shifted over one bent knee while the other leg stays straight — no bow, no arrow',
  'torsión espinal': 'seated spinal twist on the floor, one knee crossed over, torso rotated',
  'trail running': 'running uphill on a mountain trail',
  'trote suave': 'a person jogging slowly at an easy relaxed pace, side view',
}

/**
 * Mismo estilo para las 162 para que el catálogo se vea de una pieza; si cambias
 * esto, cambia también `promptEjercicio` de `rooms/ejercicio/imagenIA.ts` (el que
 * usa el botón «Generar con IA» de la app).
 */
function prompt(nombre, descripcion) {
  const pista = PISTAS[claveEjercicio(nombre)]
  return [
    `Ilustración vectorial plana y minimalista de una persona demostrando el ejercicio «${nombre}».`,
    descripcion ? `Técnica: ${descripcion}` : '',
    pista ? `El movimiento es exactamente: ${pista}.` : '',
    'Una sola figura de cuerpo completo, centrada y con la postura anatómicamente correcta,',
    'trazo limpio y amigable, colores planos y suaves,',
    'fondo blanco liso sin formas ni círculos decorativos, sin sombras duras.',
    'IMPORTANTE: es una ilustración suelta, no una lámina didáctica:',
    'la imagen no debe contener ninguna letra, palabra, título, rótulo, número ni marca de agua.',
  ]
    .filter(Boolean)
    .join(' ')
}

async function pedirImagen(texto, key) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODELO}:generateContent?key=${encodeURIComponent(key)}`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
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

async function generarUna(ej, key) {
  for (let intento = 1; ; intento++) {
    try {
      const png = await pedirImagen(prompt(ej.nombre, ej.descripcion), key)
      const webp = await sharp(png)
        .resize(ANCHO, ANCHO, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 78 })
        .toBuffer()
      writeFileSync(path.join(DIR_IMG, `${ej.slug}.webp`), webp)
      return webp.length
    } catch (e) {
      if (intento > REINTENTOS || (e.reintentable === false && intento > 1)) throw e
      await espera(1500 * intento * intento)
    }
  }
}

// --- Manifiesto -----------------------------------------------------------

/**
 * Nombres viejos que el catálogo renombró pero que siguen vivos en las rutinas
 * ya sembradas en la BD de la gente: comparten la imagen del nombre nuevo.
 */
const ALIAS = {
  'gato-vaca': 'postura gato-vaca',
  'retracción de barbilla': 'retracciones de barbilla (chin tucks)',
}

/** Reescribe el .ts que la app importa, con las imágenes que hay ahora en disco. */
async function escribirManifiesto(ejercicios) {
  const enDisco = new Set(
    existsSync(DIR_IMG) ? readdirSync(DIR_IMG).filter((f) => f.endsWith('.webp')).map((f) => f.slice(0, -5)) : [],
  )
  const porClave = new Map(ejercicios.filter((e) => enDisco.has(e.slug)).map((e) => [e.clave, e.slug]))
  for (const [viejo, nuevo] of Object.entries(ALIAS)) {
    const slug = porClave.get(nuevo)
    if (slug) porClave.set(viejo, slug)
  }
  const filas = [...porClave]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([clave, slug]) => `  ${JSON.stringify(clave)}: '${slug}',`)
    .join('\n')
  writeFileSync(
    MANIFIESTO_TS,
    `/**
 * Ilustraciones que la app ya trae de fábrica, por nombre normalizado del
 * ejercicio (\`normalizarEjercicio\`). Los archivos viven en \`public/ejercicios/\`.
 *
 * GENERADO por \`scripts/generar-imagenes-ejercicios.mjs\` — no lo edites a mano.
 */
import { normalizarEjercicio } from './stats'

const PRESET: Record<string, string> = {
${filas}
}

/** URL de la ilustración preguardada del ejercicio, o null si no trae. */
export function urlImagenPreset(nombre: string): string | null {
  const slug = PRESET[normalizarEjercicio(nombre)]
  return slug ? \`\${import.meta.env.BASE_URL}ejercicios/\${slug}.webp\` : null
}
`,
    'utf8',
  )
  console.log(`Manifiesto: ${filas ? filas.split('\n').length : 0} imágenes en imagenesPreset.ts`)
}

// --- Main -----------------------------------------------------------------

const ejercicios = await leerCatalogo()
mkdirSync(DIR_IMG, { recursive: true })

if (flag('manifiesto')) {
  await escribirManifiesto(ejercicios)
  process.exit(0)
}

// --solo acepta varios términos separados por coma (--solo=sentadilla,cobra);
// con «=» delante el término es exacto (--solo==rana) y no arrastra parecidos.
const filtros = (valor('solo')?.toLowerCase().split(',') ?? []).map((f) => f.trim()).filter(Boolean)
const coincide = (e, f) =>
  f.startsWith('=') ? e.clave === f.slice(1) || e.slug === f.slice(1) : e.clave.includes(f) || e.slug.includes(f)
let pendientes = ejercicios.filter((e) => {
  if (filtros.length && !filtros.some((f) => coincide(e, f))) return false
  return flag('forzar') || !existsSync(path.join(DIR_IMG, `${e.slug}.webp`))
})
const limite = Number(valor('limite') || 0)
if (limite > 0) pendientes = pendientes.slice(0, limite)

console.log(`Catálogo: ${ejercicios.length} ejercicios · a generar: ${pendientes.length}`)
if (pendientes.length === 0) {
  await escribirManifiesto(ejercicios)
  process.exit(0)
}

const key = apiKey()
const fallidos = []
let hechas = 0
let bytes = 0

const cola = [...pendientes]
await Promise.all(
  Array.from({ length: CONCURRENCIA }, async () => {
    for (let ej = cola.shift(); ej; ej = cola.shift()) {
      try {
        bytes += await generarUna(ej, key)
        hechas++
        console.log(`  [${hechas}/${pendientes.length}] ${ej.nombre} → ${ej.slug}.webp`)
      } catch (e) {
        fallidos.push(ej.nombre)
        console.warn(`  ✗ ${ej.nombre}: ${e.message}`)
      }
    }
  }),
)

console.log(`\nListas: ${hechas} · fallaron: ${fallidos.length} · peso: ${(bytes / 1024 / 1024).toFixed(1)} MB`)
if (fallidos.length) console.log('Fallaron:', fallidos.join(' | '))
await escribirManifiesto(ejercicios)
