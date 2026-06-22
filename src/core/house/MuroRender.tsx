import { Suspense, useMemo, type ReactElement, type ReactNode } from 'react'
import { useLoader } from '@react-three/fiber'
import { DoubleSide, ExtrudeGeometry, Path, RepeatWrapping, Shape, TextureLoader, type Texture } from 'three'
import { WALL_H, FORMA_ALTO_TECHO } from './walls'
import type { TipoMuroId, FormaMuroId } from './murosPuertas'

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

/**
 * Ventana decorativa centrada en un muro. Forma cuadrada (con rotación → rombo) o
 * circular; cristal de color, con opción de mosaico (vitral) y multicolor.
 * Se construye en un marco local (ancho→X, alto→Y, fondo→Z) y se orienta al muro.
 */
function VentanaEnMuro({
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
  /** Forma del cristal: cuadrado o círculo. */
  forma: 'cuadrado' | 'circulo'
  /** Rotación del cristal en grados (cuadrado → rombo a 45°). */
  rot: number
  /** Cristal dividido en piezas (vitral). */
  mosaico: boolean
  /** Cada pieza con un color distinto. */
  multicolor: boolean
  /** Color del cristal. */
  color: string
  marco: string
}) {
  const ww = Math.min(largo * 0.98, largo * ancho)
  if (ww < 0.4) return null
  const wh = Math.min(alto * 0.98, alto * altoVent)
  const y = alto * (posY - 0.5) // local al centro del muro
  // Desplazamiento a lo largo del muro, acotado para no salirse de sus extremos.
  const margen = Math.max(0, (largo - ww) / 2)
  const off = posX * margen
  const prof = grosor + 0.06
  const rotRad = (rot * Math.PI) / 180
  // Se subdivide en piezas con mosaico o multicolor (el multicolor necesita varias).
  const dividir = mosaico || multicolor
  const colorDe = (i: number) => (multicolor ? MOSAICO_COLORES[i % MOSAICO_COLORES.length] : color)

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
    } else {
      piezas.push(
        <mesh key="glass" rotation={[Math.PI / 2, 0, 0]} scale={[ww * 0.92, 1, wh * 0.92]}>
          <cylinderGeometry args={[0.5, 0.5, prof, 40]} />
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
    } else {
      piezas.push(
        <mesh key="glass">
          <boxGeometry args={[ww - bw * 2, wh - bw * 2, prof]} />
          <MatCristal color={color} />
        </mesh>,
      )
    }
  }

  return (
    <group position={horizontal ? [off, y, 0] : [0, y, off]}>
      <group rotation={horizontal ? [0, 0, 0] : [0, Math.PI / 2, 0]}>
        <group rotation={[0, 0, rotRad]}>{piezas}</group>
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
function DetalleMuro({ tipo, horizontal, largo, alto, grosor, base }: {
  tipo: TipoMuroId
  horizontal: boolean
  largo: number
  /** Alto real de este segmento de muro (m). El grupo padre está centrado en este eje. */
  alto: number
  /** Grosor real del segmento (m): el detalle se ciñe a él para no sobresalir. */
  grosor: number
  base: string
}) {
  // Junta de ladrillo más oscura; listón de madera más oscuro: así el patrón resalta.
  const surco = ajustarColor(base, -55)
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
        piezas.push(
          <mesh key={`h${f}`} position={[0, yJunta, 0]}>
            <boxGeometry
              args={horizontal ? [largo, 0.025, grosor + 0.02] : [grosor + 0.02, 0.025, largo]}
            />
            <meshStandardMaterial color={surco} roughness={0.95} />
          </mesh>,
        )
      }
      const offsetFila = f % 2 === 0 ? 0 : pitch / 2
      const yc = -alto / 2 + (f + 0.5) * hilada
      for (let c = 0; c <= cols; c++) {
        const pos = -largo / 2 + offsetFila + c * pitch
        if (pos < -largo / 2 + 0.03 || pos > largo / 2 - 0.03) continue
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
function MatForma({ color, map, roughness, metalness }: {
  color: string
  map?: Texture
  roughness: number
  metalness: number
}) {
  return (
    <meshStandardMaterial
      color={map ? '#ffffff' : color}
      map={map}
      roughness={roughness}
      metalness={metalness}
      side={DoubleSide}
      toneMapped={!map}
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
        <MatForma color={color} map={map} roughness={roughness} metalness={metalness} />
      </mesh>
      <mesh position={pos(1)} castShadow receiveShadow>
        <boxGeometry args={args} />
        <MatForma color={color} map={map} roughness={roughness} metalness={metalness} />
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
      <MatForma color={color} map={map} roughness={roughness} metalness={metalness} />
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
      <MatForma color={color} map={map} roughness={roughness} metalness={metalness} />
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
  ventRot = 0,
  ventColor,
  ventMosaico = false,
  ventMulticolor = false,
  forma = 'recta',
  formaAlto,
  formaAncho = 0.32,
  formaPosX = 0,
  formaDividir = false,
  formaColor,
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
  ventForma?: 'cuadrado' | 'circulo'
  ventRot?: number
  ventColor?: string
  ventMosaico?: boolean
  ventMulticolor?: boolean
  /** Silueta superior del muro completo. */
  forma?: FormaMuroId
  formaAlto?: number
  formaAncho?: number
  formaPosX?: number
  formaDividir?: boolean
  formaColor?: string
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
  const huecoGeo = useMemo(() => {
    if (!esVentana || esHeader || imagen) return null
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
    if (ventForma === 'circulo') {
      // Algo menor que el cristal (0.92) para que éste cubra el borde del hueco.
      hole.absellipse(offC, yC, ww * 0.45, wh * 0.45, 0, Math.PI * 2, true, rot)
    } else {
      // Rectángulo (rotado → rombo); el marco cubre el reborde del hueco.
      const hu = ww / 2 - 0.03
      const hv = wh / 2 - 0.03
      const cos = Math.cos(rot)
      const sin = Math.sin(rot)
      const pt = (px: number, py: number): [number, number] => [
        offC + px * cos - py * sin,
        yC + px * sin + py * cos,
      ]
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
    return geo
  }, [esVentana, esHeader, imagen, largo, h, grosor, ventAncho, ventAlto, ventPosY, ventPosX, ventRot, ventForma])
  // Arco y triángulo igualan por defecto el alto del techo; las esquinas, más bajas.
  const extraH = WALL_H * (formaAlto ?? (forma === 'esquinas' ? 0.4 : FORMA_ALTO_TECHO))
  // "Dos cuerpos": la forma lleva su propio color (sin la textura del muro).
  const formColor = formaDividir ? (formaColor ?? ajustarColor(tint, 40)) : tint

  // La forma comparte la textura del muro salvo que se divida en dos cuerpos.
  const formas = (map?: Texture) => {
    if (atenuado || esHeader || forma === 'recta') return null
    const formMap = formaDividir ? undefined : map
    if (forma === 'esquinas')
      return (
        <EsquinasAltas
          horizontal={horizontal} largo={largo} grosor={grosor} h={h} extraH={extraH}
          anchoPost={largo * formaAncho} color={formColor} map={formMap}
          roughness={formRough} metalness={metalness}
        />
      )
    if (forma === 'arco')
      return (
        <ArcoCircular
          horizontal={horizontal} grosor={grosor} h={h} extraH={extraH} largo={largo}
          color={formColor} map={formMap} roughness={formRough} metalness={metalness}
        />
      )
    return (
      <TrianguloPico
        horizontal={horizontal} grosor={grosor} h={h} extraH={extraH}
        anchoBase={largo * formaAncho} posX={formaPosX} color={formColor} map={formMap}
        roughness={formRough} metalness={metalness}
      />
    )
  }

  // Cuerpo del muro + decoraciones; recibe la textura ya cargada (si hay imagen).
  const cuerpo = (map?: Texture) => (
    <>
      <mesh
        castShadow={!atenuado}
        receiveShadow={!atenuado}
        rotation={huecoGeo && !horizontal ? [0, -Math.PI / 2, 0] : [0, 0, 0]}
        geometry={huecoGeo ?? undefined}
      >
        {!huecoGeo && <boxGeometry args={[sx, h, sz]} />}
        <meshStandardMaterial
          color={map ? '#ffffff' : tint}
          map={map}
          roughness={map ? 0.8 : esCristal ? 0.15 : exterior ? extRough : roughness}
          metalness={map ? 0 : esCristal ? 0.35 : metalness}
          emissive={emissive}
          emissiveIntensity={atenuado ? 0 : map ? 0 : emissiveInt}
          transparent={atenuado || (!map && esCristal)}
          opacity={atenuado ? 0.16 : !map && esCristal ? 0.55 : 1}
          toneMapped={!map}
        />
      </mesh>
      {!atenuado && esVentana && !map && (
        <VentanaEnMuro
          horizontal={horizontal} largo={largo} alto={h} grosor={grosor} ancho={ventAncho}
          altoVent={ventAlto} posY={ventPosY} posX={ventPosX}
          forma={ventForma} rot={ventRot} mosaico={ventMosaico} multicolor={ventMulticolor}
          color={ventColor ?? cristal} marco={marcoVentana}
        />
      )}
      {!atenuado && !map && (
        <DetalleMuro tipo={tipoMuro} horizontal={horizontal} largo={largo} alto={h} grosor={grosor} base={tint} />
      )}
      {formas(map)}
    </>
  )

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
