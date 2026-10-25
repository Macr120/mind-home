// Una imagen 4:5 (1080×1350) por cada parte de una guía, para Facebook e Instagram:
//   salida/<id>/final/plantilla-parte-N.jpg
//
//   node marketing/guias/plantillas.mjs ideas [es en …]
//
// De fondo, un cuadro de la lámina de la parte (la de la línea destacada si
// la hay, sin repetir entre partes); «Parte N» y el título de la parte; el dato
// de la parte (cifra grande + su texto) o, si no tiene, sus pasos; el narrador
// en una pose distinta por parte (capturada de `?pose=` en GUIAS_URL) y el sello
// de la guía. Cuatro composiciones y cinco colores se alternan entre partes.
// Antes de las partes, la portada (el narrador en su cuarto) y, al final, el
// cierre: la tarjeta del final de los videos con las tiendas.
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { FFMPEG, RAIZ, conPagina, dormir } from './cdp.mjs'
import { ICONOS, html as htmlTarjeta } from './tarjeta.mjs'
import { LOGO, sello } from './titulo.mjs'

/** En vez de la dirección de la página: los logos de donde se baja la app (web, Android, Apple y Windows). */
const PLATAFORMAS = `<div class="url">${['web', 'play', 'apple', 'microsoft'].map((k) => `<i>${ICONOS[k]}</i>`).join('')}</div>`

const [tema = 'ideas', ...resto] = process.argv.slice(2)
// `--solo=portada,cierre`: rehace solo esas (los nombres: portada, parte-N, cierre).
const SOLO = resto.find((a) => a.startsWith('--solo='))?.slice(7).split(',')
const pedidos = resto.filter((a) => !a.startsWith('--'))
const toca = (nombre) => !SOLO || SOLO.includes(nombre)
const SALIDA = path.join(RAIZ, tema, 'salida')
const TEXTOS = path.resolve(RAIZ, '..', '..', 'web', 'i18n', 'guias')
const PUBLICO = path.resolve(RAIZ, '..', '..', 'web', 'public', 'guias', tema)
const ids = pedidos.length ? pedidos : ['es', 'en', 'pt', 'fr', 'de', 'it', 'ja', 'zh', 'ko', 'ru', 'hi', 'tr', 'id', 'pl', 'nl', 'ar'].filter((id) => existsSync(path.join(RAIZ, tema, `guion.${id}.json`)))
const ANCHO = 1080
const ALTO = 1350
const { laminas = {} } = JSON.parse(readFileSync(path.join(RAIZ, tema, 'medios.json'), 'utf8'))
const FONDOS = path.join(RAIZ, tema, 'grabaciones', 'plantillas')
mkdirSync(FONDOS, { recursive: true })

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/** Como en miniaturas.mjs: en japonés y chino, <wbr> entre palabras para que no se parta a media palabra. */
function partible(texto, id) {
  if (!['ja', 'zh'].includes(id)) return esc(texto)
  const pegada = (seg) => id === 'ja' && /^[぀-ゟ　-〿！-？]/.test(seg)
  return [...new Intl.Segmenter(id, { granularity: 'word' }).segment(texto)].map((x, i) => (i && !pegada(x.segment) ? '<wbr>' : '') + esc(x.segment)).join('')
}

/** Las láminas de la parte, primero las de la línea destacada; sin las que cambian por idioma (app-plan.{idioma}). */
function laminasDe(parte) {
  const lineas = [...parte.lineas.filter((l) => l.destacada), ...parte.lineas.filter((l) => !l.destacada)]
  return lineas.flatMap((l) => [l.lamina ?? []].flat()).filter((k) => laminas[k] && !laminas[k].archivo.includes('{'))
}

/** Las láminas ya usadas de fondo: dos partes no repiten foto. */
const usadas = new Set()

/** Un cuadro de la lámina (igual en todos los idiomas, así que se saca una vez por tema y parte). */
function fondo(parte, n) {
  const destino = path.join(FONDOS, `parte-${n}.jpg`)
  const k = laminasDe(parte).find((x) => !usadas.has(x)) ?? laminasDe(parte)[0]
  usadas.add(k)
  if (existsSync(destino)) return destino
  if (!k) return null
  const archivo = path.join(PUBLICO, laminas[k].archivo)
  const desde = laminas[k].archivo.endsWith('.mp4') ? ['-ss', '1.5'] : []
  execFileSync(FFMPEG, ['-y', '-v', 'error', ...desde, '-i', archivo, '-frames:v', '1', '-vf', `scale=${ANCHO}:${ALTO}:force_original_aspect_ratio=increase,crop=${ANCHO}:${ALTO}`, '-q:v', '2', destino])
  return destino
}

