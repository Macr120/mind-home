/**
 * El tren que une las zonas: un anillo de riel por el perímetro del mapa.
 *
 * El tren NO es un objeto ni necesita estación: basta con celdas
 * `caminos.tipo = 'riel'`. Al caminar sobre la vía (radio de 4.4 m desde el
 * centro de la celda) aparece «Montar el tren» — ver `core/house/tren.tsx`.
 *
 * El trazado tiene que ser un CICLO SIMPLE: en una bifurcación el tren elige
 * al azar (`trenStore.extender`), así que cada celda debe tener exactamente
 * dos vecinos. El perímetro cumple a cualquier tamaño de mapa, y las esquinas
 * se curvan solas (las curvas se deducen de los vecinos del mismo tipo).
 */
import { aplicarPisoExteriorCeldas, caminosRepo } from '../../core/data/repository'
import { MAPA_ROOM, useDiseño } from '../../core/state/disenoStore'
import type { Cell } from '../../core/house/walls'
import { CUADRANTES, mundo, rectZona } from './cuadrantes'

/** Celdas del anillo: primera y última fila completas + los laterales. */
export function celdasAnillo(cols: number, rows: number): Cell[] {
  const ultimaCol = cols - 1
  const ultimaFila = rows - 1
  const out: Cell[] = []
  for (let col = 0; col <= ultimaCol; col++) {
    out.push({ col, row: 0 })
    out.push({ col, row: ultimaFila })
  }
  for (let row = 1; row < ultimaFila; row++) {
    out.push({ col: 0, row })
    out.push({ col: ultimaCol, row })
  }
  return out
}

/**
 * Lado del anillo donde para el tren en cada zona y a qué altura del bloque
 * (offset a lo largo de ese lado). Con las posiciones actuales, el lado
 * asignado de cada zona coincide siempre con el borde del mapa recortado.
 */
const LADO_ANDEN: Record<string, { lado: 'N' | 'S' | 'E' | 'O'; offset: number }> = {
  'zona-casa': { lado: 'N', offset: 4 },
  'zona-canchas': { lado: 'N', offset: 2 },
  'zona-santuario': { lado: 'E', offset: 2 },
  'zona-pista': { lado: 'O', offset: 2 },
  'zona-mindfulness': { lado: 'S', offset: 3 },
  'zona-feria': { lado: 'E', offset: 1 },
}

/**
 * Andén de cada zona: la celda de vía donde uno se sube y su vecina interior,
 * ambas de adoquín — DERIVADAS del cuadrante (malla proporcional), nunca
 * coordenadas fijas. Solo la parada de la casa lleva farol — es la única celda
 * libre garantizada; un farol tiene colisión y en las demás zonas podría caer
 * dentro del rectángulo de una cancha o de un corral.
 */
function andenes(cols: number, rows: number): { via: Cell; junto: Cell }[] {
  return CUADRANTES.map((q) => {
    const { lado, offset } = LADO_ANDEN[q.id]
    const r = rectZona(q.id)
    // La vía va en el borde del MAPA de ese lado (coincide con el del bloque
    // con las posiciones actuales; el min/max cubre bloques interiores).
    switch (lado) {
      case 'N': {
        const via = { col: r.c0 + offset, row: Math.max(r.r0, 0) }
        return { via, junto: { col: via.col, row: via.row + 1 } }
      }
      case 'S': {
        const via = { col: r.c0 + offset, row: Math.min(r.r1, rows - 1) }
        return { via, junto: { col: via.col, row: via.row - 1 } }
      }
      case 'E': {
        const via = { col: Math.min(r.c1, cols - 1), row: r.r0 + offset }
        return { via, junto: { col: via.col - 1, row: via.row } }
      }
      case 'O': {
        const via = { col: Math.max(r.c0, 0), row: r.r0 + offset }
        return { via, junto: { col: via.col + 1, row: via.row } }
      }
    }
  })
}

export async function construirTren(cols: number, rows: number): Promise<void> {
  const D = useDiseño.getState
  const anillo = celdasAnillo(cols, rows)
  verificarCiclo(anillo)

  for (const c of anillo) await caminosRepo.add({ col: c.col, row: c.row, tipo: 'riel' })

  for (const a of andenes(cols, rows)) {
    await aplicarPisoExteriorCeldas(0, [a.via, a.junto], 'adoquin', '#b3aca0')
  }
  // Farol solo en la parada de la casa (celda del andador, siempre libre).
  const casa = andenes(cols, rows)[0]
  if (casa) {
    const { x, z } = mundo(casa.junto.col, casa.junto.row)
    await D().addObjeto(MAPA_ROOM, 'farol', '#cbd5e1', undefined, { x, z })
  }
}

/**
 * Aviso en desarrollo si alguna celda del anillo no tiene exactamente dos
 * vecinos: con tres, el recorrido del tren se vuelve aleatorio.
 */
function verificarCiclo(celdas: Cell[]): void {
  if (!import.meta.env.DEV) return
  const clave = (c: Cell) => `${c.col},${c.row}`
  const set = new Set(celdas.map(clave))
  const malas = celdas.filter((c) => {
    const vecinos = [
      { col: c.col + 1, row: c.row },
      { col: c.col - 1, row: c.row },
      { col: c.col, row: c.row + 1 },
      { col: c.col, row: c.row - 1 },
    ].filter((v) => set.has(clave(v)))
    return vecinos.length !== 2
  })
  if (malas.length) {
    console.warn('[MPH demo] El anillo del tren tiene bifurcaciones en', malas)
  }
}
