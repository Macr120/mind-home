import { Capacitor, CapacitorHttp } from '@capacitor/core'
import { esAppNativa, hayNavegadorEscritorio } from './plataforma'
import { hostDe, sitioDe } from './navegador/dominio'
import { abrirVisita, cerrarVisita, mismoSitio, pausarVisita, reanudarVisita, sellarVisita, type VisitaEnCurso } from './navegador/visitas'
import { guardarFavicon, ponerTituloPagina, registrarPagina } from './navegador/historial'
import { urlBusqueda, useAjustesNav } from './navegador/ajustes'
import { hostBloqueado, htmlFoco } from './navegador/foco'
import { useFoco } from './state/focoStore'

/**
 * Enlaces web de los objetos del mapa y del chat: normalizar la URL tecleada,
 * abrirla en el navegador que toque por plataforma y registrar la visita
 * (`visitasWeb`) y la página (`historialWeb`).
 */

export { hostDe, sitioDe }

/**
 * Normaliza lo tecleado a una URL http(s) completa (sin esquema se asume
 * https). Devuelve null si no es una dirección web válida — `javascript:` y
 * compañía incluidos.
 */
export function normalizarUrl(texto: string): string | null {
  const crudo = texto.trim()
  if (!crudo) return null
  const conEsquema = /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(crudo) ? crudo : `https://${crudo}`
  try {
    const url = new URL(conEsquema)
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null
    // Un dominio de verdad lleva punto: sin esto, cualquier palabra suelta
    // («hola») parsea como https://hola y se guardaría un enlace muerto.
    if (!url.hostname.includes('.')) return null
    return url.href
  } catch {
    return null
  }
}

// ——— Teléfono: WebView in-app de Capgo (Android e iOS) ———

/** La visita del sitio actual en el WebView del teléfono. */
let visitaMovil: VisitaEnCurso | null = null
let oyentesMovil = false
/** Sitios cuyo favicon ya se intentó bajar en esta sesión (no se repite por cada página). */
const iconosIntentados = new Set<string>()

/**
 * Se inyecta en cada página cargada: manda a la app el título y el icono, y
 * sigue los cambios de título (las SPA cambian de vista sin recargar).
 */
const SCRIPT_PAGINA = `(function(){
  if (window.__mphPagina) return; window.__mphPagina = true;
  function manda(){ try {
    var l = document.querySelector('link[rel~="icon"]');
    window.mobileApp && window.mobileApp.postMessage({ detail: { tipo: 'pagina', url: location.href, titulo: document.title, icono: l ? l.href : '' } });
  } catch (e) {} }
  manda();
  var t = document.querySelector('title');
  if (t && window.MutationObserver) new MutationObserver(manda).observe(t, { childList: true, characterData: true, subtree: true });
})()`

function cerrarVisitaMovil(): void {
  cerrarVisita(visitaMovil)
  visitaMovil = null
}

/** Rota la visita al cambiar de sitio (misma regla que el navegador del escritorio). */
async function rotarVisitaMovil(url: string, nombre?: string): Promise<void> {
  if (mismoSitio(visitaMovil, url)) return
  cerrarVisitaMovil()
  visitaMovil = await abrirVisita(url, nombre)
}

/** Los límites diarios viven en el store del navegador (avisa el asistente); en el teléfono se revisan al cambiar de sitio y al cerrar. */
function revisarLimitesMovil(): void {
  void import('./state/navegadorStore').then((m) => m.useNavegador.getState().revisarLimites())
}

/** El WebView cambió de URL: foco, visita por sitio e historial. */
async function alCambiarUrlMovil(url: string): Promise<void> {
  if (!/^https?:/.test(url)) return
  const foco = useFoco.getState()
  if (foco.hasta && foco.hasta > Date.now() && hostBloqueado(hostDe(url), foco.hosts)) {
    // Sin `onBeforeRequest` en el WebView: la página se sustituye por la del foco nada más cargar.
    const { InAppBrowser } = await import('@capgo/inappbrowser')
    void InAppBrowser.executeScript({
      code: `window.stop(); document.open(); document.write(${JSON.stringify(htmlFoco())}); document.close();`,
    }).catch(() => {})
    void import('./state/navegadorStore').then((m) => m.useNavegador.getState().alBloqueado({ url }))
    return
  }
  await rotarVisitaMovil(url)
  void registrarPagina(url)
  revisarLimitesMovil()
}

