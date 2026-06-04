import * as THREE from 'three'
import { playerPos } from '../state/playerPosition'
import { roomEntrance } from './walls'

/** Radio alrededor del punto de puerta para permitir entrar. */
export const ENTRAR_DIST_PUERTA = 4.5

const _puerta = new THREE.Vector3()

/** Distancia del personaje al punto frente a la puerta del cuarto. */
export function distanciaAPuerta(posicion: [number, number, number]) {
  const [ex, ez] = roomEntrance(posicion)
  _puerta.set(ex, 0, ez)
  return playerPos.distanceTo(_puerta)
}

export function estaEnPuerta(posicion: [number, number, number]) {
  return distanciaAPuerta(posicion) <= ENTRAR_DIST_PUERTA
}
