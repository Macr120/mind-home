/**
 * Traducción SIN API: el puente para traducir dentro de una sesión de Claude
 * Code en vez de gastar saldo de la API. Ver `docs/TRADUCIR.md` para el reparto
 * del trabajo entre sesiones.
 *
 * Resuelve dos problemas distintos:
 *
 * - CONTENIDO (`sacar` / `meter`): `demo.data.i18n.ts` guarda la estructura
 *   entera del año demo —los `dia`, los `tipo`, los arrays— alrededor de cada
 *   frase. Copiar ese andamiaje a mano es tirar esfuerzo y arriesgar erratas que
 *   rompen el builder, así que solo se escriben las FRASES y el script las monta.
 *
 * - INTERFAZ (`sacar-dict` / `meter-dict`): son 5.878 claves, demasiadas para
 *   una tacada. Se parten en trozos de tamaño manejable y se traducen uno a uno,
 *   con lo que además la tanda se puede reanudar donde se quedó.
 *
 *   node scripts/traducir-a-mano.mjs sacar jardin
 *   node scripts/traducir-a-mano.mjs meter jardin pt
 *   node scripts/traducir-a-mano.mjs sacar-dict fr
 *   node scripts/traducir-a-mano.mjs meter-dict fr --tut
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { cabeceraRama, escribirIndice } from './partir-demo-i18n.mjs'

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const ROOMS = path.join(RAIZ, 'src', 'rooms')
const I18N = path.join(RAIZ, 'src', 'core', 'i18n')
const DIR = path.join(RAIZ, 'traducciones')

const args = process.argv.slice(2)
const [orden, sujeto, tercero] = args
const flag = (n) => args.includes(`--${n}`)
const TUT = flag('tut')
const BASE = flag('recetas') ? 'demo.recetas.data' : 'demo.data'
/** Caracteres de fuente por trozo: un trozo debe caber holgado en un turno. */
const CHARS_TROZO = 6000

if (!orden || !sujeto) {
  console.error('uso: traducir-a-mano.mjs sacar|meter <cuarto> [idioma] | sacar-dict|meter-dict <idioma> [--tut]')
  process.exit(1)
}

const leerJson = (ruta) => JSON.parse(readFileSync(ruta, 'utf8'))
const escribir = (ruta, texto) => writeFileSync(ruta, texto, 'utf8')

// ─── Contenido: recorrido de la pareja es/en ────────────────────────────────

/** Es texto traducible si el español y el inglés DIFIEREN (si no, es estructura). */
function recoger(es, en, ruta = [], salida = []) {
  if (typeof es === 'string') {
    if (typeof en === 'string' && es !== en) salida.push({ ruta: ruta.join('.'), es, en })
    return salida
  }
  if (Array.isArray(es)) {
    es.forEach((x, i) => recoger(x, Array.isArray(en) ? en[i] : undefined, [...ruta, i], salida))
    return salida
  }
  if (es && typeof es === 'object') {
    for (const k of Object.keys(es)) recoger(es[k], en?.[k], [...ruta, k], salida)
  }
  return salida
}

/** Copia la rama española poniendo cada traducción en su sitio. */
function reconstruir(es, porRuta, ruta = []) {
  if (typeof es === 'string') return porRuta.get(ruta.join('.')) ?? es
  if (Array.isArray(es)) return es.map((x, i) => reconstruir(x, porRuta, [...ruta, i]))
  if (es && typeof es === 'object') {
    return Object.fromEntries(Object.entries(es).map(([k, v]) => [k, reconstruir(v, porRuta, [...ruta, k])]))
  }
  return es
}

// ─── Interfaz: el español sale de los t()/T() del código ────────────────────

const CADENA = String.raw`'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|\`(?:[^\`\\]|\\.)*\``
const RE_TEXTO = new RegExp(String.raw`\b(?:t|tGlobal|T)\(\s*(${CADENA})\s*,\s*(${CADENA})`, 'g')

function* archivosFuente(dir) {
  for (const entrada of readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entrada.name)
    if (entrada.isDirectory()) yield* archivosFuente(p)
    else if (/\.tsx?$/.test(p)) yield p
  }
}

