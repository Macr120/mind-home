import { useCallback, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { esGamaBaja } from '../../../gamaDispositivo'
import { SueloMovil, hash01, manchas } from '../fondoMovil'
import type { PropsEscenario } from '../EscenarioVivo'
import { Esparcidos, Y_SUELO, aLocal, juntar, medidas, pintada } from './comun'

/** Roca volcánica con grietas de lava. */
const pintarRoca = (ctx: CanvasRenderingContext2D, lado: number) => {
  ctx.fillStyle = '#26201e'
  ctx.fillRect(0, 0, lado, lado)
  manchas(ctx, lado, ['#1c1716', '#332a26', '#2d2522'], 70, [5, 16], 19)
  ctx.strokeStyle = '#f97316'
  ctx.lineWidth = 2.5
  ctx.shadowColor = '#fbbf24'
  ctx.shadowBlur = 6
  for (let i = 0; i < 7; i++) {
    let x = hash01(i, 1) * lado
    let y = hash01(i, 2) * lado
    ctx.beginPath()
    ctx.moveTo(x, y)
    for (let p = 0; p < 6; p++) {
      x += (hash01(i * 11 + p, 3) - 0.5) * 60
      y += (hash01(i * 11 + p, 4) - 0.2) * 40
      ctx.lineTo(x, y)
    }
    ctx.stroke()
  }
}

/** Volcán: roca negra con grietas de lava, charcos que brillan y el cono humeante al fondo. */
export default function Volcan({ L, W, rumbo }: PropsEscenario) {
  const pocos = esGamaBaja()
  const { hx, hz, k, e } = medidas(L, W)
  const pintar = useCallback(pintarRoca, [])
  const zona = useMemo(() => ({ hx, hz, desde: 3, hasta: 30 + 20 * k }), [hx, hz, k])

  const roca = useMemo(() => pintada(new THREE.DodecahedronGeometry(1, 0).scale(1, 0.7, 1.2).translate(0, 0.3, 0), '#1f1a18'), [])
  const charco = useMemo(() => new THREE.CircleGeometry(1, 12).rotateX(-Math.PI / 2).translate(0, 0.03, 0), [])
  const matRoca = useMemo(() => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, flatShading: true }), [])
  const matLava = useMemo(() => new THREE.MeshBasicMaterial({ color: '#fb923c' }), [])

  // El volcán: cono truncado, cráter encendido y bocanadas de humo que suben.
  const R = Math.max(hx, hz) + 40 + 20 * k
  const alto = 32 * k
  // Al fondo, del lado lejano a la cámara.
  const [vx, vz] = aLocal(rumbo, -R * 0.75, -R * 0.75)
  const cono = useMemo(() => {
    const falda = new THREE.CylinderGeometry(6 * k, 30 * k, alto, 12, 1, true).translate(0, alto / 2, 0)
    return juntar(pintada(falda, '#2b2220'))
  }, [k, alto])
  const humo = useRef<THREE.Group>(null)
  const nHumo = pocos ? 5 : 9
  useFrame(({ clock }) => {
    const g = humo.current
    if (!g) return
    g.children.forEach((c, i) => {
      const f = (clock.elapsedTime * 0.06 + i / nHumo) % 1
      c.position.set(Math.sin(i * 2.3) * 4 * k + f * 14 * k, alto + f * 40 * k, Math.cos(i * 1.7) * 4 * k)
      c.scale.setScalar((4 + f * 12) * k)
      const m = (c as THREE.Mesh).material as THREE.MeshBasicMaterial
      m.opacity = 0.55 * (1 - f)
    })
  })

  return (
    <>
      <SueloMovil pintar={pintar} tamLoseta={16} y={Y_SUELO} rugosidad={1} hueco={[L / 2, W / 2]} />
      <Esparcidos geometria={roca} material={matRoca} n={pocos ? 30 : 70} zona={zona} semilla={6} escala={[0.6 * e, 2.4 * e]} />
      <Esparcidos geometria={charco} material={matLava} n={pocos ? 10 : 22} zona={zona} semilla={10} escala={[1.2 * e, 3 * e]} />
      <group position={[vx, Y_SUELO, vz]}>
        <mesh geometry={cono} material={matRoca} />
        <mesh position={[0, alto - 0.5, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[6 * k, 16]} />
          <meshBasicMaterial color="#f97316" />
        </mesh>
        <pointLight position={[0, alto + 4 * k, 0]} color="#ff7a2a" intensity={3} distance={120 * k} decay={1} />
        <group ref={humo}>
          {Array.from({ length: nHumo }, (_, i) => (
            <mesh key={i}>
              <icosahedronGeometry args={[1, 1]} />
              <meshBasicMaterial color="#57534e" transparent opacity={0.5} depthWrite={false} />
            </mesh>
          ))}
        </group>
      </group>
    </>
  )
}
