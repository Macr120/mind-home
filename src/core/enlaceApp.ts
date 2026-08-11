import { abrirApp } from './abrirApp'
import type { EnlaceApp } from './data/db'
import { getPlantilla, plantillasTodas, type Plantilla } from './registry'
import { esObjetoLibreria, esObjetoMapa, useDiseño } from './state/disenoStore'
import { useRutinasUI } from './state/rutinasUiStore'

/**
 * Los chips de app de un paso: «tomar agua» lleva a la cocina, «leer 20 páginas» a
 * la biblioteca. Un enlace NO registra nada — abre la app donde ese dato se apunta,
 * que es quien sabe pedirlo bien (ver `EnlaceApp` en data/db.ts).
 *
 * Los destinos no se inventan aquí: son los mismos deep links que cada app ya
 * declara para el chat (`Plantilla.comandos`), así que una app gana secciones en los
 * chips en cuanto las gana en el chat.
 */

/** Un sitio concreto de una app al que puede apuntar un chip. */
export interface DestinoApp {
  seccion?: string
  dato?: string
  /** Etiqueta del comando («Recetario»); sin sección, el nombre de la app. */
  etiqueta: string
}

/**
 * Apps que pueden llevar chip: las que el usuario tiene puestas en un cuarto de su
 * casa. Las de la librería y las del mapa quedan fuera porque `abrirApp` no puede
 * entrar en ellas (una deja el overlay vacío y la otra ni siquiera es un cuarto).
 */
export function appsParaEnlace(): Plantilla[] {
  const ids = new Set<string>()
  for (const o of useDiseño.getState().objetos)
    if (o.plantillaId && !esObjetoLibreria(o) && !esObjetoMapa(o)) ids.add(o.plantillaId)
  return plantillasTodas().filter((p) => ids.has(p.id))
}

/** Dónde se puede caer dentro de una app: su portada y las secciones que declara. */
export function destinosDeApp(p: Plantilla): DestinoApp[] {
  return [
    { etiqueta: p.nombre },
    ...(p.comandos ?? []).map((c) => ({ seccion: c.seccion, dato: c.dato, etiqueta: c.etiqueta })),
  ]
}

/** Cómo se pinta un enlace: la app y, si apunta a una sección, su etiqueta. */
export function textoEnlace(e: EnlaceApp): { app?: Plantilla; seccion?: string } {
  const app = getPlantilla(e.plantillaId)
  if (!app) return {}
  const destino = app.comandos?.find((c) => c.seccion === e.seccion && (c.dato ?? undefined) === e.dato)
  return { app, seccion: destino?.etiqueta }
}

/**
 * Lleva a la app del enlace. Cierra antes el calendario: los planes se leen a
 * pantalla completa desde el reloj del HUD, y sin esto el cuarto se abriría DEBAJO.
 * Devuelve false si la app ya no está en ningún cuarto (el chip no hace nada).
 */
export function abrirEnlace(e: EnlaceApp): boolean {
  useRutinasUI.getState().cerrarCalendario()
  return abrirApp(e.plantillaId, e.seccion, e.dato) != null
}
