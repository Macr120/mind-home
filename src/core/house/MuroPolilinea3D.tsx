import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { WALL_H, WALL_T, FORMA_ALTO_TECHO } from './walls'
import { perfilFormaVano, VANO_FORMA_ALTO_DEFAULT, type FormaVanoId } from './murosPuertas'
import { texturaMuro } from './texturasMuro'
import { vanoEn, type IntervaloVano, type MuestraMuro } from './formasLibre'

/** Tamaño del mosaico de textura en unidades de mundo (el mismo de MuroCurvo3D). */
const TILE = 2.2
/** Paso máximo entre columnas dentro de un vano con forma (círculo, triángulo, arco). */
const PASO_VANO_FORMA = 0.12

/** Altura extra de la silueta a lo largo del contorno (t = 0…1). Copia de MuroCurvo3D. */
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

/** ¿El vano necesita columnas extra (su hueco no es un rectángulo)? */
function vanoConForma(iv: IntervaloVano): boolean {
  const v = iv.vano
  if (v.tipo === 'puerta') return (v.puertaForma ?? 'recta') !== 'recta'
  return (v.ventForma ?? 'cuadrado') !== 'cuadrado'
}

/**
 * Inserta columnas intermedias (interpolando posición y normal) dentro de los vanos con
 * forma: en un tramo recto solo hay muestras cada 0.5 m y un círculo saldría a trompicones.
 */
function densificar(muestras: MuestraMuro[], vanos: IntervaloVano[]): MuestraMuro[] {
  const conForma = vanos.filter(vanoConForma)
  if (!conForma.length) return muestras
  const out: MuestraMuro[] = []
  for (let i = 0; i < muestras.length; i++) {
    const a = muestras[i]
    out.push(a)
    const b = muestras[i + 1]
    if (!b) break
    const iv = conForma.find((v) => a.s >= v.s0 - 1e-6 && b.s <= v.s1 + 1e-6)
    if (!iv) continue
    const n = Math.ceil((b.s - a.s) / PASO_VANO_FORMA)
    for (let k = 1; k < n; k++) {
      const t = k / n
      out.push({
        x: a.x + (b.x - a.x) * t,
        z: a.z + (b.z - a.z) * t,
        nx: a.nx + (b.nx - a.nx) * t,
        nz: a.nz + (b.nz - a.nz) * t,
        s: a.s + (b.s - a.s) * t,
      })
    }
  }
  return out
}

/**
 * Muro de una forma LIBRE en una sola malla: sigue la polilínea/curva muestreada
 * (`muestrasMuro`), con remate recto/arco/pico a lo largo del contorno y los huecos de sus
 * vanos (puertas al piso, ventanas a media altura, con forma cuadrada/circular/triangular).
 * Generalización de `MuroCurvo3D`: los bordes se calculan por columna, así que los huecos
 * quedan bien también en tramos curvos. La hoja de puerta la pone `MuroLibrePuerta3D`;
 * aquí solo se pone el cristal de las ventanas.
 */
