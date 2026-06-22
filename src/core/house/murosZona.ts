import type { ZonaPlano } from '../data/db'
import {
  edgeKey,
  roomEdges,
  SIDE_KEYS,
  type Cell,
  type EdgeInfo,
  type Footprint,
  type SideKey,
  type WallOverrides,
  type WallState,
} from './walls'
import { ocupadoConZonas, zonaAnchorFootprint } from './planoGeometria'

/** Ordena aristas exteriores a lo largo de un lado cardinal (para elegir la del centro). */
function ordenarPorLado(grupo: EdgeInfo[], side: SideKey): EdgeInfo[] {
  const copia = [...grupo]
  if (side === 'N' || side === 'S') {
    copia.sort((a, b) => a.off.col - b.off.col || a.off.row - b.off.row)
  } else {
    copia.sort((a, b) => a.off.row - b.off.row || a.off.col - b.off.col)
  }
  return copia
}

/**
 * Puertas exteriores por defecto: una en el centro de cada fachada (N/S/E/O).
 * Las aristas con vecino (auto = puerta) no se guardan: las resuelve `roomEdges`.
 */
export function calcularMurosExteriorDefecto(
  anchor: Cell,
  footprint: Footprint,
  ocupado: Set<string>,
): WallOverrides {
  const muros: WallOverrides = {}
  const edges = roomEdges(anchor, footprint, ocupado)
  const exteriores = edges.filter((e) => e.auto === 'pared')

  for (const side of SIDE_KEYS) {
    const grupo = exteriores.filter((e) => e.side === side)
    if (grupo.length === 0) continue
    const ordenadas = ordenarPorLado(grupo, side)
    const medio = ordenadas[Math.floor((ordenadas.length - 1) / 2)]
    muros[edgeKey(medio.off, medio.side)] = 'puerta'
  }

  return muros
}

/** Muros efectivos de una zona: defaults de fachada + overrides guardados. */
export function murosEfectivosZona(
  z: ZonaPlano,
  todasZonas: ZonaPlano[],
  ocupadoLayout: Set<string>,
): WallOverrides {
  const { anchor, footprint } = zonaAnchorFootprint(z.celdas)
  const ocupado = ocupadoConZonas(
    z.nivel,
    new Map([[z.nivel, new Set(ocupadoLayout)]]),
    todasZonas,
    z.id,
  )
  const defecto = calcularMurosExteriorDefecto(anchor, footprint, ocupado)
  return { ...defecto, ...(z.muros ?? {}) }
}

/** Calcula muros iniciales al construir un cuarto básico. */
export function murosInicialesZona(
  celdas: Cell[],
  nivel: number,
  ocupadoLayout: Set<string>,
  zonas: ZonaPlano[],
): WallOverrides {
  const { anchor, footprint } = zonaAnchorFootprint(celdas)
  const ocupado = ocupadoConZonas(nivel, new Map([[nivel, new Set(ocupadoLayout)]]), zonas)
  return calcularMurosExteriorDefecto(anchor, footprint, ocupado)
}

export interface AristaZonaPlano {
  zonaId: number
  edge: EdgeInfo
  estado: WallState
}

/** Aristas exteriores de zonas en un nivel (para el croquis 2D). */
export function aristasZonasEnNivel(
  nivel: number,
  zonas: ZonaPlano[],
  ocupadoLayout: Set<string>,
): AristaZonaPlano[] {
  const out: AristaZonaPlano[] = []
  const delNivel = zonas.filter((z) => z.nivel === nivel && z.id != null)
  for (const z of delNivel) {
    const { anchor, footprint } = zonaAnchorFootprint(z.celdas)
    const ocupado = ocupadoConZonas(
      nivel,
      new Map([[nivel, new Set(ocupadoLayout)]]),
      zonas,
      z.id,
    )
    const muros = murosEfectivosZona(z, zonas, ocupadoLayout)
    for (const e of roomEdges(anchor, footprint, ocupado)) {
      const estado = muros[edgeKey(e.off, e.side)] ?? e.auto
      out.push({ zonaId: z.id!, edge: e, estado })
    }
  }
  return out
}
