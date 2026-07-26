import { Suspense, useMemo, type ReactElement, type ReactNode } from 'react'
import { useLoader } from '@react-three/fiber'
import { MeshReflectorMaterial } from '@react-three/drei'
import { DoubleSide, ExtrudeGeometry, Path, RepeatWrapping, Shape, ShapeGeometry, SRGBColorSpace, TextureLoader, type Texture } from 'three'
import { WALL_H, FORMA_ALTO_TECHO } from './walls'
import { puntosRemateVano, VANO_FORMA_ALTO_DEFAULT } from './murosPuertas'
import type { TipoMuroId, FormaMuroId, FormaVanoId, VentanaFormaId, VentanaContenidoId } from './murosPuertas'
import { texturaMuro } from './texturasMuro'

/** Repeticiones de la imagen según el ajuste elegido. */
const AJUSTE_REPEAT: Record<string, number> = { x1: 1, x2: 2, x4: 4 }

/** Paleta del vitral multicolor (cada pieza un color). */
const MOSAICO_COLORES = [
  '#ef4444', '#f59e0b', '#fbbf24', '#22c55e',
  '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899',
]

/** Material de cristal: transparente sin emisivo, igual estética que el muro vitraje. */
function MatCristal({ color }: { color: string }) {
  return (
    <meshStandardMaterial
      color={color}
      roughness={0.05}
      metalness={0.5}
      transparent
      opacity={0.28}
      depthWrite={false}
    />
  )
}

/** Lienzo del cuadro sin foto (crema, como papel). */
const CUADRO_FONDO = '#f2ead9'

/**
 * Luna plana recortada a la forma del vano (foto del cuadro o espejo),
 * apoyada sobre la cara del muro (mira a +Z local).
 */
function LunaVano({
  forma,
  ww,
  wh,
  bw,
  z,
  children,
}: {
  forma: VentanaFormaId
  ww: number
  wh: number
  /** Ancho del borde del marco (la luna lo descuenta). */
  bw: number
  z: number
  children: ReactNode
}) {
  const triGeo = useMemo(() => {
    if (forma !== 'triangulo') return null
    const iu = ww / 2 - bw
    const iv = wh / 2 - bw
    const s = new Shape()
    s.moveTo(-iu, -iv)
    s.lineTo(iu, -iv)
    s.lineTo(0, iv)
    s.closePath()
    return new ShapeGeometry(s)
  }, [forma, ww, wh, bw])
  if (forma === 'circulo') {
    return (
      <mesh position={[0, 0, z]} scale={[ww * 0.92, wh * 0.92, 1]}>
        <circleGeometry args={[0.5, 40]} />
        {children}
      </mesh>
    )
  }
  if (forma === 'triangulo' && triGeo) {
    return (
      <mesh position={[0, 0, z]} geometry={triGeo}>
        {children}
      </mesh>
    )
  }
  return (
    <mesh position={[0, 0, z]}>
      <planeGeometry args={[ww - bw * 2, wh - bw * 2]} />
      {children}
    </mesh>
  )
}

/** Foto del cuadro empotrado, recortada a la forma del vano (una sola cara). */
function FotoVano({
  url,
  forma,
  ww,
  wh,
  bw,
  z,
}: {
  url: string
  forma: VentanaFormaId
  ww: number
  wh: number
  bw: number
  z: number
}) {
  const base = useLoader(TextureLoader, url)
  const map = useMemo(() => {
    const tex = base.clone()
    tex.colorSpace = SRGBColorSpace
    if (forma === 'triangulo') {
      // ShapeGeometry usa las coords del shape como UV: se normalizan al vano.
      const iu = ww / 2 - bw
      const iv = wh / 2 - bw
      tex.repeat.set(1 / (iu * 2), 1 / (iv * 2))
      tex.offset.set(0.5, 0.5)
    }
    tex.needsUpdate = true
    return tex
  }, [base, forma, ww, wh, bw])
  return (
    <LunaVano forma={forma} ww={ww} wh={wh} bw={bw} z={z}>
      <meshStandardMaterial map={map} roughness={0.85} metalness={0} />
    </LunaVano>
  )
}

/**
 * Ventana decorativa centrada en un muro. Forma cuadrada (con rotación → rombo) o
 * circular; cristal de color, con opción de mosaico (vitral) y multicolor.
 * Se construye en un marco local (ancho→X, alto→Y, fondo→Z) y se orienta al muro.
 * Exportada: los muros curvos montan el APLIQUE (cuadro/espejo) tangente al arco.
 */
