/**
 * Multiplica las páginas ESTÁTICAS de la web por idioma, después del build de
 * Vite. `dist-web/index.html` trae marcas `{{clave}}`; este script las sustituye
 * con el catálogo de cada idioma y escribe una copia en `dist-web/<id>/`.
 *
 * Por qué una página por idioma y no un swap en el navegador: estas páginas no
 * cargan JavaScript (es su gracia) y son las que indexa Google. Con HTML por
 * idioma cada versión es una URL real, sin destello de otro idioma ni SEO
 * perdido; Cloudflare Pages resuelve `/en/` y `/en/privacidad` sin configurar
 * nada.
 *
 *   node scripts/web-i18n.mjs        (lo encadena `npm run build:web`)
 */
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { IDIOMAS, IDIOMA_ORIGEN, prefijo } from '../web/i18n/idiomas.mjs'

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const DIST = path.join(RAIZ, 'dist-web')
const CATALOGOS = path.join(RAIZ, 'web', 'i18n', 'paginas')

/** Las páginas sin JS que se multiplican. `cuenta.html` NO: es la app React. */
const PAGINAS = ['index.html', 'privacidad.html', 'terminos.html']

if (!existsSync(DIST)) {
  console.error('dist-web no existe: corre primero `vite build --config vite.config.web.ts`')
  process.exit(1)
}

const catalogo = async (id) =>
  (await import(pathToFileURL(path.join(CATALOGOS, `${id}.mjs`)).href)).TEXTOS

/**
 * Solo los idiomas que YA tienen catálogo. Traducir la web entera es un trabajo
 * por tandas: mientras uno no esté, ni se genera ni aparece en el selector —
 * mejor que ofrecer un idioma que llevaría a una página a medio traducir.
 */
const DISPONIBLES = IDIOMAS.filter((i) => existsSync(path.join(CATALOGOS, `${i.id}.mjs`)))
const pendientes = IDIOMAS.filter((i) => !DISPONIBLES.includes(i)).map((i) => i.id)

const escapar = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/**
 * Sustituye `{{clave}}` por su texto. El valor puede traer HTML en línea (un
 * enlace dentro de una frase), así que va tal cual; `{{clave|attr}}` es la misma
 * clave escapada para meterla en un atributo (title, content, alt).
 */
function traducir(html, textos, faltan) {
  return html.replace(/\{\{([\w.-]+)(\|attr)?\}\}/g, (_, clave, attr) => {
    const v = textos[clave]
    if (v === undefined) {
      faltan.add(clave)
      return ''
    }
    return attr ? escapar(v) : v
  })
}

/**
 * Deja los enlaces INTERNOS dentro del idioma: desde `/en/` un `/privacidad`
 * devolvería al español. Solo se tocan las cuatro rutas de la web (y su ancla);
 * los assets (`/estilos.css`, `/favicon.svg`), los `mailto:`, las anclas sueltas
 * y las URLs absolutas de la app se quedan como están.
 */
function localizarEnlaces(html, id) {
  if (id === IDIOMA_ORIGEN) return html
  return html.replace(
    /href="\/(cuenta|privacidad|terminos)?((?:#[^"]*)?)"/g,
    (_, ruta, ancla) => `href="/${id}/${ruta ?? ''}${ancla}"`,
  )
}

/**
 * El enlace al ORIGINAL en español de las páginas legales («la versión española
 * prevalece»). En el catálogo lleva la ruta abstracta `/original` por dos
 * razones: así la MISMA frase sirve en privacidad y en términos, y así
 * `localizarEnlaces` —que solo conoce las tres rutas reales— no lo mete dentro
 * del idioma. Es el único enlace que debe SALIR de él.
 */
function enlaceOriginal(html, pagina) {
  return html.replaceAll('href="/original"', `href="/${pagina.replace('.html', '')}"`)
}

/** El menú de idiomas, sin JavaScript: un `<details>` con un enlace por idioma. */
function selector(idActual, pagina) {
  const actual = IDIOMAS.find((i) => i.id === idActual)
  const suelta = pagina === 'index.html' ? '' : `/${pagina.replace('.html', '')}`
  // Elegir idioma GUARDA la elección. Sin esto, quien tuviera 'en' apuntado de
  // antes no podía volver al español: el enlace lleva a `/`, y allí la
  // autodetección leía el idioma viejo y lo devolvía a `/en/` — un bucle que
  // dejaba el español inalcanzable desde el selector.
  const enlaces = DISPONIBLES.map(
    (i) =>
      `<a lang="${i.id}" href="${prefijo(i.id)}${suelta || '/'}"${
        i.id === idActual ? ' aria-current="true"' : ''
      } onclick="try{localStorage.setItem('mph.idioma','${i.id}')}catch(e){}"` +
      `><span>${i.flag}</span>${i.endonimo}</a>`,
  ).join('')
  return (
    `<details class="idiomas"><summary title="Language"><span>${actual.flag}</span>` +
    `<span class="endonimo">${actual.endonimo}</span></summary><nav>${enlaces}</nav></details>`
  )
}

/**
 * Manda a su idioma a quien llega por primera vez. Va EN LÍNEA y antes de nada:
 * un archivo aparte tardaría en llegar y se vería un parpadeo de español. Solo
 * actúa en la raíz y solo una vez — si el visitante ya eligió (o ya está en su
 * idioma) no se mueve nada, y con una elección guardada manda esa.
 */
