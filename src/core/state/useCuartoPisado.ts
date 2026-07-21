import { useEffect, useState } from 'react'
import { useHouse } from './houseStore'
import { cuartoEnMundo } from './layoutStore'
import { playerPos } from './playerPosition'

/**
 * Cuarto (de nivel 0) que pisa el personaje mientras pasea por la casa; null si
 * va por fuera, está en otro piso o hay una app abierta (ahí manda el cuarto
 * abierto). `playerPos` vive fuera de React y cambia por frame, así que se
 * muestrea con un intervalo flojo en vez de re-renderizar de continuo.
 */
export function useCuartoPisado(activo = true): string | null {
  const [id, setId] = useState<string | null>(null)
  useEffect(() => {
    if (!activo) {
      setId(null)
      return
    }
    const leer = () => {
      const h = useHouse.getState()
      setId(h.activeRoom || h.playerLevel !== 0 ? null : cuartoEnMundo(playerPos.x, playerPos.z))
    }
    leer()
    const timer = window.setInterval(leer, 1200)
    return () => window.clearInterval(timer)
  }, [activo])
  return id
}
