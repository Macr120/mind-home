import { Suspense, useMemo } from 'react'
import * as THREE from 'three'
import { useLoader } from '@react-three/fiber'
import type { TechoTipoId, TechoFormaId, TechoParams } from './techos'
import { colorTechoLoseta, getTechoTipo } from './techos'
import { mezclar } from './temas'

/** Repeticiones de la imagen sobre la forma según el ajuste elegido. */
const AJUSTE_REPEAT: Record<string, number> = { x1: 1, x2: 2, x4: 4 }

/**
 * Techo no plano (o plano inclinado) que cubre TODO el footprint (caja W×H) de un
 * cuarto. Las formas son plantillas base que el usuario ajusta con `params`:
 * - dos_aguas → 1/2/4 faldones (inclinado, dos aguas, pabellón)
 * - abovedado → bóveda con altura y curvatura ajustables
 * - cupula → media esfera con altura ajustable
 * - plano con inclinacion > 0 → un solo faldón inclinado (cobertizo)
 *
 * El material (color/rugosidad/brillo) se deriva del tipo de techo igual que la
 * losa plana. La losa plana sin inclinación se sigue dibujando celda a celda en
 * Room3D (esta pieza solo cubre formas inclinadas/curvas).
 */
export function TechoForma({
  forma,
  params,
  tipo,
  colorCuarto,
  tinte,
  imagen,
  imagenAjuste,
  W,
  H,
  yBase,
  margenN = 0,
  margenS = 0,
  margenO = 0,
  margenE = 0,
  ocultarHastialNeg = false,
  ocultarHastialPos = false,
  atenuado = false,
}: {
  forma: TechoFormaId
  params: TechoParams
  tipo: TechoTipoId | null
  colorCuarto: string
  /** Tinte de color: se mezcla con el color del material. undefined = nativo. */
  tinte?: string
  /** Imagen personalizada (object URL). Si está, se usa como textura. */
  imagen?: string
  /** Repetición de la imagen: 'x1' | 'x2' | 'x4'. */
  imagenAjuste?: string
  /** Ancho (X) y largo (Z) de la caja contenedora del cuarto, en unidades de mundo. */
  W: number
  H: number
  /** Altura (Y) de la base del techo (parte alta de los muros). */
  yBase: number
  /** Margen extra por lado (m) para que el techo cubra la cara exterior del muro. */
  margenN?: number
  margenS?: number
  margenO?: number
  margenE?: number
  /** Omite el hastial del lado −Z/−X (dos aguas) cuando ese muro ya tiene forma "triángulo". */
  ocultarHastialNeg?: boolean
  /** Omite el hastial del lado +Z/+X (dos aguas) cuando ese muro ya tiene forma "triángulo". */
  ocultarHastialPos?: boolean
  atenuado?: boolean
}) {
  const mat = colorTechoLoseta(tipo, colorCuarto)
  if (tinte) mat.color = mezclar(mat.color, tinte, 0.55)
  const esCristal = tipo === 'cristal'
  // La altura se calcula con la caja original (no expandida) para no alterar el perfil.
  const altBase = Math.min(2.6, Math.max(1.0, Math.min(W, H) * 0.5))
  const alt = altBase * (params.altura || 1)
  const dir = ((params.dir % 4) + 4) % 4
  // Caja expandida hasta la cara exterior de los muros (N=−Z, S=+Z, O=−X, E=+X)
  // y desplazamiento del centro cuando la extensión es asimétrica.
  const Wp = W + margenO + margenE
  const Hp = H + margenN + margenS
  const offX = (margenE - margenO) / 2
  const offZ = (margenS - margenN) / 2

  const piezas = (map?: THREE.Texture) => {
    const m: Mat = map ? { ...mat, color: '#ffffff' } : mat
    return (
      <>
        {forma === 'plano' && params.inclinacion > 0 && (
          <Faldones W={Wp} H={Hp} alt={params.inclinacion * Math.min(W, H) * 0.85} aguas={1} dir={dir} mat={m} map={map} cristal={esCristal} atenuado={atenuado} />
        )}
        {forma === 'dos_aguas' && (
          <Faldones
            W={Wp} H={Hp} alt={alt} aguas={params.aguas} dir={dir}
            ocultarHastialNeg={ocultarHastialNeg} ocultarHastialPos={ocultarHastialPos}
            mat={m} map={map} cristal={esCristal} atenuado={atenuado}
          />
        )}
        {forma === 'abovedado' && (
          <Abovedado
            W={Wp} H={Hp} alt={alt} curva={params.curva} dir={dir}
            ocultarHastialNeg={ocultarHastialNeg} ocultarHastialPos={ocultarHastialPos}
            mat={m} map={map} cristal={esCristal} atenuado={atenuado}
          />
        )}
        {forma === 'cupula' && <Cupula W={Wp} H={Hp} alt={alt} mat={m} map={map} cristal={esCristal} atenuado={atenuado} />}
      </>
    )
  }

  const builtinTex = getTechoTipo(tipo)?.textura
  const builtinTileSize = getTechoTipo(tipo)?.tileSize ?? 2
  const esTejaCanvas = tipo === 'tejas_rojas' || tipo === 'tejas_oscuras'

  return (
    <group position={[offX, yBase, offZ]}>
      {imagen ? (
        <Suspense fallback={piezas()}>
          <FormaImagen dataUrl={imagen} ajuste={imagenAjuste}>{piezas}</FormaImagen>
        </Suspense>
      ) : builtinTex ? (
        <Suspense fallback={piezas()}>
          <FormaTextura url={`/textures/${builtinTex}_color.jpg`} tileSize={builtinTileSize} W={Wp} H={Hp}>
            {piezas}
          </FormaTextura>
        </Suspense>
      ) : esTejaCanvas ? (
        <FormaTejas color={mat.color} W={Wp} H={Hp}>
          {piezas}
        </FormaTejas>
      ) : (
        piezas()
      )}
    </group>
  )
}

