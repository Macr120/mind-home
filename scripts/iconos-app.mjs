/**
 * Iconos de la app, sacados del SVG de la marca: `public/icon.svg` (con fondo)
 * y `public/favicon.svg` (las piezas solas, con su relieve). Se corre a mano
 * cuando cambie el logo y lo generado se sube al repo. iOS y el escritorio
 * tienen su propio guion (`ios:iconos`, `escritorio:icono`).
 *
 *   npm run app:iconos
 *
 * - `public/icon-192.png` e `icon-512.png`: el manifest de la PWA, a sangre.
 * - `web/public/apple-touch-icon.png`: la web en la pantalla de inicio de iOS.
 * - Android (`mipmap-*`): `ic_launcher_foreground.png` es la capa de arriba del
 *   icono adaptativo (Android 8+): las piezas SIN fondo dentro de la zona
 *   segura (66 de 108 dp), así ninguna máscara del launcher les corta un lado;
 *   el fondo lo pone `@color/ic_launcher_background`. `ic_launcher.png`
 *   (cuadrado redondeado) e `ic_launcher_round.png` (círculo) son los de
 *   Android < 8, que no enmascara nada.
 * - `marketing/icono/`: los iconos de las fichas (Play 512, App Store 1024 sin
 *   alfa), el catálogo de Xcode de 25 tamaños y una copia de los de Android.
 */
import { mkdir, readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..')
const en = (...p) => join(raiz, ...p)

/** Verde del borde del fondo de icon.svg (es un degradado radial), para aplanar. */
const VERDE = '#4e600d'

// Una sola rasterización grande de cada SVG; el resto sale reduciéndola.
// icon.svg declara 512 px: density 144 (2 × 72) lo deja en 1024 nativos.
const icono = await sharp(en('public/icon.svg'), { density: 144 }).resize(1024, 1024).png().toBuffer()
// favicon.svg declara 389 × 138: las piezas (357 × 100) más margen para la sombra.
const PIEZAS = { ancho: 389, arte: 357 }
const piezas = await sharp(en('public/favicon.svg'), { density: 72 * 4 }).png().toBuffer()

const cuadrado = (lado) => sharp(icono).resize(lado, lado)

/** Cuadrado a sangre; `alfa: false` lo aplana (las tiendas rechazan transparencia). */
async function guardar(destino, lado, { alfa = true } = {}) {
  await mkdir(dirname(destino), { recursive: true })
  const img = cuadrado(lado)
  await (alfa ? img : img.flatten({ background: VERDE }).removeAlpha()).png().toFile(destino)
}

/** Recorte con una máscara SVG (`dest-in` deja solo lo que pisa la máscara). */
async function recortado(destino, lado, mascara) {
  await mkdir(dirname(destino), { recursive: true })
  const svg = Buffer.from(`<svg width="${lado}" height="${lado}">${mascara}</svg>`)
  await cuadrado(lado).composite([{ input: svg, blend: 'dest-in' }]).png().toFile(destino)
}

/** Capa de arriba del icono adaptativo: las piezas en la zona segura (66 de 108). */
async function primerPlano(destino, lado) {
  await mkdir(dirname(destino), { recursive: true })
  const anchoArte = Math.round((lado * 66) / 108)
  const ancho = Math.round((anchoArte * PIEZAS.ancho) / PIEZAS.arte)
  const capa = await sharp(piezas).resize({ width: ancho }).png().toBuffer()
  await sharp({
    create: { width: lado, height: lado, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([{ input: capa, gravity: 'centre' }])
    .png()
    .toFile(destino)
}

// PWA y web pública.
await guardar(en('public/icon-192.png'), 192)
await guardar(en('public/icon-512.png'), 512)
await guardar(en('web/public/apple-touch-icon.png'), 180)

// Android: las cinco densidades, en el proyecto y en la copia de marketing.
const DENSIDADES = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 }
for (const [nombre, factor] of Object.entries(DENSIDADES)) {
  const lado = 48 * factor
  for (const base of ['android/app/src/main/res', 'marketing/icono/android']) {
    const carpeta = en(base, `mipmap-${nombre}`)
    await recortado(
      join(carpeta, 'ic_launcher.png'),
      lado,
      `<rect width="${lado}" height="${lado}" rx="${lado * 0.2}" fill="#fff"/>`,
    )
    await recortado(
      join(carpeta, 'ic_launcher_round.png'),
      lado,
      `<circle cx="${lado / 2}" cy="${lado / 2}" r="${lado / 2}" fill="#fff"/>`,
    )
    await primerPlano(join(carpeta, 'ic_launcher_foreground.png'), 108 * factor)
  }
}
await primerPlano(en('marketing/icono/android/adaptive-foreground.png'), 1024)

// Fichas de las tiendas.
await guardar(en('marketing/icono/playstore.png'), 512)
await guardar(en('marketing/icono/appstore.png'), 1024, { alfa: false })
await guardar(en('marketing/icono/AppIcon.icon/Assets/icon.png'), 1024, { alfa: false })

// Catálogo de Xcode: un PNG por tamaño real (`expected-size`), sin alfa.
const catalogo = en('marketing/icono/Assets.xcassets/AppIcon.appiconset')
const { images } = JSON.parse(await readFile(join(catalogo, 'Contents.json'), 'utf8'))
for (const lado of new Set(images.map((i) => Number(i['expected-size'])))) {
  await guardar(join(catalogo, `${lado}.png`), lado, { alfa: false })
}

console.log('Iconos de la app regenerados desde public/icon.svg y public/favicon.svg')