/** La página avisó de su título e icono (script inyectado). */
async function alPaginaMovil(d: { url?: string; titulo?: string; icono?: string }): Promise<void> {
  if (!d.url || !/^https?:/.test(d.url)) return
  if (d.titulo) void ponerTituloPagina(d.url, d.titulo)
  const sitio = sitioDe(d.url)
  if (!d.icono || iconosIntentados.has(sitio)) return
  iconosIntentados.add(sitio)
  try {
    // Petición NATIVA (sin CORS): los favicons casi nunca lo permiten.
    const r = await CapacitorHttp.get({ url: d.icono, responseType: 'blob', connectTimeout: 5000, readTimeout: 5000 })
    if (r.status !== 200 || typeof r.data !== 'string') return
    const tipo = String(Object.entries(r.headers ?? {}).find(([k]) => k.toLowerCase() === 'content-type')?.[1] ?? '')
      .split(';')[0]
      .trim()
    if (!tipo.startsWith('image/')) return
    void guardarFavicon(d.url, `data:${tipo};base64,${r.data}`)
  } catch {
    // Sin favicon: la app pinta el icono genérico.
  }
}

/**
 * Android e iOS: WebView in-app de `@capgo/inappbrowser` en vez del navegador
 * del sistema. A cambio de las sesiones de Chrome/Safari (el WebView tiene su
 * PROPIO tarro de cookies persistente, como la sesión del navegador del
 * escritorio), el plugin avisa de cada cambio de URL → visitas por sitio,
 * historial por página con título y favicon, bloqueo del modo foco y pausa
 * del tiempo cuando la app pasa a segundo plano.
 */
async function abrirEnMovil(url: string, nombre?: string): Promise<void> {
  const { InAppBrowser, ToolBarType } = await import('@capgo/inappbrowser')
  if (!oyentesMovil) {
    // Oyentes ÚNICOS de por vida: abrir otro enlace no debe duplicarlos.
    await InAppBrowser.addListener('urlChangeEvent', (e) => void alCambiarUrlMovil(e.url))
    await InAppBrowser.addListener('browserPageLoaded', () => {
      void InAppBrowser.executeScript({ code: SCRIPT_PAGINA }).catch(() => {})
    })
    await InAppBrowser.addListener('messageFromWebview', (e) => {
      const d = e.detail as { tipo?: string; url?: string; titulo?: string; icono?: string } | undefined
      if (d?.tipo === 'pagina') void alPaginaMovil(d)
    })
    await InAppBrowser.addListener('closeEvent', () => {
      cerrarVisitaMovil()
      revisarLimitesMovil()
    })
    // La app en segundo plano no cuenta como tiempo navegado.
    const { App } = await import('@capacitor/app')
    await App.addListener('appStateChange', ({ isActive }) => {
      if (!visitaMovil) return
      visitaMovil = isActive ? reanudarVisita(visitaMovil) : pausarVisita(visitaMovil)
      if (!isActive) sellarVisita(visitaMovil)
    })
    oyentesMovil = true
  }
  await rotarVisitaMovil(url, nombre)
  void registrarPagina(url)
  try {
    await InAppBrowser.openWebView({
      url,
      title: nombre || hostDe(url),
      toolbarType: ToolBarType.NAVIGATION,
      showReloadButton: true,
      visibleTitle: true,
      // El botón atrás del sistema navega el historial del WebView, no cierra.
      activeNativeNavigationForWebview: true,
    })
  } catch (e) {
    // No abrió (implementación web del plugin): la visita recién creada sobra —
    // el camino de respaldo del caller registrará la suya.
    if (visitaMovil?.id != null) void import('./data/db').then(({ db }) => db.visitasWeb.delete(visitaMovil!.id!))
    visitaMovil = null
    throw e
  }
}

