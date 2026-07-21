import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { Ropa, AnclasRopa } from './apariencia'
import { PRENDA_COLOR_DEFAULT } from './apariencia'
import { anguloMarcha, anguloBrazoNado, anguloPiernaNado, marchaAvatar, MARCHA_BRAZOS, MARCHA_PIERNAS } from './animacion'
import { monturaFrame, anguloPiernaMontada, ANGULO_BRAZO_MONTADO } from '../state/monturaStore'
import { parqueFrame, anguloPiernaParque, anguloBrazoParque } from '../state/parqueStore'
import { accionCuartoFrame, anguloPiernaAccion, anguloBrazoAccion } from '../state/accionCuartoStore'
import {
  accionFrame,
  anguloBrazoBaile,
  anguloPiernaBaile,
  anguloSaludo,
  ANGULO_BRAZO_CUERDA,
} from '../state/herramientaStore'

/**
 * Pivote de marcha para prendas de extremidades (pantalón/tenis/mangas): gira
 * con la misma fórmula que los brazos/piernas del avatar (leen el mismo
 * `marchaAvatar`), así la ropa acompaña el paso sin compartir refs. Montado en
 * un vehículo adopta la misma pose sentada/pedaleo que el cuerpo. Sin
 * `activo` el grupo queda quieto (los offsets de los hijos compensan el pivote).
 */
function PivoteMarcha({
  activo,
  x,
  pivotY,
  factor,
  signo,
  extremidad,
  children,
}: {
  activo: boolean
  x: number
  pivotY: number
  factor: number
  signo: 1 | -1
  extremidad: 'pierna' | 'brazo'
  children: React.ReactNode
}) {
  const g = useRef<THREE.Group>(null)
  useFrame(() => {
    if (!activo || !g.current) return
    if (monturaFrame.montado) {
      // Piernas sentadas; las mangas bailan si el baile está activo.
      g.current.rotation.x =
        extremidad === 'pierna'
          ? anguloPiernaMontada(signo)
          : accionFrame.bailando
            ? anguloBrazoBaile(-signo as 1 | -1)
            : ANGULO_BRAZO_MONTADO
    } else if (parqueFrame.usando && parqueFrame.pose !== 'de-pie') {
      // Sentado/colgado en un juego de parque: misma pose que el cuerpo.
      g.current.rotation.x = extremidad === 'pierna' ? anguloPiernaParque(signo) : anguloBrazoParque()
    } else if (accionCuartoFrame.usando && accionCuartoFrame.pose !== 'caminar') {
      // Usando un objeto del cuarto: misma pose de acción que el cuerpo.
      g.current.rotation.x =
        extremidad === 'pierna' ? anguloPiernaAccion() : anguloBrazoAccion(-signo as 1 | -1)
    } else if (accionFrame.cuerda) {
      g.current.rotation.x = extremidad === 'brazo' ? ANGULO_BRAZO_CUERDA : 0
    } else if (accionFrame.bailando) {
      // El signo de brazo en Prendas es inverso al del cuerpo (ver signoBrazo).
      g.current.rotation.x =
        extremidad === 'pierna' ? anguloPiernaBaile(signo) : anguloBrazoBaile(-signo as 1 | -1)
    } else if (marchaAvatar.nadando) {
      // Nadando: misma brazada/patada que el cuerpo (x<0 = lado izquierdo, como en CuerpoCubos).
      g.current.rotation.x =
        extremidad === 'pierna' ? anguloPiernaNado(x < 0) : anguloBrazoNado(x < 0)
    } else {
      g.current.rotation.x = anguloMarcha(factor) * signo
    }
    // Saludo: solo la manga derecha (signoBrazo del lado +x es 1).
    const s = anguloSaludo(performance.now())
    if (s !== null && extremidad === 'brazo' && signo === 1) g.current.rotation.x = s
  })
  return (
    <group ref={g} position={[x, pivotY, 0]}>
      {children}
    </group>
  )
}

/**
 * Ropa del personaje, colocada según sus `anclas` (cabeza, torso y piernas), así
 * calza tanto en el avatar (box-man) como en cada agente. Cada prenda se dibuja un
 * poco más grande que la parte del cuerpo para que no haya z-fighting.
 * `marcha`: las prendas de extremidades se balancean al caminar (solo el avatar).
 */
