import type { Rutina } from '../../data/db'
import type { EventoResuelto } from '../../eventosApps'
import { getPlantilla } from '../../registry'

/**
 * Taxonomía del filtro del calendario. La unidad es la APP, no la categoría:
 * 'complemento' se lleva más de la mitad de las plantillas, así que filtrar solo
 * por categoría casi no seleccionaría nada. Las categorías se usan como títulos
 * de grupo para marcar/desmarcar sus apps de golpe.
 */

/** `plantillaId` de la app, o `CASA` para lo que se agendó a mano en el calendario. */
export type ClaveApp = string

export const CASA = 'casa'

/** Categorías en el mismo orden que el menú lateral de cuartos, más la casa. */
export type CategoriaCal = 'cuerpo' | 'mente' | 'complemento' | typeof CASA

const ORDEN: CategoriaCal[] = ['cuerpo', 'mente', 'complemento', CASA]

export const appDeRutina = (r: Rutina): ClaveApp => r.plantillaId ?? CASA

/** La categoría bajo la que se agrupa una app ('config' no agenda nada). */
function categoriaDeApp(id: ClaveApp): CategoriaCal {
  const cat = getPlantilla(id)?.categoria
  return cat === 'cuerpo' || cat === 'mente' || cat === 'complemento' ? cat : CASA
}

export interface AppFiltrable {
  id: ClaveApp
  nombre: string
  icon: string
  color: string
}

export interface GrupoApps {
  categoria: CategoriaCal
  apps: AppFiltrable[]
}

/**
 * Apps que realmente aparecen en el calendario del usuario, agrupadas por
 * categoría. Se arma desde los datos para no ofrecer chips que no filtrarían nada.
 */
export function gruposDeApps(
  rutinas: Rutina[],
  eventos: Map<string, EventoResuelto[]>,
  nombreCasa: string,
): GrupoApps[] {
  const ids = new Set<ClaveApp>()
  for (const r of rutinas) ids.add(appDeRutina(r))
  for (const lista of eventos.values()) for (const e of lista) ids.add(e.plantillaId)

  const grupos = new Map<CategoriaCal, AppFiltrable[]>()
  for (const id of ids) {
    const p = getPlantilla(id)
    const app: AppFiltrable =
      id === CASA || !p
        ? { id: CASA, nombre: nombreCasa, icon: '📅', color: '#94a3b8' }
        : { id, nombre: p.nombre, icon: p.icon, color: p.color }
    const cat = categoriaDeApp(app.id)
    grupos.set(cat, [...(grupos.get(cat) ?? []), app])
  }

  return ORDEN.filter((c) => grupos.has(c)).map((categoria) => ({
    categoria,
    apps: grupos.get(categoria)!.sort((a, b) => a.nombre.localeCompare(b.nombre)),
  }))
}

/** Set vacío = sin filtro. Así no hay que sembrarlo con todas las apps al arrancar. */
export const pasa = (app: ClaveApp, activas: Set<ClaveApp>) => activas.size === 0 || activas.has(app)
