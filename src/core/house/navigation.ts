import { playerPos } from '../state/playerPosition'
import { roomEntrance } from './walls'

/** Radio alrededor del punto de puerta para permitir entrar. */
export const ENTRAR_DIST_PUERTA = 4.5

/** Distancia del personaje al punto frente a la puerta del cuarto (solo en XZ).
 *  Ignorar la Y evita que cuartos en niveles elevados queden siempre fuera del radio. */
export function distanciaAPuerta(posicion: [number, number, number]) {
  const [ex, ez] = roomEntrance(posicion)
  const dx = playerPos.x - ex
  const dz = playerPos.z - ez
  return Math.sqrt(dx * dx + dz * dz)
}

export function estaEnPuerta(posicion: [number, number, number]) {
  return distanciaAPuerta(posicion) <= ENTRAR_DIST_PUERTA
}