/** «Parte dos»: el encabezado de la parte sin su título ni la puntuación de en medio. */
function etiqueta(parte) {
  const enc = parte.lineas.find((l) => l.visual?.tipo === 'encabezado')
  if (!enc) return ''
  return enc.texto.replace(parte.titulo, '').replace(/[\s.。,:：।]+$/u, '').trim()
}

/**
 * Lo de en medio: la respuesta de la parte (`respuesta` en el guion, una oración
 * que contesta su pregunta); sin ella, el primer dato o, si no tiene, sus pasos.
 */
function centro(parte, ui) {
  if (parte.respuesta) return `<p class="respuesta">${esc(parte.respuesta)}</p>`
  const t = ui[tema] ?? {}
  const dato = parte.lineas.find((l) => l.visual?.tipo === 'dato' && t.dato?.[l.visual.clave])
  if (dato) return `<div class="dato"><b>${esc(dato.visual.cifra)}</b><span>${esc(t.dato[dato.visual.clave])}</span></div>`
  const pasos = parte.lineas.find((l) => l.visual?.tipo === 'pasos' && l.visual.claves?.every((c) => t.pasos?.[c]))
  if (pasos) return `<ol class="pasos">${pasos.visual.claves.map((c) => `<li><b>${esc(t.pasos[c])}</b>${t.pasos[c + 'Det'] ? `<span>${esc(t.pasos[c + 'Det'])}</span>` : ''}</li>`).join('')}</ol>`
  return ''
}

/** Una pose distinta por parte (`?pose=<id>` de la página, ver POSES en web/src/guias/Memes.tsx). */
const NARRADORES = readFileSync(path.resolve(RAIZ, '..', '..', 'web', 'src', 'guias', 'pep.ts'), 'utf8').match(/NARRADOR_GUIA[^=]*=\s*\{([^}]*)\}/)?.[1] ?? ''
/** Pep@ (las guías sin otro narrador) se tumba en «relajado»: él se estira de pie. */
const esPep = !new RegExp(`\\b${tema}:`).test(NARRADORES)
const POSES = ['contento', 'pensando', 'confundido', 'orgulloso', 'pulgar', esPep ? 'estira' : 'relajado', 'explica', 'ternura', 'miniatura']
const DIR_POSES = path.join(RAIZ, tema, 'poses')
const rutaPose = (n) => path.join(DIR_POSES, `${POSES[(n - 1) % POSES.length]}.png`)

/** Colores de acento (los del logo y dos más) y cuatro composiciones: se alternan para que no se repita el formato. */
const COLORES = [
  { ac: '#C07DFE', tx: '#1b1030' },
  { ac: '#FFB319', tx: '#2a1d00' },
  { ac: '#FF505F', tx: '#ffffff' },
  { ac: '#34D399', tx: '#05261a' },
  { ac: '#60A5FA', tx: '#06203f' },
]
const DISENOS = ['arriba', 'abajo', 'banda', 'centro']

