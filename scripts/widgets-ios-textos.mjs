/**
 * Genera los Localizable.strings de la extensión de widgets de iOS a partir de
 * los strings.xml YA traducidos de Android.
 *
 * Los once textos fijos de los widgets (nombre y descripción de cada uno, los
 * botones del de chat, el vacío y la etiqueta de palomear) son los mismos en
 * las dos plataformas. Tenerlos dos veces a mano significaría que una copia
 * envejece, así que Android es la fuente y esto los traduce de formato.
 *
 *   node scripts/widgets-ios-textos.mjs   (o `npm run ios:textos-widgets`)
 */
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..')
const RES = join(raiz, 'android/app/src/main/res')
const DESTINO = join(raiz, 'ios/App/MPHWidgets')

/** Las claves que consume la extensión; el resto de strings.xml no le sirve. */
const CLAVES = [
  'widget_hoy_label',
  'widget_hoy_desc',
  'widget_casa_label',
  'widget_casa_desc',
  'widget_chat_label',
  'widget_chat_desc',
  'widget_vacio',
  'widget_palomear',
  'widget_chat_abrir',
  'widget_chat_camara',
  'widget_chat_voz',
]

/**
 * Android → iOS. Coinciden salvo el indonesio: Android usa el código legado
 * `in` y iOS el actual `id`. La carpeta `values` a secas es el inglés.
 */
const IDIOMAS = [
  ['values', 'en'],
  ['values-ar', 'ar'],
  ['values-de', 'de'],
  ['values-es', 'es'],
  ['values-fr', 'fr'],
  ['values-hi', 'hi'],
  ['values-in', 'id'],
  ['values-it', 'it'],
  ['values-ja', 'ja'],
  ['values-ko', 'ko'],
  ['values-nl', 'nl'],
  ['values-pl', 'pl'],
  ['values-pt', 'pt'],
  ['values-ru', 'ru'],
  ['values-tr', 'tr'],
  ['values-zh', 'zh'],
]

/** Desescapa lo que Android escapa y escapa lo que .strings necesita. */
function aStrings(valor) {
  return valor
    .replace(/\\'/g, "'")
    .replace(/\\"/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
}

function leer(carpeta) {
  const archivo = join(RES, carpeta, 'strings.xml')
  if (!existsSync(archivo)) return null
  const xml = readFileSync(archivo, 'utf8')
  const textos = {}
  for (const clave of CLAVES) {
    // `[^]` y no `.` para que un texto con salto de línea no se pierda.
    const m = xml.match(new RegExp(`<string name="${clave}">([^]*?)</string>`))
    if (m) textos[clave] = aStrings(m[1])
  }
  return textos
}

// El inglés es el respaldo: si a un idioma le falta una clave, iOS caería al
// desarrollo (la clave cruda) y el widget enseñaría «widget_chat_voz».
const base = leer('values')
if (!base) throw new Error(`No encuentro ${join(RES, 'values/strings.xml')}`)
const faltan = CLAVES.filter((c) => !base[c])
if (faltan.length) throw new Error(`Faltan en el inglés: ${faltan.join(', ')}`)

let escritos = 0
for (const [carpeta, lproj] of IDIOMAS) {
  const textos = leer(carpeta)
  if (!textos) {
    console.warn(`⚠️  sin ${carpeta}/strings.xml — ${lproj} se queda en inglés`)
    continue
  }
  const dir = join(DESTINO, `${lproj}.lproj`)
  mkdirSync(dir, { recursive: true })
  const cuerpo = CLAVES.map((c) => `"${c}" = "${textos[c] ?? base[c]}";`).join('\n')
  writeFileSync(
    join(dir, 'Localizable.strings'),
    `/* Generado por scripts/widgets-ios-textos.mjs desde android/…/${carpeta}/strings.xml.\n   No editar a mano: se regenera. */\n${cuerpo}\n`,
    'utf8',
  )
  escritos++
}
console.log(`✓ ${escritos} idiomas en ${DESTINO}/<idioma>.lproj/Localizable.strings`)
