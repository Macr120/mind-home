import { Suspense, useMemo, useEffect } from 'react'
import { useTexture } from '@react-three/drei'
import { useLoader } from '@react-three/fiber'
import { type ThreeEvent } from '@react-three/fiber'
import { CanvasTexture, RepeatWrapping, Texture, TextureLoader } from 'three'
import { SIZE } from './walls'
import type { PisoTipo } from './pisos'
import type { CeldaFormaLoseta } from './formasLoseta'
import { esFormaCuadrada, geometriaLoseta3D } from './formasLoseta'

const TILE = SIZE - 0.1

function meshLosetaProps(
  lx: number,
  lz: number,
  formaLoseta: CeldaFormaLoseta | undefined,
  modo: 'solido' | 'plano',
): { position: [number, number, number]; rotation?: [number, number, number] } {
  if (esFormaCuadrada(formaLoseta)) {
    if (modo === 'solido') return { position: [lx, 0.1, lz] }
    return { position: [lx, 0.11, lz], rotation: [-Math.PI / 2, 0, 0] }
  }
  if (modo === 'solido') {
    if (esFormaCuadrada(formaLoseta)) return { position: [lx, 0.1, lz] }
    return { position: [lx, 0.11, lz], rotation: [-Math.PI / 2, 0, 0] }
  }
  return { position: [lx, 0.11, lz], rotation: [-Math.PI / 2, 0, 0] }
}

function GeometriaLoseta({
  formaLoseta,
  modo,
  tile = TILE,
}: {
  formaLoseta?: CeldaFormaLoseta
  modo: 'solido' | 'plano'
  tile?: number
}) {
  const geometry = useMemo(() => {
    if (esFormaCuadrada(formaLoseta)) return null
    return geometriaLoseta3D(formaLoseta!, tile, modo)
  }, [formaLoseta, modo, tile])

  useEffect(() => {
    return () => {
      geometry?.dispose()
    }
  }, [geometry])

  if (esFormaCuadrada(formaLoseta)) {
    if (modo === 'solido') return <boxGeometry args={[tile, 0.2, tile]} />
    return <planeGeometry args={[tile, tile]} />
  }

  return <primitive object={geometry!} attach="geometry" />
}

/** Tipos de piso con patrón procedural (sin imagen). El patrón se genera en canvas. */
const PROC_TIPOS = ['mosaico', 'ajedrez', 'grid_neon'] as const
/** Período del patrón en unidades de mundo (para el tiling). */
const PROC_PERIODO: Record<string, number> = { mosaico: 1.8, ajedrez: 3.6, grid_neon: 2 }

const procCache: Record<string, Texture> = {}

/** Genera (y cachea) la textura de canvas con el patrón base, en tonos neutros para teñir. */
function texturaProc(tipo: string): Texture {
  if (procCache[tipo]) return procCache[tipo]
  const s = 128
  const cv = document.createElement('canvas')
  cv.width = cv.height = s
  const x = cv.getContext('2d')!
  if (tipo === 'mosaico') {
    x.fillStyle = '#c8c6d8'
    x.fillRect(0, 0, s, s)
    x.fillStyle = '#9896a8'
    x.fillRect(s / 2, 0, s / 2, s / 2)
    x.fillRect(0, s / 2, s / 2, s / 2)
  } else if (tipo === 'ajedrez') {
    x.fillStyle = '#f0ede8'
    x.fillRect(0, 0, s, s)
    x.fillStyle = '#161616'
    x.fillRect(s / 2, 0, s / 2, s / 2)
    x.fillRect(0, s / 2, s / 2, s / 2)
  } else {
    // grid_neon: fondo oscuro + líneas blancas (arriba/izquierda) que tilean continuas
    x.fillStyle = '#050a18'
    x.fillRect(0, 0, s, s)
    x.fillStyle = '#ffffff'
    const lw = s * 0.08
    x.fillRect(0, 0, s, lw)
    x.fillRect(0, 0, lw, s)
  }
  const tex = new CanvasTexture(cv)
  tex.wrapS = tex.wrapT = RepeatWrapping
  procCache[tipo] = tex
  return tex
}

