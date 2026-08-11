import { memo, Suspense, useEffect, useMemo } from 'react'
import { useLoader } from '@react-three/fiber'
import { CanvasTexture, RepeatWrapping, TextureLoader, type BufferGeometry, type Texture } from 'three'
import type { TechoTipoId } from './techos'
import { colorTechoLoseta, getTechoTipo } from './techos'
import { mezclar } from './temas'
import { SIZE } from './walls'
import {
  esFormaCuadrada,
  geometriaTechoCaja3D,
  geometriaTechoLoseta3D,
  FORMA_LOSETA_DEFAULT,
  type CeldaFormaLoseta,
  type HuecoLosa,
} from './formasLoseta'

const GROSOR = 0.12
/** Lado de la loseta de techo (misma rendija que el piso): SIZE es mutable, calcular al usar. */
const lado = () => SIZE - 0.12

/** Canvas procedural para patrones de teja (tejas_rojas, tejas_oscuras, teja_castillo). */
function texturaCanvasTeja(color: string): CanvasTexture {
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
  const tex = new CanvasTexture(cv)
  tex.wrapS = tex.wrapT = RepeatWrapping
  return tex
}

/**
 * Caja de la losa según el margen (m) de cada lado, MEDIDO DESDE EL EJE de la
 * celda (la línea de la rejilla, donde se asienta el muro):
 *  - `+WALL_T/2` (fachada): sobresale hasta la cara exterior del muro, para que
 *    el techo coincida con el muro y no quede borde gris descubierto.
 *  - `0` (linde con otro cuarto): termina justo en el eje, donde se encuentra
 *    con el techo del vecino sin solaparse.
 *  - `−INSET` (entre losas del mismo techo): deja la rendija decorativa.
 */
function cajaLoseta(mN: number, mS: number, mO: number, mE: number) {
  const xmin = -(SIZE / 2 + mO)
  const xmax = SIZE / 2 + mE
  const zmin = -(SIZE / 2 + mN)
  const zmax = SIZE / 2 + mS
  return { w: xmax - xmin, d: zmax - zmin, ox: (xmin + xmax) / 2, oz: (zmin + zmax) / 2 }
}

/** Repeticiones de la imagen por losa según el ajuste elegido. */
const AJUSTE_REPEAT: Record<string, number> = { x1: 1, x2: 2, x4: 4 }

/**
 * Geometría de la caja de la losa: caja lisa o, si un ascenso la atraviesa, perforada.
 * Los huecos vienen en coordenadas de la CELDA; (ox,oz) es lo que los márgenes desplazan
 * el centro de la caja respecto a ella.
 */
function GeoCaja({
  w,
  d,
  ox = 0,
  oz = 0,
  huecos,
}: {
  w: number
  d: number
  ox?: number
  oz?: number
  huecos?: HuecoLosa[] | null
}) {
  const geo = useMemo(
    () =>
      huecos?.length
        ? geometriaTechoCaja3D(w, d, GROSOR, huecos.map((h) => ({ x: h.x - ox, z: h.z - oz, r: h.r })))
        : null,
    [w, d, ox, oz, huecos],
  )
  useEffect(() => () => geo?.dispose(), [geo])
  if (!geo) return <boxGeometry args={[w, GROSOR, d]} />
  return <primitive object={geo} attach="geometry" />
}

function Mat({
  color,
  roughness,
  metalness,
  emissive,
  emissiveIntensity,
  transparent,
  opacity,
  map,
  atenuado = false,
}: {
  color: string
  roughness: number
  metalness: number
  emissive: string
  emissiveIntensity: number
  transparent?: boolean
  opacity?: number
  map?: Texture
  atenuado?: boolean
}) {
  return (
    <meshStandardMaterial
      color={map ? '#ffffff' : color}
      map={map}
      roughness={roughness}
      metalness={metalness}
      emissive={emissive}
      emissiveIntensity={atenuado ? 0 : emissiveIntensity}
      transparent={transparent || atenuado}
      opacity={atenuado ? 0.16 : opacity ?? 1}
      toneMapped={false}
    />
  )
}

