/**
 * Icono y pantalla de arranque de iOS, sacados de los SVG de la marca
 * (`public/icon.svg` y `public/favicon.svg`). Se corre a mano cuando cambie el
 * logo; lo generado se sube al repo, porque Xcode compila lo que hay en disco.
 *
 *   npm run ios:iconos
 *
 * En Android los mismos PNG los generó una herramienta externa (mipmap-*), así
 * que ese lado no se toca desde aquí.
 */
import sharp from 'sharp'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..')
const iconoDestino = join(raiz, 'ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png')
const splashDir = join(raiz, 'ios/App/App/Assets.xcassets/Splash.imageset')

/** Fondo del tema oscuro (`--ui-bg`, y `background_color` del manifest). */
const FONDO = '#0f1115'
/** Verde del icono (el `<rect>` de icon.svg). */
const VERDE = '#576748'
/** Cuánto del lienzo cuadrado ocupa el logo del arranque (ver abajo). */
const PROPORCION_LOGO = 0.22

// Icono: icon.svg ya trae el cuadrado verde opaco, pero `sharp` sacaría el PNG
// con canal alfa igualmente y el App Store RECHAZA un icono con transparencia.
// `flatten` lo quita. Una sola imagen de 1024: desde Xcode 14 el resto de
// tamaños los deriva el propio catálogo.
await sharp(readFileSync(join(raiz, 'public/icon.svg')), { density: 384 })
  .resize(1024, 1024)
  .flatten({ background: VERDE })
  .png()
  .toFile(iconoDestino)

// Arranque: el logo SIN fondo (favicon.svg) centrado sobre el fondo del tema,
// para que el salto a la app no pase por un fogonazo blanco. El lienzo es
// cuadrado y el teléfono lo recorta a «aspect fill», así que el logo se queda
// en el 22 %: en un iPhone alto eso son ~4 de cada 10 de ancho de pantalla.
const logo = await sharp(readFileSync(join(raiz, 'public/favicon.svg')), { density: 384 })
  .resize({ width: Math.round(2732 * PROPORCION_LOGO) })
  .png()
  .toBuffer()
const splash = await sharp({
  create: { width: 2732, height: 2732, channels: 3, background: FONDO },
})
  .composite([{ input: logo, gravity: 'centre' }])
  .png()
  .toBuffer()
// Los tres archivos del imageset (1x, 2x y 3x) son el mismo dibujo: la
// plantilla de Capacitor los declara por separado y el catálogo los quiere ahí.
// El `flatten` va en esta segunda pasada y no arriba: sharp aplica flatten
// ANTES del composite pase donde pase en la cadena, así que allí no quitaría el
// alfa que trae el logo.
for (const nombre of ['splash-2732x2732.png', 'splash-2732x2732-1.png', 'splash-2732x2732-2.png']) {
  await sharp(splash).flatten({ background: FONDO }).png().toFile(join(splashDir, nombre))
}

console.log('iOS: icono y arranque regenerados desde public/*.svg')
