import { useCallback, useMemo } from 'react'
import * as THREE from 'three'
import { esGamaBaja } from '../../../gamaDispositivo'
import { SueloMovil, manchas } from '../fondoMovil'
import type { PropsEscenario } from '../EscenarioVivo'
import { Esparcidos, Y_SUELO, alFondo, juntar, medidas, pintada } from './comun'

const pintarNieve = (ctx: CanvasRenderingContext2D, lado: number) => {
  ctx.fillStyle = '#d5dee8'
  ctx.fillRect(0, 0, lado, lado)
  manchas(ctx, lado, ['#c9d4e0', '#e2e8f0', '#c7d6e8', '#d9e1ea'], 80, [5, 18], 23)
}

/** Montañas nevadas: nieve, pinos con su capa blanca y cordilleras al fondo. */
export default function Nevado({ L, W, rumbo }: PropsEscenario) {
  const pocos = esGamaBaja()
  const { hx, hz, k, e } = medidas(L, W)
  const pintar = useCallback(pintarNieve, [])
  const fondo = useMemo(() => alFondo(rumbo), [rumbo])
  const cerca = useMemo(() => ({ hx, hz, desde: 3, hasta: 30 + 20 * k }), [hx, hz, k])
  const lejos = useMemo(() => ({ hx, hz, desde: 80 + 30 * k, hasta: 150 + 50 * k }), [hx, hz, k])

  const pino = useMemo(() => {
    const partes = [pintada(new THREE.CylinderGeometry(0.2, 0.3, 1.2, 6).translate(0, 0.6, 0), '#5b3a1e')]
    for (let i = 0; i < 3; i++) {
      const r = 1.6 - i * 0.4
      partes.push(pintada(new THREE.ConeGeometry(r, 1.9, 8).translate(0, 1.6 + i * 1.1, 0), '#1f4d32'))
      partes.push(pintada(new THREE.ConeGeometry(r * 0.55, 0.7, 8).translate(0, 2.2 + i * 1.1, 0), '#f8fafc'))
    }
    return juntar(...partes)
  }, [])
  const montana = useMemo(() => {
    const roca = new THREE.ConeGeometry(1, 1, 6).translate(0, 0.5, 0)
    const cima = new THREE.ConeGeometry(0.42, 0.42, 6).translate(0, 0.79, 0)
    return juntar(pintada(roca, '#56657a'), pintada(cima, '#ffffff'))
  }, [])
  const roca = useMemo(() => pintada(new THREE.DodecahedronGeometry(0.8, 0).scale(1, 0.6, 1.1), '#cbd5e1'), [])
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, flatShading: true }), [])

  return (
    <>
      <SueloMovil pintar={pintar} tamLoseta={14} y={Y_SUELO} rugosidad={0.8} hueco={[L / 2, W / 2]} />
      <Esparcidos geometria={pino} material={mat} n={pocos ? 40 : 90} zona={cerca} semilla={4} escala={[0.8 * e, 1.7 * e]} />
      <Esparcidos geometria={roca} material={mat} n={pocos ? 6 : 14} zona={cerca} semilla={9} escala={[0.5 * e, 1.4 * e]} />
      {/* Cordillera: conos gigantes con la cima blanca, que la niebla aclara. */}
      <Esparcidos geometria={montana} material={mat} n={pocos ? 8 : 16} zona={lejos} semilla={12} filtro={fondo} escala={[14 * k, 26 * k]} />
    </>
  )
}
