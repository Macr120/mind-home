import { useCallback, useMemo } from 'react'
import * as THREE from 'three'
import { esGamaBaja } from '../../../gamaDispositivo'
import { SueloMovil, manchas } from '../fondoMovil'
import type { PropsEscenario } from '../EscenarioVivo'
import { Esparcidos, Y_SUELO, juntar, medidas, pintada } from './comun'

const pintarHojarasca = (ctx: CanvasRenderingContext2D, lado: number) => {
  ctx.fillStyle = '#8a6a3a'
  ctx.fillRect(0, 0, lado, lado)
  manchas(ctx, lado, ['#7a8a3a', '#9a7a42', '#6f7f35'], 40, [8, 20], 31)
  manchas(ctx, lado, ['#d9622b', '#e8a33a', '#b83a1f', '#f2c14e', '#a0522d'], 220, [2, 5], 67)
}

/** Bosque otoñal: hojarasca, árboles naranjas, rojos y amarillos, y calabazas. */
export default function Otonal({ L, W }: PropsEscenario) {
  const pocos = esGamaBaja()
  const { hx, hz, k, e } = medidas(L, W)
  const pintar = useCallback(pintarHojarasca, [])
  const zona = useMemo(() => ({ hx, hz, desde: 3, hasta: 30 + 25 * k }), [hx, hz, k])
  const cerca = useMemo(() => ({ hx, hz, desde: 1.5, hasta: 12 }), [hx, hz])

  // Tronco oscuro y copa blanca: el tinte de cada árbol le da su color de otoño.
  const arbol = useMemo(() => {
    const tronco = new THREE.CylinderGeometry(0.25, 0.4, 3, 7).translate(0, 1.5, 0)
    const copa = new THREE.IcosahedronGeometry(1.9, 1).translate(0, 4.1, 0)
    const copa2 = new THREE.IcosahedronGeometry(1.3, 0).translate(0.9, 3.4, 0.5)
    return juntar(pintada(tronco, '#3b2a1a'), pintada(copa, '#ffffff'), pintada(copa2, '#ffffff'))
  }, [])
  const calabaza = useMemo(() => {
    const cuerpo = new THREE.SphereGeometry(0.45, 12, 8).scale(1.2, 0.85, 1.2).translate(0, 0.38, 0)
    const rabo = new THREE.CylinderGeometry(0.05, 0.07, 0.25, 5).translate(0, 0.8, 0)
    return juntar(pintada(cuerpo, '#f97316'), pintada(rabo, '#4d7c0f'))
  }, [])
  const hongo = useMemo(() => {
    const pie = new THREE.CylinderGeometry(0.08, 0.1, 0.35, 6).translate(0, 0.17, 0)
    const sombrero = new THREE.SphereGeometry(0.25, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2).translate(0, 0.32, 0)
    return juntar(pintada(pie, '#f5f5f4'), pintada(sombrero, '#dc2626'))
  }, [])
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, flatShading: true }), [])

  return (
    <>
      <SueloMovil pintar={pintar} tamLoseta={12} y={Y_SUELO} rugosidad={0.95} hueco={[L / 2, W / 2]} />
      <Esparcidos
        geometria={arbol}
        material={mat}
        n={pocos ? 45 : 110}
        zona={zona}
        semilla={2}
        escala={[0.9 * e, 1.8 * e]}
        colores={['#e0662a', '#c2410c', '#f59e0b', '#b91c1c', '#eab308', '#d97706']}
      />
      <Esparcidos geometria={calabaza} material={mat} n={pocos ? 10 : 24} zona={cerca} semilla={7} escala={[0.8, 1.5]} />
      <Esparcidos geometria={hongo} material={mat} n={pocos ? 6 : 16} zona={cerca} semilla={13} escala={[0.8, 1.6]} />
    </>
  )
}