export function Prendas({
  ropa,
  anclas,
  marcha = false,
}: {
  ropa: Ropa | undefined
  anclas: AnclasRopa
  marcha?: boolean
}) {
  if (!ropa || Object.keys(ropa).length === 0) return null
  const color = (id: keyof Ropa) => ropa[id]?.color ?? PRENDA_COLOR_DEFAULT[id]
  const a = anclas
  const k = a.cabezaR / 0.22 // escala de la cabeza respecto al avatar (lentes)
  const cinturaW = Math.max(...a.piernasX) - Math.min(...a.piernasX) + a.piernaW + 0.06
  // Mismos pivotes que las extremidades del box-man (cadera y hombro).
  const caderaY = a.piernasY + a.piernaH / 2
  const hombroY = a.torsoY + a.torsoH / 2
  const signoPierna = (x: number): 1 | -1 => (x < 0 ? 1 : -1)
  const signoBrazo = (x: number): 1 | -1 => (x < 0 ? -1 : 1)

  return (
    <group>
      {/* Tenis: sobre los pies de cada pierna */}
      {ropa.tenis &&
        a.piernasX.map((x, i) => (
          <PivoteMarcha key={i} activo={marcha} x={x} pivotY={caderaY} factor={MARCHA_PIERNAS} signo={signoPierna(x)} extremidad="pierna">
            <mesh position={[0, a.piesY - caderaY, 0.04]} castShadow>
              <boxGeometry args={[a.piernaW, 0.2, a.piernaD * 1.25]} />
              <meshStandardMaterial color={color('tenis')} />
            </mesh>
          </PivoteMarcha>
        ))}

      {/* Pantalón: una pierna por posición + cintura */}
      {ropa.pantalon && (
        <>
          {a.piernasX.map((x, i) => (
            <PivoteMarcha key={i} activo={marcha} x={x} pivotY={caderaY} factor={MARCHA_PIERNAS} signo={signoPierna(x)} extremidad="pierna">
              <mesh position={[0, a.piernasY - caderaY, 0]} castShadow>
                <boxGeometry args={[a.piernaW, a.piernaH, a.piernaD]} />
                <meshStandardMaterial color={color('pantalon')} />
              </mesh>
            </PivoteMarcha>
          ))}
          <mesh position={[0, a.piernasY + a.piernaH * 0.5, 0]} castShadow>
            <boxGeometry args={[cinturaW, 0.2, a.piernaD + 0.02]} />
            <meshStandardMaterial color={color('pantalon')} />
          </mesh>
        </>
      )}

      {/* Playera: torso + mangas cortas */}
      {ropa.playera && (
        <>
          <mesh position={[0, a.torsoY, 0]} castShadow>
            <boxGeometry args={[a.torsoW + 0.06, a.torsoH + 0.04, a.torsoD + 0.06]} />
            <meshStandardMaterial color={color('playera')} />
          </mesh>
          {[-a.brazoX, a.brazoX].map((x, i) => (
            <PivoteMarcha key={i} activo={marcha} x={x} pivotY={hombroY} factor={MARCHA_BRAZOS} signo={signoBrazo(x)} extremidad="brazo">
              <mesh position={[0, a.torsoY + a.torsoH * 0.19 - hombroY, 0]} castShadow>
                <boxGeometry args={[0.26, 0.3, a.torsoD + 0.02]} />
                <meshStandardMaterial color={color('playera')} />
              </mesh>
            </PivoteMarcha>
          ))}
        </>
      )}

      {/* Chamarra: encima de la playera. Con override (búho) es una prenda grande que
          envuelve el cuerpo, sin mangas ni cuello; si no, torso + mangas largas + cuello. */}
      {ropa.chamarra &&
        (a.chamarra ? (
          <mesh position={[0, a.chamarra.y, 0]} castShadow>
            <boxGeometry args={[a.chamarra.w, a.chamarra.h, a.chamarra.d]} />
            <meshStandardMaterial color={color('chamarra')} />
          </mesh>
        ) : (
          <>
            <mesh position={[0, a.torsoY - 0.02, 0]} castShadow>
              <boxGeometry args={[a.torsoW + 0.12, a.torsoH + 0.1, a.torsoD + 0.14]} />
              <meshStandardMaterial color={color('chamarra')} />
            </mesh>
            {[-a.brazoX, a.brazoX].map((x, i) => (
              <PivoteMarcha key={i} activo={marcha} x={x} pivotY={hombroY} factor={MARCHA_BRAZOS} signo={signoBrazo(x)} extremidad="brazo">
                <mesh position={[0, a.torsoY - hombroY, 0]} castShadow>
                  <boxGeometry args={[0.3, a.torsoH + 0.02, a.torsoD + 0.04]} />
                  <meshStandardMaterial color={color('chamarra')} />
                </mesh>
              </PivoteMarcha>
            ))}
            <mesh position={[0, a.torsoY + a.torsoH * 0.58, 0]} castShadow>
              <boxGeometry args={[a.torsoW * 0.83, 0.16, a.torsoD + 0.1]} />
              <meshStandardMaterial color={color('chamarra')} />
            </mesh>
          </>
        ))}

      {/* Lentes: dos cristales + puente sobre la cara */}
      {ropa.lentes && (
        <>
          {[-a.cabezaR * 0.5, a.cabezaR * 0.5].map((x, i) => (
            <mesh key={i} position={[x, a.cabezaY, a.caraZ]}>
              <boxGeometry args={[0.15 * k, 0.12 * k, 0.04]} />
              <meshStandardMaterial color={color('lentes')} />
            </mesh>
          ))}
          <mesh position={[0, a.cabezaY, a.caraZ]}>
            <boxGeometry args={[0.1 * k, 0.03, 0.03]} />
            <meshStandardMaterial color={color('lentes')} />
          </mesh>
        </>
      )}

      {/* Sombrero: ala + copa sobre la cabeza */}
      {ropa.sombrero && (
        <>
          <mesh position={[0, a.cabezaTop + 0.02, 0]} castShadow>
            <cylinderGeometry args={[a.cabezaR + 0.14, a.cabezaR + 0.14, 0.05, 20]} />
            <meshStandardMaterial color={color('sombrero')} />
          </mesh>
          <mesh position={[0, a.cabezaTop + 0.18, 0]} castShadow>
            <cylinderGeometry args={[a.cabezaR - 0.01, a.cabezaR, 0.28, 20]} />
            <meshStandardMaterial color={color('sombrero')} />
          </mesh>
        </>
      )}
    </group>
  )
}