/** Carga la imagen y entrega la textura lista (tileada) al render de las piezas. */
function FormaImagen({
  dataUrl,
  ajuste,
  children,
}: {
  dataUrl: string
  ajuste?: string
  children: (map: THREE.Texture) => React.ReactNode
}) {
  const base = useLoader(THREE.TextureLoader, dataUrl)
  const map = useMemo(() => {
    const t = base.clone()
    t.needsUpdate = true
    const rep = AJUSTE_REPEAT[ajuste ?? 'x1'] ?? 1
    t.wrapS = t.wrapT = THREE.RepeatWrapping
    t.repeat.set(rep, rep)
    return t
  }, [base, ajuste])
  return <>{children(map)}</>
}

/** Carga una textura incorporada desde /textures/ y la entrega tileada a las piezas. */
function FormaTextura({
  url,
  tileSize,
  W,
  H,
  children,
}: {
  url: string
  tileSize: number
  W: number
  H: number
  children: (map: THREE.Texture) => React.ReactNode
}) {
  const base = useLoader(THREE.TextureLoader, url)
  const map = useMemo(() => {
    const t = base.clone()
    t.needsUpdate = true
    t.wrapS = t.wrapT = THREE.RepeatWrapping
    t.repeat.set(Math.max(1, Math.round(W / tileSize)), Math.max(1, Math.round(H / tileSize)))
    return t
  }, [base, tileSize, W, H])
  return <>{children(map)}</>
}