/** Losa con textura de archivo incorporada (ruta relativa a /textures/). */
function LosetaTex({
  textura,
  tileSize,
  color,
  roughness,
  metalness,
  emissive,
  emissiveIntensity,
  w,
  d,
  ox,
  oz,
  atenuado,
  huecos,
}: {
  textura: string
  tileSize: number
  color: string
  roughness: number
  metalness: number
  emissive: string
  emissiveIntensity: number
  w: number
  d: number
  ox: number
  oz: number
  atenuado: boolean
  huecos?: HuecoLosa[] | null
}) {
  const base = useLoader(TextureLoader, `/textures/${textura}_color.jpg`)
  const map = useMemo(() => {
    const t = base.clone()
    t.needsUpdate = true
    t.wrapS = t.wrapT = RepeatWrapping
    t.repeat.set(Math.max(1, w / tileSize), Math.max(1, d / tileSize))
    return t
  }, [base, tileSize, w, d])
  return (
    <mesh castShadow={!atenuado} receiveShadow={!atenuado}>
      <GeoCaja w={w} d={d} ox={ox} oz={oz} huecos={huecos} />
      <Mat
        color={color}
        map={map}
        roughness={roughness}
        metalness={metalness}
        emissive={emissive}
        emissiveIntensity={emissiveIntensity}
        atenuado={atenuado}
      />
    </mesh>
  )
}

/** Losa con textura canvas procedural de teja (tejas_rojas / tejas_oscuras / teja_castillo). */
function LosetaCanvas({
  color,
  roughness,
  w,
  d,
  ox,
  oz,
  atenuado,
  huecos,
}: {
  color: string
  roughness: number
  w: number
  d: number
  ox: number
  oz: number
  atenuado: boolean
  huecos?: HuecoLosa[] | null
}) {
  const map = useMemo(() => {
    const t = texturaCanvasTeja(color).clone()
    t.needsUpdate = true
    t.repeat.set(Math.max(1, w / 1.5), Math.max(1, d / 1.5))
    return t
  }, [color, w, d])
  return (
    <mesh castShadow={!atenuado} receiveShadow={!atenuado}>
      <GeoCaja w={w} d={d} ox={ox} oz={oz} huecos={huecos} />
      <Mat
        color={color}
        map={map}
        roughness={roughness}
        metalness={0}
        emissive="#000000"
        emissiveIntensity={0}
        atenuado={atenuado}
      />
    </mesh>
  )
}

/** Losa de techo con imagen personalizada (textura subida por el usuario). */
function LosetaImagen({
  dataUrl,
  ajuste,
  w,
  d,
  ox,
  oz,
  atenuado,
  huecos,
}: {
  dataUrl: string
  ajuste?: string
  w: number
  d: number
  ox: number
  oz: number
  atenuado: boolean
  huecos?: HuecoLosa[] | null
}) {
  const base = useLoader(TextureLoader, dataUrl)
  const map = useMemo(() => {
    const t = base.clone()
    t.needsUpdate = true
    const rep = AJUSTE_REPEAT[ajuste ?? 'x1'] ?? 1
    t.wrapS = t.wrapT = RepeatWrapping
    t.repeat.set(rep, rep)
    return t
  }, [base, ajuste])
  return (
    <mesh castShadow={!atenuado} receiveShadow={!atenuado}>
      <GeoCaja w={w} d={d} ox={ox} oz={oz} huecos={huecos} />
      <Mat
        color="#ffffff"
        roughness={0.75}
        metalness={0}
        emissive="#000000"
        emissiveIntensity={0}
        map={map}
        atenuado={atenuado}
      />
    </mesh>
  )
}

/** Filas de tejas en relieve. */
function Tejas({ color, filas = 2 }: { color: string; filas?: number }) {
  const paso = lado() / (filas * 2 + 1)
  return (
    <>
      {Array.from({ length: filas * 2 }, (_, i) => {
        const row = Math.floor(i / 2)
        const col = i % 2
        const x = (col - 0.5) * paso * 1.6
        const z = (row - (filas - 1) / 2) * paso * 1.8
        return (
          <mesh
            key={i}
            position={[x, GROSOR * 0.55, z]}
            rotation={[0.15, 0, col === 0 ? 0.08 : -0.08]}
          >
            <boxGeometry args={[paso * 1.4, 0.06, paso * 0.9]} />
            <meshStandardMaterial color={color} roughness={0.88} toneMapped={false} />
          </mesh>
        )
      })}
    </>
  )
}

