import { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useHouse, playerPos } from '../state/houseStore'
import { useDiseño } from '../state/disenoStore'
import { wallColliders } from './walls'
import { moveInput } from './movement'

const RADIO = 0.4 // radio del personaje para colisiones
const SPEED = 0.095 // velocidad de movimiento libre por frame

// Temporales reutilizables (un solo Character en escena).
const _fwd = new THREE.Vector3()
const _right = new THREE.Vector3()
const _move = new THREE.Vector3()

/** ¿La posición (x,z) cae dentro de alguna pared (inflada por el radio)? */
function chocado(x: number, z: number) {
  for (const c of wallColliders) {
    if (
      x > c.minX - RADIO &&
      x < c.maxX + RADIO &&
      z > c.minZ - RADIO &&
      z < c.maxZ + RADIO
    ) {
      return true
    }
  }
  return false
}

/**
 * Avatar cúbico estilo Roblox.
 * - Movimiento libre (teclado/pad): velocidad relativa a la cámara, con colisiones
 *   (las puertas dejan pasar de un cuarto a otro).
 * - Sin input: se desliza hacia `target` (clic en la casa o menú lateral).
 */
export function Character() {
  const ref = useRef<THREE.Group>(null)
  useHouse((s) => s.navTick)
  const av = useDiseño((s) => s.avatar)
  const camera = useThree((s) => s.camera)

  useFrame(() => {
    if (!ref.current) return
    const cur = ref.current.position
    const { f, s } = moveInput

    if (f !== 0 || s !== 0) {
      // Dirección "adelante" = hacia donde mira la cámara (proyectada al piso).
      camera.getWorldDirection(_fwd)
      _fwd.y = 0
      if (_fwd.lengthSq() < 1e-6) _fwd.set(0, 0, -1)
      _fwd.normalize()
      _right.set(_fwd.z, 0, -_fwd.x) // perpendicular (derecha de pantalla)

      _move
        .set(0, 0, 0)
        .addScaledVector(_fwd, f)
        .addScaledVector(_right, s)
      if (_move.lengthSq() > 0) _move.normalize().multiplyScalar(SPEED)

      let x = cur.x
      let z = cur.z
      if (!chocado(cur.x + _move.x, cur.z)) x = cur.x + _move.x
      if (!chocado(x, cur.z + _move.z)) z = cur.z + _move.z

      cur.set(x, 0, z)
      playerPos.copy(cur)
      // Mantener el destino en la posición actual (sin re-render) para no "regresar".
      useHouse.getState().target.set(x, 0, z)
      ref.current.lookAt(x + _move.x, 0, z + _move.z)
    } else {
      // Clic en la casa / menú lateral: deslizar hacia el destino.
      const { target, freeMove } = useHouse.getState()
      const nx = THREE.MathUtils.lerp(cur.x, target.x, 0.32)
      const nz = THREE.MathUtils.lerp(cur.z, target.z, 0.32)

      let x = cur.x
      let z = cur.z
      if (freeMove) {
        x = nx
        z = nz
      } else {
        if (!chocado(nx, z)) x = nx
        if (!chocado(x, nz)) z = nz
      }

      cur.set(x, 0, z)
      playerPos.copy(cur)
      if (Math.hypot(target.x - x, target.z - z) > 0.05) {
        ref.current.lookAt(target.x, 0, target.z)
      }
    }
  })

  return (
    <group ref={ref} position={[-3, 0, 0]}>
      {/* piernas */}
      <mesh position={[-0.14, 0.3, 0]}>
        <boxGeometry args={[0.24, 0.6, 0.26]} />
        <meshStandardMaterial color={av.piernas} />
      </mesh>
      <mesh position={[0.14, 0.3, 0]}>
        <boxGeometry args={[0.24, 0.6, 0.26]} />
        <meshStandardMaterial color={av.piernas} />
      </mesh>
      {/* torso */}
      <mesh position={[0, 0.92, 0]}>
        <boxGeometry args={[0.6, 0.62, 0.3]} />
        <meshStandardMaterial color={av.torso} />
      </mesh>
      {/* brazos */}
      <mesh position={[-0.42, 0.92, 0]}>
        <boxGeometry args={[0.2, 0.6, 0.26]} />
        <meshStandardMaterial color={av.torso} />
      </mesh>
      <mesh position={[0.42, 0.92, 0]}>
        <boxGeometry args={[0.2, 0.6, 0.26]} />
        <meshStandardMaterial color={av.torso} />
      </mesh>
      {/* cabeza */}
      <mesh position={[0, 1.5, 0]}>
        <boxGeometry args={[0.44, 0.44, 0.44]} />
        <meshStandardMaterial color={av.cabeza} />
      </mesh>
    </group>
  )
}