function html(g, ui, parte, n, id, fondoJpg) {
  const titulo = parte.titulo
  const diseno = DISENOS[(n - 1) % DISENOS.length]
  const { ac, tx } = COLORES[(n - 1) % COLORES.length]
  const largo = titulo.length * (['ja', 'zh', 'ko'].includes(id) ? 1.8 : 1)
  const tam = Math.round((largo > 70 ? 66 : largo > 45 ? 78 : 92) * (diseno === 'abajo' ? 0.78 : 1))
  return `<!doctype html><html lang="${id}" dir="${id === 'ar' ? 'rtl' : 'ltr'}"><head><meta charset="utf-8"><style>
  html,body{margin:0;width:${ANCHO}px;height:${ALTO}px;overflow:hidden}
  body{--ac:${ac};--tx:${tx};position:relative;background:#1b1f33;font-family:"Segoe UI","Yu Gothic UI","Microsoft YaHei UI","Malgun Gothic","Nirmala UI",sans-serif;color:#fff}
  .fondo{position:absolute;inset:0;${fondoJpg ? `background:url("${pathToFileURL(fondoJpg)}") center/cover;` : ''}filter:saturate(1.1)}
  .velo{position:absolute;inset:0}
  .pep,.texto,.pie{position:absolute}
  .parte{display:inline-block;padding:10px 24px;border-radius:999px;background:var(--ac);color:var(--tx);font-weight:900;font-size:34px;letter-spacing:.02em}
  h1{text-wrap:balance;word-break:keep-all;margin:26px 0 0;font-weight:900;font-size:${tam}px;line-height:1.05;letter-spacing:-.015em;text-shadow:0 6px 24px rgb(0 0 0/.55)}
  .dato,.pasos{margin-top:40px;max-width:640px;padding:30px 34px;border-radius:28px;background:rgb(255 255 255/.95);color:#1c2333;box-shadow:0 14px 40px rgb(0 0 0/.35)}
  .dato b{display:block;font-size:110px;line-height:1;font-weight:900;letter-spacing:-.03em;border-inline-start:12px solid var(--ac);padding-inline-start:18px}
  .dato span{display:block;margin-top:14px;font-size:34px;line-height:1.25;font-weight:600}
  .pasos{list-style:none;counter-reset:p}
  .pasos li{counter-increment:p;position:relative;padding-inline-start:64px;margin:0 0 20px}
  .pasos li:last-child{margin-bottom:0}
  .pasos li::before{content:counter(p);position:absolute;inset-inline-start:0;top:2px;width:46px;height:46px;border-radius:50%;background:var(--ac);color:var(--tx);font:900 28px/46px "Segoe UI",sans-serif;text-align:center}
  .pasos b{display:block;font-size:36px;line-height:1.2;font-weight:800}
  .pasos span{display:block;font-size:28px;line-height:1.3;color:#4b5368}
  .respuesta{margin:40px 0 0;max-width:700px;padding:30px 34px;border-radius:28px;background:rgb(255 255 255/.95);color:#1c2333;box-shadow:0 14px 40px rgb(0 0 0/.35);border-inline-start:14px solid var(--ac);font-size:40px;line-height:1.3;font-weight:650;text-wrap:pretty}
  .chip{display:inline-flex;align-items:center;gap:14px;padding:12px 22px;border-radius:999px;background:#fff;color:#1c2333;font-weight:800;font-size:27px;box-shadow:0 8px 24px rgb(0 0 0/.3)}
  .chip svg{height:24px;flex:none}
  .url{display:flex;gap:14px;margin-top:16px}
  .url i{display:grid;place-items:center;width:62px;height:62px;border-radius:50%;background:#fff;box-shadow:0 8px 24px rgb(0 0 0/.3)}
  .url svg{width:34px;height:34px}
  .pie{inset-inline-start:64px;bottom:60px;max-width:560px}
  /* Mirando hacia el texto: en espejo cuando va a la derecha (en árabe, al revés). */
  .pep{transform:scaleX(-1)}
  [dir=rtl] .pep{transform:none}

  /* arriba: título y tarjeta arriba, el narrador abajo a un lado. */
  .arriba .velo{background:linear-gradient(180deg,rgb(15 17 30/.88) 0%,rgb(15 17 30/.62) 45%,rgb(15 17 30/.25) 70%,rgb(15 17 30/.7) 100%)}
  .arriba .pep{inset-inline-end:-70px;bottom:-110px;height:720px}
  .arriba .texto{inset-inline:64px;top:72px}

  /* abajo: la foto limpia arriba; el narrador a la izquierda y el texto en columna a su lado. */
  .abajo .velo{background:linear-gradient(180deg,rgb(15 17 30/.6) 0%,rgb(15 17 30/0) 18%,rgb(15 17 30/.3) 40%,rgb(15 17 30/.92) 70%)}
  .abajo .pep{inset-inline-start:-125px;bottom:-100px;height:660px;transform:none}
  [dir=rtl] .abajo .pep{transform:scaleX(-1)}
  .abajo .texto{inset-inline-start:400px;inset-inline-end:56px;bottom:70px}
  .abajo .dato,.abajo .pasos{padding:24px 28px}
  .abajo .dato b{font-size:88px}
  .abajo .dato span{font-size:29px}
  .abajo .pasos b{font-size:31px}
  .abajo .pasos span{font-size:25px}
  .abajo .respuesta{font-size:33px;padding:24px 28px}
  .abajo .pie{top:56px;bottom:auto;max-width:none}
  .abajo .url{display:inline-flex;margin:0;margin-inline-start:18px;vertical-align:middle}

  /* banda: medio cartel del color de acento con el título; la foto abajo. */
  .banda{background:var(--ac)}
  .banda .fondo{top:50%}
  .banda .velo{top:50%;background:linear-gradient(180deg,rgb(15 17 30/.1) 0%,rgb(15 17 30/.25) 60%,rgb(15 17 30/.8) 100%)}
  .banda .texto{inset-inline:64px;top:72px}
  .banda h1{color:var(--tx);text-shadow:none}
  .banda .parte{background:var(--tx);color:var(--ac)}
  .banda .pep{inset-inline-end:-60px;bottom:-110px;height:680px}

  /* centro: todo centrado sobre la foto oscurecida; la cifra, enorme y sin tarjeta. */
  .centro .velo{background:rgb(15 17 30/.72)}
  .centro .texto{inset-inline:70px;top:90px;text-align:center}
  .centro .dato{background:none;box-shadow:none;color:#fff;max-width:none;padding:0;margin-top:50px}
  .centro .dato b{font-size:210px;color:var(--ac);border:0;padding:0;text-shadow:0 8px 30px rgb(0 0 0/.5)}
  .centro .dato span{font-size:38px;max-width:820px;margin:18px auto 0;text-wrap:balance}
  .centro .pasos{margin:44px auto 0;text-align:start}
  .centro .respuesta{margin:44px auto 0;background:none;box-shadow:none;border:0;padding:0;color:#fff;font-size:46px;max-width:860px;text-wrap:balance;text-shadow:0 4px 18px rgb(0 0 0/.6)}
  .centro .respuesta::before{content:"";display:block;width:120px;height:10px;border-radius:5px;background:var(--ac);margin:0 auto 34px}
  .centro .pep{inset-inline-end:-40px;bottom:-80px;height:560px}
</style></head><body class="${diseno}">
  <div class="fondo"></div><div class="velo"></div>
  <img class="pep" src="${pathToFileURL(rutaPose(n))}">
  <div class="texto"><span class="parte">${esc(etiqueta(parte) || n)}</span><h1>${partible(titulo, id)}</h1>${centro(parte, ui)}</div>
  <div class="pie"><span class="chip">${LOGO}${sello(g, ui)}</span>${PLATAFORMAS}</div>
</body></html>`
}

