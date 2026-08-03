/**
 * Genera con IA el contenido bilingüe del AÑO DEMO (la vida de Pep@).
 *
 * Mismo espíritu que generar-ejemplos.mjs, con tres diferencias:
 *  - Esquemas TIPADOS por app (arrays de objetos con `dia` como offset −364..0),
 *    declarados en `scripts/demo/especificaciones.mjs`.
 *  - Colecciones largas por TROZOS: cada trozo es una llamada aparte que recibe
 *    un resumen de lo ya generado (continuidad narrativa) y el script concatena.
 *  - Un `PERSONAJE` compartido (el canon de Pep@) como system prompt de TODAS
 *    las apps, para que la historia cruce entre ellas.
 *
 * El TEXTO va a `src/rooms/<app>/demo.data.ts` (lo consume el builder demo.ts);
 * las FOTOS a `public/demo/<app>/*.webp` con manifiesto en `src/demo/imagenes.ts`.
 * La app NUNCA llama a la IA para esto.
 *
 *   node scripts/generar-demo.mjs                  # los textos que falten
 *   node scripts/generar-demo.mjs --solo=ejercicio,cocina
 *   node scripts/generar-demo.mjs --forzar
 *   node scripts/generar-demo.mjs --imagenes       # solo las fotos
 *   node scripts/generar-demo.mjs --manifiesto     # solo reescribir el .ts
 */
import Anthropic from '@anthropic-ai/sdk'
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import { ESPECIFICACIONES_DEMO, PERSONAJE } from './demo/especificaciones.mjs'

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const DIR_IMG = path.join(RAIZ, 'public', 'demo')
const MANIFIESTO_TS = path.join(RAIZ, 'src', 'demo', 'imagenes.ts')

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

/** El esquema completo: el contenido de la app en es y en (misma forma). */
function esquemaBilingue(espec) {
  return {
    type: 'object',
    properties: { es: espec.esquema, en: espec.esquema },
    required: ['es', 'en'],
    additionalProperties: false,
  }
}

/**
 * Resumen compacto de lo ya generado para el siguiente trozo: cuántas filas
 * lleva cada array y las últimas 3 (continuidad sin re-mandar todo).
 */
function resumenPrevio(acumulado) {
  if (!acumulado) return null
  const resumen = {}
  for (const [k, v] of Object.entries(acumulado.es)) {
    if (Array.isArray(v)) resumen[k] = { total: v.length, ultimas: v.slice(-3) }
  }
  return JSON.stringify(resumen)
}

async function pedirTrozo(cliente, espec, trozo, acumulado) {
  const previo = resumenPrevio(acumulado)
  // stream + finalMessage: con max_tokens grandes el SDK exige streaming
  // (una respuesta no-streaming podría exceder los 10 minutos).
  const respuesta = await cliente.messages
    .stream({
      model: valor('modelo') ?? MODELO_TEXTO,
      max_tokens: 32000,
      system: PERSONAJE,
      output_config: { format: { type: 'json_schema', schema: esquemaBilingue(espec) } },
      messages: [
        {
          role: 'user',
          content: [
            `App: ${espec.app}`,
            `Contenido: ${espec.descripcion}`,
            ...(trozo ? ['', `Trozo a generar AHORA: ${trozo.id}`, trozo.instrucciones] : []),
            ...(previo
              ? ['', 'Resumen de lo YA generado (continúa la historia, no lo repitas):', previo]
              : []),
            '',
            'Devuelve el contenido en español (es) y en inglés (en): la MISMA',
            'historia, cada idioma escrito con naturalidad (no traducción literal).',
          ].join('\n'),
        },
      ],
    })
    .finalMessage()
  const texto = respuesta.content.find((b) => b.type === 'text')?.text
  if (!texto) throw new Error('la respuesta no trae texto')
  return JSON.parse(texto)
}

/** Concatena un trozo al acumulado: los arrays de primer nivel se suman. */
function fusionar(acumulado, trozo) {
  if (!acumulado) return trozo
  for (const idioma of ['es', 'en']) {
    for (const [k, v] of Object.entries(trozo[idioma])) {
      if (Array.isArray(v) && Array.isArray(acumulado[idioma][k])) {
        acumulado[idioma][k].push(...v)
      }
    }
  }
  return acumulado
}

/** Chequeos que el json_schema no cubre: días en rango y arrays no vacíos. */
function validar(espec, datos) {
  for (const idioma of ['es', 'en']) {
    const contenido = datos[idioma]
    if (!contenido) throw new Error(`falta el idioma ${idioma}`)
    for (const [k, v] of Object.entries(contenido)) {
      if (!Array.isArray(v)) continue
      if (!v.length) throw new Error(`${idioma}.${k} vacío`)
      for (const fila of v) {
        if (typeof fila?.dia === 'number' && (fila.dia < -364 || fila.dia > 0)) {
          throw new Error(`${idioma}.${k}: dia ${fila.dia} fuera de −364..0`)
        }
      }
    }
  }
}

