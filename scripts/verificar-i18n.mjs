/**
 * Revisa los diccionarios traducidos contra el inglés, que es la referencia de
 * qué claves existen — y el propio inglés contra el CÓDIGO: toda clave literal
 * de `t()/tGlobal()/T()` debe tener entrada en `dict.en(.tut).ts`, porque el
 * inglés es el respaldo de los demás idiomas (ver `useT`). Una clave que no
 * está en el inglés sale en español en los 15 idiomas.
 *
 * Lo que busca no es que la traducción sea buena —eso se mira en la app— sino
 * los fallos que NO se ven al abrirla: un marcador `{nombre}` que se perdió y
 * deja un hueco en la frase, un emoji colado donde el original no lo tenía, o
 * una clave que se quedó sin traducir (ERROR: los idiomas van al 100 %). La
 * longitud se avisa pero no falla: un texto largo puede estar bien y solo hay
 * que mirarlo en su botón.
 *
 *   node scripts/verificar-i18n.mjs
 *   node scripts/verificar-i18n.mjs --solo=de
 *
 * Sale con código 1 si hay errores, para poder encadenarlo en un script.
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const I18N = path.join(RAIZ, 'src', 'core', 'i18n')

/**
 * A partir de aquí la traducción se mira: puede no caber en su botón.
 *
 * El umbral es POR IDIOMA porque la misma frase no ocupa lo mismo en todos: el
 * CJK escribe con ideogramas y sale más corto que el inglés (si crece, casi
 * siempre es una paráfrasis), mientras que el ruso, el hindi y el árabe crecen
 * de por sí y con 1,6 el informe se llenaba de falsas alarmas.
 */
const FACTOR_LARGO = 1.6
const FACTOR_POR_IDIOMA = {
  ja: 1.2,
  zh: 1.2,
  ko: 1.3,
  ru: 1.9,
  hi: 1.9,
  ar: 1.9,
}
const factorDe = (id) => FACTOR_POR_IDIOMA[id] ?? FACTOR_LARGO
/** Por debajo de esto no se avisa: en textos cortos el factor salta por nada. */
const MINIMO_LARGO = 12

const args = process.argv.slice(2)
const soloIdioma = args.find((a) => a.startsWith('--solo='))?.split('=')[1]

const CAPAS = [
  { id: 'dict', fuente: ['dict.en.ts', 'EN'], destino: (id) => [`dict.${id}.ts`, id.toUpperCase()] },
  { id: 'tut', fuente: ['dict.en.tut.ts', 'EN_TUT'], destino: (id) => [`dict.${id}.tut.ts`, `${id.toUpperCase()}_TUT`] },
]

const RE_MARCADOR = /\{\w+\}/g
// `Extended_Pictographic` cubre emoji y pictogramas; las banderas van aparte
// porque son pares de indicadores regionales.
const RE_EMOJI = /\p{Extended_Pictographic}|\p{Regional_Indicator}/u

async function leer(archivo, simbolo) {
  const ruta = path.join(I18N, archivo)
  if (!existsSync(ruta)) return null
  return (await import(pathToFileURL(ruta)))[simbolo] ?? {}
}

const marcadores = (s) => (s.match(RE_MARCADOR) ?? []).slice().sort()

// --- Claves usadas en el código (misma regex que traducir-i18n.mjs) ----------