/** Estilo común de la portada y el cierre. */
const BASE_CSS = `html,body{margin:0;width:${ANCHO}px;height:${ALTO}px;overflow:hidden}
  body{position:relative;background:#1b1f33;font-family:"Segoe UI","Yu Gothic UI","Microsoft YaHei UI","Malgun Gothic","Nirmala UI",sans-serif;color:#fff}
  h1{text-wrap:balance;word-break:keep-all;margin:0;font-weight:900;line-height:1.04;letter-spacing:-.015em}
  .chip{display:inline-flex;align-items:center;gap:14px;padding:12px 22px;border-radius:999px;background:#fff;color:#1c2333;font-weight:800;font-size:27px;box-shadow:0 8px 24px rgb(0 0 0/.3)}
  .chip svg{height:24px;flex:none}
  .url{display:flex;gap:14px;margin-top:16px}
  .url i{display:grid;place-items:center;width:62px;height:62px;border-radius:50%;background:#fff;box-shadow:0 8px 24px rgb(0 0 0/.3)}
  .url svg{width:34px;height:34px}`

/** Un cuadro del primer plano de la toma de entrada: el narrador en su cuarto, de frente. */
function fondoCuarto(id) {
  const destino = path.join(SALIDA, id, 'final', 'fondo-portada.jpg')
  const { cortes } = JSON.parse(readFileSync(path.join(SALIDA, id, 'casa-entrada.json'), 'utf8'))
  execFileSync(FFMPEG, ['-y', '-v', 'error', '-ss', String((cortes[0] ?? 2) / 2), '-i', path.join(SALIDA, id, 'casa-entrada.mp4'), '-frames:v', '1', '-vf', `scale=${ANCHO}:${ANCHO}`, '-q:v', '2', destino])
  return destino
}

/** La casa entera desde arriba: un cuadro del arranque de la toma de salida (casa.mjs). */
function fondoCasa(id) {
  const destino = path.join(SALIDA, id, 'final', 'fondo-casa.jpg')
  execFileSync(FFMPEG, ['-y', '-v', 'error', '-ss', '3.2', '-i', path.join(SALIDA, id, 'casa-salida.mp4'), '-frames:v', '1', '-vf', `scale=${ALTO}:${ALTO},crop=${ANCHO}:${ALTO}`, '-q:v', '2', destino])
  return destino
}

/**
 * Portada: el cuadro del narrador en su cuarto entero arriba (sin zoom: en algunas
 * guías el primer plano ya es cercano) y la pregunta debajo, sin taparlo.
 */