const CABECERA = (app) => `// Generado por \`npm run demo:texto\` — no lo edites a mano.
// Contenido del año demo (la vida de Pep@) para ${app}, en los dos idiomas.
// Los \`dia\` son offsets −364..0: el builder los resuelve contra hoy().
`

/**
 * Archivo destino de una especificación. Una app puede tener VARIAS (con
 * `destino` propio): la gramática de structured outputs tiene un tope de
 * tamaño, así que un esquema muy ramificado hay que partirlo en dos pasadas.
 */
const rutaDatos = (espec) =>
  path.join(RAIZ, 'src', 'rooms', espec.app, espec.destino ?? 'demo.data.ts')

function escribirDatos(espec, datos) {
  const destino = rutaDatos(espec)
  const cuerpo = `${CABECERA(espec.app)}
export const ${espec.constante} = ${JSON.stringify(datos, null, 2)} as const
`
  writeFileSync(destino, cuerpo, 'utf8')
  return destino
}

// --- Imágenes con OpenAI ----------------------------------------------------

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
      const dir = path.join(DIR_IMG, espec.app)
      const destino = path.join(dir, `${img.clave}.webp`)
      if (existsSync(destino) && !flag('forzar')) {
        console.log(`· ${espec.app}/${img.clave}: ya existe`)
        continue
      }
      mkdirSync(dir, { recursive: true })
      const formato = img.formato ?? 'cuadrada'
      const bytes = await pedirImagen(img.prompt, formato, key)
      await sharp(bytes)
        .resize(ANCHO, MEDIDAS[formato].alto, { fit: 'cover' })
        .webp({ quality: 78 })
        .toFile(destino)
      console.log(`✓ ${espec.app}/${img.clave}`)
    }
  }
}

/** El manifiesto se reconstruye de lo que HAY en public/demo, no de la lista. */
function escribirManifiesto() {
  const filas = []
  if (existsSync(DIR_IMG)) {
    // public/demo también guarda casa.json: solo cuentan las CARPETAS de app.
    const carpetas = readdirSync(DIR_IMG, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name)
      .sort()
    for (const app of carpetas) {
      const dir = path.join(DIR_IMG, app)
      for (const archivo of readdirSync(dir).sort()) {
        if (!archivo.endsWith('.webp')) continue
        const claveImg = `${app}/${archivo.replace(/\.webp$/, '')}`
        filas.push(`  '${claveImg}': '/demo/${app}/${archivo}',`)
      }
    }
  }
  const cuerpo = `// Generado por \`npm run demo:imagenes\` — no lo edites a mano.
// Fotos del año demo: '<app>/<clave>' → ruta en public/demo/.
// Las carga \`ctx.foto()\` de los builders y se guardan como Blob.

export const IMAGENES_DEMO: Record<string, string> = {
${filas.join('\n')}
}
`
  writeFileSync(MANIFIESTO_TS, cuerpo, 'utf8')
  console.log(`✓ manifiesto con ${filas.length} imágenes`)
}

// --- Orquestación -----------------------------------------------------------

function seleccion() {
  const solo = valor('solo')
  if (!solo) return ESPECIFICACIONES_DEMO
  const ids = solo.split(',')
  return ESPECIFICACIONES_DEMO.filter((e) => ids.includes(e.app))
}

async function generarTextos() {
  const especs = seleccion()
  if (!especs.length) {
    console.log('Nada que generar: añade especificaciones en scripts/demo/especificaciones.mjs')
    return
  }
  const cliente = new Anthropic({ apiKey: clave('ANTHROPIC_API_KEY') })
  for (const espec of especs) {
    const destino = rutaDatos(espec)
    if (existsSync(destino) && !flag('forzar')) {
      console.log(`· ${espec.app}: ya existe`)
      continue
    }
    let datos = null
    for (const trozo of espec.trozos ?? [null]) {
      datos = fusionar(datos, await pedirTrozo(cliente, espec, trozo, datos))
      if (trozo) console.log(`  … ${espec.app}/${trozo.id}`)
    }
    validar(espec, datos)
    console.log(`✓ ${espec.app}: ${path.basename(escribirDatos(espec, datos))} escrito`)
  }
}

if (flag('manifiesto')) escribirManifiesto()
else if (flag('imagenes')) {
  await generarImagenes()
  escribirManifiesto()
} else await generarTextos()
