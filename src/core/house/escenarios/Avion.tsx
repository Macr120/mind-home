import { useCallback, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { esGamaBaja } from '../../gamaDispositivo'
import { mezclar } from '../temas'
import { Desfile, SueloMovil, manchas, useRecorrido, useSueloEscenario } from './fondoMovil'
import type { PropsEscenario } from './EscenarioVivo'

/** Hélice de dos palas; gira con el recorrido (se para si se pide menos movimiento). */
function Helice({ pos, r, color }: { pos: [number, number, number]; r: number; color: string }) {
  const ref = useRef<THREE.Group>(null)
  const recorrido = useRecorrido()
  useFrame(() => {
    if (ref.current) ref.current.rotation.x = recorrido.d * 2.2
  })
  return (
    <group position={pos}>
      <mesh rotation={[0, 0, -Math.PI / 2]}>
        <coneGeometry args={[r * 0.18, r * 0.35, 12]} />
        <meshStandardMaterial color={color} metalness={0.6} roughness={0.3} />
      </mesh>
      <group ref={ref}>
        {[0, Math.PI / 2].map((a) => (
          <mesh key={a} rotation={[a, 0, 0]}>
            <boxGeometry args={[0.06, r * 2, r * 0.16]} />
            <meshStandardMaterial color="#1f2937" roughness={0.6} />
          </mesh>
        ))}
      </group>
    </group>
  )
}

/** Parcelas de cultivo vistas desde muy alto. */
const pintarCampos = (ctx: CanvasRenderingContext2D, lado: number) => {
  ctx.fillStyle = '#7fa35a'
  ctx.fillRect(0, 0, lado, lado)
  const colores = ['#9bbf5f', '#c9b870', '#6b8f45', '#a9c77a', '#8a9a4e', '#d6c88a']
  const n = 4
  const c = lado / n
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      ctx.fillStyle = colores[(i * 3 + j * 5) % colores.length]
      ctx.fillRect(i * c + 2, j * c + 2, c - 4, c - 4)
    }
  }
  manchas(ctx, lado, ['#4d7040'], 10, [4, 9], 11)
}