export function VentanaEnMuro({
  horizontal,
  largo,
  alto,
  grosor,
  ancho,
  altoVent,
  posY,
  posX,
  forma,
  rot,
  mosaico,
  multicolor,
  color,
  marco,
  contenido = 'ventana',
  cara = 'interior',
  fotoUrl,
  caraInterior = 1,
}: {
  horizontal: boolean
  largo: number
  /** Alto real del muro (m). */
  alto: number
  /** Grosor real del muro (m). */
  grosor: number
  /** Ancho de la ventana como factor del largo del muro. */
  ancho: number
  /** Alto de la ventana como factor del alto del muro (0–1). */
  altoVent: number
  /** Centro vertical de la ventana como factor del alto del muro (0–1 desde el piso). */
  posY: number
  /** Posición horizontal a lo largo del muro (-1 izq … 1 der). */
  posX: number
  /** Forma del cristal: cuadrado, círculo o triángulo. */
  forma: 'cuadrado' | 'circulo' | 'triangulo'
  /** Rotación del cristal en grados (cuadrado → rombo a 45°). */
  rot: number
  /** Cristal dividido en piezas (vitral). */
  mosaico: boolean
  /** Cada pieza con un color distinto. */
  multicolor: boolean
  /** Color del cristal. */
  color: string
  marco: string
  /** Qué vive en el vano: ventana (cristal), cuadro con foto o espejo. */
  contenido?: VentanaContenidoId
  /** Cara del muro donde vive el cuadro/espejo (la otra queda lisa). */
  cara?: 'interior' | 'exterior'
  /** Foto del cuadro (objectURL). */
  fotoUrl?: string
  /** Signo de +Z local que apunta al interior del cuarto. */
  caraInterior?: 1 | -1
}) {
  const ww = Math.min(largo * 0.98, largo * ancho)
  if (ww < 0.4) return null
  const wh = Math.min(alto * 0.98, alto * altoVent)
  const y = alto * (posY - 0.5) // local al centro del muro
  // Desplazamiento a lo largo del muro, acotado para no salirse de sus extremos.
  const margen = Math.max(0, (largo - ww) / 2)
  const off = posX * margen
  // Cuadro/espejo: APLIQUE adosado a una sola cara (marco fino); ventana: atraviesa.
  const esAplique = contenido !== 'ventana'
  const prof = esAplique ? 0.16 : grosor + 0.06
  const rotRad = (rot * Math.PI) / 180
  // Se subdivide en piezas con mosaico o multicolor (el multicolor necesita varias).
  const dividir = contenido === 'ventana' && (mosaico || multicolor)
  const colorDe = (i: number) => (multicolor ? MOSAICO_COLORES[i % MOSAICO_COLORES.length] : color)
  // Signo de la cara elegida en el marco local (+Z = interior del cuarto).
  const signoCara = caraInterior * (cara === 'exterior' ? -1 : 1)

  // Ancho del borde del marco (cuadrado).
  const bw = 0.09

  const piezas: ReactElement[] = []
  if (forma === 'circulo') {
    // Marco: cilindro abierto (sin tapas) = anillo visible desde el frente.
    piezas.push(
      <mesh key="marco" rotation={[Math.PI / 2, 0, 0]} scale={[ww + 0.14, 1, wh + 0.14]} castShadow receiveShadow>
        <cylinderGeometry args={[0.5, 0.5, prof * 0.8, 40, 1, true]} />
        <meshStandardMaterial color={marco} roughness={0.6} metalness={0.1} side={DoubleSide} />
      </mesh>,
    )
    if (dividir) {
      const N = 8
      const paso = (Math.PI * 2) / N
      for (let i = 0; i < N; i++) {
        piezas.push(
          <mesh key={i} rotation={[Math.PI / 2, 0, 0]} scale={[ww, 1, wh]}>
            <cylinderGeometry args={[0.5, 0.5, prof, 24, 1, false, i * paso, paso * 0.85]} />
            <MatCristal color={colorDe(i)} />
          </mesh>,
        )
      }
    } else if (contenido === 'ventana') {
      piezas.push(
        <mesh key="glass" rotation={[Math.PI / 2, 0, 0]} scale={[ww * 0.92, 1, wh * 0.92]}>
          <cylinderGeometry args={[0.5, 0.5, prof, 40]} />
          <MatCristal color={color} />
        </mesh>,
      )
    }
  } else if (forma === 'triangulo') {
    // Triángulo: 3 barras de marco (base abajo, vértice arriba) + cristal triangular.
    const A: [number, number] = [-ww / 2, -wh / 2]
    const B: [number, number] = [ww / 2, -wh / 2]
    const C: [number, number] = [0, wh / 2]
    const bar = (p: [number, number], q: [number, number], key: string) => {
      const len = Math.hypot(q[0] - p[0], q[1] - p[1])
      const ang = Math.atan2(q[1] - p[1], q[0] - p[0])
      return (
        <mesh key={key} position={[(p[0] + q[0]) / 2, (p[1] + q[1]) / 2, 0]} rotation={[0, 0, ang]} castShadow receiveShadow>
          <boxGeometry args={[len, bw, prof * 0.8]} />
          <meshStandardMaterial color={marco} roughness={0.6} metalness={0.1} />
        </mesh>
      )
    }
    piezas.push(bar(A, B, 'mb'), bar(B, C, 'mr'), bar(C, A, 'ml'))
    if (contenido === 'ventana') {
      const iu = ww / 2 - bw
      const iv = wh / 2 - bw
      const triShape = new Shape()
      triShape.moveTo(-iu, -iv)
      triShape.lineTo(iu, -iv)
      triShape.lineTo(0, iv)
      triShape.closePath()
      piezas.push(
        <mesh key="glass" position={[0, 0, -prof / 2]}>
          <extrudeGeometry args={[triShape, { depth: prof, bevelEnabled: false }]} />
          <MatCristal color={color} />
        </mesh>,
      )
    }
  } else {
    // Cuadrado: 4 tiras de borde (el centro queda libre, no tapa el cristal).
    piezas.push(
      <mesh key="mt" position={[0, wh / 2 - bw / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[ww, bw, prof * 0.8]} />
        <meshStandardMaterial color={marco} roughness={0.6} metalness={0.1} />
      </mesh>,
      <mesh key="mb" position={[0, -wh / 2 + bw / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[ww, bw, prof * 0.8]} />
        <meshStandardMaterial color={marco} roughness={0.6} metalness={0.1} />
      </mesh>,
      <mesh key="ml" position={[-ww / 2 + bw / 2, 0, 0]} castShadow receiveShadow>
        <boxGeometry args={[bw, wh - bw * 2, prof * 0.8]} />
        <meshStandardMaterial color={marco} roughness={0.6} metalness={0.1} />
      </mesh>,
      <mesh key="mr" position={[ww / 2 - bw / 2, 0, 0]} castShadow receiveShadow>
        <boxGeometry args={[bw, wh - bw * 2, prof * 0.8]} />
        <meshStandardMaterial color={marco} roughness={0.6} metalness={0.1} />
      </mesh>,
    )
    if (dividir) {
      const cols = 3
      const rows = 3
      const gap = 0.06
      const cw = (ww - gap * (cols + 1)) / cols
      const ch = (wh - gap * (rows + 1)) / rows
      let k = 0
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++, k++) {
          if (cw < 0.04 || ch < 0.04) continue
          const px = -ww / 2 + gap * (c + 1) + cw * (c + 0.5)
          const py = -wh / 2 + gap * (r + 1) + ch * (r + 0.5)
          piezas.push(
            <mesh key={`p${k}`} position={[px, py, 0]}>
              <boxGeometry args={[cw, ch, prof]} />
              <MatCristal color={colorDe(k)} />
            </mesh>,
          )
        }
      }
    } else if (contenido === 'ventana') {
      piezas.push(
        <mesh key="glass">
          <boxGeometry args={[ww - bw * 2, wh - bw * 2, prof]} />
          <MatCristal color={color} />
        </mesh>,
      )
    }
  }

  // Luna del aplique, delante de la cara del muro y dentro del reborde del marco.
  const zLuna = 0.05
  const lienzoVacio = (
    <LunaVano forma={forma} ww={ww} wh={wh} bw={bw} z={zLuna}>
      <meshStandardMaterial color={CUADRO_FONDO} roughness={0.9} />
    </LunaVano>
  )

  return (
    <group position={horizontal ? [off, y, 0] : [0, y, off]}>
      <group rotation={horizontal ? [0, 0, 0] : [0, Math.PI / 2, 0]}>
        <group rotation={[0, 0, rotRad]}>
          {esAplique ? (
            // Cuadro/espejo: todo el conjunto (marco fino + luna) adosado a UNA cara
            // del muro; la otra cara queda lisa. Girado 180° cuando va del otro lado.
            <group
              position={[0, 0, signoCara * (grosor / 2)]}
              rotation={[0, signoCara === 1 ? 0 : Math.PI, 0]}
            >
              {piezas}
              {contenido === 'cuadro' &&
                (fotoUrl ? (
                  <Suspense fallback={lienzoVacio}>
                    <FotoVano url={fotoUrl} forma={forma} ww={ww} wh={wh} bw={bw} z={zLuna} />
                  </Suspense>
                ) : (
                  lienzoVacio
                ))}
              {contenido === 'espejo' && (
                <LunaVano forma={forma} ww={ww} wh={wh} bw={bw} z={zLuna}>
                  <MeshReflectorMaterial
                    resolution={512}
                    mirror={1}
                    mixStrength={2.2}
                    mixBlur={0}
                    blur={[0, 0]}
                    depthScale={0}
                    roughness={0.05}
                    metalness={0.15}
                    color="#dbe4ee"
                  />
                </LunaVano>
              )}
            </group>
          ) : (
            piezas
          )}
        </group>
      </group>
    </group>
  )
}

