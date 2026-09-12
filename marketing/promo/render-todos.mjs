// Renderiza el anuncio en uno o varios idiomas: out/<id>.mp4 (1080×1920, 30 fps, H.264 + AAC).
//
//   node render-todos.mjs            los 16
//   node render-todos.mjs es en      solo esos
//
// Empaqueta el proyecto UNA sola vez y renderiza cada composición `Promo-<id>`
// por la API de Node (el CLI volvería a empaquetar y a copiar `public/` por idioma).
import { bundle } from '@remotion/bundler'
import { renderMedia, selectComposition } from '@remotion/renderer'
import { mkdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const RAIZ = path.dirname(fileURLToPath(import.meta.url))
const IDIOMAS = ['es', 'en', 'pt', 'fr', 'de', 'it', 'ja', 'zh', 'ko', 'ru', 'hi', 'tr', 'id', 'pl', 'nl', 'ar']
const pedidos = process.argv.slice(2).filter((a) => IDIOMAS.includes(a))
const objetivo = pedidos.length ? pedidos : IDIOMAS

mkdirSync(path.join(RAIZ, 'out'), { recursive: true })
console.log('empaquetando…')
const serveUrl = await bundle({
  entryPoint: path.join(RAIZ, 'src', 'index.ts'),
  publicDir: path.join(RAIZ, 'public'),
})

for (const id of objetivo) {
  const salida = path.join(RAIZ, 'out', id + '.mp4')
  const composition = await selectComposition({ serveUrl, id: 'Promo-' + id })
  const t0 = Date.now()
  let ultimo = -1
  await renderMedia({
    composition,
    serveUrl,
    codec: 'h264',
    audioCodec: 'aac',
    crf: 18,
    imageFormat: 'jpeg',
    jpegQuality: 92,
    concurrency: 6,
    outputLocation: salida,
    onProgress: ({ progress }) => {
      const p = Math.floor(progress * 20)
      if (p !== ultimo) {
        ultimo = p
        process.stdout.write(`\r  ${id}: ${Math.round(progress * 100)} %   `)
      }
    },
  })
  console.log(`\r✓ ${id}: ${(composition.durationInFrames / composition.fps).toFixed(1)} s → out/${id}.mp4 (${((Date.now() - t0) / 1000).toFixed(0)} s)`)
}
