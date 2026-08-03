/**
 * Dónde aparece el personaje al entrar a la casa demo.
 *
 * El motor arranca en un punto FIJO de mundo: `playerPos` y `useHouse.target`
 * nacen ambos en (-3, 0, 0). Como `cellToWorld` centra la rejilla, ese punto
 * cae en celdas distintas según el tamaño del mapa — y el mapa demo se recorta
 * a las zonas elegidas. Sin esto, con un mapa chico el visitante aparecería
 * dentro de la casa (o atrapado en un muro).
 *
 * Por eso la construcción guarda el punto bueno (el andador del patio) y
 * `main.tsx` lo aplica ANTES del primer render: `Character` toma `playerPos`
 * como posición inicial, así que después ya sería tarde. Se fija también
 * `target`, o el personaje se deslizaría de vuelta al punto viejo (no hay
 * input → `Character` interpola hacia el destino).
 */
import { claveLS } from '../core/edicion'
import { useHouse } from '../core/state/houseStore'
import { playerPos } from '../core/state/playerPosition'

const LS_SPAWN = 'mh.demo.spawn'

export function guardarSpawnDemo(x: number, z: number): void {
  localStorage.setItem(claveLS(LS_SPAWN), JSON.stringify({ x, z }))
}

/** Coloca al personaje en el punto guardado (si lo hay). */
export function aplicarSpawnDemo(): void {
  const crudo = localStorage.getItem(claveLS(LS_SPAWN))
  if (!crudo) return
  try {
    const { x, z } = JSON.parse(crudo) as { x: number; z: number }
    if (typeof x !== 'number' || typeof z !== 'number') return
    playerPos.set(x, 0, z)
    useHouse.getState().target.set(x, 0, z)
  } catch {
    /* json corrupto: se queda el punto por defecto */
  }
}
