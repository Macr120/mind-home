import { createContext, useContext, useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

/**
 * Piezas comunes de los escenarios en movimiento. Todo vive en un marco LOCAL
 * donde la proa del vehículo apunta a +X: el vehículo no se mueve y el fondo
 * corre hacia −X. `EscenarioVivo` gira y centra ese marco sobre la casa.
 */

/** Distancia recorrida (unidades de mundo). La avanza `EscenarioVivo` en su `useFrame`. */
export interface Recorrido {
  d: number
}
export const RecorridoCtx = createContext<Recorrido>({ d: 0 })
export const useRecorrido = () => useContext(RecorridoCtx)

/** Reparto estable por semilla (fract(sin)), igual que el cielo animado. */
export function hash01(seed: number, sal: number): number {
  const v = Math.sin(seed * 127.1 + sal * 311.7) * 43758.5453
  return v - Math.floor(v)
}

const mod = (a: number, n: number) => ((a % n) + n) % n

interface DesfileProps {
  geometria: THREE.BufferGeometry
  material: THREE.Material
  n: number
  /** Largo de la franja en X: lo que sale por detrás reaparece por delante. */
  largo: number
  /** Bandas laterales [zMin, zMax] donde caen los elementos (para no pisar el vehículo). */
  bandas: [number, number][]
  y: [number, number]
  escala: [number, number]
  /** Multiplicador de velocidad (capas lejanas más lentas dan profundidad). */
  factor?: number
  semilla?: number
  /** Giro aleatorio sobre Y. */
  girar?: boolean
  /** Estira cada elemento en X según la velocidad (estelas de estrellas). */
  estirarX?: number
  /** Reparto parejo a lo largo (durmientes, postes) en vez de al azar. */
  uniforme?: boolean
}

/**
 * Elementos instanciados que desfilan hacia −X y se reciclan por delante.
 * Nunca proyectan sombra: las sombras de la casa están congeladas.
 */
export function Desfile({ geometria, material, n, largo, bandas, y, escala, factor = 1, semilla = 1, girar = true, estirarX = 1, uniforme = false }: DesfileProps) {
  const ref = useRef<THREE.InstancedMesh>(null)
  const recorrido = useRecorrido()
  const base = useMemo(
    () =>
      Array.from({ length: n }, (_, i) => {
        const s = semilla * 97 + i
        const banda = bandas[Math.floor(hash01(s, 1) * bandas.length) % bandas.length]
        return {
          x: uniforme ? (i / n) * largo : hash01(s, 2) * largo,
          z: banda[0] + hash01(s, 3) * (banda[1] - banda[0]),
          y: y[0] + hash01(s, 4) * (y[1] - y[0]),
          e: escala[0] + hash01(s, 5) * (escala[1] - escala[0]),
          r: girar ? hash01(s, 6) * Math.PI * 2 : 0,
        }
      }),
    [n, largo, bandas, y, escala, semilla, girar, uniforme],
  )
  const m = useMemo(() => new THREE.Matrix4(), [])
  const q = useMemo(() => new THREE.Quaternion(), [])
  const p = useMemo(() => new THREE.Vector3(), [])
  const sc = useMemo(() => new THREE.Vector3(), [])
  const eje = useMemo(() => new THREE.Vector3(0, 1, 0), [])

  useFrame(() => {
    const mesh = ref.current
    if (!mesh) return
    for (let i = 0; i < base.length; i++) {
      const b = base[i]
      p.set(largo / 2 - mod(b.x + recorrido.d * factor, largo), b.y, b.z)
      q.setFromAxisAngle(eje, b.r)
      sc.set(b.e * estirarX, b.e, b.e)
      m.compose(p, q, sc)
      mesh.setMatrixAt(i, m)
    }
    mesh.instanceMatrix.needsUpdate = true
  })

  return <instancedMesh ref={ref} args={[geometria, material, n]} frustumCulled={false} />
}

interface SueloMovilProps {
  /** Pinta UNA loseta del suelo (se repite). */
  pintar: (ctx: CanvasRenderingContext2D, lado: number) => void
  /** Lado de la loseta en unidades de mundo. */
  tamLoseta: number
  /** Lado del plano completo (grande: sus bordes se pierden en la niebla). */
  extension?: number
  y: number
  factor?: number
  rugosidad?: number
}

/** Plano de suelo cuya textura corre hacia −X. */
export function SueloMovil({ pintar, tamLoseta, extension = 900, y, factor = 1, rugosidad = 1 }: SueloMovilProps) {
  const recorrido = useRecorrido()
  const textura = useMemo(() => {
    const lado = 256
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = lado
    const ctx = canvas.getContext('2d')!
    pintar(ctx, lado)
    const tex = new THREE.CanvasTexture(canvas)
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping
    tex.repeat.set(extension / tamLoseta, extension / tamLoseta)
    tex.colorSpace = THREE.SRGBColorSpace
    tex.anisotropy = 4
    return tex
  }, [pintar, tamLoseta, extension])
  useEffect(() => () => textura.dispose(), [textura])

  useFrame(() => {
    textura.offset.x = mod((recorrido.d * factor) / tamLoseta, 1)
  })

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, y, 0]} receiveShadow>
      <planeGeometry args={[extension, extension]} />
      <meshStandardMaterial map={textura} roughness={rugosidad} metalness={0} />
    </mesh>
  )
}

/** Manchas de color al azar sobre la loseta (tierra, pasto, parcelas). */
export function manchas(ctx: CanvasRenderingContext2D, lado: number, colores: string[], n: number, radio: [number, number], semilla: number) {
  for (let i = 0; i < n; i++) {
    const x = hash01(semilla + i, 1) * lado
    const y = hash01(semilla + i, 2) * lado
    const r = radio[0] + hash01(semilla + i, 3) * (radio[1] - radio[0])
    ctx.fillStyle = colores[i % colores.length]
    // Se pinta también desplazada una loseta para que la textura empalme sin costuras.
    for (const dx of [-lado, 0, lado]) {
      for (const dy of [-lado, 0, lado]) {
        ctx.beginPath()
        ctx.arc(x + dx, y + dy, r, 0, Math.PI * 2)
        ctx.fill()
      }
    }
  }
}