/** Oscurece/aclara un color hex por una cantidad (-255…255). */
function ajustarColor(hex: string, amt: number) {
  const n = parseInt(hex.slice(1), 16)
  const r = Math.min(255, Math.max(0, ((n >> 16) & 255) + amt))
  const g = Math.min(255, Math.max(0, ((n >> 8) & 255) + amt))
  const b = Math.min(255, Math.max(0, (n & 255) + amt))
  return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')
}

/** Detalle superficial según tipo de muro (en contraste con la base para que se note). */
function DetalleMuro({ tipo, horizontal, largo, alto, grosor, base, hueco }: {
  tipo: TipoMuroId
  horizontal: boolean
  largo: number
  /** Alto real de este segmento de muro (m). El grupo padre está centrado en este eje. */
  alto: number
  /** Grosor real del segmento (m): el detalle se ciñe a él para no sobresalir. */
  grosor: number
  base: string
  /** Vano de puerta {x0,x1,yTop} (coords locales): juntas y listones lo esquivan. */
  hueco?: { x0: number; x1: number; yTop: number } | null
}) {
  // Junta de ladrillo más oscura; listón de madera más oscuro: así el patrón resalta.
  const surco = ajustarColor(base, -55)
  // ¿El tramo [a,b] (a lo largo del muro) cruza el vano por debajo de su tope?
  const enHueco = (a: number, b: number, y: number) =>
    !!hueco && y < hueco.yTop && b > hueco.x0 && a < hueco.x1
  if (tipo === 'ladrillo') {
    const altoHilada = 0.22
    const anchoLadrillo = 0.45
    const filas = Math.min(40, Math.max(1, Math.round(alto / altoHilada)))
    const hilada = alto / filas
    const cols = Math.min(24, Math.max(2, Math.round(largo / anchoLadrillo)))
    const pitch = largo / cols
    const piezas: ReactElement[] = []
    for (let f = 0; f < filas; f++) {
      const yJunta = -alto / 2 + (f + 1) * hilada
      if (f < filas - 1) {
        // La junta horizontal se parte en dos tramos si cruza el vano de la puerta.
        const tramos: [number, number][] = enHueco(-largo / 2, largo / 2, yJunta)
          ? [[-largo / 2, hueco!.x0], [hueco!.x1, largo / 2]]
          : [[-largo / 2, largo / 2]]
        for (const [a, b] of tramos) {
          const len = b - a
          if (len < 0.05) continue
          const cxT = (a + b) / 2
          piezas.push(
            <mesh key={`h${f}-${a.toFixed(2)}`} position={[horizontal ? cxT : 0, yJunta, horizontal ? 0 : cxT]}>
              <boxGeometry
                args={horizontal ? [len, 0.025, grosor + 0.02] : [grosor + 0.02, 0.025, len]}
              />
              <meshStandardMaterial color={surco} roughness={0.95} />
            </mesh>,
          )
        }
      }
      const offsetFila = f % 2 === 0 ? 0 : pitch / 2
      const yc = -alto / 2 + (f + 0.5) * hilada
      for (let c = 0; c <= cols; c++) {
        const pos = -largo / 2 + offsetFila + c * pitch
        if (pos < -largo / 2 + 0.03 || pos > largo / 2 - 0.03) continue
        if (enHueco(pos, pos, yc - hilada / 2)) continue // junta vertical dentro del vano
        piezas.push(
          <mesh key={`v${f}-${c}`} position={[horizontal ? pos : 0, yc, horizontal ? 0 : pos]}>
            <boxGeometry
              args={horizontal ? [0.025, hilada, grosor + 0.02] : [grosor + 0.02, hilada, 0.025]}
            />
            <meshStandardMaterial color={surco} roughness={0.95} />
          </mesh>,
        )
      }
    }
    return <>{piezas}</>
  }
  if (tipo === 'madera') {
    const anchoTabla = 0.18
    const n = Math.min(40, Math.max(2, Math.round(largo / anchoTabla)))
    const pitch = largo / n
    return (
      <>
        {Array.from({ length: n - 1 }, (_, i) => {
          const off = -largo / 2 + (i + 1) * pitch
          // Listón que cruza el vano de la puerta: solo el tramo sobre el hueco.
          if (hueco && off > hueco.x0 && off < hueco.x1) {
            const y1 = alto / 2 - 0.03
            const hL = y1 - hueco.yTop
            if (hL < 0.05) return null
            return (
              <mesh
                key={i}
                position={[horizontal ? off : 0, (hueco.yTop + y1) / 2, horizontal ? 0 : off]}
              >
                <boxGeometry
                  args={horizontal ? [0.02, hL, grosor + 0.03] : [grosor + 0.03, hL, 0.02]}
                />
                <meshStandardMaterial color={surco} roughness={0.85} metalness={0.02} />
              </mesh>
            )
          }
          return (
            <mesh key={i} position={[horizontal ? off : 0, 0, horizontal ? 0 : off]}>
              <boxGeometry
                args={
                  horizontal
                    ? [0.02, alto - 0.06, grosor + 0.03]
                    : [grosor + 0.03, alto - 0.06, 0.02]
                }
              />
              <meshStandardMaterial color={surco} roughness={0.85} metalness={0.02} />
            </mesh>
          )
        })}
      </>
    )
  }
  return null
}

