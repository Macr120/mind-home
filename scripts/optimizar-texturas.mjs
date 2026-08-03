/**
 * Reduce las texturas de public/textures/floors/ a un tamaño razonable.
 *
 * Eran ~29 MB en 27 JPG de hasta 2.3 MB (2048px+): pesan en el APK y en el
 * egress, y además se usan como swatches de 32px en el editor. Se reescalan a
 * 512px como máximo (son texturas que se repiten en mosaico: a la distancia de
 * la cámara isométrica no se nota) y se recomprimen. Solo toca archivos que
 * superen el límite, así que es idempotente. Los originales viven en git.
 *
 * Uso: node scripts/optimizar-texturas.mjs
 */
import { readdir, readFile, stat, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import sharp from 'sharp'

const DIR = join(process.cwd(), 'public', 'textures', 'floors')
const LADO_MAX = 512
const CALIDAD = 80

const archivos = (await readdir(DIR)).filter((f) => f.endsWith('.jpg'))
let antes = 0
let despues = 0

for (const nombre of archivos) {
  const ruta = join(DIR, nombre)
  const tam = (await stat(ruta)).size
  antes += tam

  // Se lee entero a memoria: si sharp abre el archivo por ruta, Windows lo
  // mantiene bloqueado y el writeFile de abajo falla.
  const original = await readFile(ruta)
  const img = sharp(original)
  const meta = await img.metadata()
  const lado = Math.max(meta.width ?? 0, meta.height ?? 0)
  if (lado <= LADO_MAX && tam < 200_000) {
    despues += tam
    continue
  }

  const buf = await img
    .resize({ width: LADO_MAX, height: LADO_MAX, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: CALIDAD, mozjpeg: true })
    .toBuffer()
  await writeFile(ruta, buf)
  despues += buf.length
  console.log(`${nombre}: ${(tam / 1024).toFixed(0)} KB → ${(buf.length / 1024).toFixed(0)} KB`)
}

console.log(
  `\nTotal: ${(antes / 1024 / 1024).toFixed(1)} MB → ${(despues / 1024 / 1024).toFixed(1)} MB`,
)
