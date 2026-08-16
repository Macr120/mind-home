/**
 * Traduce la interfaz de MPH a los idiomas de `core/i18n/idiomas.ts`.
 *
 * FUENTE DOBLE: el español es el original (vive en línea en el código, en los
 * `t('clave', 'Español')` y en los `T('clave', 'Español')` de los tutoriales) y
 * el inglés es su traducción curada, en `dict.en.ts`. Al modelo se le pasan los
 * dos: con el par delante acierta mucho más que con el inglés solo, y de paso
 * el español marca el tono, que es lo que se pierde al traducir de traducción.
 * Las claves cuyo español no se puede extraer (las dinámicas) van solo con el
 * inglés.
 *
 * INCREMENTAL: por defecto solo traduce lo que falta en cada idioma, así el
 * mismo comando sirve para esta tanda y para mantener los idiomas al día
 * cuando se añadan claves nuevas. Con `--forzar` rehace el idioma entero.
 *
 * La clave sale de `ANTHROPIC_API_KEY` (variable de entorno o `.env.local`).
 *
 *   node scripts/traducir-i18n.mjs --dry           # qué haría y cuánto es
 *   node scripts/traducir-i18n.mjs                 # lo que falte, los 4 idiomas
 *   node scripts/traducir-i18n.mjs --solo=fr
 *   node scripts/traducir-i18n.mjs --capa=tut
 *   node scripts/traducir-i18n.mjs --limite=40     # cata barata antes de gastar
 *   node scripts/traducir-i18n.mjs --solo=de --forzar
 */
import Anthropic from '@anthropic-ai/sdk'
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { sistemaDe } from './traducir/glosario.mjs'

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SRC = path.join(RAIZ, 'src')
const I18N = path.join(SRC, 'core', 'i18n')

const MODELO = 'claude-opus-5'
/** Traducir es mecánico: `medium` da el mismo texto que `high` por menos. */
const ESFUERZO = 'medium'
/** Caracteres de fuente por lote. Con esto un lote cabe holgado en la respuesta. */
const CHARS_LOTE = 4000
const CONCURRENCIA = 5
const REINTENTOS = 2

const args = process.argv.slice(2)
const flag = (n) => args.some((a) => a === `--${n}`)
const valor = (n) => args.find((a) => a.startsWith(`--${n}=`))?.split('=').slice(1).join('=')

const DRY = flag('dry')
const FORZAR = flag('forzar')
const LIMITE = Number(valor('limite')) || 0

// --- Clave de API (mismo patrón que generar-ejemplos.mjs) --------------------

