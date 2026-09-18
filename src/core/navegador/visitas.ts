import { db } from '../data/db'
import { useAjustesNav } from './ajustes'
import { sitioDe } from './dominio'

/**
 * Ciclo de vida de una visita (`visitasWeb`): UNA fila por sitio mientras se
 * navega; al cambiar de sitio se cierra con su duración y se abre otra. La
 * misma lógica la usan el navegador del escritorio (`navegadorStore`) y el
 * WebView del teléfono (`enlaces.ts`), que antes la tenían duplicada.
 *
 * El tiempo se lleva por TRAMOS: `desde` marca el tramo activo y `acumulado`
 * suma los ya cerrados, así la visita se pausa (ventana en segundo plano,
 * usuario inactivo, otra pestaña) sin perder lo contado.
 */

/** Tope de una visita: si nadie avisó del cierre, no se apunta un día entero. */
export const TOPE_VISITA_SEG = 4 * 3600

export interface VisitaEnCurso {
  /** Fila de `visitasWeb`; null = «sin registro» (no se escribió nada). */
  id: number | null
  /** Dominio registrable (`sitioDe`). */
  sitio: string
  /** Inicio del tramo activo (ms); null = en pausa. */
  desde: number | null
  /** Segundos de los tramos ya cerrados. */
  acumulado: number
}

function segundosDe(v: VisitaEnCurso): number {
  const abierto = v.desde == null ? 0 : (Date.now() - v.desde) / 1000
  return Math.min(Math.round(v.acumulado + abierto), TOPE_VISITA_SEG)
}

/** Abre la visita de `url` (fila nueva; ninguna en modo «sin registro»). `activa=false` la deja ya en pausa. */
export async function abrirVisita(
  url: string,
  nombre?: string,
  opts: { activa?: boolean; registrar?: boolean } = {},
): Promise<VisitaEnCurso> {
  const sitio = sitioDe(url)
  const id =
    opts.registrar === false || useAjustesNav.getState().sinRegistro
      ? null
      : await db.visitasWeb.add({ url, nombre: nombre || undefined, inicio: new Date().toISOString(), host: sitio })
  return { id, sitio, desde: opts.activa === false ? null : Date.now(), acumulado: 0 }
}

/** Cierra la fila con su duración; no toca el objeto (quien llama lo suelta). */
export function cerrarVisita(v: VisitaEnCurso | null): void {
  if (!v || v.id == null) return
  void db.visitasWeb.update(v.id, { duracionSeg: segundosDe(v) })
}

/** Guarda el parcial sin cerrar: un cierre brusco no pierde una visita larga. */
export function sellarVisita(v: VisitaEnCurso | null): void {
  cerrarVisita(v)
}

export function pausarVisita(v: VisitaEnCurso): VisitaEnCurso {
  if (v.desde == null) return v
  return { ...v, acumulado: v.acumulado + (Date.now() - v.desde) / 1000, desde: null }
}

export function reanudarVisita(v: VisitaEnCurso): VisitaEnCurso {
  return v.desde == null ? { ...v, desde: Date.now() } : v
}

/** ¿`url` sigue en el sitio de la visita? (misma regla en todas las plataformas) */
export function mismoSitio(v: VisitaEnCurso | null, url: string): boolean {
  return v != null && v.sitio === sitioDe(url)
}
