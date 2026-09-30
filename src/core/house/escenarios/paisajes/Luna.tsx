import { useCallback, useMemo } from 'react'
import * as THREE from 'three'
import { esGamaBaja } from '../../../gamaDispositivo'
import { SueloMovil, manchas } from '../fondoMovil'
import type { PropsEscenario } from '../EscenarioVivo'
import { Esparcidos, Y_SUELO, aLocal, medidas, pintada } from './comun'

/** Regolito: polvo gris con cráteres chicos (sombra y borde claro). */
const pintarRegolito = (ctx: CanvasRenderingContext2D, lado: number) => {
  ctx.fillStyle = '#9a9a9e'
  ctx.fillRect(0, 0, lado, lado)
  manchas(ctx, lado, ['#8e8e93', '#a6a6aa', '#86868b', '#b0b0b4'], 90, [4, 14], 29)
  manchas(ctx, lado, ['#6b6b70'], 14, [5, 10], 83)
  manchas(ctx, lado, ['#c4c4c8'], 14, [1.5, 3], 91)
}

/** Superficie lunar: regolito, cráteres con borde, rocas y la Tierra colgada del cielo. */
export default function Luna({ L, W, rumbo }: PropsEscenario) {
  const pocos = esGamaBaja()
  const { hx, hz, k, e } = medidas(L, W)
  const pintar = useCallback(pintarRegolito, [])
  const zona = useMemo(() => ({ hx, hz, desde: 4, hasta: 35 + 25 * k }), [hx, hz, k])

  // Cráter: anillo aplanado (el borde) con su fondo oscuro.
  const borde = useMemo(() => pintada(new THREE.TorusGeometry(1, 0.28, 6, 20).rotateX(Math.PI / 2).scale(1, 0.5, 1), '#a8a8ac'), [])
  const fondo = useMemo(() => new THREE.CircleGeometry(1, 20).rotateX(-Math.PI / 2).translate(0, 0.02, 0), [])
  const roca = useMemo(() => pintada(new THREE.DodecahedronGeometry(1, 0).scale(1, 0.6, 1.1).translate(0, 0.25, 0), '#7c7c80'), [])
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, flatShading: true }), [])
  const matFondo = useMemo(() => new THREE.MeshStandardMaterial({ color: '#6f6f74', roughness: 1 }), [])
  const R = Math.max(hx, hz)
  // La Tierra cuelga del lado lejano a la cámara.
  const [tx, tz] = aLocal(rumbo, -R - 50 * k, -R - 70 * k)

  return (
    <>
      <SueloMovil pintar={pintar} tamLoseta={18} y={Y_SUELO} rugosidad={1} hueco={[L / 2, W / 2]} />
      <Esparcidos geometria={borde} material={mat} n={pocos ? 14 : 32} zona={zona} semilla={3} escala={[2 * k, 9 * k]} girar={false} />
      <Esparcidos geometria={fondo} material={matFondo} n={pocos ? 14 : 32} zona={zona} semilla={3} escala={[2 * k, 9 * k]} girar={false} />
      <Esparcidos geometria={roca} material={mat} n={pocos ? 20 : 50} zona={zona} semilla={8} escala={[0.4 * e, 1.8 * e]} />
      {/* La Tierra: océanos, continentes y un halo. */}
      <group position={[tx, 45 * k, tz]}>
        <mesh>
          <sphereGeometry args={[16 * k, 32, 20]} />
          <meshStandardMaterial color="#2563eb" emissive="#1d4ed8" emissiveIntensity={0.35} roughness={0.6} />
        </mesh>
        <mesh rotation={[0.4, 0.8, 0]}>
          <icosahedronGeometry args={[16.3 * k, 1]} />
          <meshStandardMaterial color="#16a34a" emissive="#166534" emissiveIntensity={0.3} flatShading transparent opacity={0.55} />
        </mesh>
        <mesh>
          <sphereGeometry args={[17.5 * k, 32, 20]} />
          <meshBasicMaterial color="#93c5fd" transparent opacity={0.15} depthWrite={false} />
        </mesh>
      </group>
    </>
  )
}
