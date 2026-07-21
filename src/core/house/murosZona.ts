import type { ZonaPlano } from '../data/db'
import {
  centroCuarto3D,
  doorFor,
  edgeKey,
  roomEdges,
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
 * Puerta inicial de un cuarto recién creado: UNA sola, al centro de la fachada que
 * mira hacia afuera del centro de la casa. Solo se aplica al crear; después el
 * usuario agrega/quita puertas a mano (no hay defaults que reaparezcan).
 */
export function puertaInicialCuarto(
  anchor: Cell,
  footprint: Footprint,
  ocupado: Set<string>,
): WallOverrides {
  const exteriores = roomEdges(anchor, footprint, ocupado).filter((e) => e.auto === 'pared')
  if (exteriores.length === 0) return {}
  const [wx, , wz] = centroCuarto3D(anchor, footprint)
  const { axis, sign } = doorFor([wx, 0, wz])
  const lado: SideKey = axis === 'x' ? (sign < 0 ? 'E' : 'O') : sign < 0 ? 'S' : 'N'
  const grupo = exteriores.filter((e) => e.side === lado)
  const candidatas = grupo.length ? ordenarPorLado(grupo, lado) : exteriores
  const medio = candidatas[Math.floor((candidatas.length - 1) / 2)]
  return { [edgeKey(medio.off, medio.side)]: 'puerta' }
}

/**
 * Abre TODAS las aristas exteriores (fachada) de un cuarto: lo deja al aire libre,
 * sin muros ni puerta hacia afuera. Las aristas que dan a un cuarto vecino se dejan
 * como están (cada cuarto dibuja su propio muro). Para cuartos de tipo jardín.
 */
export function murosAbiertosExterior(
  anchor: Cell,
  footprint: Footprint,
  ocupado: Set<string>,
): WallOverrides {
  const out: WallOverrides = {}
  for (const e of roomEdges(anchor, footprint, ocupado)) {
    if (e.auto === 'pared') out[edgeKey(e.off, e.side)] = 'abierto'
  }
  return out
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
    const muros = z.muros ?? {}
    for (const e of roomEdges(anchor, footprint, ocupado)) {
      const estado = muros[edgeKey(e.off, e.side)] ?? e.auto
      out.push({ zonaId: z.id!, edge: e, estado })
    }
  }
  return out
}
