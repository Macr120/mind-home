import { useMemo } from 'react'
import { useLayout } from '../../state/layoutStore'
import { useHouse } from '../../state/houseStore'
import { useTemaActivo } from '../useTema'
import type { EscenarioId } from '../temas'
import { SPACING, WALL_H, nivelBaseY } from '../walls'

/** Rectángulo (en mundo) del plano del mapa: la cubierta del vehículo. */
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

/**
 * Límites activos del escenario en movimiento (null = sin escenario o editando).
 * Con ellos `EscenarioVivo` detiene el vehículo cuando el personaje se baja del plano.
 */
let activos: LimitesCasa | null = null
export function setLimitesEscenario(l: LimitesCasa | null) {
  activos = l
}
/** ¿(x,z) queda fuera del plano del vehículo? (sin escenario activo, nunca). */
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

  return useMemo(() => {
    // El vehículo ocupa el plano ENTERO (toda la rejilla), no solo lo construido.
    const ancho = gridCols * SPACING
    const largo = gridRows * SPACING
    let nivelMax = 0
    for (const [nivel, occ] of ocupadoPorNivel) if (occ.size && nivel > nivelMax) nivelMax = nivel
    return {
      x0: -ancho / 2,
      x1: ancho / 2,
      z0: -largo / 2,
      z1: largo / 2,
      cx: 0,
      cz: 0,
      ancho,
      largo,
      alto: nivelBaseY(nivelMax, apilado) + WALL_H,
    }
  }, [ocupadoPorNivel, gridCols, gridRows, apilado])
}
