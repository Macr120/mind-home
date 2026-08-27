/**
 * `npx cap sync ios` corriendo en WINDOWS escribe las rutas de los plugins en
 * `ios/App/CapApp-SPM/Package.swift` con barras invertidas
 * (`..\..\..\node_modules\@capacitor\app`), y Swift Package Manager no las
 * resuelve en la Mac: el proyecto no compila. Esto las normaliza.
 *
 *   node scripts/arreglar-package-swift.mjs
 */
import { readFile, writeFile } from 'node:fs/promises'

const RUTA = 'ios/App/CapApp-SPM/Package.swift'
const antes = await readFile(RUTA, 'utf8')
const despues = antes.replace(/path: "([^"]+)"/g, (_, ruta) => `path: "${ruta.split('\\').join('/')}"`)

if (antes === despues) {
  console.log('Las rutas ya estaban bien.')
} else {
  await writeFile(RUTA, despues, 'utf8')
  console.log('Rutas normalizadas:')
  for (const l of despues.split('\n').filter((l) => l.includes('path:'))) console.log(' ', l.trim())
}
