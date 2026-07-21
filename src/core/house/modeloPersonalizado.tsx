import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import type { Pieza3D } from '../chat/mascotas'

/**
 * Render de los modelos 3D personalizados, compartido por el avatar del usuario
 * (Character) y los asistentes (Asistente3D): piezas primitivas descritas a la
 * IA, construidas a mano en el editor, o un .glb subido por el usuario.
 */

/**
 * Selección de pieza en edición: los previews del editor la proveen (dentro de su
 * Canvas) para que las piezas se puedan tocar y la elegida se resalte. Sin
 * provider (mapa, miniaturas) las piezas se dibujan normales y no capturan clics.
 */
export const PiezasSeleccionContext = createContext<{
  sel: number
  onSel: (i: number) => void
} | null>(null)

/** Personaje u objeto construido con primitivas (por la IA o a mano en el editor). */
export function ModeloPiezas({
  piezas,
  meshRefs,
}: {
  piezas: Pieza3D[]
  /** Refs de cada mesh por índice (la animación de poses los mueve por frame). */
  meshRefs?: { current: (THREE.Mesh | null)[] }
}) {
  const edicion = useContext(PiezasSeleccionContext)
  return (
    <group>
      {piezas.map((p, i) => {
        const sel = edicion != null && i === edicion.sel
        return (
          <mesh
            key={i}
            ref={meshRefs ? (m) => { meshRefs.current[i] = m } : undefined}
            position={p.pos}
            rotation={p.rot ?? [0, 0, 0]}
            castShadow
            onPointerDown={
              edicion
                ? (e) => {
                    e.stopPropagation()
                    edicion.onSel(i)
                  }
                : undefined
            }
            onPointerOver={
              edicion
                ? (e) => {
                    e.stopPropagation()
                    document.body.style.cursor = 'pointer'
                  }
                : undefined
            }
            onPointerOut={edicion ? () => { document.body.style.cursor = 'default' } : undefined}
          >
            {p.tipo === 'caja' ? (
              <boxGeometry args={[p.tam[0] ?? 0.3, p.tam[1] ?? 0.3, p.tam[2] ?? 0.3]} />
            ) : p.tipo === 'esfera' ? (
              <sphereGeometry args={[p.tam[0] ?? 0.2, 16, 16]} />
            ) : p.tipo === 'cono' ? (
              <coneGeometry args={[p.tam[0] ?? 0.2, p.tam[1] ?? 0.4, 12]} />
            ) : p.tipo === 'plano' ? (
              <planeGeometry args={[p.tam[0] ?? 0.5, p.tam[1] ?? 0.5]} />
            ) : (
              <cylinderGeometry args={[p.tam[0] ?? 0.15, p.tam[1] ?? 0.15, p.tam[2] ?? 0.4, 12]} />
            )}
            <meshStandardMaterial
              color={p.color}
              emissive={sel ? '#34d399' : '#000000'}
              emissiveIntensity={sel ? 0.45 : 0}
              side={p.tipo === 'plano' ? THREE.DoubleSide : THREE.FrontSide}
            />
          </mesh>
        )
      })}
    </group>
  )
}

/**
 * Modelo .glb subido por el usuario, normalizado a ~1.5 en su lado mayor sobre y=0.
 *
 * El object-URL se crea en un EFECTO (comprometido), no en el render que suspende:
 * `useGLTF` suspende hasta cargar, y si el URL se creara con useMemo en el mismo
 * componente, cada reintento de Suspense generaría un URL nuevo → useGLTF recarga
 * y nunca estabiliza (bucle infinito, el modelo no aparece). Con un hijo aparte que
 * recibe un URL estable, la suspensión se resuelve una sola vez.
 */
export function ModeloGLB({ blob }: { blob: Blob }) {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    const u = URL.createObjectURL(blob)
    // eslint-disable-next-line react-hooks/set-state-in-effect -- deliberado: el URL debe nacer en un render YA comprometido (ver doc arriba); con useMemo cada reintento de Suspense lo regeneraría
    setUrl(u)
    return () => URL.revokeObjectURL(u)
  }, [blob])
  return url ? <ModeloGLBInner url={url} /> : null
}

function ModeloGLBInner({ url }: { url: string }) {
  const { scene } = useGLTF(url)

  const normalizado = useMemo(() => {
    const clon = scene.clone(true)
    const caja = new THREE.Box3().setFromObject(clon)
    const tam = caja.getSize(new THREE.Vector3())
    // Normaliza por la dimensión MAYOR (no solo la altura): así un modelo plano o
    // ancho (una moneda, un cuadro) no se dispara de escala. ~1.5 en su lado mayor.
    const mayor = Math.max(tam.x, tam.y, tam.z)
    const escala = mayor > 0 && Number.isFinite(mayor) ? 1.5 / mayor : 1
    clon.scale.setScalar(escala)
    // Centrar en XZ y apoyar la base en y=0.
    const centro = caja.getCenter(new THREE.Vector3())
    clon.position.set(-centro.x * escala, -caja.min.y * escala, -centro.z * escala)
    return clon
  }, [scene])

  return <primitive object={normalizado} />
}
