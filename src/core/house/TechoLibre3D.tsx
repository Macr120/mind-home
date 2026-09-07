import { Suspense, useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { useTexture } from '@react-three/drei'
import type { TechoLibreId } from '../data/db'
import { colorTechoLoseta, getTechoTipo, type TechoTipoId } from './techos'
import { areaConSigno, centroide, esPoligonoConvexo, shapeDePoligono, type PuntoXZ } from './formasLibre'
import { texturaCanvasTeja } from './TechoLoseta'

/** Grosor de la losa plana (el de las losetas de los cuartos). */
const GROSOR = 0.12
/** Lado del patrón de teja procedural, en metros. */
const TILE_TEJA = 1.4
const TEJAS = new Set<string>(['tejas_rojas', 'tejas_oscuras', 'teja_castillo'])

/** El techo no intercepta clics: el toque sigue llegando al suelo (como el piso libre). */
const sinRaycast = () => {}

/** Altura automática (misma receta que TechoForma): la mitad del lado menor, acotada. */
const altoBase = (W: number, D: number) => Math.min(2.6, Math.max(1.0, Math.min(W, D) * 0.5))

type V3 = [number, number, number]

/** Acumula triángulos sin índice, girándolos para que su normal mire hacia `hacia`. */
class Triangulos {
  pos: number[] = []
  agregar(a: V3, b: V3, c: V3, hacia: V3) {
    const ux = b[0] - a[0]
    const uy = b[1] - a[1]
    const uz = b[2] - a[2]
    const vx = c[0] - a[0]
    const vy = c[1] - a[1]
    const vz = c[2] - a[2]
    const nx = uy * vz - uz * vy
    const ny = uz * vx - ux * vz
    const nz = ux * vy - uy * vx
    if (nx * hacia[0] + ny * hacia[1] + nz * hacia[2] < 0) [b, c] = [c, b]
    this.pos.push(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2])
  }
  geometria(): THREE.BufferGeometry {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3))
    g.computeVertexNormals()
    return g
  }
}

/**
 * UV métricas: las caras horizontales o inclinadas proyectan (x, z) y las verticales
 * (faldas, hastiales, cantos) el eje horizontal de la cara y la altura, así la textura
 * repite con `1/tileSize` sin estirarse en ninguna.
 */
function uvMetricas(g0: THREE.BufferGeometry): THREE.BufferGeometry {
  const g = g0.index ? g0.toNonIndexed() : g0
  if (g !== g0) g0.dispose()
  const pos = g.getAttribute('position')
  const uv = new Float32Array(pos.count * 2)
  for (let t = 0; t + 2 < pos.count; t += 3) {
    const ux = pos.getX(t + 1) - pos.getX(t)
    const uy = pos.getY(t + 1) - pos.getY(t)
    const uz = pos.getZ(t + 1) - pos.getZ(t)
    const vx = pos.getX(t + 2) - pos.getX(t)
    const vy = pos.getY(t + 2) - pos.getY(t)
    const vz = pos.getZ(t + 2) - pos.getZ(t)
    const nx = uy * vz - uz * vy
    const ny = uz * vx - ux * vz
    const nz = ux * vy - uy * vx
    const vertical = Math.abs(ny) < 0.5 * Math.hypot(nx, ny, nz)
    // Cara vertical que mira a ±X: se extiende a lo largo de Z (y viceversa).
    const enZ = vertical && Math.abs(nx) > Math.abs(nz)
    for (let i = t; i < t + 3; i++) {
      uv[2 * i] = enZ ? pos.getZ(i) : pos.getX(i)
      uv[2 * i + 1] = vertical ? pos.getY(i) : pos.getZ(i)
    }
  }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2))
  return g
}

/** Losa plana: el polígono extruido `GROSOR` hacia arriba. */
function techoPlano(contorno: PuntoXZ[]): THREE.BufferGeometry {
  const g = new THREE.ExtrudeGeometry(shapeDePoligono(contorno), { depth: GROSOR, bevelEnabled: false })
  g.rotateX(-Math.PI / 2) // la extrusión (+Z del shape) pasa a +Y
  return g
}

/** Tienda/cono/pirámide: una cara por arista hacia el ápice (solo tiene sentido en convexos). */
function techoTienda(contorno: PuntoXZ[], apice: PuntoXZ, alt: number): THREE.BufferGeometry {
  const T = new Triangulos()
  const n = contorno.length
  for (let i = 0; i < n; i++) {
    const a = contorno[i]
    const b = contorno[(i + 1) % n]
    T.agregar([a.x, 0, a.z], [b.x, 0, b.z], [apice.x, alt, apice.z], [0, 1, 0])
  }
  return T.geometria()
}

