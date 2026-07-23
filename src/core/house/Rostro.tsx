import { Suspense, useEffect, useMemo, useState } from 'react'
import { useLoader } from '@react-three/fiber'
import * as THREE from 'three'
import type { AnclasRopa, ExpresionId } from './apariencia'
import { EXPRESION_DEFAULT } from './apariencia'

/**
 * Rostro del personaje sobre el frente de la cabeza (definido por sus `anclas`):
 * una expresión dibujada con primitivas (ojos + boca + cejas) o, si el usuario
 * subió una imagen, esa imagen como textura tapando la cara. Se dibuja apenas por
 * delante de la superficie de la cabeza y por detrás de los lentes.
 */

const OJO = '#20232b'
const BOCA = '#8a3b3b'

export function Rostro({
  anclas,
  expresion,
  rostro,
}: {
  anclas: AnclasRopa
  expresion?: ExpresionId
  /** Imagen subida (gana a la expresión dibujada). */
  rostro?: Blob
}) {
  if (rostro) {
    return (
      <Suspense fallback={null}>
        <RostroImagen anclas={anclas} blob={rostro} />
      </Suspense>
    )
  }
  const exp = expresion ?? EXPRESION_DEFAULT
  if (exp === 'ninguno') return null
  return <RostroDibujado anclas={anclas} exp={exp} />
}

/** Un ojo (esferita oscura). */
function Ojo({ x, y, z, r }: { x: number; y: number; z: number; r: number }) {
  return (
    <mesh position={[x, y, z]}>
      <sphereGeometry args={[r, 10, 10]} />
      <meshStandardMaterial color={OJO} />
    </mesh>
  )
}

/** Boca según la expresión (línea recta, media dona sonriente o «o» de sorpresa). */
function Boca({ exp, y, z, k }: { exp: ExpresionId; y: number; z: number; k: number }) {
  if (exp === 'sorpresa') {
    return (
      <mesh position={[0, y, z]}>
        <torusGeometry args={[0.05 * k, 0.02 * k, 8, 16]} />
        <meshStandardMaterial color={BOCA} />
      </mesh>
    )
  }
  if (exp === 'neutral' || exp === 'serio') {
    return (
      <mesh position={[0, y, z]}>
        <boxGeometry args={[0.16 * k, 0.025 * k, 0.02]} />
        <meshStandardMaterial color={BOCA} />
      </mesh>
    )
  }
  // Sonrisa (feliz = más ancha y gruesa): media dona con la curva hacia arriba.
  const ancho = exp === 'feliz' ? 0.09 : 0.07
  const grosor = exp === 'feliz' ? 0.02 : 0.016
  return (
    <mesh position={[0, y + 0.02 * k, z]} rotation={[0, 0, Math.PI]}>
      <torusGeometry args={[ancho * k, grosor * k, 8, 16, Math.PI]} />
      <meshStandardMaterial color={BOCA} />
    </mesh>
  )
}

/** Cara dibujada con primitivas, escalada al tamaño de la cabeza (`cabezaR`). */
function RostroDibujado({ anclas, exp }: { anclas: AnclasRopa; exp: ExpresionId }) {
  const k = anclas.cabezaR / 0.22 // escala respecto a la cabeza del avatar
  const z = anclas.caraZ - 0.006 // sobre la cara, por detrás de los lentes
  const eyesY = anclas.cabezaY + 0.03 * k
  const mouthY = anclas.cabezaY - 0.1 * k
  const sep = anclas.cabezaR * 0.42
  const guino = exp === 'guino'
  const ojoR = (exp === 'sorpresa' ? 0.06 : 0.045) * k

  return (
    <group>
      <Ojo x={-sep} y={eyesY} z={z} r={ojoR} />
      {guino ? (
        <mesh position={[sep, eyesY, z]}>
          <boxGeometry args={[0.11 * k, 0.028 * k, 0.02]} />
          <meshStandardMaterial color={OJO} />
        </mesh>
      ) : (
        <Ojo x={sep} y={eyesY} z={z} r={ojoR} />
      )}
      {/* Cejas enojadas (solo «serio»). */}
      {exp === 'serio' &&
        [-1, 1].map((s) => (
          <mesh key={s} position={[s * sep, eyesY + 0.08 * k, z]} rotation={[0, 0, s * -0.45]}>
            <boxGeometry args={[0.12 * k, 0.03 * k, 0.02]} />
            <meshStandardMaterial color={OJO} />
          </mesh>
        ))}
      {/* Rubor (solo «ternura»). */}
      {exp === 'ternura' &&
        [-1, 1].map((s) => (
          <mesh key={s} position={[s * anclas.cabezaR * 0.66, mouthY + 0.06 * k, z]}>
            <sphereGeometry args={[0.045 * k, 10, 10]} />
            <meshStandardMaterial color="#ff9db0" transparent opacity={0.75} />
          </mesh>
        ))}
      <Boca exp={exp} y={mouthY} z={z} k={k} />
    </group>
  )
}

/**
 * El object-URL nace en un efecto (render comprometido), no junto al `useLoader`
 * que suspende: con `useMemo` cada reintento de Suspense generaría un URL nuevo y
 * la carga no estabilizaría (mismo patrón que `ModeloGLB` y el cuadro con foto).
 */
function useUrlBlob(blob: Blob): string | null {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    const u = URL.createObjectURL(blob)
    // eslint-disable-next-line react-hooks/set-state-in-effect -- deliberado: URL estable para que la suspensión de useLoader se resuelva una sola vez
    setUrl(u)
    return () => URL.revokeObjectURL(u)
  }, [blob])
  return url
}

function RostroImagen({ anclas, blob }: { anclas: AnclasRopa; blob: Blob }) {
  const url = useUrlBlob(blob)
  return url ? <RostroTextura anclas={anclas} url={url} /> : null
}

function RostroTextura({ anclas, url }: { anclas: AnclasRopa; url: string }) {
  const tex = useLoader(THREE.TextureLoader, url)
  useMemo(() => {
    tex.colorSpace = THREE.SRGBColorSpace
    tex.anisotropy = 4
    tex.needsUpdate = true
  }, [tex])
  const s = anclas.cabezaR * 1.75 // tapa la mayor parte del frente de la cabeza
  return (
    <mesh position={[0, anclas.cabezaY - 0.02, anclas.caraZ - 0.004]}>
      <planeGeometry args={[s, s]} />
      <meshStandardMaterial map={tex} roughness={0.9} />
    </mesh>
  )
}
