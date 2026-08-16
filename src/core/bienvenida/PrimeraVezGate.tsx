import { useEffect } from 'react'
import { useDiseño } from '../state/disenoStore'
import { useLayout } from '../state/layoutStore'
import { useCuartos } from '../state/cuartosStore'
import { evaluarPrimeraVez } from './bienvenidaStore'

/**
 * Dispara la bienvenida de primera vez cuando la casa termina de cargar.
 * Vive aparte (montado SIEMPRE y sin UI) porque `BienvenidaOverlay` es lazy y
 * solo se monta ya abierto: el disparo no puede vivir dentro del overlay.
 */
export function PrimeraVezGate() {
  const cargadoDiseno = useDiseño((s) => s.cargado)
  const cargadoLayout = useLayout((s) => s.cargado)
  const cargadoCuartos = useCuartos((s) => s.cargado)
  const cargado = cargadoDiseno && cargadoLayout && cargadoCuartos

  useEffect(() => {
    if (cargado) evaluarPrimeraVez()
  }, [cargado])

  return null
}