const desencomillar = (s) =>
  s.slice(1, -1).replace(/\\n/g, '\n').replace(/\\'/g, "'").replace(/\\"/g, '"').replace(/\\`/g, '`').replace(/\\\\/g, '\\')

/**
 * Mapa clave → español. Se DESCARTAN los fallbacks escritos como template
 * literal con interpolación: ahí el hueco lo rellena JavaScript antes de llamar
 * a `t()`, así que el texto del archivo trae código dentro y el traductor lo
 * conservaría. Esas claves van solo desde el inglés, donde el hueco ya está
 * escrito con la convención `{var}`.
 */
function extraerEspanol() {
  const es = new Map()
  for (const archivo of archivosFuente(path.join(RAIZ, 'src'))) {
    for (const m of readFileSync(archivo, 'utf8').matchAll(RE_TEXTO)) {
      const clave = desencomillar(m[1])
      const valor = desencomillar(m[2])
      if (!es.has(clave) && !valor.includes('${')) es.set(clave, valor)
    }
  }
  return es
}

const CAPA = () =>
  TUT
    ? { fuente: 'dict.en.tut.ts', simF: 'EN_TUT', destino: (id) => `dict.${id}.tut.ts`, simD: (id) => `${id.toUpperCase()}_TUT` }
    : { fuente: 'dict.en.ts', simF: 'EN', destino: (id) => `dict.${id}.ts`, simD: (id) => id.toUpperCase() }

async function leerDict(archivo, simbolo) {
  const ruta = path.join(I18N, archivo)
  if (!existsSync(ruta)) return {}
  return (await import(pathToFileURL(ruta)))[simbolo] ?? {}
}

const marcadores = (s) => (s.match(/\{\w+\}/g) ?? []).sort().join(',')
const comillas = (s) => `'${s.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n')}'`

/** Agrupa por presupuesto de caracteres, no por número de textos. */
function trocear(items) {
  const trozos = []
  let actual = []
  let peso = 0
  for (const item of items) {
    const suyo = (item.es?.length ?? 0) + item.en.length
    if (peso + suyo > CHARS_TROZO && actual.length) {
      trozos.push(actual)
      actual = []
      peso = 0
    }
    actual.push(item)
    peso += suyo
  }
  if (actual.length) trozos.push(actual)
  return trozos
}

// ─── Órdenes ────────────────────────────────────────────────────────────────

const CABECERA_DICT = (id, tut) =>
  tut
    ? `import type { Dict } from './dict'\n\n/**\n * Textos de PASO de los tutoriales en ${id}. Capa aparte porque solo hacen\n * falta con un tour corriendo.\n *\n * Lo monta \`traducir-a-mano.mjs meter-dict\` — no lo edites a mano.\n */`
    : `/**\n * Diccionario ${id.toUpperCase()} de la interfaz. Se carga con import() perezoso\n * desde dict.ts: quien no use este idioma no lo descarga.\n *\n * Lo monta \`traducir-a-mano.mjs meter-dict\` a partir de \`dict.en.ts\` y de los\n * fallbacks españoles del código. Lo que falte cae al inglés (ver \`useT\`).\n */\nimport type { Dict } from './dict'`

async function catalogoContenido(cuarto) {
  const fuente = path.join(ROOMS, cuarto, `${BASE}.ts`)
  if (!existsSync(fuente)) throw new Error(`no existe ${path.relative(RAIZ, fuente)}`)
  const modulo = await import(pathToFileURL(fuente))
  const cat = Object.values(modulo).find((v) => v?.es)
  if (!cat) throw new Error(`${path.relative(RAIZ, fuente)} no tiene rama es`)
  return cat
}

if (orden === 'sacar') {
  const cat = await catalogoContenido(sujeto)
  const textos = recoger(cat.es, cat.en)
  mkdirSync(DIR, { recursive: true })
  const salida = path.join(DIR, `${sujeto}.pendientes.json`)
  escribir(salida, JSON.stringify(textos, null, 2))
  const kb = (textos.reduce((a, t) => a + t.es.length, 0) / 1024).toFixed(1)
  console.log(`${textos.length} frases (${kb} KB) → ${path.relative(RAIZ, salida)}`)
  console.log(`Traduce a [{ruta, texto}] y guarda como ${sujeto}.<idioma>.json`)
} else if (orden === 'meter') {
  if (!tercero) throw new Error('falta el idioma: meter <cuarto> <idioma>')
  const cat = await catalogoContenido(sujeto)
  const archivo = path.join(DIR, `${sujeto}.${tercero}.json`)
  if (!existsSync(archivo)) throw new Error(`no existe ${path.relative(RAIZ, archivo)}`)

  const porRuta = new Map(leerJson(archivo).filter((t) => t.texto?.trim()).map((t) => [t.ruta, t.texto.trim()]))
  const faltan = recoger(cat.es, cat.en).filter((t) => !porRuta.has(t.ruta))
  if (faltan.length) console.log(`⚠ ${faltan.length} sin traducir (se quedan en español)`)

  // Un archivo POR idioma + índice de cargadores: solo se descarga el idioma
  // activo (ver partir-demo-i18n.mjs y builders.ts::textos).
  const destino = path.join(ROOMS, sujeto, `${BASE}.i18n.${tercero}.ts`)
  const rama = reconstruir(cat.es, porRuta)
  escribir(destino, `${cabeceraRama(sujeto, BASE, tercero)}\nexport default ${JSON.stringify(rama, null, 2)}\n`)
  const idiomas = escribirIndice(path.join(ROOMS, sujeto), BASE)
  console.log(`${porRuta.size} frases montadas en ${path.relative(RAIZ, destino)} (idiomas: ${idiomas.join(', ')})`)
} else if (orden === 'sacar-dict') {
  const capa = CAPA()
  const fuente = await leerDict(capa.fuente, capa.simF)
  const previas = await leerDict(capa.destino(sujeto), capa.simD(sujeto))
  const espanol = extraerEspanol()

  // Pendiente = sin traducir, o traducida perdiendo un marcador del inglés.
  const pendientes = Object.keys(fuente)
    .filter((k) => previas[k] == null || marcadores(previas[k]) !== marcadores(fuente[k]))
    .map((k) => ({ clave: k, es: espanol.get(k), en: fuente[k] }))

  const carpeta = path.join(DIR, `dict-${sujeto}${TUT ? '-tut' : ''}`)
  mkdirSync(carpeta, { recursive: true })
  const trozos = trocear(pendientes)
  trozos.forEach((trozo, i) => escribir(path.join(carpeta, `${String(i + 1).padStart(2, '0')}.json`), JSON.stringify(trozo, null, 2)))

  console.log(`${pendientes.length} claves pendientes en ${trozos.length} trozos → ${path.relative(RAIZ, carpeta)}/`)
  console.log(`Traduce cada NN.json a [{clave, texto}] y guárdalo como NN.hecho.json`)
} else if (orden === 'meter-dict') {
  const capa = CAPA()
  const fuente = await leerDict(capa.fuente, capa.simF)
  const traducciones = { ...(await leerDict(capa.destino(sujeto), capa.simD(sujeto))) }
  const carpeta = path.join(DIR, `dict-${sujeto}${TUT ? '-tut' : ''}`)
  if (!existsSync(carpeta)) throw new Error(`no existe ${path.relative(RAIZ, carpeta)}`)

  let puestas = 0
  const rotas = []
  for (const archivo of readdirSync(carpeta).filter((f) => f.endsWith('.hecho.json'))) {
    for (const { clave, texto } of leerJson(path.join(carpeta, archivo))) {
      if (!texto?.trim() || fuente[clave] == null) continue
      // Un marcador perdido deja un hueco en la frase: se rechaza y la clave
      // vuelve a salir pendiente en el siguiente `sacar-dict`.
      if (marcadores(texto) !== marcadores(fuente[clave])) {
        rotas.push(clave)
        continue
      }
      traducciones[clave] = texto.trim()
      puestas++
    }
  }

  const filas = Object.keys(fuente)
    .filter((k) => traducciones[k] != null)
    .map((k) => {
      const linea = `  ${comillas(k)}: ${comillas(traducciones[k])},`
      return linea.length <= 120 ? linea : `  ${comillas(k)}:\n    ${comillas(traducciones[k])},`
    })
    .join('\n')

  const destino = path.join(I18N, capa.destino(sujeto))
  escribir(destino, `${CABECERA_DICT(sujeto, TUT)}\n\nexport const ${capa.simD(sujeto)}: Dict = {\n${filas}\n}\n`)

  const total = Object.keys(fuente).length
  console.log(`${puestas} claves nuevas · ${Object.keys(traducciones).length}/${total} en ${path.relative(RAIZ, destino)}`)
  if (rotas.length) console.log(`⚠ ${rotas.length} con marcadores rotos, vuelven a la cola: ${rotas.slice(0, 5).join(', ')}`)
} else {
  throw new Error(`orden desconocida: ${orden}`)
}