function htmlPortada(g, ui, id) {
  const largo = g.pregunta.length * (['ja', 'zh', 'ko'].includes(id) ? 1.8 : 1)
  return `<!doctype html><html lang="${id}" dir="${id === 'ar' ? 'rtl' : 'ltr'}"><head><meta charset="utf-8"><style>${BASE_CSS}
  .fondo{position:absolute;inset:0 0 auto;height:${ANCHO}px;background:url("${pathToFileURL(fondoCuarto(id))}") center/cover}
  .velo{position:absolute;inset:0;background:linear-gradient(180deg,rgb(15 17 30/.45) 0%,rgb(15 17 30/0) 12%,rgb(15 17 30/0) 55%,rgb(27 31 51/.85) 74%,#1b1f33 80%)}
  .texto{position:absolute;inset-inline:64px;bottom:56px}
  .serie{display:inline-block;padding:10px 24px;border-radius:999px;background:#FFB319;color:#2a1d00;font-weight:900;font-size:32px}
  h1{margin:20px 0 0;font-size:${largo > 40 ? 80 : 96}px;text-shadow:0 6px 24px rgb(0 0 0/.55)}
  .pie{position:absolute;inset-inline-start:48px;top:44px}
</style></head><body>
  <div class="fondo"></div><div class="velo"></div>
  <div class="pie"><span class="chip">${LOGO}${sello(g, ui)}</span>${PLATAFORMAS}</div>
  <div class="texto"><span class="serie">${esc(ui.comun?.serie ?? 'MindHaOS')}</span><h1>${partible(g.pregunta, id)}</h1></div>
</body></html>`
}

const BASE = (process.env.GUIAS_URL || 'http://localhost:5174').replace(/\/$/, '')

await conPagina(path.join(RAIZ, tema, 'grabaciones'), async (c) => {
  // Las poses del narrador, una vez por tema (iguales en todos los idiomas), con fondo transparente.
  mkdirSync(DIR_POSES, { recursive: true })
  const faltan = POSES.filter((p) => !existsSync(path.join(DIR_POSES, `${p}.png`)))
  if (faltan.length) {
    await c.enviar('Emulation.setDeviceMetricsOverride', { width: 600, height: 600, deviceScaleFactor: 2, mobile: false })
    await c.enviar('Emulation.setDefaultBackgroundColorOverride', { color: { r: 0, g: 0, b: 0, a: 0 } })
    for (const p of faltan) {
      await c.enviar('Page.navigate', { url: `${BASE}/guias/${tema}?pose=${p}&t=${Date.now()}` })
      await dormir(6000)
      writeFileSync(path.join(DIR_POSES, `${p}.png`), Buffer.from((await c.enviar('Page.captureScreenshot', { format: 'png' })).data, 'base64'))
    }
    await c.enviar('Emulation.setDefaultBackgroundColorOverride', {})
  }
  await c.enviar('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: ALTO, deviceScaleFactor: 1, mobile: false })
  for (const id of ids) {
    const g = JSON.parse(readFileSync(path.join(RAIZ, tema, `guion.${id}.json`), 'utf8'))
    const ui = JSON.parse(readFileSync(path.join(TEXTOS, `${id}.json`), 'utf8'))
    const final = path.join(SALIDA, id, 'final')
    mkdirSync(final, { recursive: true })
    const capturar = async (nombre, contenido) => {
      const archivoHtml = path.join(final, `plantilla-${nombre}.html`)
      writeFileSync(archivoHtml, contenido)
      await c.enviar('Page.navigate', { url: pathToFileURL(archivoHtml).href })
      await dormir(900)
      const { data } = await c.enviar('Page.captureScreenshot', { format: 'jpeg', quality: 90 })
      writeFileSync(path.join(final, `plantilla-${nombre}.jpg`), Buffer.from(data, 'base64'))
    }
    if (toca('portada')) await capturar('portada', htmlPortada(g, ui, id))
    for (const [i, parte] of g.partes.entries()) if (toca(`parte-${i + 1}`)) await capturar(`parte-${i + 1}`, html(g, ui, parte, i + 1, id, fondo(parte, i + 1)))
    // El cierre es la tarjeta del final de los videos (tarjeta.mjs) en 4:5, con la casa dentro del círculo del narrador.
    if (toca('cierre')) await capturar('cierre', htmlTarjeta(tema, id, path.join(DIR_POSES, 'contento.png'), ALTO, fondoCasa(id)))
    console.log(`✓ ${id} (${g.partes.length})`)
  }
  await c.enviar('Emulation.clearDeviceMetricsOverride')
})
