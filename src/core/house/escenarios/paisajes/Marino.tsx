import { useCallback, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { esGamaBaja } from '../../../gamaDispositivo'
import { SueloMovil, hash01, manchas } from '../fondoMovil'
import type { PropsEscenario } from '../EscenarioVivo'
import { Esparcidos, Y_SUELO, juntar, medidas, pintada, repartir } from './comun'

const pintarLecho = (ctx: CanvasRenderingContext2D, lado: number) => {
  ctx.fillStyle = '#d8c894'
  ctx.fillRect(0, 0, lado, lado)
  manchas(ctx, lado, ['#cbb983', '#e2d4a6', '#bfae7a'], 80, [4, 14], 37)
  manchas(ctx, lado, ['#f5f0e1', '#e9a8a0'], 20, [1.5, 3], 73)
}

/** Fondo marino: la casa en el lecho del mar, con corales, algas, peces y burbujas. */
export default function Marino({ L, W }: PropsEscenario) {
  const pocos = esGamaBaja()
  const { hx, hz, k, e } = medidas(L, W)
  const pintar = useCallback(pintarLecho, [])
  const zona = useMemo(() => ({ hx, hz, desde: 2, hasta: 25 + 15 * k }), [hx, hz, k])

  const coral = useMemo(() => {
    const partes = [pintada(new THREE.CylinderGeometry(0.18, 0.28, 1.6, 6).translate(0, 0.8, 0), '#ffffff')]
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2
      partes.push(pintada(new THREE.CylinderGeometry(0.1, 0.16, 1.1, 5).rotateZ(0.6).rotateY(a).translate(Math.cos(a) * 0.4, 1.3, Math.sin(a) * 0.4), '#ffffff'))
      partes.push(pintada(new THREE.SphereGeometry(0.18, 6, 5).translate(Math.cos(a) * 0.72, 1.8, Math.sin(a) * 0.72), '#ffffff'))
    }
    return juntar(...partes)
  }, [])
  const alga = useMemo(() => pintada(new THREE.ConeGeometry(0.25, 4, 5).translate(0, 2, 0), '#15803d'), [])
  const concha = useMemo(() => pintada(new THREE.SphereGeometry(0.35, 8, 5, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.5, 1), '#f5d0c5'), [])
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8, flatShading: true }), [])

  // Peces que dan vueltas y burbujas que suben; todo quieto sin movimiento reducido.
  const peces = useMemo(() => repartir(pocos ? 8 : 20, zona, 41), [pocos, zona])
  const burbujas = useMemo(() => repartir(pocos ? 10 : 26, { ...zona, desde: 0 }, 43), [pocos, zona])
  const grupoPeces = useRef<THREE.Group>(null)
  const grupoBurbujas = useRef<THREE.Group>(null)
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    grupoPeces.current?.children.forEach((c, i) => {
      const p = peces[i]
      const a = t * (0.2 + hash01(p.s, 9) * 0.3) + i
      const r = 3 + hash01(p.s, 10) * 5
      c.position.set(p.x + Math.cos(a) * r, 1.5 + hash01(p.s, 11) * 5, p.z + Math.sin(a) * r)
      c.rotation.y = -a
    })
    grupoBurbujas.current?.children.forEach((c, i) => {
      const p = burbujas[i]
      const f = (t * 0.12 + hash01(p.s, 12)) % 1
      c.position.set(p.x + Math.sin(t + i) * 0.3, Y_SUELO + f * 14, p.z)
    })
  })

  return (
    <>
      <SueloMovil pintar={pintar} tamLoseta={12} y={Y_SUELO} rugosidad={0.95} hueco={[L / 2, W / 2]} />
      <Esparcidos
        geometria={coral}
        material={mat}
        n={pocos ? 30 : 70}
        zona={zona}
        semilla={3}
        escala={[0.8 * e, 1.8 * e]}
        colores={['#f472b6', '#fb7185', '#f97316', '#a78bfa', '#facc15']}
      />
      <Esparcidos geometria={alga} material={mat} n={pocos ? 35 : 80} zona={zona} semilla={5} escala={[0.6 * e, 1.5 * e]} />
      <Esparcidos geometria={concha} material={mat} n={pocos ? 6 : 14} zona={zona} semilla={9} escala={[0.8, 1.6]} />
      <group ref={grupoPeces}>
        {peces.map((_, i) => (
          <group key={i}>
            <mesh scale={[0.25, 0.3, 0.6]}>
              <sphereGeometry args={[1, 10, 8]} />
              <meshStandardMaterial color={['#f59e0b', '#38bdf8', '#f43f5e', '#facc15'][i % 4]} roughness={0.5} />
            </mesh>
            <mesh position={[0, 0, -0.65]} rotation={[Math.PI / 2, 0, 0]}>
              <coneGeometry args={[0.2, 0.35, 4]} />
              <meshStandardMaterial color={['#f59e0b', '#38bdf8', '#f43f5e', '#facc15'][i % 4]} roughness={0.5} />
            </mesh>
          </group>
        ))}
      </group>
      <group ref={grupoBurbujas}>
        {burbujas.map((_, i) => (
          <mesh key={i}>
            <sphereGeometry args={[0.12 + (i % 3) * 0.06, 8, 6]} />
            <meshStandardMaterial color="#e0f2fe" transparent opacity={0.55} roughness={0.1} />
          </mesh>
        ))}
      </group>
    </>
  )
}
