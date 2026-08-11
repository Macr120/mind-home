import type { Rutina } from '../../data/db'
import type { EventoResuelto } from '../../eventosApps'
import { getPlantilla } from '../../registry'

/**
 * Taxonomía del filtro del calendario. La unidad es la APP, no la carpeta:
 * seleccionar una carpeta es marcar sus apps de golpe, así que el filtro guarda
 * siempre ids de app — mover una app de carpeta no deja el filtro apuntando a
 * nada, y ninguna vista tiene que saber de carpetas para filtrar.
 *
 * Los grupos son las CARPETAS del catálogo de plantillas (`gruposPlantilla`), las
 * mismas que el usuario ordena en el menú Funciones: aquí no se inventa una
 * taxonomía paralela — si allí mueve Idiomas a «Estudio», el filtro lo enseña ahí.
 */

/** `plantillaId` de la app, o `CASA` para lo que se agendó a mano en el calendario. */
export type ClaveApp = string

export const CASA = 'casa'

export const appDeRutina = (r: Rutina): ClaveApp => r.plantillaId ?? CASA

export interface AppFiltrable {
  id: ClaveApp
  nombre: string
  icon: string
  color: string
}

export interface GrupoApps {
  /** Id de la carpeta, o `CASA`/`otras` para los dos grupos sintéticos. */
  id: string
  nombre: string
  emoji?: string
  apps: AppFiltrable[]
}

/** Carpeta del catálogo de plantillas, tal como la necesita el filtro. */
export interface CarpetaApps {
  id?: number
  nombre: string
  emoji?: string
  miembros: string[]
}

/** Grupo de las apps que no están en ninguna carpeta (no debería tener a nadie). */
const OTRAS = 'otras'

/**
 * Apps que realmente aparecen en el calendario del usuario, agrupadas por las
 * carpetas del catálogo de plantillas. Se arma desde los datos para no ofrecer
 * chips que no filtrarían nada, y una carpeta sin nada agendado no se pinta.
 */
export function gruposDeApps(
  rutinas: Rutina[],
  eventos: Map<string, EventoResuelto[]>,
  carpetas: CarpetaApps[],
  nombres: { casa: string; otras: string },
): GrupoApps[] {
  const ids = new Set<ClaveApp>()
  for (const r of rutinas) ids.add(appDeRutina(r))
  for (const lista of eventos.values()) for (const e of lista) ids.add(e.plantillaId)

  const casa: AppFiltrable = { id: CASA, nombre: nombres.casa, icon: '📅', color: '#94a3b8' }
  const deId = (id: ClaveApp): AppFiltrable => {
    const p = getPlantilla(id)
    return p ? { id, nombre: p.nombre, icon: p.icon, color: p.color } : casa
  }

  const salida: GrupoApps[] = []
  const colocadas = new Set<ClaveApp>()
  for (const c of carpetas) {
    // En el orden de la carpeta, que es el que el usuario ve en Funciones.
    const apps = c.miembros.filter((m) => ids.has(m)).map(deId)
    for (const a of apps) colocadas.add(a.id)
    if (apps.length > 0) salida.push({ id: String(c.id ?? c.nombre), nombre: c.nombre, emoji: c.emoji, apps })
  }

  // Sueltas: una app con datos que no esté en ninguna carpeta (la reconciliación
  // de `asegurarMiembros` solo corre al abrir el catálogo) no puede desaparecer
  // del filtro; sin ellas, lo que agendó quedaría imposible de apagar.
  const sueltas = [...ids].filter((id) => id !== CASA && !colocadas.has(id) && getPlantilla(id)).map(deId)
  if (sueltas.length > 0) salida.push({ id: OTRAS, nombre: nombres.otras, apps: sueltas })
  // Lo agendado a mano va al final: no es de ninguna app.
  if (ids.has(CASA) || [...ids].some((id) => !getPlantilla(id)))
    salida.push({ id: CASA, nombre: nombres.casa, apps: [casa] })
  return salida
}

/** Set vacío = sin filtro. Así no hay que sembrarlo con todas las apps al arrancar. */
export const pasa = (app: ClaveApp, activas: Set<ClaveApp>) => activas.size === 0 || activas.has(app)
