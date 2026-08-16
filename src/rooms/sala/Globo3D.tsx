import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Line, OrbitControls } from '@react-three/drei'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useT } from '../../core/i18n/useT'
import { useBaseClara } from '../../core/ui/useBaseUI'
import { colorDe, conAlfa, tintaResuelta } from './coloresMapa'
import type { PinMapa } from './MapaMundi'
import { MUNDO_H, MUNDO_W, PAISES_MUNDO, proyectar } from './mundo'

/**
 * El mismo mundo que el mapa plano, envuelto en una esfera.
 *
 * `mundo.ts` ya es una proyección equirectangular exacta de 2000×1000, así que no
 * hace falta geometría nueva: se pintan sus paths en un canvas 2D y ese canvas es
 * la textura de la esfera. Girar y acercar los resuelve `OrbitControls`.
 */

const RADIO = 1
/** Los pines flotan un pelo sobre la superficie para no pelearse con ella en el z-buffer. */
const RADIO_PIN = 1.012

/**
 * Mar y tierra del globo. Son literales a propósito (como el lienzo de los juegos
 * de `arcade.ts`): un globo sin mar se lee como una pelota gris, y `--ui-bg` no
 * distingue agua de continente. La tierra sí sale de la tinta del tema, así que el
 * conjunto sigue al tema claro/oscuro.
 */
const OCEANO = (claro: boolean) => (claro ? '#a8c8de' : '#0e2233')

/** lat/lng → punto de la esfera, con el mismo encuadre que la textura. */
function aEsfera(lat: number, lng: number, r: number): [number, number, number] {
  const theta = ((90 - lat) / 180) * Math.PI
  const phi = ((lng + 180) / 360) * Math.PI * 2
  const s = Math.sin(theta)
  return [-r * Math.cos(phi) * s, r * Math.cos(theta), r * Math.sin(phi) * s]
}

/**
 * Pinta el mundo en un canvas 2D y lo entrega como textura de la esfera.
 *
 * Se arma en un `useMemo` y no en un efecto con estado: la esfera no puede
 * pintarse antes de tener su textura, y un `setState` en efecto obligaría a un
 * render extra con el globo desnudo. El efecto solo la libera al reemplazarla.
 */
function useTexturaMundo(pines: PinMapa[], claro: boolean) {
  const textura = useMemo(() => {
    const lienzo = document.createElement('canvas')
    lienzo.width = MUNDO_W
    lienzo.height = MUNDO_H
    const ctx = lienzo.getContext('2d')
    if (!ctx) return null

    const tinta = tintaResuelta()
    ctx.fillStyle = OCEANO(claro)
    ctx.fillRect(0, 0, MUNDO_W, MUNDO_H)

    // Mismo criterio que el mapa plano: un país se pinta si contiene algún pin
    // visitado. Aquí el point-in-path lo hace el propio canvas.
    const visitados = pines.filter((p) => p.visitado).map((p) => proyectar(p.lat, p.lng))
    ctx.lineWidth = 1.2
    ctx.strokeStyle = conAlfa(tinta, claro ? 0.75 : 0.5)
    const relleno = conAlfa(tinta, claro ? 0.55 : 0.3)

    for (const pais of PAISES_MUNDO) {
      const trazo = new Path2D(pais.d)
      const tocado = visitados.some((pt) => ctx.isPointInPath(trazo, pt.x, pt.y))
      ctx.fillStyle = tocado ? colorDe(pais.nombre, claro) : relleno
      ctx.fill(trazo)
      ctx.stroke(trazo)
    }

    const tex = new THREE.CanvasTexture(lienzo)
    tex.colorSpace = THREE.SRGBColorSpace
    tex.anisotropy = 4
    return tex
  }, [pines, claro])

  useEffect(() => () => textura?.dispose(), [textura])

  return textura
}

/**
 * Los pines del hemisferio de atrás se ocultan a mano. La esfera ya los tapa en
 * pantalla, pero el raycaster no mira el z-buffer: sin esto se podría tocar un pin
 * que está al otro lado del mundo.
 */
