import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import {
  anguloMarcha,
  anguloBrazoNado,
  anguloPiernaNado,
  alturaFlote,
  marchaAvatar,
  MARCHA_BRAZOS,
  MARCHA_PIERNAS,
  type EstadoMarcha,
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

/**
 * Cuerpo "Base" (box-man estilo Roblox): cubos de colores (cabeza/torso/piernas).
 * Lo usan el jugador (`AvatarModelo`, con los sistemas de montura/parque/baile/
 * cuerda/nado del mapa) y un asistente con el preset "Base" (`Asistente3D`, sin
 * esos sistemas — `esJugador=false`). Con `caminar`, brazos y piernas se
 * balancean según `marchaEstado` (por defecto la marcha del jugador).
 */
export function CuerpoBase({
  colorCabeza,
  colorTorso,
  colorPiernas,
  caminar = false,
  marchaEstado = marchaAvatar,
  esJugador = true,
}: {
  colorCabeza: string
  colorTorso: string
  colorPiernas: string
  caminar?: boolean
  marchaEstado?: EstadoMarcha
  esJugador?: boolean
}) {
  const piernaI = useRef<THREE.Group>(null)
  const piernaD = useRef<THREE.Group>(null)
  const brazoI = useRef<THREE.Group>(null)
  const brazoD = useRef<THREE.Group>(null)

  // Balanceo de marcha: piernas opuestas entre sí y cada brazo opuesto a su pierna.
  // El jugador además adopta la pose de los sistemas del mapa (montado en un
  // vehículo, usando un juego de parque, etc.); un asistente no los tiene.
  useFrame(() => {
    if (!caminar) return
    if (esJugador) {
      if (monturaFrame.montado) {
        // Piernas sentadas; los brazos sueltan el manubrio si el baile está activo.
        if (piernaI.current) piernaI.current.rotation.x = anguloPiernaMontada(1)
        if (piernaD.current) piernaD.current.rotation.x = anguloPiernaMontada(-1)
        if (brazoI.current)
          brazoI.current.rotation.x = accionFrame.bailando ? anguloBrazoBaile(1) : ANGULO_BRAZO_MONTADO
        if (brazoD.current)
          brazoD.current.rotation.x = accionFrame.bailando ? anguloBrazoBaile(-1) : ANGULO_BRAZO_MONTADO
        return
      }
      if (parqueFrame.usando && parqueFrame.pose !== 'de-pie') {
        // Usando un juego de parque: sentado (resbaladilla/carrusel/columpio) o colgado (pasamanos).
        if (piernaI.current) piernaI.current.rotation.x = anguloPiernaParque(1)
        if (piernaD.current) piernaD.current.rotation.x = anguloPiernaParque(-1)
        if (brazoI.current) brazoI.current.rotation.x = anguloBrazoParque()
        if (brazoD.current) brazoD.current.rotation.x = anguloBrazoParque()
        return
      }
      if (accionCuartoFrame.usando && accionCuartoFrame.pose !== 'caminar') {
        // Usando un objeto del cuarto: pose de la acción (meditar/escribir/tocar/regar/leer).
        const pa = anguloPiernaAccion()
        if (piernaI.current) piernaI.current.rotation.x = pa
        if (piernaD.current) piernaD.current.rotation.x = pa
        if (brazoI.current) brazoI.current.rotation.x = anguloBrazoAccion(1)
        if (brazoD.current) brazoD.current.rotation.x = anguloBrazoAccion(-1)
        return
      }
      if (accionFrame.cuerda) {
        // Saltando la cuerda: brazos al frente sujetando las agarraderas.
        if (piernaI.current) piernaI.current.rotation.x = 0
        if (piernaD.current) piernaD.current.rotation.x = 0
        if (brazoI.current) brazoI.current.rotation.x = ANGULO_BRAZO_CUERDA
        if (brazoD.current) brazoD.current.rotation.x = ANGULO_BRAZO_CUERDA
        return
      }
      if (accionFrame.bailando) {
        // Bailando: brazos arriba ondeando + pasitos alternados.
        if (piernaI.current) piernaI.current.rotation.x = anguloPiernaBaile(1)
        if (piernaD.current) piernaD.current.rotation.x = anguloPiernaBaile(-1)
        if (brazoI.current) brazoI.current.rotation.x = anguloBrazoBaile(1)
        if (brazoD.current) brazoD.current.rotation.x = anguloBrazoBaile(-1)
        return
      }
      if (marchaAvatar.nadando) {
        // Nadando en una alberca: brazada de crol (molino) + patada, en vez de caminar.
        if (brazoI.current) brazoI.current.rotation.x = anguloBrazoNado(true)
        if (brazoD.current) brazoD.current.rotation.x = anguloBrazoNado(false)
        if (piernaI.current) piernaI.current.rotation.x = anguloPiernaNado(true)
        if (piernaD.current) piernaD.current.rotation.x = anguloPiernaNado(false)
        return
      }
    }
    const p = anguloMarcha(MARCHA_PIERNAS, marchaEstado)
    const b = anguloMarcha(MARCHA_BRAZOS, marchaEstado)
    if (piernaI.current) piernaI.current.rotation.x = p
    if (piernaD.current) piernaD.current.rotation.x = -p
    if (brazoI.current) brazoI.current.rotation.x = -b
    if (brazoD.current) brazoD.current.rotation.x = b
    // Saludo: pisa solo el brazo derecho (funciona incluso caminando). Solo el jugador.
    if (esJugador) {
      const s = anguloSaludo(performance.now())
      if (s !== null && brazoD.current) brazoD.current.rotation.x = s
    }
  })

  return (
    <>
      {/* piernas: grupo con pivote en la cadera (idénticas en reposo a los cubos originales) */}
      <group ref={piernaI} position={[-0.14, 0.6, 0]}>
        <mesh position={[0, -0.3, 0]} castShadow>
          <boxGeometry args={[0.24, 0.6, 0.26]} />
          <meshStandardMaterial color={colorPiernas} />
        </mesh>
      </group>
      <group ref={piernaD} position={[0.14, 0.6, 0]}>
        <mesh position={[0, -0.3, 0]} castShadow>
          <boxGeometry args={[0.24, 0.6, 0.26]} />
          <meshStandardMaterial color={colorPiernas} />
        </mesh>
      </group>
      {/* torso */}
      <mesh position={[0, 0.92, 0]} castShadow>
        <boxGeometry args={[0.6, 0.62, 0.3]} />
        <meshStandardMaterial color={colorTorso} />
      </mesh>
      {/* brazos: grupo con pivote en el hombro. Color de la cabeza (piel), no del
          torso: así la piel que asoma bajo mangas cortas o sin camisa combina con
          la cara en vez de mostrar el color de la playera/torso desnudo. */}
      <group ref={brazoI} position={[-0.42, 1.22, 0]}>
        <mesh position={[0, -0.3, 0]} castShadow>
          <boxGeometry args={[0.2, 0.6, 0.26]} />
          <meshStandardMaterial color={colorCabeza} />
        </mesh>
      </group>
      <group ref={brazoD} position={[0.42, 1.22, 0]}>
        <mesh position={[0, -0.3, 0]} castShadow>
          <boxGeometry args={[0.2, 0.6, 0.26]} />
          <meshStandardMaterial color={colorCabeza} />
        </mesh>
      </group>
      {/* cabeza */}
      <mesh position={[0, 1.5, 0]} castShadow>
        <boxGeometry args={[0.44, 0.44, 0.44]} />
        <meshStandardMaterial color={colorCabeza} />
      </mesh>
    </>
  )
}

/**
 * Rebote sutil al caminar/flotar para cuerpos sin extremidades articuladas
 * (piezas sin marcha reconocida, .glb, o formas integradas): pequeño salto
 * vertical + inclinación hacia adelante según la marcha. Sin `activo` devuelve
 * los children tal cual (cero useFrame).
 */
export function MarchaBob({
  activo,
  marchaEstado = marchaAvatar,
  esJugador = true,
  children,
}: {
  activo: boolean
  marchaEstado?: EstadoMarcha
  esJugador?: boolean
  children: React.ReactNode
}) {
  if (!activo) return <>{children}</>
  return (
    <MarchaBobActivo marchaEstado={marchaEstado} esJugador={esJugador}>
      {children}
    </MarchaBobActivo>
  )
}

function MarchaBobActivo({
  marchaEstado,
  esJugador,
  children,
}: {
  marchaEstado: EstadoMarcha
  esJugador: boolean
  children: React.ReactNode
}) {
  const g = useRef<THREE.Group>(null)
  useFrame((state) => {
    if (!g.current) return
    // Montado en un vehículo o sentado/colgado en un juego: sin rebote (cuerpo rígido). Solo jugador.
    if (esJugador && (monturaFrame.montado || (parqueFrame.usando && parqueFrame.pose !== 'de-pie'))) {
      g.current.position.y = 0
      g.current.rotation.x = 0
      return
    }
    // Baile para cuerpos sin extremidades articuladas: brinquitos + vaivén. Solo jugador.
    if (esJugador && accionFrame.bailando) {
      g.current.position.y = Math.abs(Math.sin(performance.now() * 0.007)) * 0.08
      g.current.rotation.x = Math.sin(performance.now() * 0.0035) * 0.05
      return
    }
    const v = Math.min(1, marchaEstado.velocidad)
    g.current.position.y = alturaFlote(marchaEstado, 0, state.clock.elapsedTime)
    g.current.rotation.x = 0.06 * v
  })
  return <group ref={g}>{children}</group>
}
