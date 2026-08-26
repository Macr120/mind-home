/**
 * Rasteriza public/icon.svg a los PNG que necesita el empaquetado de escritorio:
 *
 * - `electron/build/icon.png` (1024×1024), de donde electron-builder deriva el
 *   .ico de Windows y el .icns de macOS (lo exige ≥512).
 * - `electron/build/appx/*.png`, los cuatro mosaicos de Microsoft Store. Sin
 *   ellos el .appx sale con los placeholders «SampleAppx» de electron-builder,
 *   que además viven junto a su `makeappx.exe` roto (ver scripts/escritorio-win.mjs).
 *
 * Corre solo en escritorio:win|mac.
 */
import { mkdir } from 'node:fs/promises'
import sharp from 'sharp'

// El SVG declara 512px: density 144 (el doble de 72) lo rasteriza a 1024 nativos.
const ICONO = { density: 144 }
// El mismo verde del fondo de icon.svg: el mosaico ancho se rellena con él.
const FONDO = '#576748'

await mkdir('electron/build/appx', { recursive: true })

await sharp('public/icon.svg', ICONO).resize(1024, 1024).png().toFile('electron/build/icon.png')

// Cuadrados: icon.svg ya trae su propio fondo, así que basta escalarlo.
for (const [nombre, lado] of [
  ['StoreLogo', 50],
  ['Square44x44Logo', 44],
  ['Square150x150Logo', 150],
]) {
  await sharp('public/icon.svg', ICONO).resize(lado, lado).png().toFile(`electron/build/appx/${nombre}.png`)
}

// Mosaico ancho (310×150): el icono NO se estira — se centra sobre el fondo de
// la marca, que es el mismo color, así que la unión no se ve.
const centro = await sharp('public/icon.svg', ICONO).resize(130, 130).png().toBuffer()
await sharp({ create: { width: 310, height: 150, channels: 4, background: FONDO } })
  .composite([{ input: centro, gravity: 'centre' }])
  .png()
  .toFile('electron/build/appx/Wide310x150Logo.png')

console.log('electron/build/icon.png (1024×1024) + 4 mosaicos en electron/build/appx/ listos')
