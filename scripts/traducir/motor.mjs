/**
 * El motor de traducción que comparten `traducir-i18n.mjs` (la interfaz) y
 * `traducir-contenido.mjs` (el año demo, los ejemplos y los catálogos).
 *
 * Lo que hay aquí es lo que no cambia entre los dos: agrupar los textos en
 * lotes, pedirlos con salida estructurada, comprobar que vuelven todos y con
 * sus marcadores intactos, y reintentar SOLO lo que falle.
 */
import Anthropic from '@anthropic-ai/sdk'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'

export const MODELO = 'claude-opus-5'
/** Traducir es mecánico: `medium` da el mismo texto que `high` por menos. */
export const ESFUERZO = 'medium'
/** Caracteres de fuente por lote. Con esto un lote cabe holgado en la respuesta. */
export const CHARS_LOTE = 4000
export const CONCURRENCIA = 5
const REINTENTOS = 2

/** La clave, de la variable de entorno o de `.env.local` (que está fuera de git). */
export function clave(raiz, nombre) {
  if (process.env[nombre]) return process.env[nombre]
  const env = path.join(raiz, '.env.local')
  const linea = existsSync(env) && readFileSync(env, 'utf8').match(new RegExp(`^${nombre}=(.+)$`, 'm'))
  if (linea) return linea[1].trim().replace(/^["']|["']$/g, '')
  throw new Error(`Falta ${nombre} (ponla en .env.local o expórtala en la terminal)`)
}

export const crearCliente = (raiz) => new Anthropic({ apiKey: clave(raiz, 'ANTHROPIC_API_KEY') })

/** Los marcadores {así} del texto, para comprobar que la traducción los conserva. */
export const marcadores = (s) => (s.match(/\{\w+\}/g) ?? []).sort().join(',')

/**
 * Esquema CONSTANTE entre lotes a propósito: la API compila y cachea el
 * esquema 24 h, así que uno por lote pagaría la compilación en cada llamada.
 * Las claves largas no viajan de vuelta: cada texto lleva su índice en el lote.
 */
const ESQUEMA = {
  type: 'object',
  properties: {
    traducciones: {
      type: 'array',
      items: {
        type: 'object',
        properties: { id: { type: 'integer' }, texto: { type: 'string' } },
        required: ['id', 'texto'],
        additionalProperties: false,
      },
    },
  },
  required: ['traducciones'],
  additionalProperties: false,
}

function mensajeLote(items, instruccion) {
  const fichas = items.map((it, i) => {
    const partes = [`#${i}`]
    if (it.es) partes.push(`  ES: ${it.es}`)
    partes.push(`  EN: ${it.en}`)
    return partes.join('\n')
  })
  return `${instruccion}

Devuelve un objeto por texto, con su mismo número en "id" y la traducción en
"texto". No te saltes ninguno.

Cada ficha trae el ORIGINAL español (ES) y su traducción inglesa (EN). Traduce
desde el español, que es el original; el inglés está para desambiguar. Cuando
solo haya EN, traduce desde ahí.

${fichas.join('\n\n')}`
}

async function pedirLote(cliente, sistema, items, opciones) {
  const respuesta = await cliente.messages.create({
    model: opciones.modelo ?? MODELO,
    max_tokens: 16000,
    system: [{ type: 'text', text: sistema, cache_control: { type: 'ephemeral' } }],
    output_config: { format: { type: 'json_schema', schema: ESQUEMA }, effort: ESFUERZO },
    messages: [{ role: 'user', content: mensajeLote(items, opciones.instruccion) }],
  })
  if (respuesta.stop_reason === 'refusal') throw new Error('la API declinó el lote')
  const texto = respuesta.content.find((b) => b.type === 'text')?.text
  if (!texto) throw new Error('la respuesta no trae texto')
  return { filas: JSON.parse(texto).traducciones ?? [], uso: respuesta.usage }
}

/**
 * Un lote, con reintentos SOLO de lo que falte o venga mal: si el modelo se
 * salta tres textos, se le vuelven a pedir esos tres y no los ochenta.
 */
async function traducirLote(cliente, sistema, items, gasto, opciones) {
  const salida = new Map()
  let pendientes = items

  for (let intento = 0; intento <= REINTENTOS && pendientes.length; intento++) {
    const { filas, uso } = await pedirLote(cliente, sistema, pendientes, opciones)
    gasto.entrada += uso.input_tokens ?? 0
    gasto.salida += uso.output_tokens ?? 0
    gasto.cache += uso.cache_read_input_tokens ?? 0

    // El `id` que vuelve es la posición dentro de ESTE lote (ver `mensajeLote`).
    const porId = new Map(filas.map((f) => [f.id, f.texto]))
    const malas = []
    pendientes.forEach((item, i) => {
      const texto = porId.get(i)?.trim()
      // Un marcador perdido rompe la interpolación en silencio: se rechaza y
      // se vuelve a pedir, y si no hay manera se queda sin traducir. La
      // referencia es el inglés, que es donde los huecos van con la convención
      // `{var}` (el español del código a veces los interpola con JavaScript).
      if (!texto || marcadores(texto) !== marcadores(item.en ?? item.es)) malas.push(item)
      else salida.set(item.id, texto)
    })
    pendientes = malas
  }

  for (const item of pendientes) gasto.fallidas.push(item.id)
  return salida
}

/** Agrupa por presupuesto de caracteres, no por número de textos. */
export function hacerLotes(items, chars = CHARS_LOTE) {
  const lotes = []
  let actual = []
  let peso = 0
  for (const item of items) {
    const suyo = (item.es?.length ?? 0) + item.en.length
    if (peso + suyo > chars && actual.length) {
      lotes.push(actual)
      actual = []
      peso = 0
    }
    actual.push(item)
    peso += suyo
  }
  if (actual.length) lotes.push(actual)
  return lotes
}

/**
 * Traduce una lista de `{ id, es?, en }` y devuelve un Map id → traducción.
 *
 * Un lote que reviente NO tumba la tanda: son horas de trabajo y lo que ya
 * está traducido tiene que llegar al archivo. Lo que falle se anota en `gasto`
 * y la siguiente pasada lo recoge (todo esto es incremental).
 */
export async function traducirTextos(cliente, sistema, items, gasto, opciones = {}) {
  const lotes = hacerLotes(items, opciones.chars)
  const salida = new Map()

  for (let i = 0; i < lotes.length; i += CONCURRENCIA) {
    const tanda = await Promise.all(
      lotes.slice(i, i + CONCURRENCIA).map((lote) =>
        traducirLote(cliente, sistema, lote, gasto, opciones).catch((e) => {
          gasto.errores.push(e.message)
          return new Map()
        }),
      ),
    )
    for (const mapa of tanda) for (const [k, v] of mapa) salida.set(k, v)
  }
  return salida
}

export const nuevoGasto = () => ({ entrada: 0, salida: 0, cache: 0, fallidas: [], errores: [] })

/** Literal con las comillas simples del repo (JSON.stringify usa dobles). */
export const comillas = (s) => `'${s.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n')}'`

export const resumenGasto = (gasto) =>
  `${gasto.entrada} tokens de entrada (${gasto.cache} de caché), ${gasto.salida} de salida` +
  (gasto.fallidas.length ? ` · ${gasto.fallidas.length} sin traducir` : '') +
  (gasto.errores.length ? ` · ${gasto.errores.length} lotes con error` : '')
