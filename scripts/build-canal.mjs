/**
 * Compila la web para un canal (Android, iOS o escritorio) con la clave de HERE
 * de SU app registrada, sin perder nada de la configuración de producción.
 *
 *   node scripts/build-canal.mjs android|ios|escritorio
 *   (lo llaman `npm run build:android`, `build:ios` y `build:escritorio`)
 *
 * Por qué así y no con `vite build --mode android`: el modo cambia qué archivos
 * `.env` carga Vite, y con un modo propio se queda FUERA `.env.production` —es
 * decir, las URLs del dominio y la clave de RevenueCat de Android—, que es
 * justo lo que el artefacto de tienda necesita. Aquí el build sigue siendo de
 * producción y solo se inyecta `VITE_HERE_KEY` por el entorno, que en Vite pisa
 * a los archivos `.env` (ver `loadEnv`). Detalles en `docs/HERE.md`.
 */
import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'

const CANALES = ['android', 'ios', 'escritorio']
const canal = process.argv[2]
if (!CANALES.includes(canal)) {
  console.error(`uso: node scripts/build-canal.mjs ${CANALES.join('|')}`)
  process.exit(1)
}

const RAIZ = process.cwd()
const archivo = `.env.${canal}.local`
const ruta = path.join(RAIZ, archivo)

if (!existsSync(ruta)) {
  console.error(
    `Falta ${archivo}, que guarda la clave de HERE de la app de ${canal}.\n` +
      `Créalo con: node scripts/clave-here.mjs --${canal === 'escritorio' ? 'windows' : canal} <clave>`,
  )
  process.exit(1)
}

const clave = (readFileSync(ruta, 'utf8').match(/^VITE_HERE_KEY=(.*)$/m)?.[1] ?? '').trim()
if (!clave) {
  console.error(`${archivo} no tiene VITE_HERE_KEY. Sin ella el artefacto saldría con la clave de la web.`)
  process.exit(1)
}

console.log(`Compilando el canal ${canal} con la clave de HERE de su app (…${clave.slice(-4)}).`)

const bin = path.join(RAIZ, 'node_modules', '.bin', process.platform === 'win32' ? 'vite.cmd' : 'vite')
const r = spawnSync(bin, ['build'], {
  stdio: 'inherit',
  env: { ...process.env, VITE_HERE_KEY: clave },
  shell: process.platform === 'win32',
})
process.exit(r.status ?? 1)
