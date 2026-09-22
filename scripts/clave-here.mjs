/**
 * Guarda una clave de HERE sin que pase por el historial del shell ni por la
 * pantalla: la pide por teclado, la escribe tapada con `*` y solo confirma los
 * cuatro primeros y los cuatro últimos caracteres.
 *
 *   node scripts/clave-here.mjs <clave>              -> .env.local            (web y `npm run dev`)
 *   node scripts/clave-here.mjs --android <clave>    -> .env.android.local    (`build:android`)
 *   node scripts/clave-here.mjs --ios <clave>        -> .env.ios.local        (`build:ios`)
 *   node scripts/clave-here.mjs --windows <clave>    -> .env.escritorio.local (`build:escritorio`)
 *   npm run here:clave                               -> la pide tapada, sin argumento
 *   npm run here:claves                              -> qué clave tiene cada canal (tapadas)
 *
 * HERE pide un App ID por aplicación y cuenta como distintas la web, Android,
 * iOS y el escritorio. Los cuatro archivos usan la MISMA variable
 * (`VITE_HERE_KEY`): el de la web lo lee Vite y los otros tres los inyecta
 * `scripts/build-canal.mjs` al compilar ese canal, así que cada artefacto sale
 * con una sola clave dentro (ver `docs/HERE.md`).
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { createInterface } from 'node:readline'

const VARIABLE = 'VITE_HERE_KEY'

const CANALES = {
  '--android': ['.env.android.local', 'android', 'app de Android'],
  '--ios': ['.env.ios.local', 'ios', 'app de iOS'],
  '--windows': ['.env.escritorio.local', 'escritorio', 'app de escritorio (Windows/macOS)'],
  '--escritorio': ['.env.escritorio.local', 'escritorio', 'app de escritorio (Windows/macOS)'],
}

// `--ver`: repaso de los cuatro canales sin revelar ninguna clave, para no
// confundirse al pegarlas (cuatro apps distintas en platform.here.com).
if (process.argv.includes('--ver')) {
  const tapar = (c) => (c ? `${c.slice(0, 4)}…${c.slice(-4)} (${c.length} caracteres)` : 'FALTA')
  const filas = [
    ['web', '.env.local', 'npm run build / npm run dev'],
    ['android', '.env.android.local', 'npm run build:android'],
    ['ios', '.env.ios.local', 'npm run build:ios'],
    ['escritorio', '.env.escritorio.local', 'npm run build:escritorio'],
  ].map(([canal, archivo, build]) => {
    const texto = existsSync(archivo) ? readFileSync(archivo, 'utf8') : ''
    const clave = (texto.match(/^VITE_HERE_KEY=(.*)$/m)?.[1] ?? '').trim()
    return { canal, archivo, build, clave }
  })
  for (const f of filas) console.log(`${f.canal.padEnd(11)} ${f.archivo.padEnd(22)} ${tapar(f.clave).padEnd(28)} ${f.build}`)
  const conClave = filas.filter((f) => f.clave)
  const repes = conClave.filter((f) => conClave.filter((o) => o.clave === f.clave).length > 1)
  console.log('')
  if (repes.length) console.log(`OJO: ${repes.map((f) => f.canal).join(' y ')} comparten clave; cada app de HERE tiene la suya.`)
  else if (conClave.length === 4) console.log('Las cuatro están y son distintas.')
  process.exit(0)
}

const canal = process.argv.find((a) => a in CANALES)
const desconocida = process.argv.slice(2).find((a) => a.startsWith('--') && !(a in CANALES) && a !== '--ver')
if (desconocida) {
  console.error(`No conozco la opción ${desconocida}. Usa --android, --ios, --windows o ninguna (web).`)
  process.exit(1)
}

const [ARCHIVO, MODO, QUE] = CANALES[canal] ?? ['.env.local', 'web', 'app web']
const ENCABEZADO = canal
  ? [
      `# Clave de HERE de la ${QUE} (su propio App ID en platform.here.com).`,
      `# La lee \`scripts/build-canal.mjs\` (npm run build:${MODO}) y la inyecta en el`,
      '# build de producción, así que el artefacto de este canal no lleva las',
      '# claves de los demás. Ver docs/HERE.md.',
    ]
  : ['# «Cómo llegar» (sala de viajes): clave del plan Base de HERE; ver docs/HERE.md']

/** Lee una línea sin mostrarla. Sin terminal interactiva cae a lectura normal. */
function pedirClaveTapada(pregunta) {
  return new Promise((resolve, reject) => {
    if (!process.stdin.isTTY) {
      const rl = createInterface({ input: process.stdin, output: process.stdout })
      rl.question(`${pregunta} `, (v) => {
        rl.close()
        resolve(v)
      })
      return
    }
    process.stdout.write(`${pregunta} `)
    let clave = ''
    process.stdin.setRawMode(true)
    process.stdin.resume()
    process.stdin.setEncoding('utf8')
    const alTeclear = (trozo) => {
      for (const c of trozo) {
        if (c === '\r' || c === '\n') {
          process.stdin.setRawMode(false)
          process.stdin.pause()
          process.stdin.off('data', alTeclear)
          process.stdout.write('\n')
          resolve(clave)
          return
        }
        if (c === '\u0003') {
          // Ctrl+C
          process.stdin.setRawMode(false)
          process.stdin.pause()
          process.stdout.write('\n')
          reject(new Error('cancelado'))
          return
        }
        if (c === '\u007f' || c === '\b') {
          if (clave.length > 0) {
            clave = clave.slice(0, -1)
            process.stdout.write('\b \b')
          }
          continue
        }
        // Los pegados llegan de golpe: se tapan igual, carácter a carácter.
        if (c >= ' ') {
          clave += c
          process.stdout.write('*')
        }
      }
    }
    process.stdin.on('data', alTeclear)
  })
}

