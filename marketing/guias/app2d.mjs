// La app 2D del cuarto navegándose sola, para el recuadro del cierre de la
// guía: mientras Pep@ nombra lo que hace la app (las anclas del cierre), la
// toma pasa por cada cosa justo al nombrarla. El recorrido de cada cuarto vive
// en <tema>/escena.mjs (APP2D); aquí, lo común.
//   web/public/guias/<tema>/laminas/app-plan.<id>.mp4   (vertical, muda; la reproduce la página)
//
//   APP_URL=http://localhost:53379 node marketing/guias/app2d.mjs ejercicio [--lang=en]
//
// La app va en el idioma de la guía: los botones se buscan por su ancla
// `data-tut` o por su texto traducido (tGlobal), nunca por el español.
//
// Mismo piloto que casa.mjs (cdp.mjs + la demo de Pep@). Los instantes salen de
// los tiempos por palabra de la voz del cierre (tiempos.json).
import { mkdirSync, readFileSync, readdirSync, unlinkSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { PONER_MARCA, QUITAR_MARCA, RAIZ, codigoCaptura, conPagina, esperarDescarga, evaluar, fijarViewport, recortar } from './cdp.mjs'
import { abrirDemo } from './demo.mjs'

const args = process.argv.slice(2)
const tema = args.find((a) => !a.startsWith('--')) ?? 'ejercicio'
const idioma = args.find((a) => a.startsWith('--lang='))?.slice(7) ?? 'es'
const CRUDO = path.join(RAIZ, tema, 'grabaciones', idioma)
const PUBLICO = path.resolve(RAIZ, '..', '..', 'web', 'public', 'guias', tema)
const DESTINO = path.join(PUBLICO, 'laminas', `app-plan.${idioma}.mp4`)
/** Viewport de teléfono con el aspecto del recuadro de la guía (34 × 49 vw). */
const VP = { ancho: 390, alto: 562 }

const { APP2D } = await import(pathToFileURL(path.join(RAIZ, tema, 'escena.mjs')).href)
const guion = JSON.parse(readFileSync(path.join(RAIZ, tema, `guion.${idioma}.json`), 'utf8'))
const tiempos = JSON.parse(readFileSync(path.join(PUBLICO, 'audio', idioma, 'tiempos.json'), 'utf8'))
const clave = `cierre.${guion.cierre.id}`
const palabras = tiempos._palabras[clave]
const texto = guion.cierre.texto
/**
 * Segundo en que Pep@ dice la palabra ancla del cierre (`cierre.anclas` del
 * guion: cómo se dice cada cosa de la app en ese idioma). La posición del
 * carácter se reparte sobre los tiempos del TTS, como el texto iluminado.
 */
const cuando = (ancla) => {
  const palabra = guion.cierre.anclas?.[ancla]
  const i = palabra ? texto.toLowerCase().indexOf(palabra.toLowerCase()) : -1
  if (i < 0) throw new Error(`el cierre en ${idioma} no dice el ancla «${ancla}» (${palabra})`)
  return palabras[Math.min(palabras.length - 1, Math.round((i / texto.length) * palabras.length))]
}
const T = { ...Object.fromEntries(APP2D.anclas.map((a) => [a, cuando(a)])), fin: tiempos[clave] }

/** Ayudas dentro de la página: buscar botones por su texto y «tocarlos» con un círculo visible. */
const AYUDAS = `
  const dormir = (ms) => new Promise((r) => setTimeout(r, ms))
  const { tGlobal } = await import('/src/core/i18n/useT.ts')
  // Textos de la app en el idioma activo (las mismas claves que usan sus botones).
  const L = { salir: tGlobal('demo.salir', 'Salir de la demo'), ...${APP2D.textos} }
  const boton = (texto) => [...document.querySelectorAll('button')].find((b) => b.innerText.trim() === texto)
  /** Pestañas por su ancla de tutorial (PestanasCarpeta), p. ej. ejercicio.tab.*. */
  const tut = (id) => document.querySelector('[data-tut="' + id + '"]')
  const tocar = async (el) => {
    if (!el) throw new Error('no encontré el botón')
    const r = el.getBoundingClientRect()
    const o = document.createElement('i')
    o.style.cssText = 'position:fixed;z-index:2147483646;width:44px;height:44px;margin:-22px 0 0 -22px;border-radius:50%;pointer-events:none;background:rgb(192 125 254 / .35);border:2px solid rgb(192 125 254 / .9);left:' + (r.left + r.width / 2) + 'px;top:' + (r.top + r.height / 2) + 'px;transition:transform .35s,opacity .35s'
    document.body.appendChild(o)
    await dormir(260)
    o.style.transform = 'scale(1.6)'
    o.style.opacity = '0'
    el.click()
    setTimeout(() => o.remove(), 400)
  }
  const main = () => document.querySelector('main')
  const hasta = async (t0, s) => { const falta = t0 + s * 1000 - performance.now(); if (falta > 0) await dormir(falta) }
  /** Baja despacio por \`m\` desde \`desde\` hasta el instante \`fin\` (performance.now). */
  const bajarHasta = (m, desde, fin) => new Promise((r) => {
    const a = performance.now()
    const paso = () => {
      m.scrollTop = desde + (performance.now() - a) * 0.09
      if (performance.now() < fin) requestAnimationFrame(paso)
      else r()
    }
    paso()
  })
  ${APP2D.ayudas ?? ''}
`

/** El cuarto abierto en su punto de partida (escena.mjs) y sin avisos encima. */
const PREPARAR = `
  ${AYUDAS}
  // Sin celebraciones encima («¡Misiones del día!»): abrir y cerrar pantallas cuenta como actividad.
  const { useCelebracion } = await import('/src/core/state/celebracionStore.ts')
  useCelebracion.setState({ actual: null, cola: [], encolar: () => {} })
  const { abrirAppOPlantilla } = await import('/src/core/abrirApp.ts')
  abrirAppOPlantilla(${JSON.stringify(guion.plantillaId)})
  await dormir(3000)
  document.querySelector('.fixed.inset-0.z-50')?.click()
  await dormir(600)
  {
    const fallo = await (async () => { ${APP2D.preparar} })()
    if (fallo) return fallo
  }
  // Sin el botón de salir de la demo: en el video la app es la de Pep@.
  const salir = boton(L.salir)
  if (salir) salir.style.visibility = 'hidden'
  await dormir(1500)
  return 'ok'
`

const ACCION = `
  ${AYUDAS}
  ${QUITAR_MARCA}
  const t0 = performance.now()
  ${APP2D.accion(T)}
`

mkdirSync(CRUDO, { recursive: true })
await conPagina(CRUDO, async (c) => {
  // Siempre recién sembrada: la racha y el «hoy» de la app salen del día en que se construyó.
  await abrirDemo(c, idioma, { rehacer: true })
  await fijarViewport(c, VP.ancho, VP.alto)
  const r = await evaluar(c, `(async () => { ${PREPARAR} })()`, { timeout: 60000 })
  if (r !== 'ok') throw new Error(r)
  await evaluar(c, PONER_MARCA)
  const previo = new Set(readdirSync(CRUDO))
  await evaluar(c, codigoCaptura('app-plan', ACCION, 200), { userGesture: true, timeout: 120000 })
  const crudo = await esperarDescarga(CRUDO, 'app-plan', previo)
  const vp = await recortar(crudo, DESTINO, 480, 692)
  unlinkSync(crudo)
  console.log(`✓ app-plan.${idioma}.mp4 · viewport ${vp.w}×${vp.h} · ${JSON.stringify(T)}`)
})

// El recuadro la lista como una lámina más (sin crédito de Pexels); `{idioma}` lo pone la página.
const rutaMedios = path.join(RAIZ, tema, 'medios.json')
const medios = JSON.parse(readFileSync(rutaMedios, 'utf8'))
medios.laminas['app-plan'] = { archivo: 'laminas/app-plan.{idioma}.mp4', tipo: 'video', autor: 'MindHaOS', fuente: 'https://app.mindhaos.com', credito: '' }
writeFileSync(rutaMedios, JSON.stringify(medios, null, 2) + '\n')