export function MuroPolilinea3D({
  muestras,
  L,
  cerrada,
  vanos,
  baseY,
  alto,
  silueta,
  formaAlto,
  formaAncho,
  formaPosX,
  color,
  tipo,
  resaltado = false,
  fantasma = false,
}: {
  /** Muestras del contorno con normal ya ingleteada (borde = p ± n·WALL_T/2). */
  muestras: MuestraMuro[]
  /** Longitud total del contorno (metros). */
  L: number
  /** Contorno cerrado: la malla se cierra sobre sí misma y no lleva tapas. */
  cerrada: boolean
  vanos: IntervaloVano[]
  baseY: number
  /** Factor de WALL_H. */
  alto: number
  silueta: 'recta' | 'arco' | 'triangulo'
  formaAlto?: number
  formaAncho?: number
  formaPosX?: number
  color: string
  /** TipoMuroId → textura de canvas (solido = sin textura). */
  tipo?: string
  /** Selección/hover en el editor: brillo ámbar. */
  resaltado?: boolean
  /** Previsualización translúcida (sin huecos). */
  fantasma?: boolean
}) {
  const h = WALL_H * alto

  const datos = useMemo(() => {
    const cols = fantasma ? muestras : densificar(muestras, vanos)
    const N = cols.length - 1
    if (N < 1) return null
    const extraH = silueta === 'recta' ? 0 : WALL_H * (formaAlto ?? FORMA_ALTO_TECHO)
    const anchoPico = formaAncho ?? 0.32
    const posPico = formaPosX ?? 0
    const topMax = baseY + h * 0.98

    // Intervalo vertical del hueco en la columna de longitud de arco s (yt ≤ yb ⇒ sin hueco).
    const intervalo = (s: number): [number, number, IntervaloVano | null] => {
      if (fantasma) return [0, -1, null]
      const iv = vanoEn(vanos, s)
      if (!iv) return [0, -1, null]
      const v = iv.vano
      const half = (iv.s1 - iv.s0) / 2
      const un = half > 0 ? Math.max(-1, Math.min(1, (s - iv.sc) / half)) : 0
      if (v.tipo === 'puerta') {
        const top = baseY + (v.puertaAlto ?? 0.85) * h
        const forma = (v.puertaForma ?? 'recta') as FormaVanoId
        if (forma !== 'recta') {
          const extra = WALL_H * VANO_FORMA_ALTO_DEFAULT * perfilFormaVano(forma, un, 1, 0)
          return [baseY, Math.min(top + extra, topMax), iv]
        }
        return [baseY, Math.min(top, topMax), iv]
      }
      const centro = baseY + (v.ventPosY ?? 0.54) * h
      const media = ((v.ventAlto ?? 0.5) * h) / 2
      const bot = Math.max(baseY, centro - media)
      const top = Math.min(topMax, centro + media)
      const mid = (bot + top) / 2
      const hm = (top - bot) / 2
      const forma = v.ventForma ?? 'cuadrado'
      if (forma === 'circulo') {
        const d = Math.sqrt(Math.max(0, 1 - un * un))
        return [mid - hm * d, mid + hm * d, iv]
      }
      if (forma === 'triangulo') return [bot, mid + hm * (1 - 2 * Math.abs(un)), iv]
      return [bot, top, iv]
    }

    const inner: [number, number][] = []
    const outer: [number, number][] = []
    const topY: number[] = []
    const u: number[] = []
    const yb: number[] = []
    const yt: number[] = []
    const ivCol: (IntervaloVano | null)[] = []
    for (let i = 0; i <= N; i++) {
      const m = cols[i]
      const ox = m.nx * (WALL_T / 2)
      const oz = m.nz * (WALL_T / 2)
      outer.push([m.x + ox, m.z + oz])
      inner.push([m.x - ox, m.z - oz])
      topY.push(baseY + h + perfilSilueta(silueta, L > 0 ? m.s / L : 0, extraH, anchoPico, posPico))
      u.push(m.s / TILE)
      const [b, tp, iv] = intervalo(m.s)
      yb.push(b)
      yt.push(tp)
      ivCol.push(iv)
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
    // Jamba (canto vertical del hueco a través del grosor) en la columna i.
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
    // Jambas (cantos verticales) en los bordes laterales de cada hueco.
    for (let i = 0; i <= N; i++) {
      const cur = hueco(i)
      const prev = hueco(i - 1)
      if (cur && !prev) jamba(i, yb[i], yt[i])
      else if (!cur && prev) jamba(i, yb[i - 1], yt[i - 1])
    }
    // Tapas de los extremos: solo en muros abiertos (el cerrado se une consigo mismo).
    if (!cerrada) {
      const cap = (i: number) => {
        const ob = [outer[i][0], baseY, outer[i][1], 0, 0]
        const ot = [outer[i][0], topY[i], outer[i][1], 0, vC(topY[i])]
        const ib = [inner[i][0], baseY, inner[i][1], WALL_T / TILE, 0]
        const it = [inner[i][0], topY[i], inner[i][1], WALL_T / TILE, vC(topY[i])]
        quad(ob, ot, it, ib)
      }
      cap(0)
      cap(N)
    }

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
    geo.computeVertexNormals()

    // Cristal de las ventanas, sobre el eje del muro y con la forma del hueco; una
    // geometría por color para poder dar a cada ventana su tono.
    const porColor = new Map<string, number[]>()
    for (let i = 0; i < N; i++) {
      const iv = ivCol[i]
      if (!iv || iv.vano.tipo !== 'ventana' || !hueco(i) || !hueco(i + 1) || ivCol[i + 1] !== iv) continue
      const c = iv.vano.color ?? '#bcdcff'
      let arr = porColor.get(c)
      if (!arr) {
        arr = []
        porColor.set(c, arr)
      }
      const p0 = cols[i]
      const p1 = cols[i + 1]
      arr.push(
        p0.x, yb[i], p0.z, p0.x, yt[i], p0.z, p1.x, yt[i + 1], p1.z,
        p0.x, yb[i], p0.z, p1.x, yt[i + 1], p1.z, p1.x, yb[i + 1], p1.z,
      )
    }
    const paneles = [...porColor.entries()].map(([c, arr]) => {
      const g = new THREE.BufferGeometry()
      g.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3))
      g.computeVertexNormals()
      return { color: c, geo: g }
    })
    return { geo, paneles }
  }, [muestras, L, cerrada, vanos, baseY, h, silueta, formaAlto, formaAncho, formaPosX, fantasma])

  useEffect(
    () => () => {
      datos?.geo.dispose()
      datos?.paneles.forEach((p) => p.geo.dispose())
    },
    [datos],
  )

  const map = useMemo(() => (fantasma ? null : texturaMuro(tipo ?? 'solido')), [tipo, fantasma])
  if (!datos) return null

  return (
    <>
      <mesh geometry={datos.geo} castShadow={!fantasma} receiveShadow={!fantasma}>
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
      {datos.paneles.map((p) => (
        <mesh key={p.color} geometry={p.geo}>
          <meshStandardMaterial
            color={p.color}
            side={THREE.DoubleSide}
            roughness={0.2}
            metalness={0.1}
            transparent
            opacity={0.45}
          />
        </mesh>
      ))}
    </>
  )
}