const CADENA = String.raw`'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|\`(?:[^\`\\]|\\.)*\``
const RE_CLAVE = new RegExp(String.raw`\b(?:t|tGlobal|T)\(\s*(${CADENA})`, 'g')
/** Solo los template con hueco: de ahí sale el prefijo de una familia dinámica. */
const RE_FAMILIA = /\b(?:t|tGlobal|T)\(\s*`([^`\n]*\$\{[^`\n]*)`/g

function* archivosFuente(dir) {
  for (const entrada of readdirSync(dir)) {
    const p = path.join(dir, entrada)
    if (statSync(p).isDirectory()) yield* archivosFuente(p)
    else if (/\.tsx?$/.test(p)) yield p
  }
}

/** Claves literales de `t()/tGlobal()/T()` en src/, sin los propios diccionarios.
 *  Las dinámicas (template con `${…}`) se miran aparte, por FAMILIA. */
function clavesDelCodigo() {
  const claves = new Map() // clave → archivo donde aparece
  for (const archivo of archivosFuente(path.join(RAIZ, 'src'))) {
    const rel = path.relative(RAIZ, archivo).replace(/\\/g, '/')
    if (rel.startsWith('src/core/i18n/')) continue
    for (const m of readFileSync(archivo, 'utf8').matchAll(RE_CLAVE)) {
      if (m[1].startsWith('`') && m[1].includes('${')) continue
      const clave = m[1].slice(1, -1)
      if (!claves.has(clave)) claves.set(clave, rel)
    }
  }
  return claves
}

/**
 * Prefijos de las claves DINÁMICAS: el trozo literal de una clave de plantilla.
 *
 * De la clave concreta no se sabe nada —el id sale de un catálogo en tiempo de
 * ejecución— pero sí de la FAMILIA: si el inglés no tiene NI UNA clave con ese
 * prefijo, el catálogo entero se pinta en español en los 16 idiomas. Es por
 * donde se colaron los nombres de pisos, techos, fondos, temas y objetos, que
 * el barrido de claves literales no ve.
 */
function familiasDelCodigo() {
  const familias = new Map() // prefijo → archivo donde aparece
  for (const archivo of archivosFuente(path.join(RAIZ, 'src'))) {
    const rel = path.relative(RAIZ, archivo).replace(/\\/g, '/')
    if (rel.startsWith('src/core/i18n/')) continue
    for (const m of readFileSync(archivo, 'utf8').matchAll(RE_FAMILIA)) {
      const prefijo = m[1].slice(0, m[1].indexOf('${'))
      if (prefijo && !familias.has(prefijo)) familias.set(prefijo, rel)
    }
  }
  return familias
}

let errores = 0
let avisos = 0

/**
 * El portal `/cuenta` de la web pública, la única superficie traducida que NADIE
 * comprueba: sus textos los pinta React en el navegador, así que el build no los
 * mira (a diferencia de las páginas estáticas, que fallan en `web-i18n.mjs` si
 * les falta una clave). Su referencia es el inglés; el español va en línea en
 * `web/src/cuenta.tsx` y por eso no tiene archivo.
 */
async function portalCuenta() {
  const dir = path.join(RAIZ, 'web', 'i18n', 'cuenta')
  if (!existsSync(dir)) return
  const textos = async (f) => (await import(pathToFileURL(path.join(dir, f)))).TEXTOS ?? {}
  const ref = await textos('en.ts')
  const claves = Object.keys(ref)
  for (const f of readdirSync(dir).filter((f) => f.endsWith('.ts') && f !== 'en.ts')) {
    const d = await textos(f)
    const faltan = claves.filter((k) => d[k] == null)
    const sobran = Object.keys(d).filter((k) => !(k in ref))
    const vacias = claves.filter((k) => d[k] != null && !d[k].trim())
    const grave = faltan.length + vacias.length
    errores += grave
    const problemas = [
      faltan.length && `${faltan.length} sin traducir`,
      sobran.length && `${sobran.length} que ya no existen en el inglés`,
      vacias.length && `${vacias.length} vacías`,
    ].filter(Boolean)
    console.log(
      `${grave ? '✗' : problemas.length ? '·' : '✓'} web/cuenta/${f}: ${Object.keys(d).length}/${claves.length}` +
        (problemas.length ? ` — ${problemas.join(', ')}` : ''),
    )
    if (faltan.length && faltan.length <= 8) console.log(`    faltan: ${faltan.join(', ')}`)
  }
}

async function main() {
  const { IDIOMAS, IDIOMA_BASE } = await import(pathToFileURL(path.join(I18N, 'idiomas.ts')))
  const destinos = IDIOMAS.map((i) => i.id)
    .filter((id) => id !== IDIOMA_BASE && id !== 'en')
    .filter((id) => !soloIdioma || id === soloIdioma)

  // Código → inglés: el respaldo tiene que cubrir todo lo que la app pide.
  const en = { ...(await leer('dict.en.ts', 'EN')), ...(await leer('dict.en.tut.ts', 'EN_TUT')) }
  const usadas = clavesDelCodigo()
  const sinIngles = [...usadas].filter(([k]) => en[k] == null)
  if (sinIngles.length) {
    console.log(`✗ código → inglés: ${sinIngles.length} claves sin entrada en dict.en(.tut).ts`)
    for (const [k, archivo] of sinIngles.slice(0, 12)) console.log(`    ${k}  (${archivo})`)
    errores += sinIngles.length
  } else {
    console.log(`✓ código → inglés: ${usadas.size} claves literales cubiertas`)
  }

  // Familias dinámicas: basta con que el inglés tenga UNA clave del prefijo.
  // No prueba que el catálogo esté completo —eso pide el catálogo en la mano—
  // pero sí que no falte entero, que es el fallo que de verdad se ha dado.
  const familias = familiasDelCodigo()
  const clavesEn = Object.keys(en)
  const sinFamilia = [...familias].filter(([p]) => !clavesEn.some((k) => k.startsWith(p)))
  if (sinFamilia.length) {
    console.log(`✗ familias dinámicas: ${sinFamilia.length} sin ninguna clave en el inglés`)
    for (const [p, archivo] of sinFamilia) console.log(`    ${p}\${…}  (${archivo})`)
    errores += sinFamilia.length
  } else {
    console.log(`✓ familias dinámicas: ${familias.size} prefijos cubiertos`)
  }

  for (const capa of CAPAS) {
    const fuente = await leer(...capa.fuente)
    const claves = Object.keys(fuente)

    for (const id of destinos) {
      const [archivo, simbolo] = capa.destino(id)
      const dict = await leer(archivo, simbolo)
      if (!dict) {
        console.log(`✗ ${archivo}: no existe`)
        errores++
        continue
      }

      const faltan = claves.filter((k) => dict[k] == null)
      const sobran = Object.keys(dict).filter((k) => !(k in fuente))
      const rotas = []
      const vacias = []
      const conEmoji = []
      const largas = []
      const factor = factorDe(id)

      for (const k of claves) {
        const traducido = dict[k]
        if (traducido == null) continue
        if (!traducido.trim()) vacias.push(k)
        const a = marcadores(fuente[k]).join(',')
        const b = marcadores(traducido).join(',')
        if (a !== b) rotas.push(`${k}: {${a}} → {${b}}`)
        if (!RE_EMOJI.test(fuente[k]) && RE_EMOJI.test(traducido)) conEmoji.push(k)
        if (fuente[k].length >= MINIMO_LARGO && traducido.length > fuente[k].length * factor) {
          largas.push(`${k}: ${fuente[k].length}→${traducido.length}`)
        }
      }

      const problemas = []
      if (faltan.length) problemas.push(`${faltan.length} sin traducir`)
      if (sobran.length) problemas.push(`${sobran.length} que ya no existen en el inglés`)
      if (vacias.length) problemas.push(`${vacias.length} vacías`)
      if (rotas.length) problemas.push(`${rotas.length} con marcadores rotos`)
      if (conEmoji.length) problemas.push(`${conEmoji.length} con emoji nuevo`)

      // Los idiomas van al 100 %: una clave sin traducir es error, no aviso.
      const grave = rotas.length + vacias.length + faltan.length
      errores += grave
      avisos += largas.length

      const marca = grave ? '✗' : problemas.length ? '·' : '✓'
      console.log(`${marca} ${archivo}: ${Object.keys(dict).length}/${claves.length}` + (problemas.length ? ` — ${problemas.join(', ')}` : ''))

      for (const r of rotas.slice(0, 8)) console.log(`    marcador: ${r}`)
      for (const k of vacias.slice(0, 8)) console.log(`    vacía: ${k}`)
      for (const k of conEmoji.slice(0, 8)) console.log(`    emoji: ${k} = ${dict[k]}`)
      if (largas.length) console.log(`    largas (>${factor}×, revisar en su botón): ${largas.slice(0, 5).join(' · ')}${largas.length > 5 ? ` …+${largas.length - 5}` : ''}`)
      if (faltan.length && faltan.length <= 8) console.log(`    faltan: ${faltan.join(', ')}`)
    }
  }

  await portalCuenta()

  console.log(`\n${errores ? `${errores} errores` : 'sin errores'}, ${avisos} avisos de longitud`)
  if (errores) process.exitCode = 1
}

await main()