/** Líneas de panel (metal / neón / orbital). */
function LineasPanel({
  color,
  emissive,
  inten,
  count = 4,
}: {
  color: string
  emissive: string
  inten: number
  count?: number
}) {
  const paso = lado() / (count + 1)
  return (
    <>
      {Array.from({ length: count }, (_, i) => {
        const z = (i - (count - 1) / 2) * paso
        return (
          <mesh key={i} position={[0, GROSOR * 0.52, z]}>
            <boxGeometry args={[lado() * 0.92, 0.025, 0.04]} />
            <meshStandardMaterial
              color={color}
              emissive={emissive}
              emissiveIntensity={inten}
              toneMapped={false}
            />
          </mesh>
        )
      })}
    </>
  )
}

/** Montículos de paja o nieve. */
function Bultos({ color, n = 6, alto = 0.08 }: { color: string; n?: number; alto?: number }) {
  return (
    <>
      {Array.from({ length: n }, (_, i) => {
        const a = (i / n) * Math.PI * 2
        const r = lado() * 0.22 + ((i * 3) % 4) * 0.08
        return (
          <mesh
            key={i}
            position={[Math.cos(a) * r, GROSOR * 0.5 + alto * 0.5, Math.sin(a) * r]}
          >
            <coneGeometry args={[0.12, alto, 5]} />
            <meshStandardMaterial color={color} roughness={0.9} toneMapped={false} />
          </mesh>
        )
      })}
    </>
  )
}

function Decoracion({ variante, mat }: { variante: TechoTipoId; mat: ReturnType<typeof colorTechoLoseta> }) {
  switch (variante) {
    case 'tejas_rojas':
    case 'tejas_oscuras':
    case 'teja_castillo':
      return <Tejas color={mat.color} />
    case 'metal':
      return <LineasPanel color="#94a3b8" emissive="#000000" inten={0} count={5} />
    case 'paja':
      return <Bultos color="#eab308" n={8} alto={0.1} />
    case 'panel_orbital':
      return (
        <group>
          <LineasPanel color="#0f172a" emissive={mat.emissive} inten={mat.emissiveIntensity} count={3} />
          <mesh position={[0, GROSOR * 0.55, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.15, 0.22, 12]} />
            <meshStandardMaterial color={mat.emissive} emissive={mat.emissive} emissiveIntensity={0.6} toneMapped={false} />
          </mesh>
        </group>
      )
    case 'neon_techo':
      return <LineasPanel color={mat.color} emissive={mat.emissive} inten={mat.emissiveIntensity} count={4} />
    case 'madera_sol':
      return <LineasPanel color={mat.color} emissive="#000000" inten={0} count={6} />
    case 'nieve_techo':
      return <Bultos color="#f8fafc" n={7} alto={0.06} />
    case 'cristal':
      return null
    default:
      return null
  }
}

/**
 * Una losa de techo (por celda del cuarto o terraza caminable). Memoizada: sus props
 * son escalares/estables, y re-renderizar el cuarto no reconstruye cada losa.
 */
