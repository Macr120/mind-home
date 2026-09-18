/**
 * Rasteriza public/icon.svg (claro) y public/icon-oscuro.svg a los PNG que
 * necesita el empaquetado de escritorio:
 *
 * - `electron/build/icon.png` (1024×1024) a sangre, de donde electron-builder
 *   deriva el .ico de Windows (lo exige ≥512).
 * - `electron/build/icono-mac.png` (1024×1024), el MISMO arte pero recortado en
 *   squircle y con su margen: de ahí sale el .icns. macOS no recorta nada por
 *   su cuenta, así que un cuadrado a sangre se vería más grande que los demás
 *   iconos del Dock y delataría que la app no es de aquí.
 * - `electron/iconos/claro.png` y `oscuro.png` (256): los que el shell pone en
 *   la ventana/barra de tareas (Windows) o el Dock (macOS) EN CALIENTE según el
 *   aspecto del sistema (`nativeTheme`, ver electron/main.js). Viajan dentro
 *   del paquete (`files` del yml); electron/build no, que es buildResources.
 * - `electron/build/appx/*.png`, los mosaicos de Microsoft Store. Sin ellos el
 *   .appx sale con los placeholders «SampleAppx» de electron-builder, que además
 *   viven junto a su `makeappx.exe` roto (ver scripts/escritorio-win.mjs).
 *   Los `Square44x44Logo.targetsize-N_altform-unplated` van con el fondo NEGRO
 *   y los `_altform-lightunplated` con el BLANCO: Windows elige uno u otro
 *   según el tema de la barra de tareas (oscuro / claro), que es la única forma
 *   de que un icono de Store cambie con el aspecto. electron-builder copia a
 *   `assets/` todo lo que haya en electron/build/appx y makepri lo indexa.
 *
 * Corre solo en escritorio:win|mac.
 */
import { mkdir } from 'node:fs/promises'
import sharp from 'sharp'

// Los SVG declaran 512px: density 144 (el doble de 72) los rasteriza a 1024 nativos.
const ICONO = { density: 144 }
const CLARO = 'public/icon.svg'
const OSCURO = 'public/icon-oscuro.svg'
// Blanco del borde del fondo de icon.svg (degradado radial): el mosaico ancho se rellena con él.
const FONDO = '#f2f2f2'

await mkdir('electron/build/appx', { recursive: true })
await mkdir('electron/iconos', { recursive: true })

await sharp(CLARO, ICONO).resize(1024, 1024).png().toFile('electron/build/icon.png')
await sharp(CLARO, ICONO).resize(256, 256).png().toFile('electron/iconos/claro.png')
await sharp(OSCURO, ICONO).resize(256, 256).png().toFile('electron/iconos/oscuro.png')

// macOS: la retícula de Apple deja el arte en 824 de 1024 y redondea a 185,4 de
// radio. `dest-in` recorta el arte a la máscara, y el resto del lienzo queda
// transparente: ese margen es el que iguala el icono con los del sistema.
const LIENZO = 1024
const ARTE = 824
const RADIO = 185.4
const mascara = Buffer.from(
  `<svg width="${ARTE}" height="${ARTE}"><rect width="${ARTE}" height="${ARTE}" rx="${RADIO}" ry="${RADIO}" fill="#fff"/></svg>`,
)
const squircle = await sharp(CLARO, ICONO)
  .resize(ARTE, ARTE)
  .composite([{ input: mascara, blend: 'dest-in' }])
  .png()
  .toBuffer()
await sharp({
  create: { width: LIENZO, height: LIENZO, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
})
  .composite([{ input: squircle, top: (LIENZO - ARTE) / 2, left: (LIENZO - ARTE) / 2 }])
  .png()
  .toFile('electron/build/icono-mac.png')

// Cuadrados: icon.svg ya trae su propio fondo, así que basta escalarlo.
for (const [nombre, lado] of [
  ['StoreLogo', 50],
  ['Square44x44Logo', 44],
  ['Square150x150Logo', 150],
]) {
  await sharp(CLARO, ICONO).resize(lado, lado).png().toFile(`electron/build/appx/${nombre}.png`)
}

// Barra de tareas y menú Inicio, sin «plato»: un juego por tema del sistema.
for (const lado of [16, 20, 24, 30, 32, 36, 40, 48, 64, 256]) {
  await sharp(OSCURO, ICONO).resize(lado, lado).png().toFile(`electron/build/appx/Square44x44Logo.targetsize-${lado}_altform-unplated.png`)
  await sharp(CLARO, ICONO).resize(lado, lado).png().toFile(`electron/build/appx/Square44x44Logo.targetsize-${lado}_altform-lightunplated.png`)
}

// Mosaico ancho (310×150): el icono NO se estira — se centra sobre el fondo de
// la marca, que es el mismo color, así que la unión no se ve.
const centro = await sharp(CLARO, ICONO).resize(130, 130).png().toBuffer()
await sharp({ create: { width: 310, height: 150, channels: 4, background: FONDO } })
  .composite([{ input: centro, gravity: 'centre' }])
  .png()
  .toFile('electron/build/appx/Wide310x150Logo.png')

console.log('electron/build/icon.png + icono-mac.png (squircle) + electron/iconos/{claro,oscuro}.png + mosaicos (con unplated claro/oscuro) en electron/build/appx/ listos')
