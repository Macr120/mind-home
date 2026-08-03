import { useCaminos } from './caminosStore'
import { useCanchas } from './canchasStore'
import { useHuerto } from './huertoStore'
import { useGranja } from './granjaStore'

/**
 * Hay un editor de infraestructura abierto (Caminos, Canchas, Huerto o Granja).
 * Su HUD ocupa arriba y abajo, así que el HUD de juego cede: se ocultan los
 * controles de movimiento y se pliegan las esquinas superiores de la casa.
 */
export function useConstruyendo() {
  // Los cuatro hooks se llaman SIEMPRE (un `||` directo saltaría hooks al corto-circuitar).
  const enCaminos = useCaminos((s) => s.activo)
  const enCanchas = useCanchas((s) => s.activo)
  const enHuerto = useHuerto((s) => s.activo)
  const enGranja = useGranja((s) => s.activo)
  return enCaminos || enCanchas || enHuerto || enGranja
}