export const TechoLoseta = memo(function TechoLoseta({
  tipo,
  colorCuarto,
  tinte,
  imagen,
  imagenAjuste,
  y = 0,
  lx,
  lz,
  mN = 0,
  mS = 0,
  mO = 0,
  mE = 0,
  atenuado = false,
  formaLoseta,
  subformas,
  huecos,
}: {
  tipo: TechoTipoId | null
  colorCuarto: string
  /** Tinte de color: se mezcla con el color del material. undefined = nativo. */
  tinte?: string
  /** Imagen personalizada (object URL). Si está, reemplaza el material. */
  imagen?: string
  /** Repetición de la imagen: 'x1' | 'x2' | 'x4'. */
  imagenAjuste?: string
  y?: number
  lx: number
  lz: number
  /** Margen de cada lado desde el eje de la celda (ver `cajaLoseta`). */
  mN?: number
  mS?: number
  mO?: number
  mE?: number
  /** Cuarto vecino en edición: mismo aspecto tenue que paredes/piso. */
  atenuado?: boolean
  /** Triángulo, cuarto de círculo, etc. Si no es cuadrado, ignora márgenes de caja. */
  formaLoseta?: CeldaFormaLoseta
  /** Recortes finos por cuadrante (NO,NE,SO,SE): losa con esquinas recortadas. */
  subformas?: (CeldaFormaLoseta | undefined)[] | null
  /** Huecos que atraviesan la losa (ascensos), en coordenadas locales de la celda. */
  huecos?: HuecoLosa[] | null
}) {
  const conf = getTechoTipo(tipo)
  const mat = colorTechoLoseta(tipo, colorCuarto)
  if (tinte) mat.color = mezclar(mat.color, tinte, 0.55)
  const variante = conf?.variante ?? 'plano_gris'
  const esCristal = variante === 'cristal'
  const formaCuadrada = esFormaCuadrada(formaLoseta)

  if ((!formaCuadrada && formaLoseta) || subformas) {
    return (
      <TechoLosetaForma
        formaLoseta={formaLoseta ?? FORMA_LOSETA_DEFAULT}
        subformas={subformas}
        lx={lx}
        lz={lz}
        y={y}
        tipo={tipo}
        mat={mat}
        esCristal={esCristal}
        imagen={imagen}
        imagenAjuste={imagenAjuste}
        atenuado={atenuado}
        huecos={huecos}
      />
    )
  }

  const caja = cajaLoseta(mN, mS, mO, mE)
  const pos: [number, number, number] = [lx + caja.ox, y, lz + caja.oz]

  const fallbackBase = (
    <mesh>
      <boxGeometry args={[caja.w, GROSOR, caja.d]} />
      <Mat {...mat} atenuado={atenuado} />
    </mesh>
  )

  // Imagen personalizada: reemplaza el material (sin decoración procedural).
  if (imagen)
    return (
      <group position={pos}>
        <Suspense fallback={fallbackBase}>
          <LosetaImagen
            dataUrl={imagen}
            ajuste={imagenAjuste}
            w={caja.w}
            d={caja.d}
            ox={caja.ox}
            oz={caja.oz}
            atenuado={atenuado}
            huecos={huecos}
          />
        </Suspense>
      </group>
    )

  // Textura de archivo incorporada: usa imagen de /textures/ como mapa de color.
  if (conf?.textura)
    return (
      <group position={pos}>
        <Suspense fallback={fallbackBase}>
          <LosetaTex
            textura={conf.textura}
            tileSize={conf.tileSize ?? 2}
            color={mat.color}
            roughness={mat.roughness}
            metalness={mat.metalness}
            emissive={mat.emissive}
            emissiveIntensity={mat.emissiveIntensity}
            w={caja.w}
            d={caja.d}
            ox={caja.ox}
            oz={caja.oz}
            atenuado={atenuado}
            huecos={huecos}
          />
        </Suspense>
      </group>
    )

  // Tejas con textura canvas procedural + decoración 3D encima.
  const esTejaCanvas = variante === 'tejas_rojas' || variante === 'tejas_oscuras'
  if (esTejaCanvas)
    return (
      <group position={pos}>
        <LosetaCanvas
          color={mat.color}
          roughness={mat.roughness}
          w={caja.w}
          d={caja.d}
          ox={caja.ox}
          oz={caja.oz}
          atenuado={atenuado}
          huecos={huecos}
        />
        {!atenuado && <Decoracion variante={variante} mat={mat} />}
      </group>
    )

  return (
    <group position={pos}>
      <mesh castShadow={!atenuado} receiveShadow={!atenuado}>
        <GeoCaja w={caja.w} d={caja.d} ox={caja.ox} oz={caja.oz} huecos={huecos} />
        <Mat
          {...mat}
          transparent={esCristal}
          opacity={esCristal ? 0.72 : 1}
          atenuado={atenuado}
        />
      </mesh>
      {!atenuado && tipo && <Decoracion variante={variante} mat={mat} />}
    </group>
  )
})

