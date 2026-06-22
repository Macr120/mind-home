import { useMemo, useState } from 'react'
import { Canvas, useThree, useFrame, type ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import { useCam, camAnim, type VistaCubo } from '../state/cameraStore'
import { useLayout, roomFocusPos } from '../state/layoutStore'
import { useAjustes } from '../state/ajustesStore'
import { useT } from '../i18n/useT'

/** Caras del cubo que son ALZADOS (paredes): activan la vista interior al editar un cuarto. */
const CARAS_PARED: VistaCubo[] = ['front', 'back', 'left', 'right']

/**
 * Aplica la vista del cubo: si estamos editando un cuarto y se pulsa un alzado (pared),
 * entra a la vista INTERIOR (de pie en el centro mirando esa pared); si no, vista iso.
 */
function aplicarVistaCubo(key: VistaCubo) {
  const { editMode, editingRoomId } = useLayout.getState()
  if (editMode && editingRoomId && CARAS_PARED.includes(key)) {
    useCam.getState().verParedInterior(key, roomFocusPos(editingRoomId))
  } else {
    useCam.getState().setVistaIso(key)
  }
}

/**
 * Cubo de navegación estilo AutoCAD (esquina inferior derecha).
 * - Gira en sincronía con la escena (lee la orientación animada `camAnim`).
 * - 5 caras (planta + 4 alzados), 4 esquinas superiores (vistas isométricas) y
 *   4 aristas superiores (vistas elevadas), todas clicables: al pulsarlas la cámara
 *   va a esa vista (`setVistaIso`).
 * - Caras y botones (esquinas/aristas) se dimensionan para NO traslaparse.
 */

const LADO = 1 // media arista del cubo (vértices en ±LADO)
const CARA = 1.3 // lado del plano de cada cara (deja hueco hacia esquinas/aristas)
const BTN = 0.5 // lado de los cubitos de esquina y arista

/** Genera una textura con la etiqueta de una cara (fondo claro tipo AutoCAD). */
function texturaEtiqueta(texto: string): THREE.CanvasTexture {
  const c = document.createElement('canvas')
  c.width = 128
  c.height = 128
  const ctx = c.getContext('2d')!
  ctx.fillStyle = '#e9e9f0'
  ctx.fillRect(0, 0, 128, 128)
  ctx.strokeStyle = '#aeaec0'
  ctx.lineWidth = 6
  ctx.strokeRect(3, 3, 122, 122)
  ctx.fillStyle = '#34343c'
  ctx.font = 'bold 20px sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(texto, 64, 64)
  const tex = new THREE.CanvasTexture(c)
  tex.anisotropy = 4
  return tex
}

/** Mueve la mini-cámara para mirar el cubo desde el mismo ángulo que la escena. */
function OrbitRig() {
  const cam = useThree((s) => s.camera)
  useFrame(() => {
    const R = 8.5
    const ce = Math.cos(camAnim.el)
    const se = Math.sin(camAnim.el)
    cam.position.set(R * ce * Math.cos(camAnim.az), R * se, R * ce * Math.sin(camAnim.az))
    cam.up.set(0, 1, 0)
    cam.lookAt(0, 0, 0)
  })
  return null
}

interface Cara {
  key: VistaCubo
  texto: string
  position: [number, number, number]
  rotation: [number, number, number]
}

/** Una cara clicable del cubo, con su etiqueta y resaltado al pasar el cursor. */
function CaraCubo({ cara, hover, setHover }: { cara: Cara; hover: string | null; setHover: (k: string | null) => void }) {
  const tex = useMemo(() => texturaEtiqueta(cara.texto), [cara.texto])
  const activo = hover === cara.key
  return (
    <mesh
      position={cara.position}
      rotation={cara.rotation}
      onClick={(e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation()
        aplicarVistaCubo(cara.key)
      }}
      onPointerOver={(e) => {
        e.stopPropagation()
        setHover(cara.key)
      }}
      onPointerOut={() => setHover(null)}
    >
      <planeGeometry args={[CARA, CARA]} />
      <meshBasicMaterial map={tex} color={activo ? '#9ecbff' : '#ffffff'} toneMapped={false} />
    </mesh>
  )
}

/**
 * Un cubito clicable (esquina = vista isométrica, arista = vista elevada).
 * `arista` lo dibuja un poco más plano para distinguirlo visualmente de las esquinas.
 */
function BotonCubo({
  pos,
  vista,
  arista,
  hover,
  setHover,
}: {
  pos: [number, number, number]
  vista: VistaCubo
  arista?: boolean
  hover: string | null
  setHover: (k: string | null) => void
}) {
  const activo = hover === vista
  const size: [number, number, number] = arista ? [BTN, BTN * 0.7, BTN] : [BTN, BTN, BTN]
  return (
    <mesh
      position={pos}
      onClick={(e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation()
        aplicarVistaCubo(vista)
      }}
      onPointerOver={(e) => {
        e.stopPropagation()
        setHover(vista)
      }}
      onPointerOut={() => setHover(null)}
    >
      <boxGeometry args={size} />
      <meshBasicMaterial
        color={activo ? '#6ba8ff' : arista ? '#aab0c4' : '#c2c2d0'}
        toneMapped={false}
      />
    </mesh>
  )
}

function CuboEscena() {
  const idioma = useAjustes((s) => s.idioma)
  const t = useT()
  const [hover, setHover] = useState<string | null>(null)

  // Caras: planta (arriba) + 4 alzados. La posición/rotación sitúa cada plano sobre
  // su cara con la normal hacia afuera (coincide con el azimut de esa vista).
  const caras: Cara[] = useMemo(
    () => [
      { key: 'top', texto: t('cubo.planta', 'PLANTA'), position: [0, LADO, 0], rotation: [-Math.PI / 2, 0, 0] },
      { key: 'front', texto: t('cubo.frente', 'FRENTE'), position: [0, 0, LADO], rotation: [0, 0, 0] },
      { key: 'right', texto: t('cubo.der', 'DER.'), position: [LADO, 0, 0], rotation: [0, Math.PI / 2, 0] },
      { key: 'back', texto: t('cubo.atras', 'ATRÁS'), position: [0, 0, -LADO], rotation: [0, Math.PI, 0] },
      { key: 'left', texto: t('cubo.izq', 'IZQ.'), position: [-LADO, 0, 0], rotation: [0, -Math.PI / 2, 0] },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [idioma],
  )

  // Esquinas superiores → vistas iso (az = 45° + k·90°), en los 4 vértices de arriba.
  const esquinas: { pos: [number, number, number]; vista: VistaCubo }[] = [
    { pos: [LADO, LADO, LADO], vista: 'iso-0' },
    { pos: [-LADO, LADO, LADO], vista: 'iso-1' },
    { pos: [-LADO, LADO, -LADO], vista: 'iso-2' },
    { pos: [LADO, LADO, -LADO], vista: 'iso-3' },
  ]

  // Aristas superiores → vistas elevadas, en el punto medio de cada borde de la planta.
  const aristas: { pos: [number, number, number]; vista: VistaCubo }[] = [
    { pos: [0, LADO, LADO], vista: 'edge-front' },
    { pos: [LADO, LADO, 0], vista: 'edge-right' },
    { pos: [0, LADO, -LADO], vista: 'edge-back' },
    { pos: [-LADO, LADO, 0], vista: 'edge-left' },
  ]

  return (
    <>
      <OrbitRig />
      {caras.map((c) => (
        <CaraCubo key={c.key} cara={c} hover={hover} setHover={setHover} />
      ))}
      {esquinas.map((e) => (
        <BotonCubo key={e.vista} pos={e.pos} vista={e.vista} hover={hover} setHover={setHover} />
      ))}
      {aristas.map((a) => (
        <BotonCubo key={a.vista} pos={a.pos} vista={a.vista} arista hover={hover} setHover={setHover} />
      ))}
    </>
  )
}

/** Ancho del widget (NavControls alinea botones al mismo ancho). */
export const VIEW_CUBE_PX = 128
/** Alto del lienzo (debe coincidir con el contenedor para que el Canvas no quede a 0px). */
export const VIEW_CUBE_H = 128

export function ViewCube() {
  const t = useT()
  return (
    <div
      className="relative cursor-pointer select-none leading-none"
      style={{ width: VIEW_CUBE_PX, height: VIEW_CUBE_H }}
      title={t(
        'cubo.titulo',
        'Cubo de navegación: esquinas = isométrico, aristas = elevado, caras = planos',
      )}
    >
      <Canvas
        orthographic
        camera={{ position: [6, 6, 6], zoom: 20, near: 0.1, far: 100 }}
        gl={{ alpha: true }}
        style={{ width: '100%', height: '100%', background: 'transparent' }}
      >
        <CuboEscena />
      </Canvas>
    </div>
  )
}