function autodeteccion() {
  const ids = DISPONIBLES.map((i) => i.id)
  return (
    `<script>(function(){try{var g=localStorage.getItem('mph.idioma');` +
    `var d=(g||navigator.language||'').slice(0,2).toLowerCase();` +
    `var L=${JSON.stringify(ids)};if(L.indexOf(d)<0||d==='${IDIOMA_ORIGEN}')return;` +
    `var p=location.pathname.replace(/\\/$/,'');location.replace('/'+d+(p||'/'));}catch(e){}})()</script>`
  )
}

/**
 * El botón de modo claro/oscuro. Se ve el SOL cuando estás en oscuro y la LUNA
 * cuando estás en claro: el icono es a dónde te lleva pulsarlo, no dónde estás.
 * El `title` va traducido, y sin JavaScript el botón no aparece siquiera — lo
 * escribe el propio script de tema, que es quien puede hacerlo funcionar.
 */
function botonTema(textos) {
  const etiqueta = escapar(textos['tema.boton'] ?? 'Light or dark mode')
  const html =
    `<button type="button" class="tema ui-boton" title="${etiqueta}" aria-label="${etiqueta}" ` +
    `onclick="mphTema()"><span class="luna">🌙</span><span class="sol">☀️</span></button>`
  return `<script>document.write(${JSON.stringify(html)});function mphTema(){` +
    `var d=document.documentElement,o=d.dataset.tema==='oscuro';` +
    `if(o)delete d.dataset.tema;else d.dataset.tema='oscuro';` +
    `try{localStorage.setItem('mph.tema',o?'claro':'oscuro')}catch(e){}}</script>`
}

/**
 * Aplica el tema guardado ANTES de pintar. Va en el <head> y en línea: con un
 * archivo aparte se vería un destello de claro antes de oscurecer.
 */
function temaGuardado() {
  return (
    `<script>try{if(localStorage.getItem('mph.tema')==='oscuro')` +
    `document.documentElement.dataset.tema='oscuro'}catch(e){}</script>`
  )
}

/** Guarda la elección del visitante: el enlace del selector no puede hacerlo solo. */
function recordarEleccion() {
  return (
    `<script>(function(){try{var m=location.pathname.match(/^\\/([a-z]{2})(\\/|$)/);` +
    `localStorage.setItem('mph.idioma',m?m[1]:'${IDIOMA_ORIGEN}');}catch(e){}})()</script>`
  )
}

const faltan = new Map()

// Las plantillas se leen ANTES del bucle: el idioma de origen se escribe encima
// de ellas (vive en la raíz), y leerlas dentro dejaría a los demás sin marcas.
const PLANTILLAS = new Map(
  PAGINAS.filter((p) => existsSync(path.join(DIST, p))).map((p) => [
    p,
    readFileSync(path.join(DIST, p), 'utf8'),
  ]),
)

for (const { id } of DISPONIBLES) {
  const textos = await catalogo(id)
  const destino = id === IDIOMA_ORIGEN ? DIST : path.join(DIST, id)
  mkdirSync(destino, { recursive: true })
  for (const pagina of PAGINAS) {
    const plantilla = PLANTILLAS.get(pagina)
    if (!plantilla) continue
    const sinTraducir = new Set()
    let html = enlaceOriginal(localizarEnlaces(traducir(plantilla, textos, sinTraducir), id), pagina)
    html = html
      .replace('<html lang="es"', `<html lang="${id}"`)
      // El selector va DESPUÉS de localizar: sus enlaces salen a otros idiomas.
      .replace('<!--selector-idiomas-->', selector(id, pagina))
      .replace('<!--boton-tema-->', botonTema(textos))
      // La autodetección solo en la raíz: dentro de /<id>/ ya se está donde toca.
      // El tema guardado se aplica en las dos, y antes que nada.
      .replace(
        '<!--idioma-script-->',
        temaGuardado() + (id === IDIOMA_ORIGEN ? autodeteccion() : recordarEleccion()),
      )
    writeFileSync(path.join(destino, pagina), html, 'utf8')
    if (sinTraducir.size) {
      const previo = faltan.get(id) ?? new Set()
      for (const c of sinTraducir) previo.add(c)
      faltan.set(id, previo)
    }
  }
  // `cuenta.html` se copia sin tocar: sus textos los pone React en el navegador,
  // pero necesita existir bajo cada idioma para que `/en/cuenta` no sea un 404.
  if (id !== IDIOMA_ORIGEN && existsSync(path.join(DIST, 'cuenta.html'))) {
    cpSync(path.join(DIST, 'cuenta.html'), path.join(destino, 'cuenta.html'))
  }
}

const generadas = DISPONIBLES.length * PLANTILLAS.size
console.log(`✓ web i18n: ${generadas} páginas en ${DISPONIBLES.length} idiomas`)
if (faltan.size) {
  console.error('✗ claves sin traducir:')
  for (const [id, claves] of faltan) console.error(`   ${id}: ${[...claves].join(', ')}`)
  process.exitCode = 1
}

// Aviso si algún catálogo trae claves que ya no usa ninguna página. Las que
// consume ESTE script (y no una marca de la plantilla) se apuntan a mano.
const usadas = new Set(['tema.boton'])
for (const plantilla of PLANTILLAS.values()) {
  for (const m of plantilla.matchAll(/\{\{([\w.-]+)(\|attr)?\}\}/g)) usadas.add(m[1])
}
const sobran = Object.keys(await catalogo(IDIOMA_ORIGEN)).filter((k) => !usadas.has(k))
if (sobran.length) console.warn(`  (sobran ${sobran.length} claves en el catálogo: ${sobran.join(', ')})`)

if (pendientes.length) {
  console.warn(`  (sin catálogo todavía, fuera del selector: ${pendientes.join(', ')})`)
}
if (!readdirSync(DIST).length) process.exitCode = 1