/** Material de una forma (silueta): hereda la textura del muro (map) o su color. */
function MatForma({ color, map, patron, roughness, metalness }: {
  color: string
  map?: Texture
  /** `map` es un patrón genérico (ladrillo/madera) y no una foto: se tiñe con `color`. */
  patron?: boolean
  roughness: number
  metalness: number
}) {
  return (
    <meshStandardMaterial
      color={map && !patron ? '#ffffff' : color}
      map={map}
      roughness={roughness}
      metalness={metalness}
      side={DoubleSide}
      toneMapped={!map || patron}
    />
  )
}

/** Postes elevados en ambos extremos del muro (silueta "esquinas altas"). */
function EsquinasAltas({
  horizontal,
  largo,
  grosor,
  h,
  extraH,
  anchoPost,
  color,
  map,
  patron,
  roughness,
  metalness,
}: {
  horizontal: boolean
  largo: number
  grosor: number
  /** Alto base del muro (m), tope sobre el que se apoyan los postes. */
  h: number
  extraH: number
  anchoPost: number
  color: string
  map?: Texture
  patron?: boolean
  roughness: number
  metalness: number
}) {
  const postW = Math.min(anchoPost, largo / 2 - 0.05)
  if (postW < 0.1 || extraH < 0.02) return null
  const off = largo / 2 - postW / 2
  const y = h / 2 + extraH / 2
  const args: [number, number, number] = horizontal ? [postW, extraH, grosor] : [grosor, extraH, postW]
  const pos = (signo: 1 | -1): [number, number, number] =>
    horizontal ? [signo * off, y, 0] : [0, y, signo * off]
  return (
    <>
      <mesh position={pos(-1)} castShadow receiveShadow>
        <boxGeometry args={args} />
        <MatForma color={color} map={map} patron={patron} roughness={roughness} metalness={metalness} />
      </mesh>
      <mesh position={pos(1)} castShadow receiveShadow>
        <boxGeometry args={args} />
        <MatForma color={color} map={map} patron={patron} roughness={roughness} metalness={metalness} />
      </mesh>
    </>
  )
}

