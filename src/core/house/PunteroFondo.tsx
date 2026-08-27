import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useHouse } from '../state/houseStore'
import { elFondoSigueAlCursor } from '../plataforma'

/**
 * Puntero espacial del modo fondo (wallpaper de escritorio): un anillo con
 * latido que sigue al cursor sobre el suelo. El shell reenvía el mouse global
 * como eventos normales (`sendInputEvent`), así que `state.pointer` ya trae la
 * posición; aquí solo se proyecta al mundo con un raycast.
 *
 * El plano es fijo a y=0.2 (el suelo que pisa el jugador): el puntero es
 * cosmético y el fondo vive en la vista general de la casa, no hace falta
 * seguir pisos altos.
 *
 * Y donde el shell NO puede reenviar clics (macOS: la ventana vive por debajo
 * del escritorio y el sistema no se los manda), el anillo deja de ser adorno y
 * el personaje CAMINA hacia él. Es el mismo destino que marca el click-to-move,
 * solo que puesto por el cursor; en Windows no se toca, que allí el clic sí
 * llega y mandar destino en cada frame le quitaría el control al usuario.
 */
const PLANO_SUELO = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.2)
const _punto = new THREE.Vector3()

/** Cuánto tiene que moverse el cursor para remarcar destino (evita el temblor). */
const SALTO_MINIMO = 0.35

export function PunteroFondo() {
  const ref = useRef<THREE.Mesh>(null)
  const sigue = useRef(elFondoSigueAlCursor())

  useFrame((state) => {
    const m = ref.current
    if (!m) return
    state.raycaster.setFromCamera(state.pointer, state.camera)
    if (state.raycaster.ray.intersectPlane(PLANO_SUELO, _punto)) {
      m.visible = true
      m.position.set(_punto.x, 0.22, _punto.z)
      if (sigue.current) {
        const destino = useHouse.getState().target
        if (Math.hypot(destino.x - _punto.x, destino.z - _punto.z) > SALTO_MINIMO) {
          destino.set(_punto.x, 0, _punto.z)
        }
      }
      // Latido suave: que se lea como puntero, no como un objeto de la casa.
      m.scale.setScalar(1 + 0.12 * Math.sin(state.clock.elapsedTime * 3))
    } else {
      m.visible = false
    }
  })

  return (
    <mesh ref={ref} rotation-x={-Math.PI / 2}>
      <ringGeometry args={[0.16, 0.24, 40]} />
      {/* Violeta de la marca en fijo: --color-accent puede venir en sintaxis
          CSS que THREE.Color no parsea (color-mix/oklch). */}
      <meshBasicMaterial color="#895AC6" transparent opacity={0.85} depthWrite={false} />
    </mesh>
  )
}
