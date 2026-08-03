import { colorDeZona, regionCeldas, regionCuadrante } from '../../core/tutorial/zonaMapa'
import { AMBAR_FOCO, type RegionMapa } from '../../core/state/zonaTutStore'
import {
  CANCHAS,
  claseDeCancha,
  esCancha,
  escalaCancha,
  type ClaseCancha,
} from '../../core/state/canchasStore'
import { esObjetoMapa, useDiseño } from '../../core/state/disenoStore'
import { useLayout } from '../../core/state/layoutStore'
import { areaUtilZona, metaPista } from './cuadrantes'

/**
 * Focos de cámara del mapa demo: lo que enfocan y resaltan los tutoriales de
 * infraestructura. Igual que el resto de `mapa/`, todo se deriva del ÁREA ÚTIL
 * de cada zona, así que si la malla crece los focos crecen con ella.
 *
 * Todos devuelven `null` cuando la zona no existe — un solo chequeo cubre «no
 * es la casa demo» y «el visitante no eligió esa zona»; el paso se queda
 * entonces sin vuelo ni resalte, como cualquier tarjeta de texto.
 */

const dims = () => {
  const { gridCols, gridRows } = useLayout.getState()
  return { cols: gridCols, rows: gridRows }
}

/** La zona completa ('zona-pista', 'zona-canchas'…). */
export const focoZona = (id: string): RegionMapa | null => regionCuadrante(id)

/**
 * Sub-rectángulo de una zona en OFFSETS de su área útil (mismas coordenadas
 * con las que se construyó su contenido).
 */
export function focoZonaOffset(
  zonaId: string,
  dc0: number,
  dr0: number,
  dc1: number,
  dr1: number,
  extra?: Pick<RegionMapa, 'alto' | 'margen' | 'color'>,
): RegionMapa | null {
  const color = colorDeZona(zonaId)
  if (!color) return null
  const { cols, rows } = dims()
  const u = areaUtilZona(zonaId, cols, rows)
  // Por defecto hereda el color de su zona; un foco de objeto pasa el ámbar.
  return regionCeldas(u.c0 + dc0, u.r0 + dr0, u.c0 + dc1, u.r0 + dr1, { color, ...extra })
}

/** El mapa entero (lo que recorre el anillo del tren). */
export function focoMapa(): RegionMapa {
  const { cols, rows } = dims()
  return regionCeldas(0, 0, cols - 1, rows - 1)
}

/**
 * La línea de meta del circuito, con una celda de aire alrededor. Sin `color`
 * hereda el de su zona; como foco de objeto se le pasa el ámbar.
 */
export function focoMeta(color?: string): RegionMapa | null {
  const deZona = colorDeZona('zona-pista')
  if (!deZona) return null
  const { cols, rows } = dims()
  const m = metaPista(cols, rows)
  return regionCeldas(m.col - 1, m.row - 1, m.col + 1, m.row + 1, { color: color ?? deZona })
}

// ─── Focos de OBJETO: lo que un paso señala en ámbar. Se derivan de los datos
// REALES del mapa (no de coordenadas teóricas), así el resalte cae sobre el
// objeto aunque el terreno se haya movido.

/** Región a partir de un rect ya medido en metros (complementa `regionCeldas`). */
export function focoRect(
  x: number,
  z: number,
  ancho: number,
  largo: number,
  extra?: Pick<RegionMapa, 'alto' | 'margen' | 'color'>,
): RegionMapa {
  return { centro: [x, 0, z], ancho, largo, color: AMBAR_FOCO, ...extra }
}

/** Las canchas de esas clases que estén colocadas en el mapa. */
function canchasDe(clases: ClaseCancha[]) {
  const quiere = new Set<string>(clases)
  return useDiseño
    .getState()
    .objetos.filter((o) => esObjetoMapa(o) && esCancha(o.tipo) && quiere.has(claseDeCancha(o.tipo)))
}

/**
 * Una o varias canchas, envueltas en un solo rect (ya rotadas y escaladas:
 * mismo criterio que `canchaEnPunto` de `core/house/canchas.tsx`).
 */
export function focoCanchas(...clases: ClaseCancha[]): RegionMapa | null {
  const objetos = canchasDe(clases)
  if (!objetos.length) return null
  let x0 = Infinity
  let x1 = -Infinity
  let z0 = Infinity
  let z1 = -Infinity
  for (const o of objetos) {
    const def = CANCHAS[claseDeCancha(o.tipo)]
    // `escalaCancha` es la fuente única del tamaño real (incluye el factor de
    // la celda del mapa): el ámbar debe medir lo mismo que la cancha pintada.
    const esc = escalaCancha(o.escala)
    const girada = (o.rotY ?? 0) % 180 !== 0
    const hw = ((girada ? def.ancho : def.largo) * esc) / 2
    const hh = ((girada ? def.largo : def.ancho) * esc) / 2
    const x = o.x ?? 0
    const z = o.z ?? 0
    x0 = Math.min(x0, x - hw)
    x1 = Math.max(x1, x + hw)
    z0 = Math.min(z0, z - hh)
    z1 = Math.max(z1, z + hh)
  }
  return focoRect((x0 + x1) / 2, (z0 + z1) / 2, x1 - x0, z1 - z0)
}

/**
 * Un corral del santuario: 0 = el grande de pastoreo, 1 = el chico (el sucio,
 * donde además está el animal enfermo). Deterministas por el reparto con que
 * los construye `construirSantuario`.
 */
export function focoCorral(indice: 0 | 1): RegionMapa | null {
  return indice === 0
    ? focoZonaOffset('zona-santuario', 0, 0, 2, 1, { color: AMBAR_FOCO })
    : focoZonaOffset('zona-santuario', 3, 0, 3, 1, { color: AMBAR_FOCO })
}

/** El bloque de parcelas del huerto (las 4×2 celdas que siembra el santuario). */
export function focoParcelas(): RegionMapa | null {
  return focoZonaOffset('zona-santuario', 0, 2, 3, 3, { color: AMBAR_FOCO })
}