/** Arco circular suave de esquina a esquina del muro (silueta "arco"). */
function ArcoCircular({
  horizontal,
  grosor,
  h,
  extraH,
  largo,
  color,
  map,
  patron,
  roughness,
  metalness,
}: {
  horizontal: boolean
  grosor: number
  /** Alto base del muro (m), tope sobre el que se apoya el arco. */
  h: number
  extraH: number
  largo: number
  color: string
  map?: Texture
  patron?: boolean
  roughness: number
  metalness: number
}) {
  const geo = useMemo(() => {
    if (extraH < 0.02 || largo < 0.2) return null
    const halfW = largo / 2
    // Curva elíptica: x recorre todo el ancho del muro (esquina a esquina) y
    // y sube hasta extraH en el centro; con muchos segmentos no se ve "pixeleado".
    const shape = new Shape()
    const pasos = 28
    shape.moveTo(-halfW, 0)
    for (let i = 1; i <= pasos; i++) {
      const t = (Math.PI * i) / pasos
      shape.lineTo(-halfW * Math.cos(t), extraH * Math.sin(t))
    }
    shape.lineTo(halfW, 0)
    shape.closePath()
    const g = new ExtrudeGeometry(shape, { depth: grosor, bevelEnabled: false })
    g.translate(0, 0, -grosor / 2)
    return g
  }, [largo, extraH, grosor])
  if (!geo) return null
  return (
    <mesh
      geometry={geo}
      position={[0, h / 2, 0]}
      rotation={horizontal ? [0, 0, 0] : [0, Math.PI / 2, 0]}
      castShadow
      receiveShadow
    >
      <MatForma color={color} map={map} patron={patron} roughness={roughness} metalness={metalness} />
    </mesh>
  )
}

/** Pico triangular cuyo vértice puede desplazarse hacia una de las esquinas de su base. */
function TrianguloPico({
  horizontal,
  grosor,
  h,
  extraH,
  anchoBase,
  posX,
  color,
  map,
  patron,
  roughness,
  metalness,
}: {
  horizontal: boolean
  grosor: number
  /** Alto base del muro (m), tope sobre el que se apoya el triángulo. */
  h: number
  extraH: number
  anchoBase: number
  /** Posición del vértice dentro de la base (-1 esquina izq … 1 esquina der). */
  posX: number
  color: string
  map?: Texture
  patron?: boolean
  roughness: number
  metalness: number
}) {
  const geo = useMemo(() => {
    if (extraH < 0.02 || anchoBase < 0.15) return null
    const half = anchoBase / 2
    const apexX = posX * half
    const shape = new Shape()
    shape.moveTo(-half, 0)
    shape.lineTo(apexX, extraH)
    shape.lineTo(half, 0)
    shape.closePath()
    const g = new ExtrudeGeometry(shape, { depth: grosor, bevelEnabled: false })
    g.translate(0, 0, -grosor / 2)
    return g
  }, [anchoBase, extraH, posX, grosor])
  if (!geo) return null
  return (
    <mesh
      geometry={geo}
      position={[0, h / 2, 0]}
      rotation={horizontal ? [0, 0, 0] : [0, Math.PI / 2, 0]}
      castShadow
      receiveShadow
    >
      <MatForma color={color} map={map} patron={patron} roughness={roughness} metalness={metalness} />
    </mesh>
  )
}