/** Recorta el polígono al semiplano `dentro` (Sutherland–Hodgman contra la recta v = 0). */
function recortar(poly: PuntoXZ[], v: (p: PuntoXZ) => number, dentro: (x: number) => boolean): PuntoXZ[] {
  const out: PuntoXZ[] = []
  const n = poly.length
  for (let i = 0; i < n; i++) {
    const a = poly[i]
    const b = poly[(i + 1) % n]
    const va = v(a)
    const vb = v(b)
    if (dentro(va)) out.push(a)
    // Cruce estricto de la recta (si un extremo está sobre ella ya entró como vértice).
    if (Math.abs(va) > 1e-6 && Math.abs(vb) > 1e-6 && va * vb < 0) {
      const t = va / (va - vb)
      out.push({ x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t })
    }
  }
  return out
}

/**
 * Faldones: la cara superior se triangula con earcut (como la losa) dando a cada vértice su
 * altura; con caballete se parte antes el polígono por su recta, así cada mitad es un plano
 * exacto y el caballete una arista. Vale para formas cóncavas y asimétricas. Las faldas
 * verticales cierran hasta el alero (y = 0).
 */
function techoFaldones(
  contorno: PuntoXZ[],
  altura: (p: PuntoXZ) => number,
  caballete: ((p: PuntoXZ) => number) | null,
): THREE.BufferGeometry {
  const T = new Triangulos()
  const partes = caballete
    ? [recortar(contorno, caballete, (x) => x <= 0), recortar(contorno, caballete, (x) => x >= 0)]
    : [contorno]
  for (const poly of partes) {
    if (poly.length < 3) continue
    const idx = THREE.ShapeUtils.triangulateShape(poly.map((p) => new THREE.Vector2(p.x, -p.z)), [])
    const v3 = (p: PuntoXZ): V3 => [p.x, altura(p), p.z]
    for (const [i, j, k] of idx) T.agregar(v3(poly[i]), v3(poly[j]), v3(poly[k]), [0, 1, 0])
  }
  const signo = areaConSigno(contorno) >= 0 ? 1 : -1
  const n = contorno.length
  for (let i = 0; i < n; i++) {
    const a = contorno[i]
    const b = contorno[(i + 1) % n]
    const ha = altura(a)
    const hb = altura(b)
    if (ha < 1e-4 && hb < 1e-4) continue
    const fuera: V3 = [signo * (b.z - a.z), 0, -signo * (b.x - a.x)]
    T.agregar([a.x, ha, a.z], [b.x, hb, b.z], [b.x, 0, b.z], fuera)
    T.agregar([a.x, ha, a.z], [b.x, 0, b.z], [a.x, 0, a.z], fuera)
  }
  return T.geometria()
}

/**
 * Geometría del techo sobre un contorno en mundo (alero en y = 0):
 * - plano: losa extruida del polígono;
 * - tienda: abanico hacia un ápice sobre el centroide (en polígonos cóncavos cae fuera o
 *   tapa el patio, así que ahí se pinta la losa plana; el panel deshabilita la opción);
 * - una_agua / dos_aguas: faldones con alturas por vértice (`techoFaldones`).
 */
export function geometriaTechoLibre(
  contorno: PuntoXZ[],
  techo: TechoLibreId,
  alto: number,
  dir: number,
): THREE.BufferGeometry {
  if (techo === 'plano' || (techo === 'tienda' && !esPoligonoConvexo(contorno))) {
    return uvMetricas(techoPlano(contorno))
  }
  let minX = Infinity
  let maxX = -Infinity
  let minZ = Infinity
  let maxZ = -Infinity
  for (const p of contorno) {
    if (p.x < minX) minX = p.x
    if (p.x > maxX) maxX = p.x
    if (p.z < minZ) minZ = p.z
    if (p.z > maxZ) maxZ = p.z
  }
  const W = maxX - minX
  const D = maxZ - minZ
  const h = altoBase(W, D) * alto
  if (techo === 'tienda') return uvMetricas(techoTienda(contorno, centroide(contorno), h))
  const cx = (minX + maxX) / 2
  const cz = (minZ + maxZ) / 2
  const d = ((dir % 4) + 4) % 4
  if (techo === 'una_agua') {
    // Lado alto según `dir`: −X, +X, −Z, +Z (misma semántica que el cobertizo de celda).
    const t = (p: PuntoXZ) =>
      d === 0 ? (maxX - p.x) / W : d === 1 ? (p.x - minX) / W : d === 2 ? (maxZ - p.z) / D : (p.z - minZ) / D
    return uvMetricas(techoFaldones(contorno, (p) => h * Math.min(1, Math.max(0, t(p))), null))
  }
  // Dos aguas: caballete por el centro de la caja, a lo largo de Z (dir par) o de X (impar).
  const ejeX = d % 2 === 0
  const v = (p: PuntoXZ) => (ejeX ? p.x - cx : p.z - cz)
  const semi = (ejeX ? W : D) / 2
  return uvMetricas(techoFaldones(contorno, (p) => h * Math.max(0, 1 - Math.abs(v(p)) / semi), v))
}

