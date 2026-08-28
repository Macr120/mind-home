import { Capacitor } from '@capacitor/core'
import { db } from './data/db'
import { esAppNativa, hayNavegadorEscritorio } from './plataforma'

/**
 * Enlaces web de los objetos del mapa: normalizar la URL tecleada, abrirla en
 * el navegador que toque por plataforma y registrar la visita (`visitasWeb`).
 */

/** Tope de una visita: si el navegador nunca avisó del cierre, no se apunta un día entero. */
const TOPE_VISITA_SEG = 4 * 3600

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

/** Dominio legible de una URL (sin `www.`); la URL cruda si no se puede leer. */
export function hostDe(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

/** La visita del dominio actual en el WebView de Android (ver `abrirEnAndroid`). */
let visitaAndroid: { id: number; host: string; desde: number } | null = null
let oyentesAndroid = false

function cerrarVisitaAndroid(): void {
  if (!visitaAndroid) return
  const seg = Math.min(Math.round((Date.now() - visitaAndroid.desde) / 1000), TOPE_VISITA_SEG)
  void db.visitasWeb.update(visitaAndroid.id, { duracionSeg: seg })
  visitaAndroid = null
}

/** Rota la visita al cambiar de dominio (misma regla que el navegador del escritorio). */
async function rotarVisitaAndroid(url: string, nombre?: string): Promise<void> {
  const host = hostDe(url)
  if (visitaAndroid?.host === host) return
  cerrarVisitaAndroid()
  const id = await db.visitasWeb.add({ url, nombre: nombre || undefined, inicio: new Date().toISOString() })
  visitaAndroid = { id, host, desde: Date.now() }
}

/**
 * Android (fase 3): WebView in-app de `@capgo/inappbrowser` en vez de Custom
 * Tabs. A cambio de las sesiones de Chrome (el WebView tiene su PROPIO tarro de
 * cookies persistente, como la sesión del navegador del escritorio), el plugin
 * avisa de cada cambio de URL → visitas por dominio de verdad. iOS se queda con
 * SFSafariViewController a propósito: es opaco y Apple no da más.
 */
async function abrirEnAndroid(url: string, nombre?: string): Promise<void> {
  const { InAppBrowser, ToolBarType } = await import('@capgo/inappbrowser')
  if (!oyentesAndroid) {
    // Oyentes ÚNICOS de por vida: abrir otro enlace no debe duplicarlos.
    await InAppBrowser.addListener('urlChangeEvent', (e) => void rotarVisitaAndroid(e.url))
    await InAppBrowser.addListener('closeEvent', () => cerrarVisitaAndroid())
    oyentesAndroid = true
  }
  await rotarVisitaAndroid(url, nombre)
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
    if (visitaAndroid) void db.visitasWeb.delete(visitaAndroid.id)
    visitaAndroid = null
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
  const verbo = /^(?:abre|abrir|visita|visitar|navega a|entra a|ve a)\s+(\S+)$/i.exec(limpio)
  const candidato = verbo ? verbo[1] : limpio
  if (/\s/.test(candidato)) return null
  if (!/^https?:\/\//i.test(candidato) && !/^[\w-]+(\.[\w-]+)*\.[a-zA-Z]{2,}([/?#]\S*)?$/.test(candidato)) return null
  return normalizarUrl(candidato)
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
 * navegador EMBEBIDO (fase 2: `navegadorStore` lleva ahí las visitas, una por
 * dominio); en Android/iOS el navegador in-app de Capacitor (Custom Tabs /
 * SFSafariViewController) con la duración al cerrarse; en web abre pestaña
 * nueva y solo se cuenta la apertura — no hay cierre que oír.
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
  if (Capacitor.getPlatform() === 'android') {
    try {
      await abrirEnAndroid(url, nombre)
      return
    } catch {
      // El plugin falló: cae al navegador del sistema, que siempre funciona.
    }
  }
  const visitaId = await db.visitasWeb.add({ url, nombre: nombre || undefined, inicio: new Date().toISOString() })
  if (esAppNativa()) {
    const { Browser } = await import('@capacitor/browser')
    const desde = Date.now()
    const oyente = await Browser.addListener('browserFinished', () => {
      void oyente.remove()
      const seg = Math.min(Math.round((Date.now() - desde) / 1000), TOPE_VISITA_SEG)
      void db.visitasWeb.update(visitaId, { duracionSeg: seg })
    })
    await Browser.open({ url })
  } else {
    window.open(url, '_blank', 'noopener')
  }
}
