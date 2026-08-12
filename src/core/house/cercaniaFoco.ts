import { useEffect } from 'react'
import { create } from 'zustand'
import { useCam } from '../state/cameraStore'
import { useLayout } from '../state/layoutStore'
import { SPACING, type Cell } from './walls'
import { TAM_BLOQUE } from './cuadrantesMapa'

/**
 * Qué parte del mapa está «en juego» ahora mismo, para no montar los objetos ni
 * los controladores de lo que queda lejos.
 *
 * Manda el FOCO DE LA CÁMARA, no el jugador: durante un tutorial la cámara vuela
 * a otra zona (ver `core/tutorial/zonaMapa.ts`) y el jugador se queda donde
 * estaba — con el criterio del jugador, el tour enfocaría un cuadrante vacío. En
 * exploración libre el foco sigue al personaje, así que un solo criterio cubre
 * los dos casos.
 *
 * El casco de los cuartos NO se recorta: en isométrica se ve el mapa entero y
 * hacerlos aparecer y desaparecer cambiaría la silueta. Lo que se ahorra es lo
 * que casi no se distingue de lejos (los objetos) y lo que no se ve nunca (los
 * sondeos de proximidad).
 */

/** Radio en CUADRANTES alrededor del foco. 1 = el suyo y sus ocho vecinos. */
const RADIO_BLOQUES = 1
/** Cada cuánto se remira el foco. Misma cadencia acotada que RoomProximity. */
const MS_SONDEO = 250

interface CercaniaState {
  /** Celda del foco de cámara. `null` = todavía sin medir: nadie recorta nada. */
  centro: Cell | null
}

export const useCercania = create<CercaniaState>(() => ({ centro: null }))

if (import.meta.env.DEV) {
  ;(window as unknown as { useCercania: typeof useCercania }).useCercania = useCercania
}

/** Mundo → celda: la inversa exacta de `cellToWorld` (walls.ts). */
function celdaDeMundo(x: number, z: number, cols: number, rows: number): Cell {
  return {
    col: Math.round(x / SPACING + (cols - 1) / 2),
    row: Math.round(z / SPACING + (rows - 1) / 2),
  }
}

/**
 * ¿Esta celda está dentro del radio del foco? Sin foco medido (o sin celda)
 * responde que SÍ: el recorte nunca debe esconder por no saber.
 */
export function cercaDelFoco(cell: Cell | undefined, centro: Cell | null): boolean {
  if (!cell || !centro) return true
  const r = RADIO_BLOQUES * TAM_BLOQUE
  return Math.abs(cell.col - centro.col) <= r && Math.abs(cell.row - centro.row) <= r
}

/** Igual, para lo que vive en coordenadas de MUNDO (los objetos libres del mapa). */
export function cercaDelFocoMundo(x: number, z: number, centro: Cell | null): boolean {
  if (!centro) return true
  const { gridCols, gridRows } = useLayout.getState()
  return cercaDelFoco(celdaDeMundo(x, z, gridCols, gridRows), centro)
}

/**
 * Sondea el foco de la cámara y publica su celda. Con histéresis: solo reescribe
 * cuando el foco cambia de celda, así que los cuartos no se re-renderizan
 * mientras la cámara se mueve dentro de la misma.
 */
export function SeguirFoco({ cols, rows }: { cols: number; rows: number }) {
  useEffect(() => {
    const medir = () => {
      const [x, , z] = useCam.getState().focus
      const c = celdaDeMundo(x, z, cols, rows)
      const prev = useCercania.getState().centro
      if (!prev || prev.col !== c.col || prev.row !== c.row) useCercania.setState({ centro: c })
    }
    medir()
    const id = window.setInterval(medir, MS_SONDEO)
    return () => window.clearInterval(id)
  }, [cols, rows])
  return null
}
