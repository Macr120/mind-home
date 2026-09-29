import { useMemo } from 'react'
import { useLayout } from '../../state/layoutStore'
import { useHouse } from '../../state/houseStore'
import { VACIO, caminosRepo, corralesRepo, cultivosRepo } from '../../data/repository'
import { useTemaActivo } from '../useTema'
import type { EscenarioId } from '../temas'
import { SPACING, WALL_H, cellToWorld, nivelBaseY } from '../walls'

/** Rectángulo (en mundo) que ocupa lo construido: cuartos + infraestructura. */
export interface LimitesCasa {
  x0: number
  x1: number
  z0: number
  z1: number
  cx: number
  cz: number
  ancho: number
  largo: number
  /** Altura del techo más alto. */
  alto: number
}

/** Holgura alrededor de lo construido para que la cubierta no quede al ras de los muros. */
const MARGEN = 0.8

/**
 * Límites activos del escenario en movimiento (null = sin escenario o editando).
 * Los lee `Character` en cada fotograma para no dejar al personaje caminar por el aire.
 */
let activos: LimitesCasa | null = null
export function setLimitesEscenario(l: LimitesCasa | null) {
  activos = l
}
export function fueraDelEscenario(x: number, z: number): boolean {
  return !!activos && (x < activos.x0 || x > activos.x1 || z < activos.z0 || z > activos.z1)
}

/** Escenario que se VE ahora: el del tema activo, salvo en el editor (ahí vuelve el piso). */
export function useEscenarioVisible(): EscenarioId | null {
  const tema = useTemaActivo()
  const editMode = useLayout((s) => s.editMode)
  return tema?.escenario && !editMode ? tema.escenario : null
}

export function useLimitesCasa(): LimitesCasa {
  const ocupadoPorNivel = useLayout((s) => s.ocupadoPorNivel)
  const gridCols = useLayout((s) => s.gridCols)
  const gridRows = useLayout((s) => s.gridRows)
  const apilado = !useHouse((s) => s.explotado)
  const caminos = caminosRepo.useAll() ?? VACIO
  const cultivos = cultivosRepo.useAll() ?? VACIO
  const corrales = corralesRepo.useAll() ?? VACIO

  return useMemo(() => {
    let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity
    let nivelMax = 0
    const incluir = (a: number, b: number, c: number, d: number) => {
      if (a < x0) x0 = a
      if (b > x1) x1 = b
      if (c < z0) z0 = c
      if (d > z1) z1 = d
    }
    // Sub-celdas de los cuartos (misma fórmula que `MapaBase3D`).
    for (const [nivel, occ] of ocupadoPorNivel) {
      if (occ.size && nivel > nivelMax) nivelMax = nivel
      for (const k of occ) {
        const [sc, sr] = k.split(',').map(Number)
        const sx = (sc / 2 - (gridCols - 1) / 2) * SPACING
        const sz = (sr / 2 - (gridRows - 1) / 2) * SPACING
        incluir(sx, sx + SPACING / 2, sz, sz + SPACING / 2)
      }
    }
    // Infraestructura por celda entera.
    const celda = (col: number, row: number, ancho = 1, alto = 1) => {
      const [ax, , az] = cellToWorld(col, row)
      const h = SPACING / 2
      incluir(ax - h, ax + (ancho - 1) * SPACING + h, az - h, az + (alto - 1) * SPACING + h)
    }
    for (const c of caminos) celda(c.col, c.row)
    for (const c of cultivos) celda(c.col, c.row)
    for (const c of corrales) celda(c.col, c.row, c.ancho, c.alto)
    // Casa vacía: una celda al centro para que el vehículo no desaparezca.
    if (x0 === Infinity) {
      x0 = z0 = -SPACING / 2
      x1 = z1 = SPACING / 2
    }
    x0 -= MARGEN
    z0 -= MARGEN
    x1 += MARGEN
    z1 += MARGEN
    return {
      x0,
      x1,
      z0,
      z1,
      cx: (x0 + x1) / 2,
      cz: (z0 + z1) / 2,
      ancho: x1 - x0,
      largo: z1 - z0,
      alto: nivelBaseY(nivelMax, apilado) + WALL_H,
    }
  }, [ocupadoPorNivel, gridCols, gridRows, apilado, caminos, cultivos, corrales])
}
