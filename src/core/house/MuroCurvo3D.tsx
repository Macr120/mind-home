import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { WALL_H, WALL_T, FORMA_ALTO_TECHO } from './walls'
import { perfilFormaVano, VANO_FORMA_ALTO_DEFAULT, type FormaVanoId } from './murosPuertas'
import { texturaMuro } from './texturasMuro'

/** Tamaño del mosaico de textura en unidades de mundo. */
const TILE = 2.2

/** Altura extra de la silueta a lo largo del arco (t = 0…1). */
function perfilSilueta(
  silueta: 'recta' | 'arco' | 'triangulo',
  t: number,
  extraH: number,
  formaAncho: number,
  formaPosX: number,
): number {
  if (silueta === 'arco') {
    return extraH * Math.sqrt(Math.max(0, 1 - (2 * t - 1) ** 2))
  }
  if (silueta === 'triangulo') {
    const tc = 0.5 + formaPosX * 0.5
    const hw = Math.max(0.04, formaAncho / 2)
    return extraH * Math.max(0, 1 - Math.abs(t - tc) / hw)
  }
  return 0
}

/**
 * Pared curva real (no segmentada): sigue el arco de 90° del muro circular, con remate
 * superior recto, de arco o de pico, y opcionalmente una abertura (puerta al piso o
 * ventana a media altura) cuya forma puede ser cuadrada, circular o triangular. Los bordes
 * del hueco se calculan por columna del arco, de modo que el círculo/triángulo quedan curvos.
 */
