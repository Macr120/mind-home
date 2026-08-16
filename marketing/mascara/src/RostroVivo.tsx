import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { AnclasRopa, ExpresionId } from '../../../src/core/house/apariencia'
import type { SenalesCara } from './expresiones'

/**
 * Rostro ANIMADO para el modo «Viva»: réplica de las primitivas de
 * `src/core/house/Rostro.tsx` (mismas fórmulas y colores) pero con párpados,
 * boca hablante y cejas movidos por las señales de MediaPipe. Todas las piezas
 * están montadas siempre; el frame solo muta escalas/visibilidad/rotaciones.
 */

const OJO = '#20232b'
const BOCA = '#8a3b3b'
const BOCA_INTERIOR = '#5a2626'

/** Suavizado exponencial independiente del framerate. */
function amortiguar(actual: number, objetivo: number, dt: number, tau: number) {
  return actual + (objetivo - actual) * (1 - Math.exp(-dt / tau))
}

export function RostroVivo({
  anclas,
  expresion,
  senales,
}: {
  anclas: AnclasRopa
  expresion: ExpresionId
  senales: React.RefObject<SenalesCara>
}) {
  const k = anclas.cabezaR / 0.22
  const z = anclas.caraZ - 0.006
  const eyesY = anclas.cabezaY + 0.03 * k
  const mouthY = anclas.cabezaY - 0.1 * k
  const sep = anclas.cabezaR * 0.42

  const grupo = useRef<THREE.Group>(null)
  const ojoL = useRef<THREE.Mesh>(null) // x=+sep (ojo izquierdo anatómico del usuario)
  const ojoR = useRef<THREE.Mesh>(null) // x=−sep
  const cejaL = useRef<THREE.Mesh>(null)
  const cejaR = useRef<THREE.Mesh>(null)
  const bocaLinea = useRef<THREE.Mesh>(null)
  const bocaSonrisa = useRef<THREE.Mesh>(null)
  const bocaFeliz = useRef<THREE.Mesh>(null)
  const bocaTriste = useRef<THREE.Mesh>(null)
  const bocaO = useRef<THREE.Mesh>(null)
  const bocaHabla = useRef<THREE.Mesh>(null)
  const rubor = useRef<THREE.Group>(null)
  const suave = useMemo(() => ({ pL: 0, pR: 0, bo: 0, so: 0, ce: 0, hablando: false }), [])

  useFrame((_, dt) => {
    const g = grupo.current
    if (!g) return
    g.visible = expresion !== 'ninguno'
    if (!g.visible) return
    const s = senales.current ?? { parpadeoL: 0, parpadeoR: 0, boca: 0, sonrisa: 0, cejas: 0 }

    // Suavizado (párpados ágiles: un cierre real dura ~100 ms).
    suave.pL = amortiguar(suave.pL, Math.max(s.parpadeoL, expresion === 'guino' ? 1 : 0), dt, 0.05)
    suave.pR = amortiguar(suave.pR, s.parpadeoR, dt, 0.05)
    suave.bo = amortiguar(suave.bo, s.boca, dt, 0.08)
    suave.so = amortiguar(suave.so, s.sonrisa, dt, 0.15)
    suave.ce = amortiguar(suave.ce, s.cejas, dt, 0.15)

    // Párpados: al cerrar el ojo queda una línea (se aplasta en y, se ensancha en x).
    const baseOjo = expresion === 'sorpresa' ? 0.06 / 0.045 : 1
    const parpado = (ojo: THREE.Mesh | null, p: number) =>
      ojo?.scale.set((1 + 0.25 * p) * baseOjo, Math.max(1 - 1.1 * p, 0.12) * baseOjo, baseOjo)
    parpado(ojoL.current, suave.pL)
    parpado(ojoR.current, suave.pR)

    // Boca: hablando gana la boca abierta; con histéresis para que no titile.
    if (suave.bo >= 0.15) suave.hablando = true
    else if (suave.bo <= 0.08) suave.hablando = false
    const estatica = suave.hablando
      ? null
      : expresion === 'sorpresa'
        ? bocaO.current
        : expresion === 'feliz'
          ? bocaFeliz.current
          : expresion === 'triste'
            ? bocaTriste.current
            : expresion === 'sonrisa' || expresion === 'ternura' || expresion === 'guino'
              ? bocaSonrisa.current
              : bocaLinea.current
    for (const b of [bocaLinea, bocaSonrisa, bocaFeliz, bocaTriste, bocaO, bocaHabla]) {
      if (b.current) b.current.visible = b.current === (suave.hablando ? bocaHabla.current : estatica)
    }
    // Línea corta y apretada de «enojado» (reusa la línea escalada).
    if (bocaLinea.current?.visible) {
      if (expresion === 'enojado') bocaLinea.current.scale.set(0.6875, 1.2, 1)
      else bocaLinea.current.scale.set(1, 1, 1)
    }
    bocaHabla.current?.scale.set(0.8 + 0.6 * suave.so, 0.3 + 0.9 * suave.bo, 0.4)

    // Cejas: en V con serio/enojado/triste; alzadas en vivo cuando alzas las tuyas.
    const enV = expresion === 'serio' || expresion === 'enojado' || expresion === 'triste'
    const alzadas = !enV && suave.ce > 0.15
    const giro = expresion === 'triste' ? 0.35 : expresion === 'enojado' ? -0.6 : -0.45
    for (const [ceja, lado] of [
      [cejaL.current, 1],
      [cejaR.current, -1],
    ] as const) {
      if (!ceja) continue
      ceja.visible = enV || alzadas
      ceja.rotation.z = enV ? lado * giro : 0
      ceja.position.y = eyesY + 0.08 * k + (alzadas ? 0.04 * k * suave.ce : 0)
    }

    if (rubor.current) rubor.current.visible = expresion === 'ternura'
  })

  return (
    <group ref={grupo}>
      <mesh ref={ojoL} position={[sep, eyesY, z]}>
        <sphereGeometry args={[0.045 * k, 10, 10]} />
        <meshStandardMaterial color={OJO} />
      </mesh>
      <mesh ref={ojoR} position={[-sep, eyesY, z]}>
        <sphereGeometry args={[0.045 * k, 10, 10]} />
        <meshStandardMaterial color={OJO} />
      </mesh>
      {(
        [
          [cejaL, 1],
          [cejaR, -1],
        ] as const
      ).map(([ref, lado]) => (
        <mesh key={lado} ref={ref} position={[lado * sep, eyesY + 0.08 * k, z]} visible={false}>
          <boxGeometry args={[0.12 * k, 0.03 * k, 0.02]} />
          <meshStandardMaterial color={OJO} />
        </mesh>
      ))}
      <mesh ref={bocaLinea} position={[0, mouthY, z]}>
        <boxGeometry args={[0.16 * k, 0.025 * k, 0.02]} />
        <meshStandardMaterial color={BOCA} />
      </mesh>
      <mesh ref={bocaSonrisa} position={[0, mouthY + 0.02 * k, z]} rotation={[0, 0, Math.PI]} visible={false}>
        <torusGeometry args={[0.07 * k, 0.016 * k, 8, 16, Math.PI]} />
        <meshStandardMaterial color={BOCA} />
      </mesh>
      <mesh ref={bocaFeliz} position={[0, mouthY + 0.02 * k, z]} rotation={[0, 0, Math.PI]} visible={false}>
        <torusGeometry args={[0.09 * k, 0.02 * k, 8, 16, Math.PI]} />
        <meshStandardMaterial color={BOCA} />
      </mesh>
      <mesh ref={bocaTriste} position={[0, mouthY - 0.02 * k, z]} visible={false}>
        <torusGeometry args={[0.07 * k, 0.016 * k, 8, 16, Math.PI]} />
        <meshStandardMaterial color={BOCA} />
      </mesh>
      <mesh ref={bocaO} position={[0, mouthY, z]} visible={false}>
        <torusGeometry args={[0.05 * k, 0.02 * k, 8, 16]} />
        <meshStandardMaterial color={BOCA} />
      </mesh>
      {/* Boca hablante: esfera achatada con interior oscuro (la mueve jawOpen). */}
      <mesh ref={bocaHabla} position={[0, mouthY, z]} visible={false}>
        <sphereGeometry args={[0.055 * k, 12, 12]} />
        <meshStandardMaterial color={BOCA_INTERIOR} />
      </mesh>
      <group ref={rubor} visible={false}>
        {[-1, 1].map((s) => (
          <mesh key={s} position={[s * anclas.cabezaR * 0.66, mouthY + 0.06 * k, z]}>
            <sphereGeometry args={[0.045 * k, 10, 10]} />
            <meshStandardMaterial color="#ff9db0" transparent opacity={0.75} />
          </mesh>
        ))}
      </group>
    </group>
  )
}