function PisoCeldaProcedural({
  tipo,
  tinte,
  lx,
  lz,
  tile = TILE,
  atenuado,
  formaLoseta,
  onClick,
  onPointerDown,
  onPointerOver,
  onPointerOut,
}: {
  tipo: string
  /** Color de personalización (undefined = patrón nativo). */
  tinte?: string
  lx: number
  lz: number
  tile?: number
  atenuado: boolean
  formaLoseta?: CeldaFormaLoseta
  onClick?: (e: ThreeEvent<MouseEvent>) => void
  onPointerDown?: (e: ThreeEvent<PointerEvent>) => void
  onPointerOver?: (e: ThreeEvent<PointerEvent>) => void
  onPointerOut?: (e: ThreeEvent<PointerEvent>) => void
}) {
  const map = useMemo(() => {
    const t = texturaProc(tipo).clone()
    t.needsUpdate = true
    t.wrapS = t.wrapT = RepeatWrapping
    const rep = Math.max(1, Math.round(tile / (PROC_PERIODO[tipo] ?? 2)))
    t.repeat.set(rep, rep)
    return t
  }, [tipo, tile])

  const esNeon = tipo === 'grid_neon'
  // Damero/mosaico: el color multiplica sobre el patrón (aclarado para que se lea).
  // El patrón se muestra nativo (blanco) y el tinte se añade como emisivo (no oscurece).
  // Neón: líneas que brillan con el color elegido (o azul nativo).
  const emissiveColor = esNeon ? tinte ?? '#0044ff' : tinte ?? '#000000'
  const emissiveInt = atenuado ? 0 : esNeon ? 0.9 : tinte ? 0.28 : 0
  const meshProps = meshLosetaProps(lx, lz, formaLoseta, 'plano')

  return (
    <mesh
      {...meshProps}
      receiveShadow={!atenuado}
      onClick={onClick}
      onPointerDown={onPointerDown}
      onPointerOver={onPointerOver}
      onPointerOut={onPointerOut}
    >
      <GeometriaLoseta formaLoseta={formaLoseta} modo="plano" tile={tile} />
      <meshStandardMaterial
        map={map}
        color="#ffffff"
        emissiveMap={esNeon || tinte ? map : undefined}
        emissive={emissiveColor}
        emissiveIntensity={emissiveInt}
        roughness={esNeon ? 0.3 : 0.28}
        metalness={esNeon ? 0.3 : 0.1}
        transparent={atenuado}
        opacity={atenuado ? 0.16 : 1}
        toneMapped={!esNeon}
      />
    </mesh>
  )
}

function PisoCeldaTexturado({
  textura,
  tileSize,
  tinte,
  roughness,
  metalness,
  emissive,
  emissiveIntensity,
  lx,
  lz,
  tile = TILE,
  atenuado,
  formaLoseta,
  onClick,
  onPointerDown,
  onPointerOver,
  onPointerOut,
}: {
  textura: string
  tileSize: number
  /** Color de personalización (undefined = textura nativa). Se aplica como emisivo. */
  tinte?: string
  roughness: number
  metalness: number
  emissive: string
  emissiveIntensity: number
  lx: number
  lz: number
  tile?: number
  atenuado: boolean
  formaLoseta?: CeldaFormaLoseta
  onClick?: (e: ThreeEvent<MouseEvent>) => void
  onPointerDown?: (e: ThreeEvent<PointerEvent>) => void
  onPointerOver?: (e: ThreeEvent<PointerEvent>) => void
  onPointerOut?: (e: ThreeEvent<PointerEvent>) => void
}) {
  const base = `/textures/floors/${textura}`
  const maps = useTexture({
    map: `${base}_color.jpg`,
    normalMap: `${base}_normal.jpg`,
    roughnessMap: `${base}_roughness.jpg`,
  })

  useMemo(() => {
    const rep = Math.max(1, tile / tileSize)
    ;[maps.map, maps.normalMap, maps.roughnessMap].forEach((t) => {
      if (!t) return
      t.wrapS = RepeatWrapping
      t.wrapT = RepeatWrapping
      t.repeat.set(rep, rep)
      t.needsUpdate = true
    })
  }, [maps, tileSize, tile])

  const meshProps = meshLosetaProps(lx, lz, formaLoseta, 'plano')

  return (
    <mesh
      {...meshProps}
      receiveShadow={!atenuado}
      onClick={onClick}
      onPointerDown={onPointerDown}
      onPointerOver={onPointerOver}
      onPointerOut={onPointerOut}
    >
      <GeometriaLoseta formaLoseta={formaLoseta} modo="plano" tile={tile} />
      <meshStandardMaterial
        {...maps}
        color="#ffffff"
        roughness={roughness}
        metalness={metalness}
        // Con tinte: emisivo coloreado modulado por la textura (tiñe sin oscurecer).
        // Sin tinte: el emisivo propio del tipo (nieve, luna…).
        emissiveMap={tinte ? maps.map : undefined}
        emissive={tinte ?? emissive}
        emissiveIntensity={atenuado ? 0 : tinte ? 0.28 : emissiveIntensity}
        transparent={atenuado}
        opacity={atenuado ? 0.16 : 1}
      />
    </mesh>
  )
}

const AJUSTE_REPEAT: Record<string, number> = { x1: 1, x2: 2, x4: 4 }