/** Genera textura canvas de teja y la entrega a las piezas (sin archivo externo). */
function FormaTejas({
  color,
  W,
  H,
  children,
}: {
  color: string
  W: number
  H: number
  children: (map: THREE.Texture) => React.ReactNode
}) {
  const map = useMemo(() => {
    const s = 128
    const cv = document.createElement('canvas')
    cv.width = cv.height = s
    const ctx = cv.getContext('2d')!
    ctx.fillStyle = color
    ctx.fillRect(0, 0, s, s)
    const tw = Math.round(s / 3)
    const th = Math.round(s / 4)
    for (let row = 0; row < 5; row++) {
      const ox = row % 2 === 0 ? 0 : tw / 2
      for (let col = -1; col < 5; col++) {
        const x = Math.round(col * tw + ox)
        const y = row * th
        ctx.fillStyle = 'rgba(255,255,255,0.13)'
        ctx.fillRect(x + 1, y + 1, tw - 2, 3)
        ctx.fillStyle = 'rgba(0,0,0,0.22)'
        ctx.fillRect(x + 1, y + th - 3, tw - 2, 3)
        ctx.fillStyle = 'rgba(0,0,0,0.15)'
        ctx.fillRect(x, y, 1, th)
      }
    }
    const t = new THREE.CanvasTexture(cv)
    t.wrapS = t.wrapT = THREE.RepeatWrapping
    t.repeat.set(Math.max(1, Math.round(W / 1.5)), Math.max(1, Math.round(H / 1.5)))
    return t
  }, [color, W, H])
  return <>{children(map)}</>
}

type Mat = ReturnType<typeof colorTechoLoseta>

function PiezaGeo({
  geo,
  mat,
  map,
  cristal,
  atenuado = false,
}: {
  geo: THREE.BufferGeometry
  mat: Mat
  map?: THREE.Texture
  cristal?: boolean
  atenuado?: boolean
}) {
  return (
    <mesh geometry={geo} castShadow={!atenuado} receiveShadow={!atenuado}>
      <Material mat={mat} map={map} cristal={cristal} atenuado={atenuado} />
    </mesh>
  )
}

function Material({ mat, map, cristal, atenuado = false }: { mat: Mat; map?: THREE.Texture; cristal?: boolean; atenuado?: boolean }) {
  return (
    <meshStandardMaterial
      color={mat.color}
      map={map}
      roughness={mat.roughness}
      metalness={mat.metalness}
      emissive={mat.emissive}
      emissiveIntensity={atenuado ? 0 : mat.emissiveIntensity}
      transparent={cristal || atenuado}
      opacity={atenuado ? 0.16 : cristal ? 0.72 : 1}
      side={THREE.DoubleSide}
      toneMapped={false}
    />
  )
}

type V = [number, number, number]

