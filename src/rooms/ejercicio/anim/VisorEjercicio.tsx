import { Suspense, useEffect, useMemo } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import type * as THREE from 'three'
import type { Avatar } from '../../../core/state/disenoStore'
import { useDiseño } from '../../../core/state/disenoStore'
import { useT } from '../../../core/i18n/useT'
import { RigEjercicio } from './RigEjercicio'
import { patronDe } from './resolver'
import { J, type PatronResuelto } from './pose'

/**
 * Canvas con el avatar del usuario haciendo el ejercicio. Devuelve null si el
 * ejercicio no tiene patrón: quien lo monte enseña la ilustración en su lugar
 * (`tienePatron` de `./mapa` lo anticipa sin cargar este chunk).
 * Un solo Canvas por diálogo/reproductor — y uno solo vivo entre las miniaturas,
 * el que tiene el cursor encima (límite de contextos WebGL, ver
 * `core/house/Miniatura.tsx`). `compacto`: miniatura (sin órbita, sin sombras,
 * sin pie).
 */
export default function VisorEjercicio({
  nombre,
  jugando = true,
  velocidad = 1,
  className = 'h-64',
  compacto = false,
}: {
  nombre: string
  jugando?: boolean
  velocidad?: number
  className?: string
  compacto?: boolean
}) {
  const t = useT()
  const av = useDiseño((s) => s.avatar)
  const patron = useMemo(() => patronDe(nombre), [nombre])
  const enc = useMemo(() => (patron ? encuadreDe(patron) : null), [patron])
  if (!patron || !enc) return null
  return (
    <div className={`relative ${compacto ? '' : 'w-full'} ${className}`}>
      <Canvas
        shadows={!compacto}
        dpr={compacto ? 1 : [1, 1.5]}
        frameloop={jugando ? 'always' : 'demand'}
        camera={{ position: enc.pos, fov: 32, near: 0.1, far: 100 }}
      >
        <EscenaEjercicio av={av} patron={patron} jugando={jugando} velocidad={velocidad} />
        <CamaraPatron enc={enc} />
        {/* Sin amortiguado en pausa (`demand`): nadie pediría los frames del frenado. */}
        {!compacto && (
          <OrbitControls makeDefault enablePan={false} enableDamping={jugando} minDistance={1.6} maxDistance={8} />
        )}
      </Canvas>
      {!compacto && (
        <span className="pointer-events-none absolute bottom-1.5 start-0 end-0 text-center text-[10px] text-white/35">
          {t('preview.girar', 'Arrastra para girar · rueda para acercar')}
        </span>
      )}
    </div>
  )
}

/** Luces, piso y el rig: lo comparten el visor y la hoja de contacto (DEV). */
export function EscenaEjercicio({
  av,
  patron,
  jugando = true,
  velocidad = 1,
  fase,
}: {
  av: Avatar
  patron: PatronResuelto
  jugando?: boolean
  velocidad?: number
  fase?: number
}) {
  return (
    <>
      <ambientLight intensity={0.85} />
      <directionalLight position={[4, 8, 5]} intensity={1.1} castShadow />
      <directionalLight position={[-4, 3, -3]} intensity={0.35} />
      <Suspense fallback={null}>
        <RigEjercicio av={av} patron={patron} jugando={jugando} velocidad={velocidad} fase={fase} />
      </Suspense>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[2.4, 40]} />
        <meshStandardMaterial color="#1a1d25" />
      </mesh>
    </>
  )
}

export interface Encuadre {
  pos: [number, number, number]
  target: [number, number, number]
}

/** Cámara según la postura de arranque (de pie o tumbado) y el lado que pide el patrón. */
export function encuadreDe(p: PatronResuelto): Encuadre {
  const q = p.poses[0]
  const tumbado = Math.abs(q[J.raizX]) > Math.PI / 4 || Math.abs(q[J.raizZ]) > Math.PI / 4
  if (tumbado) {
    const pos: Encuadre['pos'] =
      p.camara === 'frente' ? [0, 2.4, 3.6] : p.camara === 'lado' ? [3.6, 2.2, 0.4] : [2.8, 2.3, 3.2]
    return { pos, target: [0, 0.35, 0] }
  }
  const pos: Encuadre['pos'] =
    p.camara === 'frente' ? [0, 1.3, 4.8] : p.camara === 'lado' ? [4.6, 1.5, 0] : [2.6, 1.9, 4.1]
  return { pos, target: [0, 0.85, 0] }
}

/** Reencuadra al cambiar de ejercicio (el reproductor cambia el patrón con el Canvas montado). */
function CamaraPatron({ enc }: { enc: Encuadre }) {
  const camera = useThree((s) => s.camera)
  const controls = useThree((s) => s.controls) as unknown as { target: THREE.Vector3; update: () => void } | null
  const invalidate = useThree((s) => s.invalidate)
  useEffect(() => {
    camera.position.set(...enc.pos)
    if (controls) {
      controls.target.set(...enc.target)
      controls.update()
    } else {
      camera.lookAt(...enc.target)
    }
    invalidate()
  }, [enc, camera, controls, invalidate])
  return null
}
