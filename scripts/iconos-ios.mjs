/**
 * Icono y pantalla de arranque de iOS, sacados de los SVG de la marca
 * (`public/icon.svg`, `public/icon-oscuro.svg` y `public/favicon.svg`). Se
 * corre a mano cuando cambie el logo; lo generado se sube al repo, porque Xcode
 * compila lo que hay en disco.
 *
 *   npm run ios:iconos
 *
 * El catálogo (`AppIcon.appiconset/Contents.json`) declara las tres apariencias
 * de iOS 18: la clara (piezas sobre blanco), la oscura (sobre negro) y la
 * tintada (piezas en gris sin fondo, que iOS colorea con el tinte del usuario
 * sobre su propio degradado). El sistema cambia solo entre ellas con el
 * aspecto de la pantalla de inicio; en iOS < 18 se ve la clara.
 *
 * En Android los mismos PNG los genera `npm run app:iconos` (mipmap-*), así
 * que ese lado no se toca desde aquí.
 */
import sharp from 'sharp'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..')
const catalogo = join(raiz, 'ios/App/App/Assets.xcassets/AppIcon.appiconset')
const splashDir = join(raiz, 'ios/App/App/Assets.xcassets/Splash.imageset')

/** Fondo del tema oscuro (`--ui-bg`, y `background_color` del manifest). */
const FONDO = '#0f1115'
/** Cuánto del lienzo cuadrado ocupa el logo del arranque (ver abajo). */
const PROPORCION_LOGO = 0.22

// Iconos: los SVG ya traen su cuadrado opaco, pero `sharp` sacaría el PNG con
// canal alfa igualmente y el App Store RECHAZA un icono con transparencia.
// `flatten` lo quita. Una sola imagen de 1024 por apariencia: desde Xcode 14
// el resto de tamaños los deriva el propio catálogo.
const rasterizar = (svg) => sharp(svg, { density: 384 }).resize(1024, 1024)
await rasterizar(readFileSync(join(raiz, 'public/icon.svg')))
  .flatten({ background: '#ffffff' })
  .png()
  .toFile(join(catalogo, 'AppIcon-512@2x.png'))
await rasterizar(readFileSync(join(raiz, 'public/icon-oscuro.svg')))
  .flatten({ background: '#000000' })
  .png()
  .toFile(join(catalogo, 'AppIcon-512@2x-oscuro.png'))
// Tintado: icon.svg sin su rectángulo de fondo (las piezas en su sitio exacto), en gris y CON alfa.
const sinFondo = readFileSync(join(raiz, 'public/icon.svg'), 'utf8').replace(/<rect width="512" height="512" fill="url\(#fondo\)"\/>/, '')
await rasterizar(Buffer.from(sinFondo)).grayscale().png().toFile(join(catalogo, 'AppIcon-512@2x-tintado.png'))

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

console.log('iOS: icono (claro, oscuro y tintado) y arranque regenerados desde public/*.svg')
