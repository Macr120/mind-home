/**
 * Genera con IA el contenido bilingüe de los ejemplos de fábrica.
 *
 * El TEXTO lo escribe Claude a partir de `scripts/ejemplos/especificaciones.mjs`
 * (structured outputs: devuelve JSON validado contra el esquema, no TypeScript)
 * y se guarda en `src/rooms/<cuarto>/ejemplos.data.ts`. Las FOTOS las genera
 * OpenAI, se comprimen a WebP en `public/ejemplos/<cuarto>/` y se listan en el
 * manifiesto `src/rooms/_shared/ejemplos/imagenes.ts`.
 *
 * La app NO llama a la IA para esto: el ejemplo ya viene escrito en el repo, así
 * que se ve igual sin conexión y sin gastar créditos del usuario.
 *
 * Las claves salen de `ANTHROPIC_API_KEY` y `OPENAI_API_KEY` (variables de
 * entorno o líneas de `.env.local`, que está fuera de git).
 *
 *   node scripts/generar-ejemplos.mjs                    # los textos que falten
 *   node scripts/generar-ejemplos.mjs --solo=jardin
 *   node scripts/generar-ejemplos.mjs --forzar
 *   node scripts/generar-ejemplos.mjs --imagenes         # solo las fotos
 *   node scripts/generar-ejemplos.mjs --manifiesto       # solo reescribir el .ts
 */
import Anthropic from '@anthropic-ai/sdk'
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import { ESPECIFICACIONES, VOZ } from './ejemplos/especificaciones.mjs'

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const DIR_IMG = path.join(RAIZ, 'public', 'ejemplos')
const MANIFIESTO_TS = path.join(RAIZ, 'src', 'rooms', '_shared', 'ejemplos', 'imagenes.ts')

const MODELO_TEXTO = 'claude-opus-5'
const MODELO_IMAGEN = 'gpt-image-1'
const ANCHO = 768

const args = process.argv.slice(2)
const flag = (n) => args.some((a) => a === `--${n}`)
const valor = (n) => args.find((a) => a.startsWith(`--${n}=`))?.split('=').slice(1).join('=')

// --- Claves -----------------------------------------------------------------

function clave(nombre) {
  if (process.env[nombre]) return process.env[nombre]
  const env = path.join(RAIZ, '.env.local')
  const linea = existsSync(env) && readFileSync(env, 'utf8').match(new RegExp(`^${nombre}=(.+)$`, 'm'))
  if (linea) return linea[1].trim().replace(/^["']|["']$/g, '')
  throw new Error(`Falta ${nombre} (ponla en .env.local o expórtala en la terminal)`)
}

// --- Texto con Claude -------------------------------------------------------

/** El esquema que la respuesta tiene que cumplir: las mismas claves en es y en. */
function esquemaDe(espec) {
  const idioma = {
    type: 'object',
    properties: Object.fromEntries(
      Object.entries(espec.claves).map(([k, desc]) => [k, { type: 'string', description: desc }]),
    ),
    required: Object.keys(espec.claves),
    additionalProperties: false,
  }
  return {
    type: 'object',
    properties: { es: idioma, en: idioma },
    required: ['es', 'en'],
    additionalProperties: false,
  }
}

async function pedirTextos(cliente, espec) {
  const respuesta = await cliente.messages.create({
    model: valor('modelo') ?? MODELO_TEXTO,
    max_tokens: 16000,
    system: VOZ,
    output_config: { format: { type: 'json_schema', schema: esquemaDe(espec) } },
    messages: [
      {
        role: 'user',
        content: [
          `App: ${espec.app}`,
          `Ejemplo a escribir: ${espec.seccion}`,
          '',
          'Escribe el contenido del ejemplo en español (es) y en inglés (en).',
          'Los dos idiomas cuentan el MISMO ejemplo, pero cada uno escrito para su',
          'idioma: los nombres propios, las comidas y las costumbres pueden cambiar.',
        ].join('\n'),
      },
    ],
  })
  const texto = respuesta.content.find((b) => b.type === 'text')?.text
  if (!texto) throw new Error('la respuesta no trae texto')
  return JSON.parse(texto)
}

/** Que no falte ni sobre ninguna clave y que ningún texto venga vacío. */
function validar(espec, datos) {
  for (const idioma of ['es', 'en']) {
    const filas = datos[idioma]
    if (!filas) throw new Error(`falta el idioma ${idioma}`)
    for (const k of Object.keys(espec.claves)) {
      if (typeof filas[k] !== 'string' || !filas[k].trim()) throw new Error(`${idioma}.${k} vacío`)
    }
    for (const k of Object.keys(filas)) {
      if (!(k in espec.claves)) throw new Error(`${idioma}.${k} sobra`)
    }
  }
}

const CABECERA = (cuarto) => `// Generado por \`npm run ejemplos:texto\` — no lo edites a mano.
// Contenido del ejemplo de fábrica de ${cuarto}, en los dos idiomas. Vive aparte
// de \`dict.ts\` a propósito: en cuanto se crea es dato del usuario, no interfaz.
`

/** Literal con las comillas simples del repo (JSON.stringify usa dobles). */
const comillas = (s) => `'${s.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`

/**
 * Ramas de idiomas del archivo existente distintas de es/en (pt, fr, de, it…):
 * la IA solo escribe es/en, el resto se tradujo a mano, así que al regenerar se
 * rescatan tal cual del .ts anterior para no pisarlas.
 */
function ramasConservadas(destino) {
  if (!existsSync(destino)) return []
  const texto = readFileSync(destino, 'utf8')
  return [...texto.matchAll(/^  ([a-z]+): \{\n(?:.*\n)*?  \},?$/gm)]
    .filter((m) => m[1] !== 'es' && m[1] !== 'en')
    .map((m) => (m[0].endsWith(',') ? m[0] : `${m[0]},`))
}

/** El .ts del catálogo: un objeto por idioma. */
function escribirDatos(espec, datos) {
  const bloque = (idioma) => {
    const filas = Object.keys(espec.claves)
      .map((k) => `    ${k}: ${comillas(datos[idioma][k])},`)
      .join('\n')
    return `  ${idioma}: {\n${filas}\n  },`
  }
  const destino = path.join(RAIZ, 'src', 'rooms', espec.cuarto, 'ejemplos.data.ts')
  const manuales = ramasConservadas(destino)
  if (manuales.length) {
    console.log(`  (${espec.cuarto}: conservadas ${manuales.map((r) => r.slice(2, r.indexOf(':'))).join(', ')})`)
  }
  const cuerpo = `${CABECERA(espec.cuarto)}
export const ${espec.constante} = {
${[bloque('es'), bloque('en'), ...manuales].join('\n')}
}
`
  writeFileSync(destino, cuerpo, 'utf8')
  return destino
}

// --- Imágenes con OpenAI ----------------------------------------------------

// Las portadas (película, libro) se piden verticales y se guardan verticales: en
// cuadrado el modelo deja la mitad del lienzo vacío y el recorte se come el motivo.
const MEDIDAS = {
  cuadrada: { pide: '1024x1024', alto: ANCHO },
  vertical: { pide: '1024x1536', alto: Math.round(ANCHO * 1.5) },
}

async function pedirImagen(prompt, formato, key) {
  const r = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
    body: JSON.stringify({ model: MODELO_IMAGEN, prompt, size: MEDIDAS[formato].pide, n: 1 }),
  })
  if (!r.ok) throw new Error(`OpenAI ${r.status}: ${(await r.text()).slice(0, 200)}`)
  const json = await r.json()
  const b64 = json.data?.[0]?.b64_json
  if (!b64) throw new Error('la respuesta no trae imagen')
  return Buffer.from(b64, 'base64')
}

