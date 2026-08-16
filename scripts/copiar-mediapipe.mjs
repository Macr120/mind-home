// Copia los assets de MediaPipe (wasm + modelo facial, ~22 MB) de la máscara AR
// al public/ de la app principal, para que el overlay funcione offline. La única
// fuente en git es marketing/mascara/public/mediapipe; public/mediapipe está en
// .gitignore. Corre solo en predev/prebuild y es no-op si ya está al día.
import { copyFileSync, existsSync, mkdirSync, readdirSync, statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const origen = path.join(raiz, 'marketing', 'mascara', 'public', 'mediapipe')
const destino = path.join(raiz, 'public', 'mediapipe')

if (!existsSync(origen)) {
  console.error(`[mediapipe] No existe ${origen}: la máscara AR no tendrá modelo.`)
  process.exit(1)
}

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
if (copiados) console.log(`[mediapipe] ${copiados} asset(s) copiados a public/mediapipe`)