function PisoCeldaImagen({
  dataUrl,
  ajuste,
  lx,
  lz,
  tile = TILE,
  atenuado,
  formaLoseta,
  onClick,
  onPointerDown,
  onPointerOver,
  onPointerOut,
}: {
  dataUrl: string
  ajuste?: string
  lx: number
  lz: number
  tile?: number
  atenuado: boolean
  formaLoseta?: CeldaFormaLoseta
  onClick?: (e: ThreeEvent<MouseEvent>) => void
  onPointerDown?: (e: ThreeEvent<PointerEvent>) => void
  onPointerOver?: (e: ThreeEvent<PointerEvent>) => void
  onPointerOut?: (e: ThreeEvent<PointerEvent>) => void
}) {
  const base = useLoader(TextureLoader, dataUrl)
  const texture = useMemo(() => {
    const t = base.clone()
    t.needsUpdate = true
    const rep = AJUSTE_REPEAT[ajuste ?? 'x1'] ?? 1
    t.wrapS = t.wrapT = RepeatWrapping
    t.repeat.set(rep, rep)
    return t
  }, [base, ajuste])
  const meshProps = meshLosetaProps(lx, lz, formaLoseta, 'plano')
  return (
    <mesh
      {...meshProps}
      receiveShadow={!atenuado}
      onClick={onClick}
      onPointerDown={onPointerDown}
      onPointerOver={onPointerOver}
      onPointerOut={onPointerOut}
    >
      <GeometriaLoseta formaLoseta={formaLoseta} modo="plano" tile={tile} />
      <meshStandardMaterial
        map={texture}
        roughness={0.75}
        metalness={0}
        transparent={atenuado}
        opacity={atenuado ? 0.16 : 1}
      />
    </mesh>
  )
}

/** Loseta de piso de un cuarto (color sólido, textura PBR o imagen personalizada). */
export function PisoCelda({
  lx,
  lz,
  color,
  roughness,
  metalness,
  emissive,
  emissiveIntensity,
  pisoConf,
  pisoImagen,
  pisoImagenAjuste,
  colorTinte,
  tile = TILE,
  atenuado,
  formaLoseta,
  onClick,
  onPointerDown,
  onPointerOver,
  onPointerOut,
}: {
  lx: number
  lz: number
  color: string
  roughness: number
  metalness: number
  emissive: string
  emissiveIntensity: number
  pisoConf: PisoTipo | null
  pisoImagen?: string
  /** Ajuste de repetición de la imagen: 'x1' | 'x2' | 'x4'. */
  pisoImagenAjuste?: string
  /** Color de personalización crudo (para patrones procedurales). undefined = nativo. */
  colorTinte?: string
  /** Tamaño de la loseta (default celda completa; ½ celda para cuadrantes). */
  tile?: number
  atenuado: boolean
  formaLoseta?: CeldaFormaLoseta
  onClick?: (e: ThreeEvent<MouseEvent>) => void
  onPointerDown?: (e: ThreeEvent<PointerEvent>) => void
  onPointerOver?: (e: ThreeEvent<PointerEvent>) => void
  onPointerOut?: (e: ThreeEvent<PointerEvent>) => void
}) {
  const meshProps = meshLosetaProps(
    lx,
    lz,
    formaLoseta,
    esFormaCuadrada(formaLoseta) ? 'solido' : 'plano',
  )
  const modoGeo = esFormaCuadrada(formaLoseta) ? 'solido' : 'plano'
  const solido = (
    <mesh
      {...meshProps}
      receiveShadow={!atenuado}
      onClick={onClick}
      onPointerDown={onPointerDown}
      onPointerOver={onPointerOver}
      onPointerOut={onPointerOut}
    >
      <GeometriaLoseta formaLoseta={formaLoseta} modo={modoGeo} tile={tile} />
      <meshStandardMaterial
        color={color}
        roughness={roughness}
        metalness={metalness}
        emissive={emissive}
        emissiveIntensity={atenuado ? 0 : emissiveIntensity}
        transparent={atenuado}
        opacity={atenuado ? 0.16 : 1}
      />
    </mesh>
  )

  if (pisoImagen)
    return (
      <Suspense fallback={solido}>
        <PisoCeldaImagen
          dataUrl={pisoImagen}
          ajuste={pisoImagenAjuste}
          lx={lx}
          lz={lz}
          tile={tile}
          atenuado={atenuado}
          formaLoseta={formaLoseta}
          onClick={onClick}
          onPointerDown={onPointerDown}
          onPointerOver={onPointerOver}
          onPointerOut={onPointerOut}
        />
      </Suspense>
    )

  // Patrón procedural (mosaico, ajedrez, grid neón): se genera en canvas y se tiñe.
  if (pisoConf && !pisoConf.textura && (PROC_TIPOS as readonly string[]).includes(pisoConf.id))
    return (
      <PisoCeldaProcedural
        tipo={pisoConf.id}
        tinte={colorTinte}
        lx={lx}
        lz={lz}
        tile={tile}
        atenuado={atenuado}
        formaLoseta={formaLoseta}
        onClick={onClick}
        onPointerDown={onPointerDown}
        onPointerOver={onPointerOver}
        onPointerOut={onPointerOut}
      />
    )

  if (!pisoConf?.textura) return solido

  return (
    <Suspense fallback={solido}>
      <PisoCeldaTexturado
        textura={pisoConf.textura}
        tileSize={pisoConf.tileSize ?? 2.5}
        tinte={colorTinte}
        roughness={roughness}
        metalness={metalness}
        emissive={emissive}
        emissiveIntensity={emissiveIntensity}
        lx={lx}
        lz={lz}
        tile={tile}
        atenuado={atenuado}
        formaLoseta={formaLoseta}
        onClick={onClick}
        onPointerDown={onPointerDown}
        onPointerOver={onPointerOver}
        onPointerOut={onPointerOut}
      />
    </Suspense>
  )
}
