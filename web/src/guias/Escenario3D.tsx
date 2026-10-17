import { Suspense, useMemo, useRef, type MutableRefObject } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { RigEjercicio } from '../../../src/rooms/ejercicio/anim/RigEjercicio'
import { J } from '../../../src/rooms/ejercicio/anim/pose'
import { avanzarBoca, nuevaBocaHabla, type BocaHabla } from '../../../src/core/house/bocaHabla'
import type { ExpresionId } from '../../../src/core/house/apariencia'
import { patronEscena, pepCon, ropaDeEpoca, ATUENDO_GUIA, NARRADOR_GUIA, TUNICA_GUIA, VESTIDO_GUIA } from './pep'
import { Mago3D } from './Mago3D'
import { Princesa3D } from './Princesa3D'
import { Alien3D } from './Alien3D'

/**
 * Pep@ en 3D: el mismo rig que el visor de ejercicios de la app, con la boca
 * movida por la amplitud de la narración (`nivel`, 0–1, lo escribe el audio).
 * Canvas transparente: detrás va el cuarto difuminado (CSS del escenario).
 */
export default function Escenario3D({
  tema,
  escena,
  nivel,
  busto = false,
  cerca = false,
  cara,
  parte = -1,
}: {
  tema: string
  escena: string
  nivel: MutableRefObject<number>
  /** Presentador en la esquina: de pecho para arriba (solo si no está haciendo un ejercicio tumbado). */
  busto?: boolean
  /** De cuerpo entero sobre la página: más grande, sin margen para el globo. */
  cerca?: boolean
  /** Expresión del rostro (los memes). */
  cara?: ExpresionId
  /** Parte que suena: en las guías por épocas (Arte), Pep@ se viste con la de esa parte. */
  parte?: number
}) {
  const ropa = ropaDeEpoca(tema, parte)
  const av = useMemo(() => pepCon(ATUENDO_GUIA[tema] ?? '', cara, ropa), [tema, cara, ropa])
  const patron = useMemo(() => patronEscena(escena), [escena])
  const mago = NARRADOR_GUIA[tema] === 'mago'
  const princesa = NARRADOR_GUIA[tema] === 'princesa'
  const alien = NARRADOR_GUIA[tema] === 'alien'
  // Lo que sobresale por encima de la cabeza (el copete del gorro de chef, el sombrero del mago): el encuadre lo cuenta.
  const sobreCabeza = mago ? 0.7 : princesa ? 0.3 : alien ? 0.35 : av.ropa?.gorroChef ? 0.6 : av.ropa?.sombrero ? 0.3 : 0
  const boca = useRef<BocaHabla>(nuevaBocaHabla())
  // Tumbado (plancha, puente…): la cámara baja y se abre, como en el visor de la app.
  const q = patron.poses[0]
  const tumbado = !mago && !princesa && !alien && (Math.abs(q[J.raizX]) > Math.PI / 4 || Math.abs(q[J.raizZ]) > Math.PI / 4)
  return (
    <Canvas shadows dpr={[1, 2]} gl={{ alpha: true, antialias: true }} camera={{ position: [0, 1.35, 6.2], fov: 32 }}>
      <ambientLight intensity={0.9} />
      <directionalLight position={[3, 7, 5]} intensity={1.15} castShadow shadow-mapSize={[1024, 1024]} />
      <directionalLight position={[-4, 3, -3]} intensity={0.4} />
      <Suspense fallback={null}>
        {mago ? (
          <Mago3D escena={escena} boca={boca} cara={cara} tunica={TUNICA_GUIA[tema]} />
        ) : princesa ? (
          <Princesa3D escena={escena} boca={boca} cara={cara} vestido={VESTIDO_GUIA[tema]} />
        ) : alien ? (
          <Alien3D escena={escena} boca={boca} cara={cara} />
        ) : (
          <RigEjercicio av={av} patron={patron} boca={boca} />
        )}
      </Suspense>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[1.6, 48]} />
        <shadowMaterial opacity={0.28} />
      </mesh>
      <Camara tumbado={tumbado} busto={busto && !tumbado} cerca={cerca} sobreCabeza={sobreCabeza} />
      <Boca boca={boca} nivel={nivel} />
    </Canvas>
  )
}

const _destino = new THREE.Vector3()
const _mira = new THREE.Vector3()

const TAN = Math.tan((32 / 2) * (Math.PI / 180))
const _dir = new THREE.Vector3()

/**
 * Encuadre suave entre «de pie» y «tumbado» al cambiar de ejercicio. La
 * distancia sale del aspecto del lienzo (vertical en móvil y en el escenario
 * angosto): Pep@ entero en los dos tercios de arriba, que abajo va el globo.
 */
function Camara({ tumbado, busto, cerca, sobreCabeza }: { tumbado: boolean; busto: boolean; cerca: boolean; sobreCabeza: number }) {
  const camera = useThree((s) => s.camera)
  const aspecto = useThree((s) => s.size.width / s.size.height)
  const mira = useRef(new THREE.Vector3(0, 0.9, 0))
  useFrame((_, dt) => {
    // Medio alto y medio ancho del cuadro que debe caber (metros).
    // De pie, el cuadro crece y sube con lo que lleve sobre la cabeza (tumbado no importa).
    const extra = tumbado ? 0 : sobreCabeza / 2
    const medioAlto = (busto ? 0.85 : cerca ? 1.3 : 1.75) + extra
    const medioAncho = busto ? 0.7 : tumbado ? 1.5 : 1.05
    const dist = Math.max(medioAlto / TAN, medioAncho / (TAN * aspecto))
    if (tumbado) _dir.set(2.7, 1.9, 3.3).normalize()
    else _dir.set(0, 0.12, 1).normalize()
    _mira.set(0, (busto ? 1.45 : tumbado ? -0.25 : cerca ? 0.75 : 0.62) + extra, 0)
    _destino.copy(_mira).addScaledVector(_dir, dist)
    const k = 1 - Math.exp(-dt / 0.35)
    camera.position.lerp(_destino, k)
    mira.current.lerp(_mira, k)
    camera.lookAt(mira.current)
  })
  return null
}

function Boca({ boca, nivel }: { boca: MutableRefObject<BocaHabla>; nivel: MutableRefObject<number> }) {
  useFrame((_, dt) => avanzarBoca(boca.current, nivel.current, dt))
  return null
}
