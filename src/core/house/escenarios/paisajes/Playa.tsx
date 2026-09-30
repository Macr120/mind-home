import { useCallback, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { esGamaBaja } from '../../../gamaDispositivo'
import { SueloMovil, manchas } from '../fondoMovil'
import type { PropsEscenario } from '../EscenarioVivo'
import { Esparcidos, Y_SUELO, juntar, medidas, pintada } from './comun'

const pintarArena = (ctx: CanvasRenderingContext2D, lado: number) => {
  ctx.fillStyle = '#ecd9a8'
  ctx.fillRect(0, 0, lado, lado)
  manchas(ctx, lado, ['#e3cc93', '#f3e4bc', '#dcc285', '#f7ecd0'], 90, [3, 12], 11)
  manchas(ctx, lado, ['#ffffff', '#f4b6a0'], 18, [1, 2], 57)
}

/** Playa tropical: arena, el mar a un lado con su espuma, palmeras y sombrillas. */
export default function Playa({ L, W }: PropsEscenario) {
  const pocos = esGamaBaja()
  const { hx, hz, k, e } = medidas(L, W)
  // La orilla corre a lo largo de un lado de la casa (+X).
  const orilla = hx + 14 * k
  const pintar = useCallback(pintarArena, [])
  const zona = useMemo(() => ({ hx, hz, desde: 3, hasta: 30 + 20 * k }), [hx, hz, k])
  const enTierra = useCallback((x: number) => x < orilla - 4, [orilla])

  const palmera = useMemo(() => {
    const tronco = new THREE.CylinderGeometry(0.22, 0.38, 6, 7).translate(0, 3, 0)
    tronco.rotateZ(0.12)
    const hojas = new THREE.ConeGeometry(2.6, 1.1, 7, 1, true).rotateX(Math.PI).translate(0.7, 6.2, 0)
    const coco = new THREE.IcosahedronGeometry(0.3, 0).translate(0.75, 5.7, 0.2)
    return juntar(pintada(tronco, '#9a7148'), pintada(hojas, '#2f8f3c'), pintada(coco, '#5b3a1e'))
  }, [])
  const sombrilla = useMemo(() => {
    const palo = new THREE.CylinderGeometry(0.05, 0.05, 2.4, 5).translate(0, 1.2, 0)
    const lona = new THREE.ConeGeometry(1.4, 0.55, 10).translate(0, 2.5, 0)
    return juntar(pintada(palo, '#e5e7eb'), pintada(lona, '#ffffff'))
  }, [])
  const roca = useMemo(() => new THREE.DodecahedronGeometry(0.8, 0).scale(1, 0.55, 1.2), [])
  const matVertices = useMemo(() => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, flatShading: true, side: THREE.DoubleSide }), [])
  const matRoca = useMemo(() => new THREE.MeshStandardMaterial({ color: '#9ca3af', roughness: 1, flatShading: true }), [])

  // El mar sube y baja un poco: la espuma de la orilla respira.
  const espuma = useRef<THREE.Mesh>(null)
  useFrame(({ clock }) => {
    if (espuma.current) espuma.current.position.x = orilla + Math.sin(clock.elapsedTime * 0.8) * 0.9
  })

  return (
    <>
      <SueloMovil pintar={pintar} tamLoseta={14} y={Y_SUELO} rugosidad={0.95} hueco={[L / 2, W / 2]} />
      {/* Arena mojada, mar y espuma. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[orilla - 3, Y_SUELO + 0.01, 0]}>
        <planeGeometry args={[8, 900]} />
        <meshStandardMaterial color="#cdb47c" roughness={0.6} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[orilla + 450, Y_SUELO + 0.05, 0]}>
        <planeGeometry args={[900, 900]} />
        <meshStandardMaterial color="#1fa2c9" roughness={0.15} metalness={0.1} transparent opacity={0.92} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[orilla + 30, Y_SUELO + 0.06, 0]}>
        <planeGeometry args={[60, 900]} />
        <meshStandardMaterial color="#5fd4e0" roughness={0.2} transparent opacity={0.55} />
      </mesh>
      <mesh ref={espuma} rotation={[-Math.PI / 2, 0, 0]} position={[orilla, Y_SUELO + 0.08, 0]}>
        <planeGeometry args={[1.4, 900]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.8} />
      </mesh>
      <Esparcidos geometria={palmera} material={matVertices} n={pocos ? 30 : 70} zona={zona} semilla={3} escala={[0.8 * e, 1.4 * e]} filtro={enTierra} />
      <Esparcidos
        geometria={sombrilla}
        material={matVertices}
        n={pocos ? 8 : 18}
        zona={zona}
        semilla={8}
        escala={[0.9, 1.2]}
        colores={['#ef4444', '#f59e0b', '#3b82f6', '#ec4899', '#22c55e']}
        filtro={enTierra}
      />
      <Esparcidos geometria={roca} material={matRoca} n={pocos ? 6 : 14} zona={zona} semilla={5} escala={[0.5 * e, 1.6 * e]} />
    </>
  )
}