/** Carga la imagen del muro (tileada) y la entrega al cuerpo y a la forma. */
function MuroTextura({
  dataUrl,
  ajuste,
  children,
}: {
  dataUrl: string
  ajuste?: string
  children: (map: Texture) => ReactNode
}) {
  const base = useLoader(TextureLoader, dataUrl)
  const map: Texture = useMemo(() => {
    const tex = base.clone()
    tex.needsUpdate = true
    const rep = AJUSTE_REPEAT[ajuste ?? 'x1'] ?? 1
    tex.wrapS = tex.wrapT = RepeatWrapping
    tex.repeat.set(rep, rep)
    return tex
  }, [base, ajuste])
  return <>{children(map)}</>
}

/** Segmento de muro con tipo visual, forma paramétrica, color e imagen. */
export function MuroSegment({
  cx,
  cz,
  sx,
  sz,
  exterior,
  tipoMuro = 'solido',
  colorMuro,
  alto = 1,
  alturaM,
  yBase = 0,
  ventana = false,
  ventAncho = 0.55,
  ventAlto = 0.5,
  ventPosY = 0.54,
  ventPosX = 0,
  ventForma = 'cuadrado',
  ventContenido = 'ventana',
  ventCara = 'interior',
  ventRot = 0,
  ventColor,
  ventMosaico = false,
  ventMulticolor = false,
  ventFoto,
  caraInterior = 1,
  huecoSinCristal = false,
  forma = 'recta',
  formaAlto,
  formaAncho = 0.32,
  formaPosX = 0,
  formaDividir = false,
  formaColor,
  vanoForma = 'recta',
  vanoFormaAlto,
  vanoFormaAncho = 1,
  vanoFormaPosX = 0,
  imagen,
  imagenAjuste,
  baseColor,
  extColor,
  roughness,
  extRough,
  metalness,
  emissive,
  emissiveInt,
  atenuado,
  marcoVentana,
  cristal,
}: {
  cx: number
  cz: number
  sx: number
  sz: number
  exterior: boolean
  tipoMuro?: TipoMuroId
  colorMuro?: string
  alto?: number
  /** Altura absoluta (m). Si está, ignora `alto`. Para el muro sobre la puerta. */
  alturaM?: number
  /** Base Y del segmento (default 0). */
  yBase?: number
  /** Mostrar una ventana en este segmento. */
  ventana?: boolean
  ventAncho?: number
  ventAlto?: number
  ventPosY?: number
  ventPosX?: number
  ventForma?: VentanaFormaId
  /** Contenido del vano: ventana (cristal), cuadro con foto o espejo empotrados. */
  ventContenido?: VentanaContenidoId
  /** Cara del muro donde vive el cuadro/espejo. */
  ventCara?: 'interior' | 'exterior'
  ventRot?: number
  ventColor?: string
  ventMosaico?: boolean
  ventMulticolor?: boolean
  /** Foto del cuadro empotrado (objectURL). */
  ventFoto?: string
  /** Signo de +Z local del marco hacia el interior del cuarto (espejo). */
  caraInterior?: 1 | -1
  /** Cortar el hueco pero sin cristal (la puerta sólida pone su propia hoja). */
  huecoSinCristal?: boolean
  /** Silueta superior del muro completo. */
  forma?: FormaMuroId
  formaAlto?: number
  formaAncho?: number
  formaPosX?: number
  formaDividir?: boolean
  formaColor?: string
  /** Remate del vano de la puerta: en el dintel (cuartos) o en el hueco (muros libres). */
  vanoForma?: FormaVanoId
  vanoFormaAlto?: number
  vanoFormaAncho?: number
  vanoFormaPosX?: number
  imagen?: string
  imagenAjuste?: string
  baseColor: string
  extColor: string
  roughness: number
  extRough: number
  metalness: number
  emissive: string
  emissiveInt: number
  atenuado: boolean
  marcoVentana: string
  cristal: string
}) {
  const horizontal = sx > sz
  const largo = horizontal ? sx : sz
  const esHeader = alturaM != null // muro sobre la puerta (flotante)
  const h = esHeader ? alturaM : WALL_H * alto
  const tint = colorMuro ?? (exterior ? extColor : baseColor)
  const esCristal = tipoMuro === 'vitraje'
  const esVentana = ventana
  const grosor = horizontal ? sz : sx
  const formRough = exterior ? extRough : roughness

  // Hueco en el muro a la medida de la ventana (como la puerta): el resto sigue sólido,
  // de modo que el cristal transparente deja ver el exterior por la abertura.
  // Cuadro y espejo van EMPOTRADOS: el muro no se perfora.
  const huecoInfo = useMemo(() => {
    if (!esVentana || esHeader || imagen || ventContenido !== 'ventana') return null
    const ww = Math.min(largo * 0.98, largo * ventAncho)
    if (ww < 0.4) return null
    const wh = Math.min(h * 0.98, h * ventAlto)
    const yC = h * (ventPosY - 0.5)
    const margen = Math.max(0, (largo - ww) / 2)
    const offC = ventPosX * margen
    const rot = (ventRot * Math.PI) / 180
    const shape = new Shape()
    shape.moveTo(-largo / 2, -h / 2)
    shape.lineTo(largo / 2, -h / 2)
    shape.lineTo(largo / 2, h / 2)
    shape.lineTo(-largo / 2, h / 2)
    shape.closePath()
    const hole = new Path()
    const cos = Math.cos(rot)
    const sin = Math.sin(rot)
    const pt = (px: number, py: number): [number, number] => [
      offC + px * cos - py * sin,
      yC + px * sin + py * cos,
    ]
    const hu = ww / 2 - 0.03
    const hv = wh / 2 - 0.03
    // Vano de puerta con remate (arco/pico): rectángulo al piso + silueta encima.
    const extraVano =
      huecoSinCristal && vanoForma !== 'recta'
        ? Math.min(WALL_H * (vanoFormaAlto ?? VANO_FORMA_ALTO_DEFAULT), h / 2 - 0.02 - (yC + hv))
        : 0
    if (extraVano > 0.02) {
      const yD = yC + hv
      hole.moveTo(offC - hu, yC - hv)
      hole.lineTo(offC + hu, yC - hv)
      hole.lineTo(offC + hu, yD)
      for (const [un, f] of puntosRemateVano(vanoForma, vanoFormaAncho, vanoFormaPosX))
        hole.lineTo(offC + hu * un, yD + extraVano * f)
      hole.lineTo(offC - hu, yD)
      hole.closePath()
    } else if (ventForma === 'circulo') {
      // Algo menor que el cristal (0.92) para que éste cubra el borde del hueco.
      hole.absellipse(offC, yC, ww * 0.45, wh * 0.45, 0, Math.PI * 2, true, rot)
    } else if (ventForma === 'triangulo') {
      // Triángulo: base abajo, vértice arriba (el marco cubre el reborde).
      const [a, b, c] = [pt(-hu, -hv), pt(hu, -hv), pt(0, hv)]
      hole.moveTo(a[0], a[1])
      hole.lineTo(b[0], b[1])
      hole.lineTo(c[0], c[1])
      hole.closePath()
    } else {
      // Rectángulo (rotado → rombo); el marco cubre el reborde del hueco.
      const [a, b, c, d] = [pt(-hu, -hv), pt(hu, -hv), pt(hu, hv), pt(-hu, hv)]
      hole.moveTo(a[0], a[1])
      hole.lineTo(b[0], b[1])
      hole.lineTo(c[0], c[1])
      hole.lineTo(d[0], d[1])
      hole.closePath()
    }
    shape.holes.push(hole)
    const geo = new ExtrudeGeometry(shape, { depth: grosor, bevelEnabled: false })
    geo.translate(0, 0, -grosor / 2)
    // Rect del vano de puerta (con su remate): las juntas del detalle lo esquivan.
    const puertaRect = huecoSinCristal
      ? { x0: offC - hu, x1: offC + hu, yTop: yC + hv + extraVano }
      : null
    return { geo, puertaRect }
  }, [esVentana, esHeader, imagen, ventContenido, largo, h, grosor, ventAncho, ventAlto, ventPosY, ventPosX, ventRot, ventForma, huecoSinCristal, vanoForma, vanoFormaAlto, vanoFormaAncho, vanoFormaPosX])
  const huecoGeo = huecoInfo?.geo ?? null
  const huecoPuerta = huecoInfo?.puertaRect ?? null

  // Dintel de la puerta (cuartos) con remate del vano: placa con el recorte en su base.
  const headerGeo = useMemo(() => {
    if (!esHeader || vanoForma === 'recta') return null
    const extra = Math.min(WALL_H * (vanoFormaAlto ?? VANO_FORMA_ALTO_DEFAULT), h - 0.02)
    if (extra < 0.03 || largo < 0.2) return null
    const pts = puntosRemateVano(vanoForma, vanoFormaAncho, vanoFormaPosX)
    const shape = new Shape()
    shape.moveTo(-largo / 2, -h / 2)
    // Borde inferior siguiendo el remate, de izquierda a derecha.
    for (let i = pts.length - 1; i >= 0; i--)
      shape.lineTo((pts[i][0] * largo) / 2, -h / 2 + extra * pts[i][1])
    shape.lineTo(largo / 2, -h / 2)
    shape.lineTo(largo / 2, h / 2)
    shape.lineTo(-largo / 2, h / 2)
    shape.closePath()
    const geo = new ExtrudeGeometry(shape, { depth: grosor, bevelEnabled: false })
    geo.translate(0, 0, -grosor / 2)
    return geo
  }, [esHeader, vanoForma, vanoFormaAlto, vanoFormaAncho, vanoFormaPosX, h, largo, grosor])
  // Arco y triángulo igualan por defecto el alto del techo; las esquinas, más bajas.
  const extraH = WALL_H * (formaAlto ?? (forma === 'esquinas' ? 0.4 : FORMA_ALTO_TECHO))
  // "Dos cuerpos": la forma lleva su propio color (sin la textura del muro).
  const formColor = formaDividir ? (formaColor ?? ajustarColor(tint, 40)) : tint
  // Patrón genérico (ladrillo/madera) para la silueta (pico/arco/esquinas): el cuerpo del
  // muro lo pinta con `DetalleMuro` (mallas), pero esa técnica no sigue un borde inclinado
  // o curvo, así que la forma usa la misma textura de canvas que ya usan los muros curvos.
  const patronMap = useMemo(() => texturaMuro(tipoMuro), [tipoMuro])

  // La forma comparte la textura del muro salvo que se divida en dos cuerpos.
  const formas = (map?: Texture) => {
    if (atenuado || esHeader || forma === 'recta') return null
    const formMap = formaDividir ? undefined : (map ?? patronMap ?? undefined)
    const formPatron = !formaDividir && !map && !!patronMap
    if (forma === 'esquinas')
      return (
        <EsquinasAltas
          horizontal={horizontal} largo={largo} grosor={grosor} h={h} extraH={extraH}
          anchoPost={largo * formaAncho} color={formColor} map={formMap} patron={formPatron}
          roughness={formRough} metalness={metalness}
        />
      )
    if (forma === 'arco')
      return (
        <ArcoCircular
          horizontal={horizontal} grosor={grosor} h={h} extraH={extraH} largo={largo}
          color={formColor} map={formMap} patron={formPatron} roughness={formRough} metalness={metalness}
        />
      )
    return (
      <TrianguloPico
        horizontal={horizontal} grosor={grosor} h={h} extraH={extraH}
        anchoBase={largo * formaAncho} posX={formaPosX} color={formColor} map={formMap} patron={formPatron}
        roughness={formRough} metalness={metalness}
      />
    )
  }

  // Geometría con recorte: hueco de ventana/puerta o dintel con remate del vano.
  const geoRecorte = huecoGeo ?? headerGeo

  // Cuerpo del muro + decoraciones; recibe la textura ya cargada (si hay imagen).
  const cuerpo = (map?: Texture) => {
    // El dintel con remate (arco/pico sobre una puerta) desactiva `DetalleMuro` más abajo
    // porque sus juntas en malla no pueden rodear un hueco no rectangular: sin esto se
    // quedaba siempre liso. Mismo patrón de canvas que usa la silueta del muro.
    const cuerpoPatron = !map && !!headerGeo && !!patronMap
    const cuerpoMap = map ?? (cuerpoPatron ? patronMap : undefined)
    return (
    <>
      <mesh
        castShadow={!atenuado}
        receiveShadow={!atenuado}
        rotation={geoRecorte && !horizontal ? [0, -Math.PI / 2, 0] : [0, 0, 0]}
        geometry={geoRecorte ?? undefined}
      >
        {!geoRecorte && <boxGeometry args={[sx, h, sz]} />}
        <meshStandardMaterial
          color={cuerpoMap && !cuerpoPatron ? '#ffffff' : tint}
          map={cuerpoMap}
          roughness={cuerpoMap && !cuerpoPatron ? 0.8 : esCristal ? 0.15 : exterior ? extRough : roughness}
          metalness={cuerpoMap && !cuerpoPatron ? 0 : esCristal ? 0.35 : metalness}
          emissive={emissive}
          emissiveIntensity={atenuado ? 0 : cuerpoMap && !cuerpoPatron ? 0 : emissiveInt}
          transparent={atenuado || (!cuerpoMap && esCristal)}
          opacity={atenuado ? 0.16 : !cuerpoMap && esCristal ? 0.55 : 1}
          toneMapped={!cuerpoMap || cuerpoPatron}
        />
      </mesh>
      {!atenuado && esVentana && !map && !huecoSinCristal && (
        <VentanaEnMuro
          horizontal={horizontal} largo={largo} alto={h} grosor={grosor} ancho={ventAncho}
          altoVent={ventAlto} posY={ventPosY} posX={ventPosX}
          forma={ventForma} rot={ventRot} mosaico={ventMosaico} multicolor={ventMulticolor}
          color={ventColor ?? cristal} marco={marcoVentana}
          contenido={ventContenido} cara={ventCara} fotoUrl={ventFoto} caraInterior={caraInterior}
        />
      )}
      {/* En el dintel recortado por el remate, las juntas cruzarían el hueco. */}
      {!atenuado && !map && !headerGeo && (
        <DetalleMuro tipo={tipoMuro} horizontal={horizontal} largo={largo} alto={h} grosor={grosor} base={tint} hueco={huecoPuerta} />
      )}
      {formas(map)}
    </>
    )
  }

  return (
    <group position={[cx, yBase + h / 2, cz]}>
      {imagen ? (
        <Suspense fallback={cuerpo()}>
          <MuroTextura dataUrl={imagen} ajuste={imagenAjuste}>{cuerpo}</MuroTextura>
        </Suspense>
      ) : (
        cuerpo()
      )}
    </group>
  )
}
