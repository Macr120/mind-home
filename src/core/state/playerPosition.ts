import * as THREE from 'three'

/** Posición del personaje (mutable, actualizada cada frame sin re-render). */
// y = SUPERFICIE_SUELO (tope de la losa); literal para no meterle imports al módulo.
export const playerPos = new THREE.Vector3(-3, 0.2, 0)

// Acceso desde la consola en desarrollo (medir la Y del avatar en pruebas).
if (import.meta.env.DEV) {
  ;(window as unknown as { playerPos: typeof playerPos }).playerPos = playerPos
}

/**
 * Rumbo del avatar a pie (+Z del modelo, hacia donde mira), en coordenadas de
 * MUNDO. Lo puebla Character cada frame con getWorldDirection; lo leen los
 * minijuegos de cancha para disparar "hacia donde mira el personaje".
 */
export const playerForward = new THREE.Vector3(0, 0, 1)
