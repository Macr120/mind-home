import * as THREE from 'three'
import { useCam } from '../state/cameraStore'
import { playerForward } from '../state/playerPosition'

/**
 * Puntería tipo shooter: en 1ª/3ª persona se dispara hacia donde SEÑALA EL
 * CURSOR en pantalla (raycast real desde la cámara a través de su posición),
 * no hacia el frente del avatar ni de la cámara. En vistas sin puntería (iso,
 * interior, grafiti, diálogo) se mantiene el frente del avatar, como siempre.
 */

/** Distancia de convergencia cañón↔mira: a menos, el tiro cruzaría mucho de cerca. */
const DIST_MIRA = 22

const _dirCam = new THREE.Vector3()
const _punto = new THREE.Vector3()
const _raycaster = new THREE.Raycaster()
const _ndc = new THREE.Vector2()

/**
 * Posición del cursor sobre el lienzo en NDC (-1..1, el formato que espera
 * Three.js para raycasting). La mantiene al día `ui/Mira.tsx`. `activo` es
 * falso en móvil (no hay cursor) o mientras el ratón está fuera del lienzo
 * (sobre el HUD): en ese caso se apunta con el frente de la cámara, igual que
 * antes de que existiera el rastreo del cursor.
 */
export const cursorPuntero = { x: 0, y: 0, activo: false }

if (import.meta.env.DEV) {
  ;(window as unknown as { cursorPuntero: typeof cursorPuntero }).cursorPuntero = cursorPuntero
}

/** ¿La vista actual permite apuntar (perspectiva siguiendo al personaje)? */
export function vistaConMira(): boolean {
  const v = useCam.getState().vista
  return v === 'tercera' || v === 'primera'
}

/**
 * Escribe en `out` la dirección normalizada del disparo desde el cañón (ox,oy,oz).
 * `dispersion` (radianes) abre el tiro al azar cuando no se está apuntando.
 */
export function dirDisparoDesde(
  camera: THREE.Camera,
  ox: number,
  oy: number,
  oz: number,
  out: THREE.Vector3,
  dispersion = 0,
): THREE.Vector3 {
  if (vistaConMira()) {
    if (cursorPuntero.activo) {
      // El PUNTERO es la mira: se dispara literalmente hacia donde señala en pantalla.
      _ndc.set(cursorPuntero.x, cursorPuntero.y)
      _raycaster.setFromCamera(_ndc, camera)
      _punto.copy(_raycaster.ray.origin).addScaledVector(_raycaster.ray.direction, DIST_MIRA)
    } else {
      // Sin cursor (móvil, o el ratón salió del lienzo): al frente de la cámara.
      camera.getWorldDirection(_dirCam)
      _punto.copy(camera.position).addScaledVector(_dirCam, DIST_MIRA)
    }
    out.set(_punto.x - ox, _punto.y - oy, _punto.z - oz).normalize()
  } else {
    // Sin mira: recto al frente del avatar.
    out.set(playerForward.x, 0, playerForward.z).normalize()
  }
  if (dispersion > 0) {
    out.x += (Math.random() * 2 - 1) * dispersion
    out.y += (Math.random() * 2 - 1) * dispersion * 0.6
    out.z += (Math.random() * 2 - 1) * dispersion
    out.normalize()
  }
  return out
}

/** Rumbo (rotation.y) que encara al avatar hacia donde mira la cámara. */
export function yawDeCamara(camera: THREE.Camera): number {
  camera.getWorldDirection(_dirCam)
  return Math.atan2(_dirCam.x, _dirCam.z)
}
