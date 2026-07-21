import * as THREE from 'three'

/** Posición del personaje (mutable, actualizada cada frame sin re-render). */
export const playerPos = new THREE.Vector3(-3, 0, 0)

/**
 * Rumbo del avatar a pie (+Z del modelo, hacia donde mira), en coordenadas de
 * MUNDO. Lo puebla Character cada frame con getWorldDirection; lo leen los
 * minijuegos de cancha para disparar "hacia donde mira el personaje".
 */
export const playerForward = new THREE.Vector3(0, 0, 1)
