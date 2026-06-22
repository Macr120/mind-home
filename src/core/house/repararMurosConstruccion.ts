import { db } from '../data/db'
import type { ZonaPlano } from '../data/db'
import { useCuartos } from '../state/cuartosStore'
import {
  calcularMurosExteriorDefecto,
  murosInicialesZona,
} from './murosZona'
import { ocupadoConZonas } from './planoGeometria'
import {
  FOOTPRINT_DEFAULT,
  type Cell,
  type Footprint,
  type WallOverrides,
} from './walls'

/** Fusiona defaults de construcción con overrides guardados (el usuario gana en conflicto). */
export function fusionarMurosDefecto(
  defecto: WallOverrides,
  guardados?: WallOverrides,
): WallOverrides {
  return { ...defecto, ...(guardados ?? {}) }
}

function igualMuros(a?: WallOverrides, b?: WallOverrides): boolean {
  return JSON.stringify(a ?? {}) === JSON.stringify(b ?? {})
}

function fpDe(footprints: Record<string, Footprint>, id: string): Footprint {
  return footprints[id]?.length ? footprints[id] : [...FOOTPRINT_DEFAULT]
}

/**
 * Aplica puertas de fachada (centro por vista) a zonas ya creadas sin `muros`.
 * Idempotente: no pisa overrides del usuario.
 */
export async function repararMurosZonasExistentes(
  ocupadoPorNivel: Map<number, Set<string>>,
): Promise<void> {
  const zonas = await db.zonas.toArray()
  if (zonas.length === 0) return

  for (const z of zonas) {
    if (z.id == null) continue
    const occ = ocupadoPorNivel.get(z.nivel) ?? new Set<string>()
    const defecto = murosInicialesZona(z.celdas, z.nivel, occ, zonas)
    const fusionado = fusionarMurosDefecto(defecto, z.muros)
    if (!igualMuros(z.muros, fusionado)) {
      await db.zonas.update(z.id, { muros: fusionado })
    }
  }
}

/**
 * Aplica puertas de fachada a cuartos del registro que aún no tienen override en esa arista.
 * Las puertas entre vecinos las resuelve `roomEdges` si `ocupado` incluye zonas.
 */
export function repararMurosCuartosRegistro(opts: {
  placed: Record<string, boolean>
  cells: Record<string, Cell>
  footprints: Record<string, Footprint>
  niveles: Record<string, number>
  wallOverrides: Record<string, WallOverrides>
  ocupadoPorNivel: Map<number, Set<string>>
  zonas: ZonaPlano[]
}): { wallOverrides: Record<string, WallOverrides>; cambiados: string[] } {
  const { placed, cells, footprints, niveles, ocupadoPorNivel, zonas } = opts
  const nuevos = { ...opts.wallOverrides }
  const cambiados: string[] = []

  for (const r of useCuartos.getState().cuartos) {
    if (!placed[r.id] || !cells[r.id]) continue
    const lvl = niveles[r.id] ?? 0
    const fp = fpDe(footprints, r.id)
    const occ = ocupadoConZonas(lvl, ocupadoPorNivel, zonas)
    const defecto = calcularMurosExteriorDefecto(cells[r.id], fp, occ)
    const fusionado = fusionarMurosDefecto(defecto, nuevos[r.id])
    if (!igualMuros(nuevos[r.id], fusionado)) {
      nuevos[r.id] = fusionado
      cambiados.push(r.id)
    }
  }

  return { wallOverrides: nuevos, cambiados }
}
