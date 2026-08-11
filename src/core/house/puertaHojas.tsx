import { useEffect, useMemo, useState } from 'react'
import { useThree } from '@react-three/fiber'
import { ExtrudeGeometry, Shape, SRGBColorSpace, TextureLoader, type Texture } from 'three'
import { WALL_H } from './walls'
import { perfilFormaVano, type FormaVanoId } from './murosPuertas'

/** Geometría común de las hojas de puerta (cuartos y muros independientes). */
export const PUERTA_GROSOR = 0.18
export const PUERTA_ALTO = WALL_H - 0.08
export const PUERTA_BASE_Y = 0.1 // se apoya sobre el piso
export const ABRE_ANG = 1.9 // ángulo máximo de apertura (~109°)

/** Remate del vano heredado por la hoja: forma + alto extra YA acotado al muro (m). */
export interface RemateHoja {
  forma: FormaVanoId
  /** Alto del arco/pico en metros (clampado por el consumidor al espacio del muro). */
  extra: number
  /** Base del pico (triángulo), factor del ancho del vano. */
  ancho: number
  /** Posición del pico dentro de su base (-1…1). */
  posX: number
}

/**
 * Muestras (t 0..1 a lo ancho de la pieza, alto extra) del tope del remate entre
 * un0 y un1 (fracción del vano que cubre la pieza; una hoja doble cubre media).
 */
function topeRemate(r: RemateHoja, un0: number, un1: number): [number, number][] {
  const us: number[] = []
  if (r.forma === 'arco') {
    const N = 24
    for (let i = 0; i <= N; i++) us.push(un0 + ((un1 - un0) * i) / N)
  } else {
    // Triángulo: perfil lineal a tramos — bastan sus vértices dentro del rango.
    const half = Math.max(0.05, Math.min(1, r.ancho))
    const brks = [un0, -half, r.posX * half, half, un1].filter(
      (u) => (u - un0) * (u - un1) <= 0,
    )
    brks.sort((a, b) => (un0 < un1 ? a - b : b - a))
    us.push(...brks)
  }
  return us.map((u) => [
    (u - un0) / (un1 - un0),
    r.extra * perfilFormaVano(r.forma, u, r.ancho, r.posX),
  ])
}

/**
 * Geometría extruida de un panel x∈[x0,x1], y∈[0,alto], cuyo tope sigue el remate
 * del vano (arco/pico) para llenar el hueco sin dejar rendijas.
 */
export function geoPanelRemate(
  x0: number,
  x1: number,
  alto: number,
  remate: RemateHoja,
  un0: number,
  un1: number,
  grosor = PUERTA_GROSOR,
): ExtrudeGeometry {
  const tope = topeRemate(remate, un0, un1)
  const s = new Shape()
  s.moveTo(x0, 0)
  s.lineTo(x1, 0)
  // Tope de derecha a izquierda siguiendo el remate.
  for (let i = tope.length - 1; i >= 0; i--)
    s.lineTo(x0 + (x1 - x0) * tope[i][0], alto + tope[i][1])
  s.closePath()
  const g = new ExtrudeGeometry(s, { depth: grosor, bevelEnabled: false })
  g.translate(0, 0, -grosor / 2)
  return g
}

/**
 * Textura de la hoja a partir de la object-URL guardada por el usuario (foto o
 * imagen de IA). Se carga a mano —sin `useLoader`— para no suspender la escena
 * entera mientras llega: hasta entonces la hoja se ve con su color liso.
 */
function useTexturaHoja(url: string | undefined, geo: ExtrudeGeometry | null): Texture | null {
  const invalidate = useThree((s) => s.invalidate)
  const [tex, setTex] = useState<Texture | null>(null)

  useEffect(() => {
    if (!url) return
    let vivo = true
    new TextureLoader().load(
      url,
      (t) => {
        if (!vivo) {
          t.dispose()
          return
        }
        t.colorSpace = SRGBColorSpace
        setTex(t)
        invalidate()
      },
      undefined,
      () => {
        /* imagen ilegible: la hoja se queda con su color */
      },
    )
    return () => {
      vivo = false
      setTex((prev) => {
        prev?.dispose()
        return null
      })
    }
  }, [url, invalidate])

  return useMemo(() => {
    if (!tex) return null
    // `ExtrudeGeometry` usa las coordenadas del shape (metros) como UV: se normalizan
    // con su caja envolvente. El `boxGeometry` ya trae UV 0–1 por cara.
    if (geo) {
      geo.computeBoundingBox()
      const bb = geo.boundingBox
      if (bb) {
        const w = Math.max(bb.max.x - bb.min.x, 1e-3)
        const h = Math.max(bb.max.y - bb.min.y, 1e-3)
        tex.repeat.set(1 / w, 1 / h)
        tex.offset.set(-bb.min.x / w, -bb.min.y / h)
      }
    } else {
      tex.repeat.set(1, 1)
      tex.offset.set(0, 0)
    }
    tex.needsUpdate = true
    return tex
  }, [tex, geo])
}

/**
 * Material de una hoja de puerta: color liso o, si el usuario le puso imagen
 * (foto subida o generada con IA), esa textura. Compartido por las hojas
 * batientes y por las correderas de cuartos y muros independientes.
 */
