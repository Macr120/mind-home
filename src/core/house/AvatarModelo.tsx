import { Suspense, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { ModeloPiezas, ModeloGLB } from './modeloPersonalizado'
import { GrupoAnimado, ModeloPiezasAnimado } from './Animado'
import {
  anguloMarcha,
  anguloBrazoNado,
  anguloPiernaNado,
  marchaAvatar,
  MARCHA_BRAZOS,
  MARCHA_PIERNAS,
} from './animacion'
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
import { Prendas } from './Prendas'
import { ANCLAS_AVATAR } from './apariencia'
import type { Avatar } from '../state/disenoStore'

/**
 * Cuerpo del avatar estilo Roblox: cubos de colores (cabeza/torso/piernas),
 * o el modelo personalizado (.glb subido o piezas generadas por IA).
 * Es solo presentación; el movimiento y las colisiones viven en `Character.tsx`.
 * Con `caminar`, brazos y piernas se balancean según la marcha real del jugador.
 */
function CuerpoCubos({ av, caminar = false }: { av: Avatar; caminar?: boolean }) {
  const piernaI = useRef<THREE.Group>(null)
  const piernaD = useRef<THREE.Group>(null)
  const brazoI = useRef<THREE.Group>(null)
  const brazoD = useRef<THREE.Group>(null)

  // Balanceo de marcha: piernas opuestas entre sí y cada brazo opuesto a su pierna.
  // Montado en un vehículo: pose sentada (piernas al frente, pedaleo en bici).
  useFrame(() => {
    if (!caminar) return
    if (monturaFrame.montado) {
      // Piernas sentadas; los brazos sueltan el manubrio si el baile está activo.
      if (piernaI.current) piernaI.current.rotation.x = anguloPiernaMontada(1)
      if (piernaD.current) piernaD.current.rotation.x = anguloPiernaMontada(-1)
      if (brazoI.current)
        brazoI.current.rotation.x = accionFrame.bailando ? anguloBrazoBaile(1) : ANGULO_BRAZO_MONTADO
      if (brazoD.current)
        brazoD.current.rotation.x = accionFrame.bailando ? anguloBrazoBaile(-1) : ANGULO_BRAZO_MONTADO
    } else if (parqueFrame.usando && parqueFrame.pose !== 'de-pie') {
      // Usando un juego de parque: sentado (resbaladilla/carrusel/columpio) o colgado (pasamanos).
      if (piernaI.current) piernaI.current.rotation.x = anguloPiernaParque(1)
      if (piernaD.current) piernaD.current.rotation.x = anguloPiernaParque(-1)
      if (brazoI.current) brazoI.current.rotation.x = anguloBrazoParque()
      if (brazoD.current) brazoD.current.rotation.x = anguloBrazoParque()
    } else if (accionCuartoFrame.usando && accionCuartoFrame.pose !== 'caminar') {
      // Usando un objeto del cuarto: pose de la acción (meditar/escribir/tocar/regar/leer).
      const pa = anguloPiernaAccion()
      if (piernaI.current) piernaI.current.rotation.x = pa
      if (piernaD.current) piernaD.current.rotation.x = pa
      if (brazoI.current) brazoI.current.rotation.x = anguloBrazoAccion(1)
      if (brazoD.current) brazoD.current.rotation.x = anguloBrazoAccion(-1)
    } else if (accionFrame.cuerda) {
      // Saltando la cuerda: brazos al frente sujetando las agarraderas.
      if (piernaI.current) piernaI.current.rotation.x = 0
      if (piernaD.current) piernaD.current.rotation.x = 0
      if (brazoI.current) brazoI.current.rotation.x = ANGULO_BRAZO_CUERDA
      if (brazoD.current) brazoD.current.rotation.x = ANGULO_BRAZO_CUERDA
    } else if (accionFrame.bailando) {
      // Bailando: brazos arriba ondeando + pasitos alternados (solo rotation.x,
      // la marcha lo sobreescribe al terminar).
      if (piernaI.current) piernaI.current.rotation.x = anguloPiernaBaile(1)
      if (piernaD.current) piernaD.current.rotation.x = anguloPiernaBaile(-1)
      if (brazoI.current) brazoI.current.rotation.x = anguloBrazoBaile(1)
      if (brazoD.current) brazoD.current.rotation.x = anguloBrazoBaile(-1)
    } else if (marchaAvatar.nadando) {
      // Nadando en una alberca: brazada de crol (molino) + patada, en vez de caminar.
      if (brazoI.current) brazoI.current.rotation.x = anguloBrazoNado(true)
      if (brazoD.current) brazoD.current.rotation.x = anguloBrazoNado(false)
      if (piernaI.current) piernaI.current.rotation.x = anguloPiernaNado(true)
      if (piernaD.current) piernaD.current.rotation.x = anguloPiernaNado(false)
    } else {
      const p = anguloMarcha(MARCHA_PIERNAS)
      const b = anguloMarcha(MARCHA_BRAZOS)
      if (piernaI.current) piernaI.current.rotation.x = p
      if (piernaD.current) piernaD.current.rotation.x = -p
      if (brazoI.current) brazoI.current.rotation.x = -b
      if (brazoD.current) brazoD.current.rotation.x = b
    }
    // Saludo: pisa solo el brazo derecho (funciona incluso caminando).
    const s = anguloSaludo(performance.now())
    if (s !== null && brazoD.current) brazoD.current.rotation.x = s
  })

  return (
    <>
      {/* piernas: grupo con pivote en la cadera (idénticas en reposo a los cubos originales) */}
      <group ref={piernaI} position={[-0.14, 0.6, 0]}>
        <mesh position={[0, -0.3, 0]} castShadow>
          <boxGeometry args={[0.24, 0.6, 0.26]} />
          <meshStandardMaterial color={av.piernas} />
        </mesh>
      </group>
      <group ref={piernaD} position={[0.14, 0.6, 0]}>
        <mesh position={[0, -0.3, 0]} castShadow>
          <boxGeometry args={[0.24, 0.6, 0.26]} />
          <meshStandardMaterial color={av.piernas} />
        </mesh>
      </group>
      {/* torso */}
      <mesh position={[0, 0.92, 0]} castShadow>
        <boxGeometry args={[0.6, 0.62, 0.3]} />
        <meshStandardMaterial color={av.torso} />
      </mesh>
      {/* brazos: grupo con pivote en el hombro */}
      <group ref={brazoI} position={[-0.42, 1.22, 0]}>
        <mesh position={[0, -0.3, 0]} castShadow>
          <boxGeometry args={[0.2, 0.6, 0.26]} />
          <meshStandardMaterial color={av.torso} />
        </mesh>
      </group>
      <group ref={brazoD} position={[0.42, 1.22, 0]}>
        <mesh position={[0, -0.3, 0]} castShadow>
          <boxGeometry args={[0.2, 0.6, 0.26]} />
          <meshStandardMaterial color={av.torso} />
        </mesh>
      </group>
      {/* cabeza */}
      <mesh position={[0, 1.5, 0]} castShadow>
        <boxGeometry args={[0.44, 0.44, 0.44]} />
        <meshStandardMaterial color={av.cabeza} />
      </mesh>
    </>
  )
}

/**
 * Rebote sutil al caminar para cuerpos sin extremidades articuladas (piezas o
 * .glb): pequeño salto vertical + inclinación hacia adelante según la marcha.
 * Sin `activo` devuelve los children tal cual (cero useFrame).
 */
function MarchaBob({ activo, children }: { activo: boolean; children: React.ReactNode }) {
  if (!activo) return <>{children}</>
  return <MarchaBobActivo>{children}</MarchaBobActivo>
}

function MarchaBobActivo({ children }: { children: React.ReactNode }) {
  const g = useRef<THREE.Group>(null)
  useFrame(() => {
    if (!g.current) return
    // Montado en un vehículo o sentado/colgado en un juego: sin rebote (cuerpo rígido).
    if (monturaFrame.montado || (parqueFrame.usando && parqueFrame.pose !== 'de-pie')) {
      g.current.position.y = 0
      g.current.rotation.x = 0
      return
    }
    // Baile para cuerpos sin extremidades articuladas: brinquitos + vaivén.
    if (accionFrame.bailando) {
      g.current.position.y = Math.abs(Math.sin(performance.now() * 0.007)) * 0.08
      g.current.rotation.x = Math.sin(performance.now() * 0.0035) * 0.05
      return
    }
    const v = Math.min(1, marchaAvatar.velocidad)
    g.current.position.y = Math.abs(Math.sin(marchaAvatar.fase)) * 0.05 * v
    g.current.rotation.x = 0.06 * v
  })
  return <group ref={g}>{children}</group>
}

/**
 * Casco de obra (modo editor): cúpula amarilla + ala + cresta, sobre la cabeza.
 * Marca visualmente que el personaje está editando el mundo.
 */
function CascoEditor() {
  return (
    <group position={[0, 1.62, 0]}>
      {/* Cúpula (media esfera) */}
      <mesh castShadow position={[0, 0.08, 0]}>
        <sphereGeometry args={[0.3, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#f5b500" roughness={0.45} metalness={0.1} />
      </mesh>
      {/* Ala perimetral */}
      <mesh castShadow position={[0, 0.08, 0]}>
        <cylinderGeometry args={[0.36, 0.36, 0.05, 20]} />
        <meshStandardMaterial color="#f5b500" roughness={0.45} metalness={0.1} />
      </mesh>
      {/* Visera frontal (un poco más larga al frente) */}
      <mesh castShadow position={[0, 0.07, 0.28]}>
        <boxGeometry args={[0.34, 0.04, 0.16]} />
        <meshStandardMaterial color="#e0a400" roughness={0.5} />
      </mesh>
      {/* Cresta central */}
      <mesh castShadow position={[0, 0.2, 0]}>
        <boxGeometry args={[0.06, 0.12, 0.5]} />
        <meshStandardMaterial color="#e0a400" roughness={0.5} />
      </mesh>
    </group>
  )
}

/**
 * Avatar completo: cuerpo (cubos o modelo propio) + ropa, escalado por `av.escala`.
 * Lo usan tanto la escena 3D (`Character`) como la vista previa del editor.
 * `casco`: muestra el casco de obra (personaje en modo editor 3D).
 * `animar`: reproduce `av.animacion` (el Character del mapa y el ▶ del preview).
 * `caminar`: balanceo/bob de marcha ligado a `marchaAvatar` (solo el Character).
 */
export function AvatarModelo({
  av,
  casco = false,
  animar = false,
  caminar = false,
}: {
  av: Avatar
  casco?: boolean
  animar?: boolean
  caminar?: boolean
}) {
  const anim = animar ? av.animacion : undefined
  const conPoses = !!anim && anim.activacion !== 'apagado' && (anim.poses?.length ?? 0) >= 2
  return (
    <group scale={av.escala}>
      <GrupoAnimado anim={anim}>
        {av.modeloGlb ? (
          <MarchaBob activo={caminar}>
            <Suspense fallback={null}>
              <ModeloGLB blob={av.modeloGlb} />
            </Suspense>
            <Prendas ropa={av.ropa} anclas={ANCLAS_AVATAR} />
          </MarchaBob>
        ) : av.modelo3d && av.modelo3d.length > 0 ? (
          <MarchaBob activo={caminar}>
            {conPoses ? (
              <ModeloPiezasAnimado piezas={av.modelo3d} anim={anim!} />
            ) : (
              <ModeloPiezas piezas={av.modelo3d} />
            )}
            <Prendas ropa={av.ropa} anclas={ANCLAS_AVATAR} />
          </MarchaBob>
        ) : (
          <>
            <CuerpoCubos av={av} caminar={caminar} />
            <Prendas ropa={av.ropa} anclas={ANCLAS_AVATAR} marcha={caminar} />
          </>
        )}
        {casco && <CascoEditor />}
      </GrupoAnimado>
    </group>
  )
}
