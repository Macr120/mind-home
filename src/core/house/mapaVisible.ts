import { useMemo } from 'react'
import { useLayout } from '../state/layoutStore'
import { mapaVisible, type MapaVisible } from './cuadrantesMapa'
import { worldToCeldaEntera } from './walls'

/** Recorte del mapa a los cuadrantes no ocultos (null = se ve todo). */
export function useMapaVisible(): MapaVisible | null {
  const cols = useLayout((s) => s.gridCols)
  const rows = useLayout((s) => s.gridRows)
  const ocultos = useLayout((s) => s.cuadrantesOcultos)
  return useMemo(() => mapaVisible(cols, rows, ocultos), [cols, rows, ocultos])
}

let cache: { cols: number; rows: number; ocultos: string[]; mv: MapaVisible | null } | null = null

/** Lo mismo fuera de React (en cada fotograma): se recalcula solo si cambió el mapa. */
export function mapaVisibleActual(): MapaVisible | null {
  const { gridCols: cols, gridRows: rows, cuadrantesOcultos: ocultos } = useLayout.getState()
  if (!cache || cache.cols !== cols || cache.rows !== rows || cache.ocultos !== ocultos)
    cache = { cols, rows, ocultos, mv: mapaVisible(cols, rows, ocultos) }
  return cache.mv
}

/** ¿El punto (x, z) del mundo cae en un cuadrante oculto? (los personajes que pasean por ahí no se ven) */
export function puntoOculto(x: number, z: number): boolean {
  const mv = mapaVisibleActual()
  if (!mv) return false
  const { col, row } = worldToCeldaEntera(x, z)
  return mv.oculta(col, row)
}