function clave(nombre) {
  if (process.env[nombre]) return process.env[nombre]
  const env = path.join(RAIZ, '.env.local')
  const linea = existsSync(env) && readFileSync(env, 'utf8').match(new RegExp(`^${nombre}=(.+)$`, 'm'))
  if (linea) return linea[1].trim().replace(/^["']|["']$/g, '')
  throw new Error(`Falta ${nombre} (ponla en .env.local o expórtala en la terminal)`)
}

// --- Las dos capas y los idiomas --------------------------------------------

/**
 * `dict` es la interfaz y `tut` los textos de paso de los tutoriales, que van
 * en un archivo aparte porque solo bajan con un tour corriendo.
 */
const CAPAS = {
  dict: { fuente: 'dict.en.ts', simbolo: 'EN', archivo: (id) => `dict.${id}.ts`, constante: (id) => id.toUpperCase() },
  tut: {
    fuente: 'dict.en.tut.ts',
    simbolo: 'EN_TUT',
    archivo: (id) => `dict.${id}.tut.ts`,
    constante: (id) => `${id.toUpperCase()}_TUT`,
  },
}

/** Los idiomas traducidos son los del catálogo menos el español (el original). */
async function idiomasDestino() {
  const { IDIOMAS, IDIOMA_BASE } = await import(pathToFileURL(path.join(I18N, 'idiomas.ts')))
  return IDIOMAS.map((i) => i.id).filter((id) => id !== IDIOMA_BASE && id !== 'en')
}

// --- El español, extraído del código ----------------------------------------

const CADENA = String.raw`'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|\`(?:[^\`\\]|\\.)*\``
// `t()` y `tGlobal()` para la interfaz; `T()` para los pasos de los tutoriales.
const RE_TEXTO = new RegExp(String.raw`\b(?:t|tGlobal|T)\(\s*(${CADENA})\s*,\s*(${CADENA})`, 'g')

function* archivosFuente(dir) {
  for (const entrada of readdirSync(dir)) {
    const p = path.join(dir, entrada)
    if (statSync(p).isDirectory()) yield* archivosFuente(p)
    else if (/\.tsx?$/.test(p)) yield p
  }
}

const desencomillar = (s) =>
  s
    .slice(1, -1)
    .replace(/\\n/g, '\n')
    .replace(/\\'/g, "'")
    .replace(/\\"/g, '"')
    .replace(/\\`/g, '`')
    .replace(/\\\\/g, '\\')

/**
 * Mapa clave → español, barriendo las llamadas del código.
 *
 * Se descartan los fallbacks escritos como template literal CON interpolación
 * —`` t('x', `Borrar "${nombre(o)}"?`) ``—: ahí el hueco lo rellena JavaScript
 * antes de llamar a `t()`, así que el texto que se lee del archivo trae código
 * dentro. Pasárselo al traductor le hace conservar el `${...}` tal cual y la
 * clave acaba con un trozo de fuente en medio de la frase. Esas van desde el
 * inglés, que es donde el hueco ya está escrito con la convención `{var}`.
 */
function extraerEspanol() {
  const es = new Map()
  for (const archivo of archivosFuente(SRC)) {
    for (const m of readFileSync(archivo, 'utf8').matchAll(RE_TEXTO)) {
      const clave = desencomillar(m[1])
      const valor = desencomillar(m[2])
      if (!es.has(clave) && !valor.includes('${')) es.set(clave, valor)
    }
  }
  return es
}

// --- Lectura y escritura de los diccionarios --------------------------------

async function leerDict(archivo, simbolo) {
  const ruta = path.join(I18N, archivo)
  if (!existsSync(ruta)) return {}
  const modulo = await import(pathToFileURL(ruta))
  return modulo[simbolo] ?? {}
}

/** Literal con las comillas simples del repo (JSON.stringify usa dobles). */
const comillas = (s) => `'${s.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n')}'`

const CABECERA = {
  dict: (nombre) => `/**
 * Diccionario ${nombre.toUpperCase()} de la interfaz. Se carga con import() perezoso
 * desde dict.ts, igual que el inglés: quien no use este idioma no lo descarga.
 *
 * GENERADO por \`npm run traducir:i18n\` a partir de \`dict.en.ts\` y de los
 * fallbacks españoles del código. No lo edites a mano: se sobrescribe entero.
 * Lo que falte cae al inglés (ver \`useT\`); al español solo en último término.
 */`,
  tut: (nombre) => `/**
 * Textos de PASO de los tutoriales en ${nombre}. Capa aparte porque solo hacen
 * falta con un tour corriendo. Los títulos y resúmenes NO están aquí: los pinta
 * el selector sin abrir nada.
 *
 * GENERADO por \`npm run traducir:i18n\` — no lo edites a mano.
 */`,
}

/** El .ts del diccionario, en el orden de claves del inglés. */
function escribirDict(capa, id, nombre, orden, traducciones) {
  const meta = CAPAS[capa]
  const filas = orden
    .filter((k) => traducciones[k] != null)
    .map((k) => {
      const linea = `  ${comillas(k)}: ${comillas(traducciones[k])},`
      // Los textos de tutorial pasan de largo de 120 columnas: se parten como
      // en dict.en.tut.ts, con el valor en su propia línea.
      return linea.length <= 120 ? linea : `  ${comillas(k)}:\n    ${comillas(traducciones[k])},`
    })
    .join('\n')

  const cuerpo =
    capa === 'dict'
      ? `${CABECERA.dict(nombre)}\nimport type { Dict } from './dict'\n\nexport const ${meta.constante(id)}: Dict = {\n${filas}\n}\n`
      : `import type { Dict } from './dict'\n\n${CABECERA.tut(nombre)}\nexport const ${meta.constante(id)}: Dict = {\n${filas}\n}\n`

  writeFileSync(path.join(I18N, meta.archivo(id)), cuerpo, 'utf8')
}

// --- Traducción --------------------------------------------------------------

/** Los marcadores {así} del texto, para comprobar que la traducción los conserva. */
const marcadores = (s) => (s.match(/\{\w+\}/g) ?? []).sort().join(',')

/**
 * Esquema CONSTANTE entre lotes a propósito: la API compila y cachea el
 * esquema 24 h, así que uno por lote pagaría la compilación 80 veces. Las
 * claves largas no viajan de vuelta: cada texto lleva su índice en el lote.
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

function mensajeLote(items) {
  const fichas = items.map((it, i) => {
    const partes = [`#${i}`]
    if (it.es) partes.push(`  ES: ${it.es}`)
    partes.push(`  EN: ${it.en}`)
    return partes.join('\n')
  })
  return `Traduce estos ${items.length} textos de la interfaz. Devuelve un objeto por texto
con su mismo número en "id" y la traducción en "texto". No te saltes ninguno.

Cada ficha trae el ORIGINAL español (ES) y su traducción inglesa (EN). Traduce
desde el español, que es el original; el inglés está para desambiguar. Cuando
solo haya EN, traduce desde ahí.

${fichas.join('\n\n')}`
}

async function pedirLote(cliente, sistema, items) {
  const respuesta = await cliente.messages.create({
    model: valor('modelo') ?? MODELO,
    max_tokens: 16000,
    system: [{ type: 'text', text: sistema, cache_control: { type: 'ephemeral' } }],
    output_config: { format: { type: 'json_schema', schema: ESQUEMA }, effort: ESFUERZO },
    messages: [{ role: 'user', content: mensajeLote(items) }],
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
async function traducirLote(cliente, sistema, items, gasto) {
  const salida = new Map()
  let pendientes = items

  for (let intento = 0; intento <= REINTENTOS && pendientes.length; intento++) {
    const { filas, uso } = await pedirLote(cliente, sistema, pendientes)
    gasto.entrada += uso.input_tokens ?? 0
    gasto.salida += uso.output_tokens ?? 0
    gasto.cache += uso.cache_read_input_tokens ?? 0

    // El `id` que vuelve es la posición dentro de ESTE lote (ver `mensajeLote`).
    const porId = new Map(filas.map((f) => [f.id, f.texto]))
    const malas = []
    pendientes.forEach((item, i) => {
      const texto = porId.get(i)?.trim()
      // Un marcador perdido rompe la interpolación en silencio: se rechaza y
      // se vuelve a pedir, y si no hay manera se queda sin traducir (→ español).
      // La referencia es el INGLÉS: es donde los huecos están escritos con la
      // convención `{var}` que interpola `t()`.
      if (!texto || marcadores(texto) !== marcadores(item.en)) malas.push(item)
      else salida.set(item.clave, texto)
    })
    pendientes = malas
  }

  for (const item of pendientes) gasto.fallidas.push(item.clave)
  return salida
}

/**
 * Corre las tareas de N en N. Un lote que reviente NO tumba la tanda: son
 * horas de trabajo y lo que ya está traducido tiene que llegar al archivo. Lo
 * que falle se anota y la siguiente pasada lo recoge (esto es incremental).
 */
async function enTandas(tareas, n, gasto) {
  const salida = []
  for (let i = 0; i < tareas.length; i += n) {
    const tanda = await Promise.all(
      tareas.slice(i, i + n).map((t) =>
        t().catch((e) => {
          gasto.errores.push(e.message)
          return new Map()
        }),
      ),
    )
    salida.push(...tanda)
  }
  return salida
}

function hacerLotes(items) {
  const lotes = []
  let actual = []
  let chars = 0
  for (const item of items) {
    const peso = (item.es?.length ?? 0) + item.en.length
    if (chars + peso > CHARS_LOTE && actual.length) {
      lotes.push(actual)
      actual = []
      chars = 0
    }
    actual.push(item)
    chars += peso
  }
  if (actual.length) lotes.push(actual)
  return lotes
}

// --- Programa ---------------------------------------------------------------

async function main() {
  const soloIdioma = valor('solo')
  const soloCapa = valor('capa')
  const destinos = (await idiomasDestino()).filter((id) => !soloIdioma || id === soloIdioma)
  const capas = Object.keys(CAPAS).filter((c) => !soloCapa || c === soloCapa)
  if (!destinos.length) throw new Error(`sin idiomas que traducir (--solo=${soloIdioma}?)`)

  const espanol = extraerEspanol()
  console.log(`español extraído del código: ${espanol.size} claves\n`)

  const cliente = DRY ? null : new Anthropic({ apiKey: clave('ANTHROPIC_API_KEY') })
  const { IDIOMAS } = await import(pathToFileURL(path.join(I18N, 'idiomas.ts')))

  for (const id of destinos) {
    const nombre = IDIOMAS.find((i) => i.id === id)?.label ?? id
    const sistema = sistemaDe(id)

    for (const capa of capas) {
      const meta = CAPAS[capa]
      const fuente = await leerDict(meta.fuente, meta.simbolo)
      const orden = Object.keys(fuente)
      const previas = FORZAR ? {} : await leerDict(meta.archivo(id), meta.constante(id))

      // Una traducción que perdió por el camino un `{marcador}` del inglés deja
      // un hueco en la frase, así que no cuenta como traducida: vuelve a la
      // cola. Con esto el script se repara solo al repetirlo.
      let faltan = orden.filter((k) => previas[k] == null || marcadores(previas[k]) !== marcadores(fuente[k]))
      if (LIMITE) faltan = faltan.slice(0, LIMITE)

      if (!faltan.length) {
        console.log(`${id}/${capa}: al día (${orden.length} claves)`)
        continue
      }

      const items = faltan.map((clave) => ({ clave, es: espanol.get(clave), en: fuente[clave] }))
      const lotes = hacerLotes(items)
      const conEs = items.filter((i) => i.es).length
      console.log(
        `${id}/${capa}: ${faltan.length} por traducir (${conEs} con español) en ${lotes.length} lotes`,
      )
      if (DRY) continue

      const gasto = { entrada: 0, salida: 0, cache: 0, fallidas: [], errores: [] }
      const resultados = await enTandas(
        lotes.map((lote) => () => traducirLote(cliente, sistema, lote, gasto)),
        CONCURRENCIA,
        gasto,
      )

      const traducciones = { ...previas }
      for (const mapa of resultados) for (const [k, v] of mapa) traducciones[k] = v
      escribirDict(capa, id, nombre, orden, traducciones)

      const hechas = Object.keys(traducciones).length
      console.log(
        `  → ${meta.archivo(id)}: ${hechas}/${orden.length} claves` +
          ` · ${gasto.entrada} tokens de entrada (${gasto.cache} de caché), ${gasto.salida} de salida` +
          (gasto.fallidas.length ? `\n  ⚠ sin traducir: ${gasto.fallidas.join(', ')}` : '') +
          (gasto.errores.length ? `\n  ⚠ ${gasto.errores.length} lotes con error: ${gasto.errores[0]}` : ''),
      )
    }
  }
}

await main()
