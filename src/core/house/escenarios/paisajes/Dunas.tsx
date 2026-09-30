import { useCallback, useMemo } from 'react'
import * as THREE from 'three'
import { esGamaBaja } from '../../../gamaDispositivo'
import { SueloMovil, manchas } from '../fondoMovil'
import type { PropsEscenario } from '../EscenarioVivo'
import { Esparcidos, Y_SUELO, alFondo, juntar, medidas, pintada } from './comun'

/** Arena con las ondas que deja el viento. */
const pintarArena = (ctx: CanvasRenderingContext2D, lado: number) => {
  ctx.fillStyle = '#e7b774'
  ctx.fillRect(0, 0, lado, lado)
  manchas(ctx, lado, ['#deac66', '#efc285', '#d9a35c'], 50, [8, 22], 47)
  ctx.strokeStyle = 'rgba(160, 104, 48, 0.35)'
  ctx.lineWidth = 2
  for (let y = 8; y < lado; y += 16) {
    ctx.beginPath()
    for (let x = 0; x <= lado; x += 8) ctx.lineTo(x, y + Math.sin((x / lado) * Math.PI * 4) * 4)
    ctx.stroke()
  }
}

/** Dunas: arena ondulada, dunas grandes, cactus y rocas del desierto. */
export default function Dunas({ L, W, rumbo }: PropsEscenario) {
  const pocos = esGamaBaja()
  const { hx, hz, k, e } = medidas(L, W)
  const pintar = useCallback(pintarArena, [])
  const fondo = useMemo(() => alFondo(rumbo), [rumbo])
  const cerca = useMemo(() => ({ hx, hz, desde: 3, hasta: 30 + 20 * k }), [hx, hz, k])
  const lejos = useMemo(() => ({ hx, hz, desde: 35 + 15 * k, hasta: 100 + 40 * k }), [hx, hz, k])

  // Duna: media esfera alargada; enterrada queda una loma suave.
  const duna = useMemo(() => pintada(new THREE.SphereGeometry(1, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2).scale(2.2, 0.45, 1), '#e2ad68'), [])
  const cactus = useMemo(() => {
    const tallo = new THREE.CylinderGeometry(0.3, 0.34, 3.2, 8).translate(0, 1.6, 0)
    const brazoI = new THREE.CylinderGeometry(0.2, 0.2, 1.1, 7).translate(-0.7, 2.1, 0)
    const codoI = new THREE.CylinderGeometry(0.2, 0.2, 0.6, 7).rotateZ(Math.PI / 2).translate(-0.4, 1.6, 0)
    const brazoD = new THREE.CylinderGeometry(0.18, 0.18, 0.9, 7).translate(0.65, 2.4, 0)
    const codoD = new THREE.CylinderGeometry(0.18, 0.18, 0.5, 7).rotateZ(Math.PI / 2).translate(0.38, 2, 0)
    return juntar(...[tallo, brazoI, codoI, brazoD, codoD].map((g) => pintada(g, '#4d7c3a')))
  }, [])
  const roca = useMemo(() => pintada(new THREE.DodecahedronGeometry(1, 0).scale(1.2, 0.8, 1).translate(0, 0.4, 0), '#b4764a'), [])
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, flatShading: true }), [])
  const matDuna = useMemo(() => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 }), [])

  return (
    <>
      <SueloMovil pintar={pintar} tamLoseta={14} y={Y_SUELO} rugosidad={1} hueco={[L / 2, W / 2]} />
      <Esparcidos geometria={duna} material={matDuna} n={pocos ? 16 : 34} zona={lejos} semilla={4} filtro={fondo} escala={[5 * k, 11 * k]} />
      <Esparcidos geometria={cactus} material={mat} n={pocos ? 16 : 40} zona={cerca} semilla={7} escala={[0.7 * e, 1.4 * e]} />
      <Esparcidos geometria={roca} material={mat} n={pocos ? 6 : 14} zona={cerca} semilla={11} escala={[0.5 * e, 2 * e]} />
    </>
  )
}