/** Loseta de techo con forma no rectangular (triángulo, cuarto de círculo). */
function TechoLosetaForma({
  formaLoseta,
  subformas,
  lx,
  lz,
  y = 0,
  tipo,
  mat,
  esCristal,
  imagen,
  imagenAjuste,
  atenuado,
  huecos,
}: {
  formaLoseta: CeldaFormaLoseta
  subformas?: (CeldaFormaLoseta | undefined)[] | null
  lx: number
  lz: number
  y?: number
  tipo: TechoTipoId | null
  mat: ReturnType<typeof colorTechoLoseta>
  esCristal: boolean
  imagen?: string
  imagenAjuste?: string
  atenuado: boolean
  huecos?: HuecoLosa[] | null
}) {
  const geometry = useMemo(
    () => geometriaTechoLoseta3D(formaLoseta, lado(), GROSOR, subformas, huecos),
    [formaLoseta, subformas, huecos],
  )

  useEffect(() => () => geometry.dispose(), [geometry])

  const pos: [number, number, number] = [lx, y, lz]

  if (imagen) {
    return (
      <group position={pos}>
        <Suspense fallback={null}>
          <LosetaImagenForma
            dataUrl={imagen}
            ajuste={imagenAjuste}
            geometry={geometry}
            atenuado={atenuado}
          />
        </Suspense>
      </group>
    )
  }

  const conf = getTechoTipo(tipo)
  if (conf?.textura) {
    return (
      <group position={pos}>
        <Suspense fallback={null}>
          <LosetaTexForma
            textura={conf.textura}
            tileSize={conf.tileSize ?? 2}
            color={mat.color}
            roughness={mat.roughness}
            metalness={mat.metalness}
            emissive={mat.emissive}
            emissiveIntensity={mat.emissiveIntensity}
            geometry={geometry}
            atenuado={atenuado}
          />
        </Suspense>
      </group>
    )
  }

  return (
    <mesh castShadow={!atenuado} receiveShadow={!atenuado} position={pos} geometry={geometry}>
      <Mat
        {...mat}
        transparent={esCristal}
        opacity={esCristal ? 0.72 : 1}
        atenuado={atenuado}
      />
    </mesh>
  )
}

function LosetaImagenForma({
  dataUrl,
  ajuste,
  geometry,
  atenuado,
}: {
  dataUrl: string
  ajuste?: string
  geometry: BufferGeometry
  atenuado: boolean
}) {
  const base = useLoader(TextureLoader, dataUrl)
  const map = useMemo(() => {
    const t = base.clone()
    t.needsUpdate = true
    const rep = AJUSTE_REPEAT[ajuste ?? 'x1'] ?? 1
    t.wrapS = t.wrapT = RepeatWrapping
    t.repeat.set(rep, rep)
    return t
  }, [base, ajuste])
  return (
    <mesh castShadow={!atenuado} receiveShadow={!atenuado} geometry={geometry}>
      <Mat
        color="#ffffff"
        roughness={0.75}
        metalness={0}
        emissive="#000000"
        emissiveIntensity={0}
        map={map}
        atenuado={atenuado}
      />
    </mesh>
  )
}

function LosetaTexForma({
  textura,
  tileSize,
  color,
  roughness,
  metalness,
  emissive,
  emissiveIntensity,
  geometry,
  atenuado,
}: {
  textura: string
  tileSize: number
  color: string
  roughness: number
  metalness: number
  emissive: string
  emissiveIntensity: number
  geometry: BufferGeometry
  atenuado: boolean
}) {
  const base = useLoader(TextureLoader, `/textures/${textura}_color.jpg`)
  const map = useMemo(() => {
    const t = base.clone()
    t.needsUpdate = true
    t.wrapS = t.wrapT = RepeatWrapping
    t.repeat.set(Math.max(1, lado() / tileSize), Math.max(1, lado() / tileSize))
    return t
  }, [base, tileSize])
  return (
    <mesh castShadow={!atenuado} receiveShadow={!atenuado} geometry={geometry}>
      <Mat
        color={color}
        map={map}
        roughness={roughness}
        metalness={metalness}
        emissive={emissive}
        emissiveIntensity={emissiveIntensity}
        atenuado={atenuado}
      />
    </mesh>
  )
}