/**
 * ¿El mensaje del chat es (o pide) una página web? Acepta el texto que sea UNA
 * sola palabra con pinta de URL («example.com», «https://x.y/z») o un verbo de
 * navegación seguido de ella («abre example.com»). Sin esquema se exige un TLD
 * alfabético: sin ese candado, «3.50» parsea como la IPv4 3.0.0.50 y cualquier
 * decimal suelto abriría el navegador.
 */
export function urlDeMensaje(texto: string): string | null {
  const limpio = texto.trim()
  const verbo = /^(?:abre|abrir|visita|visitar|navega a|entra a|ve a|open|go to)\s+(\S+)$/i.exec(limpio)
  const candidato = verbo ? verbo[1] : limpio
  if (/\s/.test(candidato)) return null
  if (!/^https?:\/\//i.test(candidato) && !/^[\w-]+(\.[\w-]+)*\.[a-zA-Z]{2,}([/?#]\S*)?$/.test(candidato)) return null
  return normalizarUrl(candidato)
}

/**
 * ¿El mensaje pide buscar en la web? «busca en internet recetas de pan»,
 * «web recetas de pan», «google recetas de pan»… Devuelve la consulta.
 * Verbo EXPLÍCITO: sin él, el texto es del asistente (salvo en modo web).
 */
export function busquedaDeMensaje(texto: string): string | null {
  const m =
    /^(?:busca(?:r)? en (?:internet|la web|google)|busca en línea|web|google|internet|search (?:the )?web|search)\s*:?\s+(.+)$/i.exec(
      texto.trim(),
    )
  const consulta = m?.[1]?.trim()
  return consulta ? consulta : null
}

/** Abre los resultados de `consulta` en el buscador elegido (ver `navegador/ajustes.ts`). */
export function abrirBusqueda(consulta: string): Promise<void> {
  return abrirEnlace(urlBusqueda(consulta, useAjustesNav.getState().buscador))
}

/** Favicon del dominio (DuckDuckGo); quien lo pinte pone el fallback si no carga. */
export function faviconDe(url: string): string | null {
  try {
    return `https://icons.duckduckgo.com/ip3/${new URL(url).hostname}.ico`
  } catch {
    return null
  }
}

/**
 * Abre el enlace y registra la visita. En el escritorio con shell usa el
 * navegador EMBEBIDO con pestañas (`navegadorStore`); en Android e iOS el
 * WebView in-app de Capgo, y si falla, el navegador in-app de Capacitor
 * (Custom Tabs / SFSafariViewController) con la duración al cerrarse; en web
 * abre pestaña nueva y solo se cuenta la apertura — no hay cierre que oír.
 */
export async function abrirEnlace(url: string, nombre?: string): Promise<void> {
  if (hayNavegadorEscritorio()) {
    // Import dinámico: el store importa de este módulo (hostDe) — sin esto, ciclo.
    const { useNavegador } = await import('./state/navegadorStore')
    await useNavegador.getState().abrir(url, nombre)
    return
  }
  // Plataforma REAL, no `nombrePlataforma()`: con el Android fingido de dev
  // (`mhNativa(true)`) la implementación web del plugin es un no-op silencioso
  // — parecería que el enlace no hace nada. Fingido, mejor el respaldo de abajo.
  const plataforma = Capacitor.getPlatform()
  if (plataforma === 'android' || plataforma === 'ios') {
    try {
      await abrirEnMovil(url, nombre)
      return
    } catch {
      // El plugin falló: cae al navegador del sistema, que siempre funciona.
    }
  }
  const visita = await abrirVisita(url, nombre)
  void registrarPagina(url)
  if (esAppNativa()) {
    const { Browser } = await import('@capacitor/browser')
    const oyente = await Browser.addListener('browserFinished', () => {
      void oyente.remove()
      cerrarVisita(visita)
    })
    await Browser.open({ url })
  } else {
    window.open(url, '_blank', 'noopener')
  }
}