export function MuroCurvo3D({
  arcCx,
  arcCz,
  r,
  a0,
  a1,
  baseY,
  alto,
  silueta,
  formaAlto,
  formaAncho,
  formaPosX,
  color,
  tipo,
  fantasma = false,
  puerta = false,
  ventana = false,
  aberturaAncho = 0.5,
  aberturaColor,
  ventForma = 'cuadrado',
  aberturaPosX = 0,
  aberturaPosY = 0.54,
  aberturaAlto,
  vanoForma = 'recta',
  vanoFormaAlto,
  vanoFormaAncho = 1,
  vanoFormaPosX = 0,
  sinPanel = false,
  resaltado = false,
}: {
  arcCx: number
  arcCz: number
  r: number
  a0: number
  a1: number
  baseY: number
  alto: number
  silueta: 'recta' | 'arco' | 'triangulo'
  formaAlto?: number
  formaAncho?: number
  formaPosX?: number
  color: string
  tipo?: string
  fantasma?: boolean
  /** Abertura: puerta (al piso) o ventana (a media altura). */
  puerta?: boolean
  ventana?: boolean
  aberturaAncho?: number
  aberturaColor?: string
  /** Forma del hueco: cuadrado, círculo o triángulo. */
  ventForma?: 'cuadrado' | 'circulo' | 'triangulo'
  /** Posición horizontal de la abertura a lo largo del arco (-1 … 1). */
  aberturaPosX?: number
  /** Centro vertical de la ventana (factor del alto, 0–1). */
  aberturaPosY?: number
  /** Alto de la abertura como factor del alto del muro (0–1). */
  aberturaAlto?: number
  /** Remate del vano de la puerta sobre la hoja: recto, arco o pico. */
  vanoForma?: FormaVanoId
  vanoFormaAlto?: number
  vanoFormaAncho?: number
  vanoFormaPosX?: number
  /** No dibujar el panel del hueco (la puerta sólida animada pone su propia hoja). */
  sinPanel?: boolean
  /** Selección de plano (croquis 2D): mismo brillo ámbar que los muros rectos. */
  resaltado?: boolean
}) {
  const h = WALL_H * alto
  const conHueco = (puerta || ventana) && !fantasma
  const esPuerta = puerta
  const aAlto = aberturaAlto ?? (esPuerta ? 0.85 : 0.5)
  const winCenter = baseY + aberturaPosY * h
  const holeBot = Math.max(baseY, esPuerta ? baseY : winCenter - (aAlto * h) / 2)
  const holeTop = Math.min(baseY + h * 0.98, esPuerta ? baseY + aAlto * h : winCenter + (aAlto * h) / 2)
  const aHalf = aberturaAncho / 2
  // Centro de la abertura en t (acotado para no salirse del arco).
  const uc = 0.5 + aberturaPosX * (0.5 - aHalf)

  /** Intervalo vertical del hueco en la columna t (yt ≤ yb ⇒ sin hueco). */
  const intervalo = useMemo(() => {
    const mid = (holeBot + holeTop) / 2
    const half = (holeTop - holeBot) / 2
    // Remate del vano de puerta (arco/pico) por encima de la hoja, acotado al muro.
    const extraVano =
      esPuerta && vanoForma !== 'recta' ? WALL_H * (vanoFormaAlto ?? VANO_FORMA_ALTO_DEFAULT) : 0
    return (t: number): [number, number] => {
      const un = aHalf > 0 ? (t - uc) / aHalf : 99
      if (!conHueco || Math.abs(un) > 1) return [0, -1]
      if (esPuerta && extraVano > 0) {
        const top = holeTop + extraVano * perfilFormaVano(vanoForma, un, vanoFormaAncho, vanoFormaPosX)
        return [holeBot, Math.min(top, baseY + h * 0.98)]
      }
      if (ventForma === 'circulo') {
        const d = Math.sqrt(Math.max(0, 1 - un * un))
        return [mid - half * d, mid + half * d]
      }
      if (ventForma === 'triangulo') {
        return [holeBot, mid + half * (1 - 2 * Math.abs(un))]
      }
      return [holeBot, holeTop]
    }
  }, [conHueco, ventForma, holeBot, holeTop, aHalf, uc, esPuerta, vanoForma, vanoFormaAlto, vanoFormaAncho, vanoFormaPosX, baseY, h])

  const geo = useMemo(() => {
    const N = 28
    const extraH = silueta === 'recta' ? 0 : WALL_H * (formaAlto ?? FORMA_ALTO_TECHO)
    const anchoPico = formaAncho ?? 0.32
    const posPico = formaPosX ?? 0

    const inner: [number, number][] = []
    const outer: [number, number][] = []
    const topY: number[] = []
    const u: number[] = []
    const yb: number[] = []
    const yt: number[] = []
    const largoArco = r * Math.abs(a1 - a0)
    for (let i = 0; i <= N; i++) {
      const t = i / N
      const ang = a0 + (a1 - a0) * t
      const cos = Math.cos(ang)
      const sin = Math.sin(ang)
      const px = arcCx + r * cos
      const pz = arcCz + r * sin
      inner.push([px - cos * (WALL_T / 2), pz - sin * (WALL_T / 2)])
      outer.push([px + cos * (WALL_T / 2), pz + sin * (WALL_T / 2)])
      topY.push(baseY + h + perfilSilueta(silueta, t, extraH, anchoPico, posPico))
      u.push((largoArco * t) / TILE)
      const [b, tp] = intervalo(t)
      yb.push(b)
      yt.push(tp)
    }
    const hueco = (i: number) => i >= 0 && i <= N && yt[i] > yb[i] + 1e-3

    const pos: number[] = []
    const uv: number[] = []
    const tri = (a: number[], b: number[], c: number[]) => {
      for (const p of [a, b, c]) {
        pos.push(p[0], p[1], p[2])
        uv.push(p[3], p[4])
      }
    }
    const quad = (a: number[], b: number[], c: number[], d: number[]) => {
      tri(a, b, c)
      tri(a, c, d)
    }
    const vC = (y: number) => (y - baseY) / TILE
    // Cara vertical de un borde (outer/inner) con base y tope variables por extremo.
    const caraVert = (E: [number, number][], i: number, yb0: number, yb1: number, yt0: number, yt1: number) => {
      const a = [E[i][0], yb0, E[i][1], u[i], vC(yb0)]
      const b = [E[i][0], yt0, E[i][1], u[i], vC(yt0)]
      const c = [E[i + 1][0], yt1, E[i + 1][1], u[i + 1], vC(yt1)]
      const d = [E[i + 1][0], yb1, E[i + 1][1], u[i + 1], vC(yb1)]
      quad(a, b, c, d)
    }
    // Cara horizontal (remate superior, o canto del hueco) entre i e i+1.
    const caraHoriz = (i: number, yi: number, yj: number) => {
      const oi = [outer[i][0], yi, outer[i][1], u[i], 0]
      const oj = [outer[i + 1][0], yj, outer[i + 1][1], u[i + 1], 0]
      const ii = [inner[i][0], yi, inner[i][1], u[i], WALL_T / TILE]
      const ij = [inner[i + 1][0], yj, inner[i + 1][1], u[i + 1], WALL_T / TILE]
      quad(oi, oj, ij, ii)
    }
    // Jamba (canto vertical del hueco a través del grosor) en el sample i.
    const jamba = (i: number, ylo: number, yhi: number) => {
      const ob = [outer[i][0], ylo, outer[i][1], 0, vC(ylo)]
      const ot = [outer[i][0], yhi, outer[i][1], 0, vC(yhi)]
      const ib = [inner[i][0], ylo, inner[i][1], WALL_T / TILE, vC(ylo)]
      const it = [inner[i][0], yhi, inner[i][1], WALL_T / TILE, vC(yhi)]
      quad(ob, ot, it, ib)
    }

    for (let i = 0; i < N; i++) {
      const h0 = hueco(i)
      const h1 = hueco(i + 1)
      if (h0 || h1) {
        const b0 = h0 ? yb[i] : yb[i + 1]
        const b1 = h1 ? yb[i + 1] : yb[i]
        const t0v = h0 ? yt[i] : yt[i + 1]
        const t1v = h1 ? yt[i + 1] : yt[i]
        // Antepecho (pared bajo el hueco): solo si el hueco no llega al piso.
        if (b0 > baseY + 1e-3 || b1 > baseY + 1e-3) {
          caraVert(outer, i, baseY, baseY, b0, b1)
          caraVert(inner, i, baseY, baseY, b0, b1)
          caraHoriz(i, b0, b1) // canto inferior
        }
        // Dintel (pared sobre el hueco) hasta el remate.
        caraVert(outer, i, t0v, t1v, topY[i], topY[i + 1])
        caraVert(inner, i, t0v, t1v, topY[i], topY[i + 1])
        caraHoriz(i, t0v, t1v) // canto superior del hueco
        caraHoriz(i, topY[i], topY[i + 1]) // remate superior
      } else {
        caraVert(outer, i, baseY, baseY, topY[i], topY[i + 1])
        caraVert(inner, i, baseY, baseY, topY[i], topY[i + 1])
        caraHoriz(i, topY[i], topY[i + 1]) // remate superior
      }
    }
    // Jambas (cantos verticales) en los bordes laterales del hueco.
    for (let i = 0; i <= N; i++) {
      const cur = hueco(i)
      const prev = hueco(i - 1)
      if (cur && !prev) jamba(i, yb[i], yt[i])
      else if (!cur && prev) jamba(i, yb[i - 1], yt[i - 1])
    }
    // Tapas de los extremos.
    const cap = (i: number) => {
      const ob = [outer[i][0], baseY, outer[i][1], 0, 0]
      const ot = [outer[i][0], topY[i], outer[i][1], 0, vC(topY[i])]
      const ib = [inner[i][0], baseY, inner[i][1], WALL_T / TILE, 0]
      const it = [inner[i][0], topY[i], inner[i][1], WALL_T / TILE, vC(topY[i])]
      quad(ob, ot, it, ib)
    }
    cap(0)
    cap(N)

    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
    g.computeVertexNormals()
    return g
  }, [arcCx, arcCz, r, a0, a1, baseY, h, silueta, formaAlto, formaAncho, formaPosX, intervalo])

  // Panel del hueco (hoja de puerta / cristal de ventana): sigue la forma del hueco.
  const panelGeo = useMemo(() => {
    if (!conHueco) return null
    const N = 28
    const yb: number[] = []
    const yt: number[] = []
    for (let i = 0; i <= N; i++) {
      const [b, tp] = intervalo(i / N)
      yb.push(b)
      yt.push(tp)
    }
    const pos: number[] = []
    const tri = (a: number[], b: number[], c: number[]) => pos.push(...a, ...b, ...c)
    const ang = (k: number) => a0 + (a1 - a0) * (k / N)
    const pt = (k: number, y: number) => [arcCx + r * Math.cos(ang(k)), y, arcCz + r * Math.sin(ang(k))]
    for (let i = 0; i < N; i++) {
      if (yt[i] <= yb[i] + 1e-3 || yt[i + 1] <= yb[i + 1] + 1e-3) continue
      const a = pt(i, yb[i])
      const b = pt(i, yt[i])
      const c = pt(i + 1, yt[i + 1])
      const d = pt(i + 1, yb[i + 1])
      tri(a, b, c)
      tri(a, c, d)
    }
    if (pos.length === 0) return null
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
    g.computeVertexNormals()
    return g
  }, [conHueco, arcCx, arcCz, r, a0, a1, intervalo])

  useEffect(() => () => geo.dispose(), [geo])
  useEffect(() => () => panelGeo?.dispose(), [panelGeo])

  const map = useMemo(() => (fantasma ? null : texturaMuro(tipo ?? 'solido')), [tipo, fantasma])
  const colPanel = aberturaColor ?? (esPuerta ? '#b9824f' : '#bcdcff')

  return (
    <>
      <mesh geometry={geo} castShadow={!fantasma} receiveShadow={!fantasma}>
        <meshStandardMaterial
          color={color}
          map={map ?? undefined}
          roughness={0.7}
          metalness={0}
          side={THREE.DoubleSide}
          transparent={fantasma}
          opacity={fantasma ? 0.4 : 1}
          emissive={fantasma ? color : resaltado ? '#f59e0b' : '#000000'}
          emissiveIntensity={fantasma ? 0.4 : resaltado ? 1.1 : 0}
        />
      </mesh>
      {panelGeo && !sinPanel && (
        <mesh geometry={panelGeo}>
          <meshStandardMaterial
            color={colPanel}
            side={THREE.DoubleSide}
            roughness={esPuerta ? 0.6 : 0.2}
            metalness={esPuerta ? 0 : 0.1}
            transparent={!esPuerta}
            opacity={esPuerta ? 1 : 0.45}
          />
        </mesh>
      )}
    </>
  )
}