/** Construye una geometría a partir de caras (triángulos o cuádriláteros). */
function meshGeo(caras: V[][]): THREE.BufferGeometry {
  const pos: number[] = []
  const push = (a: V, b: V, c: V) => pos.push(...a, ...b, ...c)
  for (const c of caras) {
    if (c.length === 3) push(c[0], c[1], c[2])
    else if (c.length === 4) {
      push(c[0], c[1], c[2])
      push(c[0], c[2], c[3])
    }
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  // UV por proyección cenital (XZ): así una imagen de techo se mapea sobre los
  // faldones como vista desde arriba. Sin esto la textura no tendría dónde caer.
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity
  for (let i = 0; i < pos.length; i += 3) {
    minX = Math.min(minX, pos[i]); maxX = Math.max(maxX, pos[i])
    minZ = Math.min(minZ, pos[i + 2]); maxZ = Math.max(maxZ, pos[i + 2])
  }
  const spanX = Math.max(0.001, maxX - minX)
  const spanZ = Math.max(0.001, maxZ - minZ)
  const uv: number[] = []
  for (let i = 0; i < pos.length; i += 3) {
    uv.push((pos[i] - minX) / spanX, (pos[i + 2] - minZ) / spanZ)
  }
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
  g.computeVertexNormals()
  return g
}

/** Faldones (1 = cobertizo, 2 = dos aguas, 4 = pabellón). Hook encapsulado aquí. */
function Faldones({
  W,
  H,
  alt,
  aguas,
  dir,
  ocultarHastialNeg = false,
  ocultarHastialPos = false,
  mat,
  map,
  cristal,
  atenuado = false,
}: {
  W: number
  H: number
  alt: number
  aguas: number
  dir: number
  ocultarHastialNeg?: boolean
  ocultarHastialPos?: boolean
  mat: Mat
  map?: THREE.Texture
  cristal?: boolean
  atenuado?: boolean
}) {
  const geo = useMemo(
    () => construirAguas(W, H, alt, aguas, dir, ocultarHastialNeg, ocultarHastialPos),
    [W, H, alt, aguas, dir, ocultarHastialNeg, ocultarHastialPos],
  )
  return <PiezaGeo geo={geo} mat={mat} map={map} cristal={cristal} atenuado={atenuado} />
}

function construirShed(W: number, H: number, rise: number, dir: number): THREE.BufferGeometry {
  const hx = W / 2
  const hz = H / 2
  // Esquinas base (x,z) en orden A,B,C,D.
  const base: [number, number][] = [
    [-hx, -hz],
    [hx, -hz],
    [hx, hz],
    [-hx, hz],
  ]
  // Altura de cada esquina según el lado alto (dir): 0=-X, 1=+X, 2=-Z, 3=+Z.
  const altoEsquina = ([x, z]: [number, number]): number => {
    if (dir === 0) return x < 0 ? rise : 0
    if (dir === 1) return x > 0 ? rise : 0
    if (dir === 2) return z < 0 ? rise : 0
    return z > 0 ? rise : 0
  }
  const top: V[] = base.map(([x, z]) => [x, altoEsquina([x, z]), z])
  const bot: V[] = base.map(([x, z]) => [x, 0, z])
  const caras: V[][] = [[top[0], top[1], top[2], top[3]]]
  // Muros laterales (varios degeneran a 0 donde no hay altura).
  for (let i = 0; i < 4; i++) {
    const j = (i + 1) % 4
    caras.push([top[i], top[j], bot[j], bot[i]])
  }
  return meshGeo(caras)
}

/**
 * `ocultarNeg`/`ocultarPos` omiten el hastial del lado correspondiente cuando
 * ese borde del cuarto ya tiene un muro con forma "triángulo": el muro hace de
 * hastial (apoya la silueta del techo) y no hace falta duplicar la cara.
 */
function construirAguas(
  W: number,
  H: number,
  alt: number,
  aguas: number,
  dir: number,
  ocultarNeg = false,
  ocultarPos = false,
): THREE.BufferGeometry {
  const hx = W / 2
  const hz = H / 2
  if (aguas === 1) return construirShed(W, H, alt, dir)
  if (aguas === 4) {
    // Pabellón: cuatro faldones que suben al ápice central.
    const P: V = [0, alt, 0]
    const A: V = [-hx, 0, -hz]
    const B: V = [hx, 0, -hz]
    const C: V = [hx, 0, hz]
    const D: V = [-hx, 0, hz]
    return meshGeo([
      [A, B, P],
      [B, C, P],
      [C, D, P],
      [D, A, P],
    ])
  }
  // 2 aguas (dos faldones). Eje del caballete según dir (par = eje mayor).
  const ridgeZ = dir % 2 === 0 ? W >= H : !(W >= H)
  if (ridgeZ) {
    // Caballete a lo largo de Z (x=0).
    const A: V = [-hx, 0, -hz]
    const B: V = [hx, 0, -hz]
    const C: V = [hx, 0, hz]
    const D: V = [-hx, 0, hz]
    const R0: V = [0, alt, -hz]
    const R1: V = [0, alt, hz]
    const caras: V[][] = [
      [B, C, R1, R0], // faldón +X
      [D, A, R0, R1], // faldón −X
    ]
    if (!ocultarNeg) caras.push([A, B, R0]) // hastial −Z
    if (!ocultarPos) caras.push([C, D, R1]) // hastial +Z
    return meshGeo(caras)
  }
  // Caballete a lo largo de X (z=0).
  const A: V = [-hx, 0, -hz]
  const B: V = [hx, 0, -hz]
  const C: V = [hx, 0, hz]
  const D: V = [-hx, 0, hz]
  const R0: V = [-hx, alt, 0]
  const R1: V = [hx, alt, 0]
  const caras: V[][] = [
    [D, C, R1, R0], // faldón +Z
    [B, A, R0, R1], // faldón −Z
  ]
  if (!ocultarNeg) caras.push([A, D, R0]) // hastial −X
  if (!ocultarPos) caras.push([C, B, R1]) // hastial +X
  return meshGeo(caras)
}

/** Bóveda de cañón con altura y curvatura (fracción de arco) ajustables. */
function Abovedado({
  W,
  H,
  alt,
  curva,
  dir,
  ocultarHastialNeg = false,
  ocultarHastialPos = false,
  mat,
  map,
  cristal,
  atenuado = false,
}: {
  W: number
  H: number
  alt: number
  curva: number
  dir: number
  ocultarHastialNeg?: boolean
  ocultarHastialPos?: boolean
  mat: Mat
  map?: THREE.Texture
  cristal?: boolean
  atenuado?: boolean
}) {
  const geo = useMemo(() => {
    const frac = Math.min(1, Math.max(0.35, curva))
    const thetaLength = Math.PI * frac
    // Three.js CylinderGeometry usa x=sin(θ), z=cos(θ). Centramos el arco en θ=0
    // (que tras rotateX queda en la parte SUPERIOR) y barremos ±thetaLength/2 a
    // izquierda y derecha: así los aleros quedan en θ=±thetaLength/2, no en θ=0.
    const thetaStart = -thetaLength / 2
    // openEnded:true para evitar tapas con geometría incorrecta cuando curva<1.
    const g = new THREE.CylinderGeometry(1, 1, 1, 28, 1, true, thetaStart, thetaLength)
    g.rotateX(-Math.PI / 2)
    // Tras rotar: alero en y=cos(PI*frac/2)=sin(PI*(1-frac)/2). Bajamos a y=0
    // y normalizamos la altura del arco a 1 para que `alt` la controle el mesh.
    const yEave = Math.sin((Math.PI - thetaLength) / 2) // = cos(thetaLength/2)
    const span = Math.max(0.001, 1 - yEave)
    g.translate(0, -yEave, 0)
    g.scale(1, 1 / span, 1)
    return g
  }, [curva])

  // span horizontal del arco = cos(thetaStart); escalamos para tocar los muros.
  const frac = Math.min(1, Math.max(0.35, curva))
  const thetaLength = Math.PI * frac
  const halfSpanUnit = Math.cos((Math.PI - thetaLength) / 2)
  const ridgeZ = dir % 2 === 0 ? W >= H : !(W >= H)
  const spanWorld = ridgeZ ? W : H
  const lengthWorld = ridgeZ ? H : W
  const sx = spanWorld / 2 / Math.max(0.001, halfSpanUnit)
  const rotY = ridgeZ ? 0 : Math.PI / 2

  // Hastial: perfil del arco (en plano XY) rellenado, se ubica en cada extremo de la bóveda.
  const hastialGeo = useMemo(() => {
    const f = Math.min(1, Math.max(0.35, curva))
    const tL = Math.PI * f
    const tS = -tL / 2
    const yE = Math.sin((Math.PI - tL) / 2)
    const sN = Math.max(0.001, 1 - yE)
    const hSU = Math.cos((Math.PI - tL) / 2)
    const rZ = dir % 2 === 0 ? W >= H : !(W >= H)
    const sW = rZ ? W : H
    const sX = sW / 2 / Math.max(0.001, hSU)
    const shape = new THREE.Shape()
    shape.moveTo(Math.sin(tS) * sX, ((Math.cos(tS) - yE) / sN) * alt)
    for (let i = 1; i <= 28; i++) {
      const theta = tS + (i / 28) * tL
      shape.lineTo(Math.sin(theta) * sX, ((Math.cos(theta) - yE) / sN) * alt)
    }
    shape.closePath()
    return new THREE.ShapeGeometry(shape)
  }, [curva, alt, W, H, dir])

  return (
    <group>
      <mesh
        geometry={geo}
        scale={[sx, alt, lengthWorld]}
        rotation={[0, rotY, 0]}
        castShadow={!atenuado}
        receiveShadow={!atenuado}
      >
        <Material mat={mat} map={map} cristal={cristal} atenuado={atenuado} />
      </mesh>
      {/* Hastiales (caras laterales) de la bóveda */}
      {ridgeZ ? (
        <>
          {!ocultarHastialNeg && (
            <mesh geometry={hastialGeo} position={[0, 0, -lengthWorld / 2]} castShadow={!atenuado} receiveShadow={!atenuado}>
              <Material mat={mat} map={map} cristal={cristal} atenuado={atenuado} />
            </mesh>
          )}
          {!ocultarHastialPos && (
            <mesh geometry={hastialGeo} position={[0, 0, lengthWorld / 2]} castShadow={!atenuado} receiveShadow={!atenuado}>
              <Material mat={mat} map={map} cristal={cristal} atenuado={atenuado} />
            </mesh>
          )}
        </>
      ) : (
        <>
          {!ocultarHastialNeg && (
            <mesh geometry={hastialGeo} position={[-lengthWorld / 2, 0, 0]} rotation={[0, Math.PI / 2, 0]} castShadow={!atenuado} receiveShadow={!atenuado}>
              <Material mat={mat} map={map} cristal={cristal} atenuado={atenuado} />
            </mesh>
          )}
          {!ocultarHastialPos && (
            <mesh geometry={hastialGeo} position={[lengthWorld / 2, 0, 0]} rotation={[0, Math.PI / 2, 0]} castShadow={!atenuado} receiveShadow={!atenuado}>
              <Material mat={mat} map={map} cristal={cristal} atenuado={atenuado} />
            </mesh>
          )}
        </>
      )}
    </group>
  )
}

/** Cúpula: media esfera escalada + marco de esquinas (rect − elipse) que tapa huecos sin bloquear el interior. */
function Cupula({
  W,
  H,
  alt,
  mat,
  map,
  cristal,
  atenuado = false,
}: {
  W: number
  H: number
  alt: number
  mat: Mat
  map?: THREE.Texture
  cristal?: boolean
  atenuado?: boolean
}) {
  const geo = useMemo(
    () => new THREE.SphereGeometry(1, 28, 16, 0, Math.PI * 2, 0, Math.PI / 2),
    [],
  )
  const baseGeo = useMemo(() => {
    const hw = W / 2
    const hh = H / 2
    // Rectángulo exterior (CCW)
    const shape = new THREE.Shape()
    shape.moveTo(-hw, -hh)
    shape.lineTo(hw, -hh)
    shape.lineTo(hw, hh)
    shape.lineTo(-hw, hh)
    shape.closePath()
    // Agujero elíptico = huella de la base de la cúpula (CW para que earcut lo tome como hueco)
    const hole = new THREE.Path()
    const segs = 48
    for (let i = 0; i <= segs; i++) {
      const a = -((i / segs) * Math.PI * 2)
      if (i === 0) hole.moveTo(Math.cos(a) * hw, Math.sin(a) * hh)
      else hole.lineTo(Math.cos(a) * hw, Math.sin(a) * hh)
    }
    shape.holes.push(hole)
    return new THREE.ShapeGeometry(shape)
  }, [W, H])

  return (
    <group>
      <mesh geometry={geo} scale={[W / 2, alt * 1.25, H / 2]} castShadow={!atenuado} receiveShadow={!atenuado}>
        <Material mat={mat} map={map} cristal={cristal} atenuado={atenuado} />
      </mesh>
      {/* Marco: solo las 4 esquinas (rect − elipse), la cúpula queda visible desde adentro */}
      <mesh geometry={baseGeo} rotation={[-Math.PI / 2, 0, 0]} receiveShadow={!atenuado}>
        <Material mat={mat} map={map} cristal={cristal} atenuado={atenuado} />
      </mesh>
    </group>
  )
}