function Pin({
  pin,
  seleccionado,
  onClick,
}: {
  pin: PinMapa
  seleccionado: boolean
  onClick?: () => void
}) {
  const ref = useRef<THREE.Mesh>(null)
  const camara = useThree((s) => s.camera)
  const pos = useMemo(() => aEsfera(pin.lat, pin.lng, RADIO_PIN), [pin.lat, pin.lng])
  const dir = useMemo(() => new THREE.Vector3(...pos).normalize(), [pos])

  useFrame(() => {
    const visible = dir.dot(camara.position.clone().normalize()) > 0.06
    if (ref.current && ref.current.visible !== visible) ref.current.visible = visible
  })

  return (
    <mesh
      ref={ref}
      position={pos}
      onClick={(e) => {
        if (!ref.current?.visible) return
        e.stopPropagation()
        onClick?.()
      }}
    >
      <sphereGeometry args={[seleccionado ? 0.032 : 0.02, 12, 12]} />
      <meshBasicMaterial color={pin.visitado ? '#2dd4bf' : '#fbbf24'} />
    </mesh>
  )
}

function Ruta({ puntos }: { puntos: { lat: number; lng: number }[] }) {
  // Una recta entre dos pines atravesaría la esfera: se parte cada tramo en
  // pasos intermedios, igual que el mapa plano traza la recta en su proyección.
  const linea = useMemo(() => {
    const salida: [number, number, number][] = []
    for (let i = 0; i < puntos.length - 1; i++) {
      const a = puntos[i]
      const b = puntos[i + 1]
      for (let k = 0; k < 24; k++) {
        const f = k / 24
        salida.push(aEsfera(a.lat + (b.lat - a.lat) * f, a.lng + (b.lng - a.lng) * f, RADIO_PIN))
      }
    }
    const fin = puntos[puntos.length - 1]
    salida.push(aEsfera(fin.lat, fin.lng, RADIO_PIN))
    return salida
  }, [puntos])

  return <Line points={linea} color="#2dd4bf" lineWidth={2} />
}

function Mundo({
  pines,
  ruta,
  seleccionado,
  onClickPin,
  claro,
}: {
  pines: PinMapa[]
  ruta?: { lat: number; lng: number }[]
  seleccionado?: number | null
  onClickPin?: (id: number) => void
  claro: boolean
}) {
  const textura = useTexturaMundo(pines, claro)

  return (
    <>
      <mesh>
        <sphereGeometry args={[RADIO, 64, 48]} />
        {textura ? (
          <meshStandardMaterial map={textura} roughness={0.9} metalness={0} />
        ) : (
          <meshStandardMaterial color={OCEANO(claro)} roughness={0.9} metalness={0} />
        )}
      </mesh>
      {pines.map((pin) => (
        <Pin
          key={pin.id}
          pin={pin}
          seleccionado={seleccionado === pin.id}
          onClick={onClickPin ? () => onClickPin(pin.id) : undefined}
        />
      ))}
      {ruta && ruta.length > 1 && <Ruta puntos={ruta} />}
    </>
  )
}

export default function Globo3D({
  pines,
  ruta,
  seleccionado,
  onClickPin,
  className = '',
}: {
  pines: PinMapa[]
  ruta?: { lat: number; lng: number }[]
  seleccionado?: number | null
  onClickPin?: (id: number) => void
  className?: string
}) {
  const t = useT()
  const claro = useBaseClara()

  return (
    <div
      className={`relative overflow-hidden rounded-xl border border-white/10 bg-black/30 ${className}`}
      style={{ aspectRatio: '1 / 1', touchAction: 'none' }}
    >
      <Canvas dpr={[1, 1.5]} camera={{ position: [0, 0.9, 2.6], fov: 40, near: 0.1, far: 20 }}>
        <ambientLight intensity={claro ? 1.05 : 0.75} />
        <directionalLight position={[4, 3, 5]} intensity={claro ? 1 : 1.3} />
        <directionalLight position={[-4, -2, -3]} intensity={0.25} />
        <Mundo
          pines={pines}
          ruta={ruta}
          seleccionado={seleccionado}
          onClickPin={onClickPin}
          claro={claro}
        />
        <OrbitControls
          enablePan={false}
          enableDamping
          rotateSpeed={0.5}
          minDistance={1.4}
          maxDistance={5}
        />
      </Canvas>
      <span className="pointer-events-none absolute bottom-1.5 start-0 end-0 text-center text-[10px] text-white/40">
        {t('sala.globo.girar', 'Arrastra para girar · rueda o pellizca para acercar')}
      </span>
    </div>
  )
}
