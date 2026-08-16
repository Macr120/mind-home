/**
 * Parte cada `demo*.data.i18n.ts` monolítico (las 14 ramas de idioma en un solo
 * módulo) en un archivo POR IDIOMA + un índice de cargadores perezosos:
 *
 *   demo.data.i18n.ts        ← índice: { pt: () => import('./demo.data.i18n.pt'), … }
 *   demo.data.i18n.pt.ts     ← export default { …rama pt… }
 *   demo.data.i18n.fr.ts     …
 *
 * Motivo: el monolito obligaba a descargar ~14 idiomas (~1,1 MB gz en total)
 * para usar UNO al construir la casa demo. `builders.ts::textos()` entiende
 * ambos formatos, así que la migración es segura e idempotente.
 *
 *   node scripts/partir-demo-i18n.mjs
 */
import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const ROOMS = path.join(RAIZ, 'src', 'rooms')

/** Orden canónico de los idiomas extra (los de `IDIOMAS` sin es/en): diffs estables. */
export const ORDEN_IDIOMAS = ['pt', 'fr', 'de', 'it', 'ja', 'zh', 'ko', 'ru', 'hi', 'tr', 'id', 'pl', 'nl', 'ar']

export const cabeceraRama = (cuarto, base, idioma) => `/**
 * Rama «${idioma}» del año demo de ${cuarto}. Solo se descarga si el usuario
 * está en ese idioma (el índice \`${base}.i18n.ts\` la carga con import()).
 *
 * Las frases se traducen en \`traducciones/${cuarto}.${idioma}.json\`; este
 * archivo lo montan \`partir-demo-i18n.mjs\` / \`traducir-a-mano.mjs meter\` —
 * no lo edites a mano.
 */`

const cabeceraIndice = (cuarto, base) => `/**
 * Cargadores por idioma del año demo de ${cuarto}: el español y el inglés
 * viajan en \`${base}.ts\`; cada rama extra vive en \`${base}.i18n.<idioma>.ts\`
 * y solo se descarga la del idioma activo (ver \`builders.ts::textos\`).
 *
 * Lo montan \`partir-demo-i18n.mjs\` / \`traducir-a-mano.mjs meter\` — no lo
 * edites a mano.
 */`

/** Reescribe el índice de cargadores a partir de las ramas presentes en disco. */
export function escribirIndice(dirCuarto, base) {
  const cuarto = path.basename(dirCuarto)
  const idiomas = readdirSync(dirCuarto)
    .map((f) => f.match(new RegExp(`^${base.replaceAll('.', '\\.')}\\.i18n\\.([a-z]{2})\\.ts$`))?.[1])
    .filter(Boolean)
    .sort((a, b) => ORDEN_IDIOMAS.indexOf(a) - ORDEN_IDIOMAS.indexOf(b))
  const lineas = idiomas.map((id) => `  ${id}: () => import('./${base}.i18n.${id}'),`).join('\n')
  writeFileSync(
    path.join(dirCuarto, `${base}.i18n.ts`),
    `${cabeceraIndice(cuarto, base)}\nexport default {\n${lineas}\n}\n`,
    'utf8',
  )
  return idiomas
}

const esEjecucionDirecta = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)

if (esEjecucionDirecta) {
  let partidos = 0
  for (const cuarto of readdirSync(ROOMS)) {
    const dir = path.join(ROOMS, cuarto)
    let archivos
    try {
      archivos = readdirSync(dir).filter((f) => /^demo.*\.data\.i18n\.ts$/.test(f))
    } catch {
      continue // no es carpeta
    }
    for (const archivo of archivos) {
      const ruta = path.join(dir, archivo)
      const texto = readFileSync(ruta, 'utf8')
      if (texto.includes('import(')) continue // ya es índice: idempotente
      const marca = 'export default '
      const json = JSON.parse(texto.slice(texto.indexOf(marca) + marca.length))
      const base = archivo.replace(/\.i18n\.ts$/, '')
      const tallas = []
      for (const [idioma, rama] of Object.entries(json)) {
        const destino = path.join(dir, `${base}.i18n.${idioma}.ts`)
        const cuerpo = `${cabeceraRama(cuarto, base, idioma)}\nexport default ${JSON.stringify(rama, null, 2)}\n`
        writeFileSync(destino, cuerpo, 'utf8')
        tallas.push(`${idioma} ${(cuerpo.length / 1024).toFixed(0)}K`)
      }
      const idiomas = escribirIndice(dir, base)
      partidos++
      console.log(`${cuarto}/${archivo}: ${idiomas.length} idiomas (${tallas.join(', ')})`)
    }
  }
  console.log(partidos ? `\n${partidos} archivos partidos.` : 'Nada que partir (todo ya es índice).')
}