const tapada = (c) => (c.length > 12 ? `${c.slice(0, 4)}…${c.slice(-4)} (${c.length} caracteres)` : `${c.length} caracteres`)

// La clave puede venir pegada en la propia orden; si no, se pide por teclado.
const suelta = process.argv.slice(2).find((a) => !a.startsWith('--'))

let clave = suelta?.trim() ?? ''
if (!clave) {
  try {
    clave = (await pedirClaveTapada(`Pega la clave de HERE de la ${QUE} y pulsa Enter:`)).trim()
  } catch {
    console.error(`Cancelado: no se ha tocado ${ARCHIVO}.`)
    process.exit(1)
  }
}

if (!clave) {
  console.error(`No has pegado nada: ${ARCHIVO} se queda igual.`)
  process.exit(1)
}
if (/\s/.test(clave)) {
  console.error('La clave lleva espacios o saltos de línea: cópiala de nuevo desde Access Manager → Credentials.')
  process.exit(1)
}
if (clave.length < 20) {
  console.error(`Eso parece corto para una clave de HERE (${clave.length} caracteres). No se ha guardado nada.`)
  process.exit(1)
}

const nuevo = `${VARIABLE}=${clave}`
if (existsSync(ARCHIVO)) {
  const texto = readFileSync(ARCHIVO, 'utf8')
  const eol = texto.includes('\r\n') ? '\r\n' : '\n'
  const linea = new RegExp(`^${VARIABLE}=.*$`, 'm')
  const tenia = linea.test(texto)
  const salida = tenia
    ? texto.replace(linea, nuevo)
    : texto.replace(/\s*$/, '') + eol.repeat(2) + ENCABEZADO.join(eol) + eol + nuevo + eol
  writeFileSync(ARCHIVO, salida)
  console.log(`${tenia ? 'Actualizada' : 'Añadida'} la clave de la ${QUE} en ${ARCHIVO}: ${tapada(clave)}`)
} else {
  writeFileSync(ARCHIVO, `${ENCABEZADO.join('\n')}\n${nuevo}\n`)
  console.log(`Creado ${ARCHIVO} con la clave de la ${QUE}: ${tapada(clave)}`)
}
console.log(
  canal
    ? `La usará \`npm run build:${MODO}\`; no hace falta reiniciar Vite.`
    : 'Reinicia Vite (Ctrl+C y `npm run dev`) para que la app vea la clave.',
)
