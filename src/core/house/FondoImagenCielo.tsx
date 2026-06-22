import { useEffect, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useDiseño } from '../state/disenoStore'
import { ajusteDesdeDb, layoutFondoImagen } from './fondosImagen'

const _fwd = new THREE.Vector3()
const _right = new THREE.Vector3()
const _up = new THREE.Vector3()
const _pos = new THREE.Vector3()

/**
 * Fondo de cielo con imagen: un plano anclado a la cámara, dimensionado y
 * posicionado con la MISMA fórmula que la vista previa (ancla + zoom «contain»).
 * El color de fondo de la escena es negro, así lo que la imagen no cubra queda negro.
 */
export function FondoImagenCielo() {
  const fondoImagenActivo = useDiseño((s) => s.fondoImagenActivo)
  const fondosImagen = useDiseño((s) => s.fondosImagen)
  const item = fondosImagen.find((f) => f.id === fondoImagenActivo)
  const { invalidate } = useThree()
  const meshRef = useRef<THREE.Mesh>(null)
  const [textura, setTextura] = useState<THREE.Texture | null>(null)

  useEffect(() => {
    if (!item?.id || !item.imagen) {
      setTextura(null)
      return
    }
    let vivo = true
    const url = URL.createObjectURL(item.imagen)
    new THREE.TextureLoader().load(
      url,
      (tex) => {
        URL.revokeObjectURL(url)
        if (!vivo) {
          tex.dispose()
          return
        }
        tex.colorSpace = THREE.SRGBColorSpace
        tex.wrapS = THREE.ClampToEdgeWrapping
        tex.wrapT = THREE.ClampToEdgeWrapping
        setTextura(tex)
        invalidate()
      },
      undefined,
      () => URL.revokeObjectURL(url),
    )
    return () => {
      vivo = false
      setTextura((prev) => {
        prev?.dispose()
        return null
      })
    }
  }, [item?.id, item?.imagen, invalidate])

  useFrame(({ camera, size }) => {
    const m = meshRef.current
    if (!m || !textura || !item) return
    const cam = camera as THREE.OrthographicCamera
    if (!(cam instanceof THREE.OrthographicCamera)) return

    const e = layoutFondoImagen(
      item.ancho,
      item.alto,
      size.width,
      size.height,
      ajusteDesdeDb(item.ajusteX, item.ajusteY, item.escala),
    )

    const wppX = (cam.right - cam.left) / cam.zoom / Math.max(size.width, 1)
    const wppY = (cam.top - cam.bottom) / cam.zoom / Math.max(size.height, 1)

    const planeW = e.anchoD * wppX
    const planeH = e.altoD * wppY

    const offPxX = e.left + e.anchoD / 2 - size.width / 2
    const offPxY = e.top + e.altoD / 2 - size.height / 2
    const offWX = offPxX * wppX
    const offWY = -offPxY * wppY

    _fwd.set(0, 0, -1).applyQuaternion(cam.quaternion)
    _right.set(1, 0, 0).applyQuaternion(cam.quaternion)
    _up.set(0, 1, 0).applyQuaternion(cam.quaternion)

    _pos
      .copy(cam.position)
      .addScaledVector(_fwd, 150)
      .addScaledVector(_right, offWX)
      .addScaledVector(_up, offWY)

    m.position.copy(_pos)
    m.quaternion.copy(cam.quaternion)
    m.scale.set(planeW, planeH, 1)
  })

  if (!textura || !item) return null

  return (
    <mesh ref={meshRef} renderOrder={-1000} frustumCulled={false}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial map={textura} depthTest={false} depthWrite={false} toneMapped={false} />
    </mesh>
  )
}
