import { useEffect, useMemo } from 'react'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import type { Pieza3D } from '../chat/mascotas'

/**
 * Render de los modelos 3D personalizados, compartido por el avatar del usuario
 * (Character) y los asistentes (Asistente3D): piezas primitivas descritas a la
 * IA o un .glb subido por el usuario.
 */

/** Personaje descrito por el usuario y construido por la IA con primitivas. */
export function ModeloPiezas({ piezas }: { piezas: Pieza3D[] }) {
  return (
    <group>
      {piezas.map((p, i) => (
        <mesh key={i} position={p.pos} rotation={p.rot ?? [0, 0, 0]} castShadow>
          {p.tipo === 'caja' ? (
            <boxGeometry args={[p.tam[0] ?? 0.3, p.tam[1] ?? 0.3, p.tam[2] ?? 0.3]} />
          ) : p.tipo === 'esfera' ? (
            <sphereGeometry args={[p.tam[0] ?? 0.2, 16, 16]} />
          ) : p.tipo === 'cono' ? (
            <coneGeometry args={[p.tam[0] ?? 0.2, p.tam[1] ?? 0.4, 12]} />
          ) : (
            <cylinderGeometry args={[p.tam[0] ?? 0.15, p.tam[1] ?? 0.15, p.tam[2] ?? 0.4, 12]} />
          )}
          <meshStandardMaterial color={p.color} />
        </mesh>
      ))}
    </group>
  )
}

/** Modelo .glb subido por el usuario, normalizado a ~1.5 de alto sobre y=0. */
export function ModeloGLB({ blob }: { blob: Blob }) {
  const url = useMemo(() => URL.createObjectURL(blob), [blob])
  useEffect(() => () => URL.revokeObjectURL(url), [url])
  const { scene } = useGLTF(url)

  const normalizado = useMemo(() => {
    const clon = scene.clone(true)
    const caja = new THREE.Box3().setFromObject(clon)
    const tam = caja.getSize(new THREE.Vector3())
    const escala = tam.y > 0 ? 1.5 / tam.y : 1
    clon.scale.setScalar(escala)
    // Centrar en XZ y apoyar la base en y=0.
    const centro = caja.getCenter(new THREE.Vector3())
    clon.position.set(-centro.x * escala, -caja.min.y * escala, -centro.z * escala)
    return clon
  }, [scene])

  return <primitive object={normalizado} />
}