export default function Avion({ L, W, tema, soloPaisaje = false }: PropsEscenario) {
  useSueloEscenario('vacio', 0, !soloPaisaje)
  const pocos = esGamaBaja()
  const fuselaje = mezclar(tema.shell.muroExt, '#f8fafc', 0.35)
  const franja = tema.shell.techo
  const metal = '#94a3b8'

  const R = Math.min(4, Math.max(1.2, W * 0.26))
  const envergadura = Math.min(24, Math.max(6, W * 0.9))
  const cuerdaAla = Math.min(12, Math.max(2.5, L * 0.32))

  const nube = useMemo(() => {
    const partes = [
      [0, 0, 0, 1.6],
      [1.5, -0.2, 0.3, 1.2],
      [-1.5, -0.3, -0.2, 1.1],
      [0.5, 0.6, -0.6, 1.1],
      [-0.6, 0.4, 0.8, 1],
    ].map(([x, y, z, r]) => new THREE.SphereGeometry(r, 10, 8).translate(x, y, z))
    const g = mergeGeometries(partes)
    partes.forEach((p) => p.dispose())
    return g
  }, [])
  const matNube = useMemo(() => new THREE.MeshLambertMaterial({ color: '#ffffff' }), [])
  const matNubeLejana = useMemo(() => new THREE.MeshLambertMaterial({ color: '#e8f1fb' }), [])
  const exterior = W / 2 + envergadura + 4
  const lados = useMemo<[number, number][]>(() => [[-90, -exterior], [exterior, 90]], [exterior])
  const debajo = useMemo<[number, number][]>(() => [[-110, 110]], [])
  const pintar = useCallback(pintarCampos, [])

  return (
    <>
      <SueloMovil pintar={pintar} tamLoseta={48} y={-80} factor={0.2} extension={1200} />
      <Desfile geometria={nube} material={matNubeLejana} n={pocos ? 18 : 40} largo={260} bandas={debajo} y={[-40, -14]} escala={[1.6, 3.2]} factor={0.55} semilla={2} />
      <Desfile geometria={nube} material={matNube} n={pocos ? 10 : 22} largo={200} bandas={lados} y={[-9, 2]} escala={[1, 2.4]} semilla={5} />

      {!soloPaisaje && (
        <>
          {/* Plataforma bajo la casa + fuselaje. */}
          <mesh position={[0, -0.16, 0]} castShadow receiveShadow>
            <boxGeometry args={[L, 0.28, W]} />
            <meshStandardMaterial color={fuselaje} metalness={0.45} roughness={0.35} />
          </mesh>
          <mesh position={[0, -R - 0.1, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[R, R, L, 28]} />
            <meshStandardMaterial color={fuselaje} metalness={0.45} roughness={0.35} />
          </mesh>
          {/* Franja de color a lo largo. */}
          <mesh position={[0, -R - 0.1, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[R * 1.01, R * 1.01, L * 0.98, 28, 1, true, Math.PI * 0.35, Math.PI * 0.3]} />
            <meshStandardMaterial color={franja} side={THREE.DoubleSide} roughness={0.5} />
          </mesh>
          {/* Nariz y hélice delantera. */}
          <mesh position={[L / 2, -R - 0.1, 0]} scale={[1.5, 1, 1]} castShadow>
            <sphereGeometry args={[R, 28, 20, 0, Math.PI * 2, 0, Math.PI]} />
            <meshStandardMaterial color={fuselaje} metalness={0.45} roughness={0.35} />
          </mesh>
          <Helice pos={[L / 2 + R * 1.5, -R - 0.1, 0]} r={R * 1.1} color={metal} />
          {/* Cola: cono que se afila, timón y estabilizadores. */}
          <mesh position={[-L / 2 - R * 1.2, -R * 0.8, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[R * 0.35, R, R * 2.4, 24]} />
            <meshStandardMaterial color={fuselaje} metalness={0.45} roughness={0.35} />
          </mesh>
          <mesh position={[-L / 2 - R * 1.6, R * 0.3, 0]} rotation={[0, 0, 0.35]} castShadow>
            <boxGeometry args={[R * 1.6, R * 2, 0.18]} />
            <meshStandardMaterial color={franja} roughness={0.5} />
          </mesh>
          <mesh position={[-L / 2 - R * 1.7, -R * 0.55, 0]} castShadow>
            <boxGeometry args={[R * 1.2, 0.14, W * 0.5 + R * 2]} />
            <meshStandardMaterial color={fuselaje} metalness={0.45} roughness={0.35} />
          </mesh>
          {/* Alas con un motor de hélice en cada una. */}
          <mesh position={[L * 0.06, -R * 1.25, 0]} castShadow>
            <boxGeometry args={[cuerdaAla, 0.22, W + envergadura * 2]} />
            <meshStandardMaterial color={fuselaje} metalness={0.45} roughness={0.35} />
          </mesh>
          {[-1, 1].map((l) => {
            const z = l * (W / 2 + envergadura * 0.45)
            return (
              <group key={l}>
                <mesh position={[L * 0.06 + cuerdaAla * 0.15, -R * 1.25 - 0.35, z]} rotation={[0, 0, Math.PI / 2]} castShadow>
                  <cylinderGeometry args={[0.45, 0.4, cuerdaAla * 0.9, 16]} />
                  <meshStandardMaterial color={metal} metalness={0.7} roughness={0.3} />
                </mesh>
                <Helice pos={[L * 0.06 + cuerdaAla * 0.6 + 0.1, -R * 1.25 - 0.35, z]} r={1.2} color={metal} />
                {/* Luz de punta de ala. */}
                <mesh position={[L * 0.06, -R * 1.25, l * (W / 2 + envergadura)]}>
                  <sphereGeometry args={[0.16, 10, 10]} />
                  <meshBasicMaterial color={l < 0 ? '#ef4444' : '#22c55e'} toneMapped={false} />
                </mesh>
              </group>
            )
          })}
        </>
      )}
    </>
  )
}
