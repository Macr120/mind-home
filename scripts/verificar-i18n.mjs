/**
 * Revisa los diccionarios traducidos contra el inglés, que es la referencia de
 * qué claves existen.
 *
 * Lo que busca no es que la traducción sea buena —eso se mira en la app— sino
 * los fallos que NO se ven al abrirla: un marcador `{nombre}` que se perdió y
 * deja un hueco en la frase, un emoji colado donde el original no lo tenía, o
 * una clave que se quedó sin traducir. La longitud se avisa pero no falla: un
 * texto largo puede estar bien y solo hay que mirarlo en su botón.
 *
 *   node scripts/verificar-i18n.mjs
 *   node scripts/verificar-i18n.mjs --solo=de
 *
 * Sale con código 1 si hay errores, para poder encadenarlo en un script.
 */
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const I18N = path.join(RAIZ, 'src', 'core', 'i18n')

/** A partir de aquí la traducción se mira: puede no caber en su botón. */
const FACTOR_LARGO = 1.6
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

let errores = 0
let avisos = 0

async function main() {
  const { IDIOMAS, IDIOMA_BASE } = await import(pathToFileURL(path.join(I18N, 'idiomas.ts')))
  const destinos = IDIOMAS.map((i) => i.id)
    .filter((id) => id !== IDIOMA_BASE && id !== 'en')
    .filter((id) => !soloIdioma || id === soloIdioma)

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

      for (const k of claves) {
        const traducido = dict[k]
        if (traducido == null) continue
        if (!traducido.trim()) vacias.push(k)
        const a = marcadores(fuente[k]).join(',')
        const b = marcadores(traducido).join(',')
        if (a !== b) rotas.push(`${k}: {${a}} → {${b}}`)
        if (!RE_EMOJI.test(fuente[k]) && RE_EMOJI.test(traducido)) conEmoji.push(k)
        if (fuente[k].length >= MINIMO_LARGO && traducido.length > fuente[k].length * FACTOR_LARGO) {
          largas.push(`${k}: ${fuente[k].length}→${traducido.length}`)
        }
      }

      const problemas = []
      if (faltan.length) problemas.push(`${faltan.length} sin traducir`)
      if (sobran.length) problemas.push(`${sobran.length} que ya no existen en el inglés`)
      if (vacias.length) problemas.push(`${vacias.length} vacías`)
      if (rotas.length) problemas.push(`${rotas.length} con marcadores rotos`)
      if (conEmoji.length) problemas.push(`${conEmoji.length} con emoji nuevo`)

      const grave = rotas.length + vacias.length
      errores += grave
      avisos += largas.length

      const marca = grave ? '✗' : problemas.length ? '·' : '✓'
      console.log(`${marca} ${archivo}: ${Object.keys(dict).length}/${claves.length}` + (problemas.length ? ` — ${problemas.join(', ')}` : ''))

      for (const r of rotas.slice(0, 8)) console.log(`    marcador: ${r}`)
      for (const k of vacias.slice(0, 8)) console.log(`    vacía: ${k}`)
      for (const k of conEmoji.slice(0, 8)) console.log(`    emoji: ${k} = ${dict[k]}`)
      if (largas.length) console.log(`    largas (revisar en su botón): ${largas.slice(0, 5).join(' · ')}${largas.length > 5 ? ` …+${largas.length - 5}` : ''}`)
      if (faltan.length && faltan.length <= 8) console.log(`    faltan: ${faltan.join(', ')}`)
    }
  }

  console.log(`\n${errores ? `${errores} errores` : 'sin errores'}, ${avisos} avisos de longitud`)
  if (errores) process.exitCode = 1
}

await main()
