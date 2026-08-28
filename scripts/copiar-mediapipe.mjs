// Copia los assets de MediaPipe (wasm + modelo facial, ~22 MB) de la máscara AR
// al public/ de la app principal y al de la web pública (/mascara). La única
// fuente en git es marketing/mascara/public/mediapipe; los destinos están en
// .gitignore. Corre en predev/prebuild (y sus :web) y es no-op si ya está al día.
import { copyFileSync, existsSync, mkdirSync, readdirSync, statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const origen = path.join(raiz, 'marketing', 'mascara', 'public', 'mediapipe')
const destinos = [path.join(raiz, 'public', 'mediapipe'), path.join(raiz, 'web', 'public', 'mediapipe')]

if (!existsSync(origen)) {
  console.error(`[mediapipe] No existe ${origen}: la máscara AR no tendrá modelo.`)
  process.exit(1)
}

for (const destino of destinos) {
  mkdirSync(destino, { recursive: true })
  let copiados = 0
  for (const nombre of readdirSync(origen)) {
    const de = path.join(origen, nombre)
    const a = path.join(destino, nombre)
    const info = statSync(de)
    if (existsSync(a)) {
      const previo = statSync(a)
      if (previo.size === info.size && previo.mtimeMs >= info.mtimeMs) continue
    }
    copyFileSync(de, a)
    copiados++
  }
  if (copiados) console.log(`[mediapipe] ${copiados} asset(s) copiados a ${path.relative(raiz, destino)}`)
}
