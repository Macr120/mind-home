// La demo de Pep@ en la app (BD aparte, nunca la casa real), para las tomas
// de casa.mjs y de app2d.mjs. Corre contra el servidor de pruebas:
//   APP_URL=http://localhost:53379
import { dormir, evaluar } from './cdp.mjs'

export const APP = (process.env.APP_URL || 'http://localhost:53378').replace(/\/$/, '') + '/'

/** Oculta el HUD de la app (botones, reloj, barra del chat): en la toma solo va la casa. */
export const SIN_HUD = `
  if (!document.getElementById('sin-hud')) {
    const s = document.createElement('style')
    s.id = 'sin-hud'
    s.textContent = '[data-sin-hud]{visibility:hidden!important}'
    document.head.appendChild(s)
  }
  for (const e of document.querySelectorAll('body *')) {
    const cs = getComputedStyle(e)
    if ((cs.position === 'fixed' || cs.position === 'absolute') && e.tagName !== 'CANVAS' && !e.querySelector('canvas') && !e.closest('[data-sin-hud]')) e.setAttribute('data-sin-hud', '')
  }
`

/** ¿La pestaña ya está en la demo construida, y en `idioma`? */
export const enDemo = (c, idioma) =>
  evaluar(
    c,
    `location.href.startsWith(${JSON.stringify(APP)}) && (localStorage.getItem('mh.demo.version') || '').endsWith(':${idioma}') && !!window.useCuartos && useCuartos.getState().cuartos.length >= 17`,
  ).catch(() => false)

/**
 * Entra a la demo de Pep@ en `idioma` y espera a que la casa esté construida
 * (como esperarDemo de la promo). `rehacer` la vuelve a sembrar: sus fechas son
 * las del día en que se construyó (al otro día la racha ya sale en cero).
 */
export async function abrirDemo(c, idioma, { rehacer = false } = {}) {
  await c.enviar('Page.navigate', { url: APP })
  await dormir(3000)
  await evaluar(c, `localStorage.setItem('mh.demo', '1'); localStorage.removeItem('mh.probar'); localStorage.setItem('mh.idioma', '${idioma}'); ${rehacer ? "localStorage.removeItem('mh.demo.version');" : ''} window.__viejo = 1`)
  await c.enviar('Page.navigate', { url: APP })
  const LISTA = `(() => {
    if (window.__viejo) return false
    const v = localStorage.getItem('mh.demo.version') || ''
    if (!v.endsWith(':${idioma}')) return false
    if (!['useHouse', 'useCam', 'useCiclo', 'useDiseño', 'useLayout', 'useCuartos'].every((k) => !!window[k])) return false
    return useCuartos.getState().cuartos.length >= 17 && !!window.__r3f && !!document.querySelector('canvas')
  })()`
  // Lista y estable: con la máquina cargada (varios grabadores) la demo puede recargarse
  // aún después de parecer lista; se espera de nuevo hasta que aguante 12 s sin recargar.
  for (let intento = 0; ; intento++) {
    for (let i = 0; i < 180; i++) {
      await dormir(2000)
      try {
        if (await evaluar(c, LISTA)) break
      } catch {
        // La demo recarga la página mientras se construye.
      }
      if (i === 179) throw new Error('la demo no terminó de construirse')
    }
    await dormir(8000)
    try {
      await evaluar(c, 'window.__captura = 1')
      await dormir(4000)
      if (await evaluar(c, 'window.__captura === 1')) return
    } catch {
      // Se recargó en medio de la comprobación.
    }
    if (intento === 5) throw new Error('la demo se sigue recargando; vuelve a correr')
  }
}
