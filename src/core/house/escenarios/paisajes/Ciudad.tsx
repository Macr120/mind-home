import { useCallback, useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { esGamaBaja } from '../../../gamaDispositivo'
import { SueloMovil, hash01, manchas } from '../fondoMovil'
import type { PropsEscenario } from '../EscenarioVivo'
import { Esparcidos, Y_SUELO, alFondo, juntar, medidas, pintada, repartir } from './comun'

/** Loseta de una manzana: asfalto, banqueta y rayas de la calle. */
const pintarCalles = (ctx: CanvasRenderingContext2D, lado: number) => {
  ctx.fillStyle = '#2a2d36'
  ctx.fillRect(0, 0, lado, lado)
  manchas(ctx, lado, ['#262932', '#30333d'], 40, [4, 12], 5)
  ctx.fillStyle = '#4b5060'
  ctx.fillRect(0, 0, lado, 18)
  ctx.fillRect(0, 0, 18, lado)
  ctx.fillStyle = '#facc15'
  for (let i = 30; i < lado; i += 40) {
    ctx.fillRect(i, lado / 2 - 2, 20, 4)
    ctx.fillRect(lado / 2 - 2, i, 4, 20)
  }
}

/** Fachada con ventanas: unas encendidas, otras no. Va de mapa emisivo. */
function texturaVentanas(): THREE.CanvasTexture {
  const c = document.createElement('canvas')
  c.width = 64
  c.height = 128
  const ctx = c.getContext('2d')!
  ctx.fillStyle = '#000000'
  ctx.fillRect(0, 0, 64, 128)
  for (let f = 0; f < 16; f++) {
    for (let col = 0; col < 4; col++) {
      if (hash01(f * 7 + col, 3) < 0.45) continue
      ctx.fillStyle = hash01(f, col) < 0.7 ? '#fde68a' : '#93c5fd'
      ctx.fillRect(4 + col * 15, 3 + f * 8, 9, 5)
    }
  }
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

const sinRayo = () => null

/** Ciudad de noche: calles, edificios con ventanas encendidas y farolas. */
export default function Ciudad({ L, W, rumbo }: PropsEscenario) {
  const pocos = esGamaBaja()
  const { hx, hz, k } = medidas(L, W)
  const pintar = useCallback(pintarCalles, [])
  const zonaEdif = useMemo(() => ({ hx, hz, desde: 6, hasta: 40 + 30 * k }), [hx, hz, k])
  const zonaFarolas = useMemo(() => ({ hx, hz, desde: 2, hasta: 12 }), [hx, hz])

  const ventanas = useMemo(texturaVentanas, [])
  useEffect(() => () => ventanas.dispose(), [ventanas])
  const matEdificio = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#1e2230', roughness: 0.7, metalness: 0.3, emissive: '#ffffff', emissiveMap: ventanas, emissiveIntensity: 0.9 }),
    [ventanas],
  )
  const caja = useMemo(() => new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0), [])

  // Edificios: cada uno con su planta y su altura (escala no uniforme).
  const edificios = useRef<THREE.InstancedMesh>(null)
  const pts = useMemo(() => repartir(pocos ? 40 : 90, zonaEdif, 21, alFondo(rumbo)), [pocos, zonaEdif, rumbo])
  useLayoutEffect(() => {
    const mesh = edificios.current
    if (!mesh) return
    const m = new THREE.Matrix4()
    pts.forEach((p, i) => {
      const lado = (5 + hash01(p.s, 8) * 7) * k
      const alto = (8 + Math.pow(hash01(p.s, 9), 2) * 45) * k
      m.makeScale(lado, alto, lado * (0.8 + hash01(p.s, 10) * 0.5))
      m.setPosition(p.x, Y_SUELO, p.z)
      mesh.setMatrixAt(i, m)
    })
    mesh.instanceMatrix.needsUpdate = true
    mesh.computeBoundingSphere()
  }, [pts, k])

  const farola = useMemo(() => {
    const poste = new THREE.CylinderGeometry(0.07, 0.1, 3.4, 6).translate(0, 1.7, 0)
    const brazo = new THREE.BoxGeometry(0.7, 0.08, 0.08).translate(0.3, 3.35, 0)
    return juntar(pintada(poste, '#374151'), pintada(brazo, '#374151'))
  }, [])
  const foco = useMemo(() => new THREE.SphereGeometry(0.2, 8, 6).translate(0.62, 3.25, 0), [])
  const matVertices = useMemo(() => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6 }), [])
  const matFoco = useMemo(() => new THREE.MeshBasicMaterial({ color: '#fde68a' }), [])
  const nFarolas = pocos ? 12 : 28

  return (
    <>
      <SueloMovil pintar={pintar} tamLoseta={24} y={Y_SUELO} rugosidad={0.85} hueco={[L / 2, W / 2]} />
      <instancedMesh key={pts.length} ref={edificios} args={[caja, matEdificio, pts.length]} raycast={sinRayo} />
      {/* Poste y foco comparten semilla: caen en el mismo sitio. */}
      <Esparcidos geometria={farola} material={matVertices} n={nFarolas} zona={zonaFarolas} semilla={17} escala={[1, 1]} />
      <Esparcidos geometria={foco} material={matFoco} n={nFarolas} zona={zonaFarolas} semilla={17} escala={[1, 1]} />
    </>
  )
}
