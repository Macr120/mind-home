import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { playerPos } from '../state/houseStore'
import { SIZE, WALL_H, AGUA_BAJO_BORDE } from './walls'
import {
  esFormaCuadrada,
  geometriaLoseta3D,
  type CeldaFormaLoseta,
} from './formasLoseta'

/** Mismo tono de agua que las fuentes animadas (especiales.tsx). */
const AGUA_COLOR = '#7dd3fc'
/** Subdivisiones por celda: suficientes para olas low-poly sin costo. */
const SEGS = 7
const AMP_1 = 0.05
const AMP_2 = 0.03

/** Ola por coordenadas de MUNDO: celdas vecinas comparten fase y la lámina queda continua. */
function ola(px: number, pz: number, t: number): number {
  return (
    AMP_1 * Math.sin(px * 0.55 + t * 1.15) * Math.cos(pz * 0.48 + t * 0.85) +
    AMP_2 * Math.sin((px + pz) * 0.7 + t * 1.6)
  )
}

function MatAguaAlberca() {
  return (
    <meshStandardMaterial
      color={AGUA_COLOR}
      transparent
      opacity={0.6}
      roughness={0.1}
      metalness={0.1}
      emissive={AGUA_COLOR}
      emissiveIntensity={0.12}
      flatShading
      side={THREE.DoubleSide}
    />
  )
}

/** El agua nunca intercepta clics (arrastrar el cuarto, caminar): raycast nulo. */
const sinRaycast = () => {}

/** Lejos de este radio las olas se congelan (mutar ~64 vértices/celda cada frame suma). */
const RADIO_OLAS = 26
const _posOla = new THREE.Vector3()

/** Subformas finas por cuadrante (NO,NE,SO,SE) o null. */
type Subformas = (CeldaFormaLoseta | undefined)[] | null | undefined

/** Celda de agua cuadrada: plano subdividido con olas por vértice. */
function CeldaAguaOndulada({ lx, lz, y }: { lx: number; lz: number; y: number }) {
  const ref = useRef<THREE.Mesh>(null)
  // Geometría propia por celda: sus vértices se mutan cada frame.
  const geo = useMemo(() => new THREE.PlaneGeometry(SIZE, SIZE, SEGS, SEGS), [])
  useEffect(() => () => geo.dispose(), [geo])

  // Distancia al jugador re-medida ~2 veces/s (escalonada por celda).
  const lejos = useRef({ acc: Math.random() * 0.5, si: false })
  useFrame(({ clock }, delta) => {
    const mesh = ref.current
    if (!mesh) return
    const l = lejos.current
    l.acc += delta
    if (l.acc >= 0.5) {
      l.acc = 0
      mesh.getWorldPosition(_posOla)
      l.si = Math.hypot(playerPos.x - _posOla.x, playerPos.z - _posOla.z) > RADIO_OLAS
    }
    if (l.si) return
    const pos = (mesh.geometry as THREE.PlaneGeometry).attributes
      .position as THREE.BufferAttribute
    const t = clock.elapsedTime
    for (let i = 0; i < pos.count; i++) {
      // El plano vive en XY y el mesh gira -90° en X: X→X del mundo, Y→-Z, Z→Y (altura).
      const px = lx + pos.getX(i)
      const pz = lz - pos.getY(i)
      pos.setZ(i, ola(px, pz, t))
    }
    pos.needsUpdate = true
  })

  return (
    // Sin frustumCulled: el boundingSphere no sigue a los vértices mutados.
    <mesh ref={ref} geometry={geo} position={[lx, y, lz]} rotation={[-Math.PI / 2, 0, 0]} frustumCulled={false} raycast={sinRaycast}>
      <MatAguaAlberca />
    </mesh>
  )
}

/**
 * Celda de agua con silueta (triángulo/círculo entero o recortes finos por cuadrante):
 * lámina fija que sigue la forma exacta del piso, para que el agua no sobresalga del cuarto.
 */
function CeldaAguaForma({
  lx,
  lz,
  y,
  forma,
  subformas,
}: {
  lx: number
  lz: number
  y: number
  forma: CeldaFormaLoseta
  subformas: Subformas
}) {
  const geo = useMemo(
    () => geometriaLoseta3D(forma, SIZE, 'plano', subformas),
    [forma, subformas],
  )
  useEffect(() => () => geo.dispose(), [geo])
  return (
    <mesh geometry={geo} position={[lx, y, lz]} rotation={[-Math.PI / 2, 0, 0]} raycast={sinRaycast}>
      <MatAguaAlberca />
    </mesh>
  )
}

/**
 * Agua animada de una alberca (cuarto de sótano con `conAgua`): una lámina por celda
 * del footprint, a un pelo del borde. Las celdas cuadradas plenas ondulan con olas
 * continuas entre vecinas; las que tienen forma o recortes finos llevan lámina fija con
 * su silueta exacta (el agua queda SOLO dentro del cuarto).
 */
export function AguaCuarto({
  celdas,
}: {
  /** Celdas del cuarto en coordenadas LOCALES (las mismas del piso). */
  celdas: { lx: number; lz: number; forma?: CeldaFormaLoseta; subformas?: Subformas }[]
}) {
  const y = WALL_H - AGUA_BAJO_BORDE
  return (
    <group>
      {celdas.map((c, i) =>
        esFormaCuadrada(c.forma) && !c.subformas ? (
          <CeldaAguaOndulada key={i} lx={c.lx} lz={c.lz} y={y} />
        ) : (
          <CeldaAguaForma key={i} lx={c.lx} lz={c.lz} y={y} forma={c.forma ?? { forma: 'cuadrado', rotacion: 0 }} subformas={c.subformas} />
        ),
      )}
    </group>
  )
}