export function MaterialHoja({
  color,
  fotoUrl,
  geo = null,
  roughness = 0.8,
  metalness = 0.05,
}: {
  color: string
  /** object-URL de la imagen de la puerta (si la hay). */
  fotoUrl?: string
  /** Panel extruido al que se mapea (para normalizar sus UV); null = caja. */
  geo?: ExtrudeGeometry | null
  roughness?: number
  metalness?: number
}) {
  const map = useTexturaHoja(fotoUrl, geo)
  return (
    <meshStandardMaterial
      // Con textura el color base debe ser blanco: si no, la tiñe.
      color={map ? '#ffffff' : color}
      map={map ?? undefined}
      roughness={roughness}
      metalness={metalness}
    />
  )
}

/**
 * Montante fijo que llena el remate del vano (correderas y portones: la hoja
 * rectangular se mueve y esta pieza queda tapando el arco/pico). Centrado en x=0;
 * el consumidor lo coloca a la altura donde arranca el remate, orientado al muro.
 */
export function MontanteVanoMesh({
  ancho,
  remate,
  color,
}: {
  ancho: number
  remate: RemateHoja
  color: string
}) {
  const geo = useMemo(() => {
    if (remate.forma === 'recta' || remate.extra < 0.02 || ancho < 0.3) return null
    return geoPanelRemate(-ancho / 2 + 0.02, ancho / 2 - 0.02, 0, remate, -1, 1)
  }, [ancho, remate])
  if (!geo) return null
  return (
    <mesh geometry={geo} castShadow receiveShadow>
      <meshStandardMaterial color={color} roughness={0.8} metalness={0.05} />
    </mesh>
  )
}

/** Una hoja batiente: bisagra (en mundo), giro cerrado y sentido de apertura. */
export interface Hoja {
  hingeX: number
  hingeZ: number
  /** Yaw con la hoja cerrada (alineada al muro, apuntando de bisagra a extremo). */
  closedYaw: number
  /** +1/−1: sentido de giro que abre hacia la normal del muro. */
  signo: number
  width: number
}

/**
 * Hojas de un vano: una (recta) o dos batientes opuestas (doble/portón), con bisagra
 * en un extremo. `(dirx,dirz)` es la dirección unitaria a lo largo del muro y `(nx,nz)`
 * su normal (hacia donde abre la hoja). Sirve para muros rectos, diagonales o curvos.
 */
export function hojasDeAbertura(
  cx: number,
  cz: number,
  dirx: number,
  dirz: number,
  ancho: number,
  nx: number,
  nz: number,
  doble: boolean,
): Hoja[] {
  const half = ancho / 2
  const end1 = { x: cx - dirx * half, z: cz - dirz * half }
  const end2 = { x: cx + dirx * half, z: cz + dirz * half }
  const centro = { x: cx, z: cz }
  const mk = (hinge: { x: number; z: number }, far: { x: number; z: number }, width: number): Hoja => {
    const dx = far.x - hinge.x
    const dz = far.z - hinge.z
    const len = Math.hypot(dx, dz) || 1
    const closedYaw = Math.atan2(-dz / len, dx / len)
    const yawPlus = closedYaw + Math.PI / 2
    const signo = Math.cos(yawPlus) * nx + -Math.sin(yawPlus) * nz >= 0 ? 1 : -1
    return { hingeX: hinge.x, hingeZ: hinge.z, closedYaw, signo, width }
  }
  if (doble) return [mk(end1, centro, half), mk(end2, centro, half)]
  return [mk(end1, end2, ancho)]
}

/**
 * Una hoja: tablero + manija, extendida en +X desde la bisagra. Con `remate`, el
 * tablero toma la forma del vano (arco/pico) entre un0 y un1 para llenar el hueco.
 */
export function HojaPuertaMesh({
  width,
  color,
  alto = PUERTA_ALTO,
  remate,
  un0 = -1,
  un1 = 1,
  fotoUrl,
}: {
  width: number
  color: string
  alto?: number
  remate?: RemateHoja
  /** Fracción del vano que cubre la hoja: un en la bisagra (x=0) y en el extremo (x=width). */
  un0?: number
  un1?: number
  /** Imagen de la puerta (object-URL): foto subida o generada con IA. */
  fotoUrl?: string
}) {
  // Tablero con remate: la parte recta llega al arranque del arco/pico (el alto de la
  // hoja menos su zócalo), y el remate sube encima siguiendo el perfil del vano.
  const geo = useMemo(() => {
    if (!remate || remate.forma === 'recta' || remate.extra < 0.02) return null
    return geoPanelRemate(0.02, width - 0.02, Math.max(0.1, alto - PUERTA_BASE_Y), remate, un0, un1)
  }, [width, alto, remate, un0, un1])
  const y = PUERTA_BASE_Y + alto / 2
  return (
    <group>
      {geo ? (
        <mesh position={[0, PUERTA_BASE_Y, 0]} geometry={geo} castShadow receiveShadow>
          <MaterialHoja color={color} fotoUrl={fotoUrl} geo={geo} />
        </mesh>
      ) : (
        <mesh position={[width / 2, y, 0]} castShadow receiveShadow>
          <boxGeometry args={[width - 0.04, alto, PUERTA_GROSOR]} />
          <MaterialHoja color={color} fotoUrl={fotoUrl} />
        </mesh>
      )}
      <mesh position={[width - 0.24, PUERTA_BASE_Y + alto * 0.46, PUERTA_GROSOR / 2 + 0.04]}>
        <sphereGeometry args={[0.07, 8, 8]} />
        <meshStandardMaterial color="#c8a855" roughness={0.3} metalness={0.7} />
      </mesh>
    </group>
  )
}
