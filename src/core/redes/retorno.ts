/**
 * La vuelta del OAuth de las redes. Dos caminos: el deep link
 * `com.macr120.mindhome://redes?ok=1&plataforma=…` (app de tienda y escritorio,
 * lo reparte `escucharDeepLinkAuth`) y el `postMessage` de la ventana
 * emergente en la web. Solo toca el store de redes: sin dependencias hacia
 * `cuenta/*`, para no ciclar.
 */
import { useRedes } from './redesStore'
import { PLATAFORMAS, type MotivoVuelta, type Plataforma } from './tipos'

const PREFIJO = 'com.macr120.mindhome://redes'

/** ¿Es nuestra vuelta? Mismo criterio que el login: el host EXACTO seguido de separador o fin. */
export function esRetornoRedes(url: string): boolean {
  if (!url.startsWith(PREFIJO)) return false
  const resto = url.slice(PREFIJO.length)
  return resto === '' || '?#/'.includes(resto[0])
}

function leerParametros(query: string): { ok: boolean; plataforma: Plataforma | null; error: MotivoVuelta | null } {
  const q = new URLSearchParams(query)
  const p = q.get('plataforma')
  return {
    ok: q.get('ok') === '1',
    plataforma: (PLATAFORMAS as readonly string[]).includes(p ?? '') ? (p as Plataforma) : null,
    error: (q.get('error') as MotivoVuelta | null) ?? null,
  }
}

/** Procesa el deep link; false si la URL no era nuestra. */
export function recibirRetornoRedes(url: string): boolean {
  if (!esRetornoRedes(url)) return false
  // `new URL()` no es de fiar con esquemas propios en todos los WebView; la query sí se parsea bien.
  const { ok, plataforma, error } = leerParametros(url.split('#')[0].split('?')[1] ?? '')
  useRedes.getState().alVolver(ok, plataforma, error)
  return true
}

/** El `postMessage` de la ventana emergente (web); false si el mensaje no era nuestro. */
export function recibirMensajeRedes(e: MessageEvent, origenEsperado: string): boolean {
  if (e.origin !== origenEsperado) return false
  const d = e.data as { tipo?: unknown; ok?: unknown; plataforma?: unknown; error?: unknown } | null
  if (!d || d.tipo !== 'mph-redes') return false
  const p = typeof d.plataforma === 'string' && (PLATAFORMAS as readonly string[]).includes(d.plataforma) ? (d.plataforma as Plataforma) : null
  useRedes.getState().alVolver(d.ok === true, p, typeof d.error === 'string' ? (d.error as MotivoVuelta) : null)
  return true
}

/** La vuelta por pestaña completa (`?redes=ok&plataforma=…` en la URL de la app). */
export function recibirQueryRedes(search: string): boolean {
  const q = new URLSearchParams(search)
  const redes = q.get('redes')
  if (redes !== 'ok' && redes !== 'error') return false
  const p = q.get('plataforma')
  useRedes
    .getState()
    .alVolver(
      redes === 'ok',
      (PLATAFORMAS as readonly string[]).includes(p ?? '') ? (p as Plataforma) : null,
      (q.get('motivo') as MotivoVuelta | null) ?? null,
    )
  return true
}