async function generarImagenes() {
  const key = clave('OPENAI_API_KEY')
  for (const espec of seleccion()) {
    for (const img of espec.imagenes ?? []) {
      const dir = path.join(DIR_IMG, espec.cuarto)
      const destino = path.join(dir, `${img.clave}.webp`)
      if (existsSync(destino) && !flag('forzar')) {
        console.log(`· ${espec.cuarto}/${img.clave}: ya existe`)
        continue
      }
      mkdirSync(dir, { recursive: true })
      const formato = img.formato ?? 'cuadrada'
      const bytes = await pedirImagen(img.prompt, formato, key)
      await sharp(bytes)
        .resize(ANCHO, MEDIDAS[formato].alto, { fit: 'cover' })
        .webp({ quality: 78 })
        .toFile(destino)
      console.log(`✓ ${espec.cuarto}/${img.clave}`)
    }
  }
}

/** El manifiesto se reconstruye de lo que HAY en public/ejemplos, no de la lista. */
function escribirManifiesto() {
  const filas = []
  if (existsSync(DIR_IMG)) {
    for (const cuarto of readdirSync(DIR_IMG).sort()) {
      const dir = path.join(DIR_IMG, cuarto)
      for (const archivo of readdirSync(dir).sort()) {
        if (!archivo.endsWith('.webp')) continue
        const clave = `${cuarto}.${archivo.replace(/\.webp$/, '')}`
        filas.push(`  '${clave}': '/ejemplos/${cuarto}/${archivo}',`)
      }
    }
  }
  const cuerpo = `// Generado por \`npm run ejemplos:imagenes\` — no lo edites a mano.
// Fotos de fábrica de los ejemplos: '<cuarto>.<clave>' → ruta en public/.
// Las carga \`fotoEjemplo()\` y se guardan como Blob, igual que una foto subida.

export const IMAGENES_EJEMPLO: Record<string, string> = {
${filas.join('\n')}
}
`
  writeFileSync(MANIFIESTO_TS, cuerpo, 'utf8')
  console.log(`✓ manifiesto con ${filas.length} imágenes`)
}

// --- Orquestación -----------------------------------------------------------

function seleccion() {
  const solo = valor('solo')
  if (!solo) return ESPECIFICACIONES
  const ids = solo.split(',')
  return ESPECIFICACIONES.filter((e) => ids.includes(e.cuarto))
}

async function generarTextos() {
  const cliente = new Anthropic({ apiKey: clave('ANTHROPIC_API_KEY') })
  for (const espec of seleccion()) {
    const destino = path.join(RAIZ, 'src', 'rooms', espec.cuarto, 'ejemplos.data.ts')
    if (existsSync(destino) && !flag('forzar')) {
      console.log(`· ${espec.cuarto}: ya existe`)
      continue
    }
    const datos = await pedirTextos(cliente, espec)
    validar(espec, datos)
    escribirDatos(espec, datos)
    console.log(`✓ ${espec.cuarto}: ${Object.keys(espec.claves).length} textos × 2 idiomas`)
  }
}

if (flag('manifiesto')) escribirManifiesto()
else if (flag('imagenes')) {
  await generarImagenes()
  escribirManifiesto()
} else await generarTextos()