type Material = ReturnType<typeof colorTechoLoseta>

interface PropsMesh {
  geo: THREE.BufferGeometry
  /** Altura del alero (tope del muro). */
  y: number
  mat: Material
  map?: THREE.Texture
  /** Semitransparente: en modo Libre el techo de la forma seleccionada no tapa sus handles. */
  fantasma: boolean
  cristal: boolean
}

/** Techo de un recinto libre: losa plana, tienda o faldones con los materiales de techo. */
export function TechoLibre3D({
  contorno,
  techo,
  tipo,
  colorBase,
  alto,
  dir,
  y,
  fantasma = false,
}: {
  /** Contorno del techo en mundo (ya desplazado a la cara exterior del muro). */
  contorno: PuntoXZ[]
  techo: TechoLibreId
  /** Material (TechoTipoId) o null = color liso. */
  tipo: TechoTipoId | null
  /** Color base (el del muro si no se eligió otro): se mezcla con el del material. */
  colorBase: string
  /** Altura relativa (1 = automática). */
  alto: number
  dir: number
  y: number
  fantasma?: boolean
}) {
  const geo = useMemo(() => geometriaTechoLibre(contorno, techo, alto, dir), [contorno, techo, alto, dir])
  useEffect(() => () => geo.dispose(), [geo])
  const conf = getTechoTipo(tipo)
  const mat = colorTechoLoseta(tipo, colorBase)
  const comun: PropsMesh = { geo, y, mat, fantasma, cristal: tipo === 'cristal' }
  if (conf?.textura) {
    return (
      <Suspense fallback={<TechoLibreMesh {...comun} />}>
        <TechoLibreTexturado {...comun} textura={conf.textura} tileSize={conf.tileSize ?? 2} />
      </Suspense>
    )
  }
  if (conf && TEJAS.has(conf.variante)) return <TechoLibreTejas {...comun} />
  return <TechoLibreMesh {...comun} />
}

function TechoLibreMesh({ geo, y, mat, map, fantasma, cristal }: PropsMesh) {
  return (
    <mesh geometry={geo} position={[0, y, 0]} castShadow={!fantasma} receiveShadow raycast={sinRaycast}>
      <meshStandardMaterial
        color={map ? '#ffffff' : mat.color}
        map={map}
        roughness={mat.roughness}
        metalness={mat.metalness}
        emissive={mat.emissive}
        emissiveIntensity={mat.emissiveIntensity}
        transparent={fantasma || cristal}
        opacity={fantasma ? 0.45 : cristal ? 0.6 : 1}
        depthWrite={!fantasma}
        // Fantasma: solo la cara exterior; con las dos, tapa y fondo se suman y se ve el doble de opaco.
        side={fantasma ? THREE.FrontSide : THREE.DoubleSide}
        toneMapped={false}
      />
    </mesh>
  )
}

/** Clona la textura con repetición métrica (las UV van en metros). */
function clonarMetrica(t: THREE.Texture, tileSize: number): THREE.Texture {
  const k = t.clone()
  k.wrapS = k.wrapT = THREE.RepeatWrapping
  k.repeat.set(1 / tileSize, 1 / tileSize)
  k.needsUpdate = true
  return k
}

function TechoLibreTexturado({ textura, tileSize, ...resto }: PropsMesh & { textura: string; tileSize: number }) {
  const base = useTexture(`/textures/${textura}_color.jpg`)
  const map = useMemo(() => clonarMetrica(base, tileSize), [base, tileSize])
  useEffect(() => () => map.dispose(), [map])
  return <TechoLibreMesh {...resto} map={map} />
}

function TechoLibreTejas(props: PropsMesh) {
  const color = props.mat.color
  const map = useMemo(() => {
    const t = texturaCanvasTeja(color)
    t.repeat.set(1 / TILE_TEJA, 1 / TILE_TEJA)
    return t
  }, [color])
  useEffect(() => () => map.dispose(), [map])
  return <TechoLibreMesh {...props} map={map} />
}
