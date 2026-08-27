/**
 * Iconos del escritorio, sacados del SVG de la marca (`public/icon.svg`), igual
 * que los de iOS. Se corre a mano cuando cambie el logo; lo generado se sube al
 * repo, porque electron-builder empaqueta lo que hay en disco.
 *
 *   npm run escritorio:iconos
 *
 * Salen DOS imágenes porque los dos sistemas dibujan el icono al revés:
 *
 * - **macOS** recorta a mano: la app entrega el squircle ya dibujado, con su
 *   margen. La retícula de Apple deja el arte en 824 de 1024 y redondea a 185,4
 *   de radio; un cuadrado a sangre se vería más grande que los demás iconos del
 *   Dock y delataría que la app no es de aquí.
 * - **Windows** no recorta nada: ahí el icono va a sangre, cuadrado.
 *
 * De estos PNG salen el `.icns` y el `.ico` reales: los deriva electron-builder
 * al empaquetar, así que no hay que generar cada tamaño a mano.
 */
import sharp from 'sharp'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..')
const origen = readFileSync(join(raiz, 'public/icon.svg'))
const destino = join(raiz, 'escritorio/recursos')

/** Verde del icono (el `<rect>` de icon.svg), por si el SVG dejara alfa. */
const VERDE = '#576748'
/** La retícula de Apple: arte de 824 en un lienzo de 1024, radio 185,4. */
const LIENZO = 1024
const ARTE = 824
const RADIO = 185.4

const margen = Math.round((LIENZO - ARTE) / 2)

// macOS: el arte, recortado en squircle (`dest-in` deja solo lo que pisa la
// máscara) y centrado en el lienzo con su margen transparente alrededor.
const mascara = Buffer.from(
  `<svg width="${ARTE}" height="${ARTE}"><rect width="${ARTE}" height="${ARTE}" rx="${RADIO}" ry="${RADIO}" fill="#fff"/></svg>`,
)
const squircle = await sharp(origen, { density: 384 })
  .resize(ARTE, ARTE)
  .flatten({ background: VERDE })
  .composite([{ input: mascara, blend: 'dest-in' }])
  .png()
  .toBuffer()

await sharp({
  create: {
    width: LIENZO,
    height: LIENZO,
    channels: 4,
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  },
})
  .composite([{ input: squircle, top: margen, left: margen }])
  .png()
  .toFile(join(destino, 'icono.png'))

// Windows: a sangre y sin alfa, que es como se ve en la barra de tareas.
await sharp(origen, { density: 384 })
  .resize(LIENZO, LIENZO)
  .flatten({ background: VERDE })
  .png()
  .toFile(join(destino, 'icono-win.png'))

console.log('Iconos del escritorio listos en escritorio/recursos/')
