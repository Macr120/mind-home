import { useMemo, useRef } from 'react'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import { useHouse } from '../state/houseStore'
import { useDiseño } from '../state/disenoStore'
import { useCam } from '../state/cameraStore'
import { playerPos } from '../state/playerPosition'
import { useLayout } from '../state/layoutStore'
import { puedeMoverCuartoRegistro } from './planoGeometria'
import { usePlanos } from '../state/planosStore'
import { zonasRepo, pisosExteriorRepo } from '../data/repository'
import { ocupadoConZonas } from './planoGeometria'
import {
  roomWallSegments,
  roomDoorways,
  alturaTechoDeSegs,
  footprintBounds,
  footprintBoundsRect,
  tileLocalEnCuarto,
  cellLocalRect,
  centroRelativo,
  cellId,
  tileOcupado,
  WALL_H,
  WALL_T,
  SIZE,
  FOOTPRINT_DEFAULT,
  type Vano,
} from './walls'
import { ObjetoView, altoDeTipo } from './catalogo'
import { esMueblePrincipal } from './muebles'
import { getTema, colorConTema, mezclar } from './temas'
import { TemaContext } from './primitivas'
import { useInteractUi } from '../state/interactUiStore'
import { MarcadorEntrada } from './marcadorEntrada'
import { MuroSegment } from './MuroRender'
import { PisoCelda } from './PisoCelda'
import { PisoCuadrantes3D } from './PisoCuadrantes3D'
import { colorExteriorDefecto } from './PisosExterior3D'
import { CUADRANTES_OFF, cuadrantesDeCelda, matDeRegistroPiso, type MatPiso } from './pisoSubcelda'
import { useBlobUrlMap } from './useBlobUrlMap'
import { getPisoTipo, esSinPiso } from './pisos'
import { PINCELES_DEFAULT } from './murosPuertas'
import type { TipoPuertaId } from './murosPuertas'
import { TechoLoseta } from './TechoLoseta'
import { TechoForma } from './TechoForma'
import { TechoCeldaNoCuadrada } from './TechoCeldaNoCuadrada'
import { TECHO_PARAMS_DEFAULT } from './techos'
import { offsetsTecho, techoExtraDeOtroEnCelda } from './techoCeldas'
import { claveCeldaOff, formaEnCelda, esFormaCuadrada } from './formasLoseta'
import { filtrarSegmentosPorForma } from './murosPerimetroLoseta'
import { MurosPerimetroFormaCuarto } from './MurosPerimetroFormaCuarto'

function tint(hex: string, amt: number) {
  const n = parseInt(hex.slice(1), 16)
  const r = Math.min(255, Math.max(0, ((n >> 16) & 255) + amt))
  const g = Math.min(255, Math.max(0, ((n >> 8) & 255) + amt))
  const b = Math.min(255, Math.max(0, (n & 255) + amt))
  return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')
}

const PUERTA_GROSOR = 0.18
const PUERTA_ALTO = WALL_H - 0.08
const PUERTA_BASE_Y = 0.1 // se apoya sobre el piso
const ABRE_ANG = 1.9 // ángulo máximo de apertura (~109°)

/** Una hoja batiente: bisagra (local al cuarto), giro cerrado y sentido de apertura. */
interface Hoja {
  hingeX: number
  hingeZ: number
  /** Yaw con la hoja cerrada (alineada al muro, apuntando de bisagra a extremo). */
  closedYaw: number
  /** +1/−1: sentido de giro que abre hacia el interior del cuarto. */
  signo: number
  width: number
}

/**
 * Hojas de un vano: una para 'puerta', dos (batientes opuestos) para 'porton'.
 * Cada hoja gira sobre su bisagra (un extremo del hueco) y abre hacia el interior.
 */
function hojasDeVano(v: Vano): Hoja[] {
  const ax = v.horizontal ? 1 : 0
  const az = v.horizontal ? 0 : 1
  const half = v.ancho / 2
  const end1 = { x: v.cx - ax * half, z: v.cz - az * half }
  const end2 = { x: v.cx + ax * half, z: v.cz + az * half }
  const centro = { x: v.cx, z: v.cz }
  const mk = (
    hinge: { x: number; z: number },
    far: { x: number; z: number },
    width: number,
  ): Hoja => {
    const dx = far.x - hinge.x
    const dz = far.z - hinge.z
    const len = Math.hypot(dx, dz) || 1
    // Yaw cerrado: el +X local apunta de bisagra a extremo.
    const closedYaw = Math.atan2(-dz / len, dx / len)
    // Sentido que abre hacia la normal interior (dot del giro +90° con la normal).
    const yawPlus = closedYaw + Math.PI / 2
    const signo = Math.cos(yawPlus) * v.nx + -Math.sin(yawPlus) * v.nz >= 0 ? 1 : -1
    return { hingeX: hinge.x, hingeZ: hinge.z, closedYaw, signo, width }
  }
  if (v.tipo === 'porton') return [mk(end1, centro, half), mk(end2, centro, half)]
  return [mk(end1, end2, v.ancho)]
}

/** Colores fijos de fachada: no siguen el tema, son materiales "reales". */
const PORTON_COLOR = '#b8c4cc'
const PUERTA_COLOR = '#3b1e09'

function HojaPuertaMesh({
  width,
  color,
  alto = PUERTA_ALTO,
}: {
  width: number
  color: string
  alto?: number
}) {
  const y = PUERTA_BASE_Y + alto / 2
  return (
    <group>
      <mesh position={[width / 2, y, 0]} castShadow receiveShadow>
        <boxGeometry args={[width - 0.04, alto, PUERTA_GROSOR]} />
        <meshStandardMaterial color={color} roughness={0.8} metalness={0.05} />
      </mesh>
      <mesh position={[width - 0.24, PUERTA_BASE_Y + alto * 0.46, PUERTA_GROSOR / 2 + 0.04]}>
        <sphereGeometry args={[0.07, 8, 8]} />
        <meshStandardMaterial color="#c8a855" roughness={0.3} metalness={0.7} />
      </mesh>
    </group>
  )
}

/**
 * Puerta o portón de fachada con apertura animada:
 * - Portón ('abierto'): panel plateado que **sube** (garage-door) al acercarse el avatar.
 * - Puerta: hoja café oscuro que **gira** hacia el interior del cuarto.
 * Decorativas: no añaden colisión.
 */
function VanoFachada({
  vano,
  roomPos,
  marco,
  nivel,
}: {
  vano: Vano
  roomPos: [number, number, number]
  marco: string
  /** Nivel del cuarto: la hoja se abre cuando el avatar está en ese piso. */
  nivel: number
}) {
  const portonRef = useRef<THREE.Mesh | null>(null)
  const correderaRef = useRef<THREE.Group | null>(null)
  const hojasRefs = useRef<(THREE.Group | null)[]>([])
  const hojas = useMemo(() => {
    if (vano.tipo !== 'puerta') return []
    const tp = vano.tipoPuerta ?? 'recta'
    if (tp === 'doble') {
      return hojasDeVano({ ...vano, tipo: 'porton', ancho: vano.ancho })
    }
    return hojasDeVano(vano)
  }, [vano])
  const apertura = useRef(0)
  const umbral = vano.tipo === 'porton' ? 3 : 2.4
  // Altura del muro de la arista y de la hoja (factor del muro, hasta su tope).
  const He = WALL_H * (vano.altoMuro ?? 1)
  const hAlto = vano.alto != null ? Math.min(He, He * vano.alto) : Math.min(He, PUERTA_ALTO)
  const tipoPuerta: TipoPuertaId = vano.tipoPuerta ?? 'recta'
  const colorPuerta = vano.colorPuerta ?? PUERTA_COLOR
  const ax = vano.horizontal ? 1 : 0
  const az = vano.horizontal ? 0 : 1
  const half = vano.ancho / 2

  useFrame(() => {
    const wx = roomPos[0] + vano.cx
    const wz = roomPos[2] + vano.cz
    const lvl = useHouse.getState().playerLevel
    const cerca = lvl === nivel && Math.hypot(playerPos.x - wx, playerPos.z - wz) < umbral
    apertura.current = THREE.MathUtils.lerp(apertura.current, cerca ? 1 : 0, 0.18)
    const a = apertura.current

    if (vano.tipo === 'porton') {
      if (portonRef.current) {
        const closedY = PUERTA_BASE_Y + PUERTA_ALTO / 2
        const openY = WALL_H + PUERTA_ALTO / 2
        portonRef.current.position.y = THREE.MathUtils.lerp(closedY, openY, a)
      }
    } else if (tipoPuerta === 'corredera') {
      const g = correderaRef.current
      if (g) {
        // No deslizar más de lo que hay de muro disponible a un lado (si no, se sale del cuarto).
        const margenDisp = Math.max(0, (SIZE - vano.ancho) / 2 - 0.05)
        const slide = Math.min(vano.ancho * 0.55, margenDisp) * a
        g.position.set(vano.cx + ax * slide, 0, vano.cz + az * slide)
      }
    } else {
      for (let i = 0; i < hojas.length; i++) {
        const g = hojasRefs.current[i]
        if (g) g.rotation.y = hojas[i].closedYaw + hojas[i].signo * ABRE_ANG * a
      }
    }
  })

  return (
    <group>
      {/* Portón (abierto/garage): no hay muro, así que lleva su propio marco perimetral. */}
      {vano.tipo === 'porton' && (
        <mesh position={[vano.cx, WALL_H - 0.11, vano.cz]} castShadow receiveShadow>
          <boxGeometry
            args={vano.horizontal ? [vano.ancho + 0.1, 0.22, WALL_T] : [WALL_T, 0.22, vano.ancho + 0.1]}
          />
          <meshStandardMaterial color={marco} roughness={0.7} metalness={0.1} />
        </mesh>
      )}

      {vano.tipo === 'porton' &&
        [-1, 1].map((s) => (
          <mesh
            key={s}
            position={[vano.cx + ax * half * s, WALL_H / 2, vano.cz + az * half * s]}
            castShadow
            receiveShadow
          >
            <boxGeometry args={[WALL_T * 0.9, WALL_H, WALL_T * 0.9]} />
            <meshStandardMaterial color={marco} roughness={0.7} metalness={0.1} />
          </mesh>
        ))}

      {vano.tipo === 'porton' && (
        <mesh
          ref={portonRef}
          position={[vano.cx, PUERTA_BASE_Y + PUERTA_ALTO / 2, vano.cz]}
          castShadow
          receiveShadow
        >
          <boxGeometry
            args={
              vano.horizontal
                ? [vano.ancho - 0.06, PUERTA_ALTO, PUERTA_GROSOR]
                : [PUERTA_GROSOR, PUERTA_ALTO, vano.ancho - 0.06]
            }
          />
          <meshStandardMaterial color={PORTON_COLOR} roughness={0.25} metalness={0.7} />
        </mesh>
      )}

      {vano.tipo === 'puerta' && tipoPuerta === 'corredera' && (
        <group ref={correderaRef} position={[vano.cx, 0, vano.cz]}>
          <mesh position={[0, PUERTA_BASE_Y + hAlto / 2, 0]} castShadow receiveShadow>
            <boxGeometry
              args={
                vano.horizontal
                  ? [vano.ancho - 0.1, hAlto, PUERTA_GROSOR]
                  : [PUERTA_GROSOR, hAlto, vano.ancho - 0.1]
              }
            />
            <meshStandardMaterial color={colorPuerta} roughness={0.35} metalness={0.4} />
          </mesh>
        </group>
      )}

      {vano.tipo === 'puerta' && tipoPuerta === 'porton' &&
        Array.from({ length: 5 }, (_, i) => (
          <mesh
            key={i}
            position={[
              vano.cx,
              PUERTA_BASE_Y + 0.35 + i * (hAlto / 5),
              vano.cz,
            ]}
            castShadow
          >
            <boxGeometry
              args={
                vano.horizontal
                  ? [vano.ancho - 0.08, hAlto / 5 - 0.06, PUERTA_GROSOR]
                  : [PUERTA_GROSOR, hAlto / 5 - 0.06, vano.ancho - 0.08]
              }
            />
            <meshStandardMaterial color={colorPuerta} roughness={0.3} metalness={0.65} />
          </mesh>
        ))}

      {vano.tipo === 'puerta' &&
        (tipoPuerta === 'recta' || tipoPuerta === 'doble') &&
        hojas.map((h, i) => (
          <group
            key={i}
            ref={(el) => { hojasRefs.current[i] = el }}
            position={[h.hingeX, 0, h.hingeZ]}
            rotation={[0, h.closedYaw, 0]}
          >
            <HojaPuertaMesh width={h.width} color={colorPuerta} alto={hAlto} />
          </group>
        ))}
    </group>
  )
}

/**
 * Estructura 3D de un cuarto estilo Roblox: piso por celda (forma libre), paredes
 * chunky con puertas (de walls.ts), mueble temático y decoración. Cuando `atenuado`
 * (editando OTRO cuarto), se dibuja translúcido y sin interacción ni objetos.
 */
export function Room3D({
  id,
  position,
  color,
  atenuado = false,
  preview = false,
  forzarTecho,
  resaltadoPlano = false,
}: {
  id: string
  position: [number, number, number]
  color: string
  atenuado?: boolean
  /** Modo vista previa (editor): render completo pero sin interacción de juego/edición. */
  preview?: boolean
  /** Fuerza el techo visible/oculto en preview (ignora el toggle global 🏠). */
  forzarTecho?: boolean
  /** Resaltado desde el editor de planos (sync plano ↔ 3D). */
  resaltadoPlano?: boolean
}) {
  const ocupadoPorNivel = useLayout((s) => s.ocupadoPorNivel)
  const niveles = useLayout((s) => s.niveles)
  const overrides = useLayout((s) => s.wallOverrides[id])
  const edgeStyles = useLayout((s) => s.edgeStyles[id])
  const pinceles = useLayout((s) => s.pinceles[id] ?? PINCELES_DEFAULT)
  const placed = useLayout((s) => s.placed)
  const cells = useLayout((s) => s.cells)
  const footprints = useLayout((s) => s.footprints)
  const editMode = useLayout((s) => s.editMode)
  const editingRoomId = useLayout((s) => s.editingRoomId)
  const draggingId = useLayout((s) => s.draggingId)
  const previewCell = useLayout((s) => s.previewCell)
  const dragOriginCell = useLayout((s) => s.dragOriginCell)
  const startDrag = useLayout((s) => s.startDrag)
  const planosActivo = usePlanos((s) => s.activo)
  const planosCapa = usePlanos((s) => s.capa)
  const planosHerramienta = usePlanos((s) => s.herramienta)
  const setSeleccionPlano = usePlanos((s) => s.setSeleccion)
  const seleccionPlano = usePlanos((s) => s.seleccion)

  const fp = footprints[id] ?? FOOTPRINT_DEFAULT
  const nivel = niveles[id] ?? 0
  const anchorCell =
    draggingId === id && previewCell ? previewCell : cells[id]
  const zonas = zonasRepo.useAll() ?? []
  const ocupado = useMemo(
    () => ocupadoConZonas(nivel, ocupadoPorNivel, zonas),
    [nivel, ocupadoPorNivel, zonas],
  )
  const bounds = footprintBounds(fp)
  const boundsFpRect = footprintBoundsRect(fp)
  const W = bounds.w * SIZE
  const H = bounds.h * SIZE
  const formasCeldaLayout = useLayout((s) => s.formasCelda[id])
  const formasEfectivas = useMemo(() => formasCeldaLayout ?? {}, [formasCeldaLayout])
  const segs = useMemo(() => {
    if (!anchorCell) return []
    const raw = roomWallSegments(anchorCell, fp, ocupado, overrides, edgeStyles, pinceles)
    return filtrarSegmentosPorForma(raw, formasEfectivas)
  }, [anchorCell, fp, ocupado, overrides, edgeStyles, pinceles, formasEfectivas])
  const vanos = useMemo(() => {
    if (!anchorCell) return []
    return roomDoorways(anchorCell, fp, ocupado, overrides, edgeStyles, pinceles)
  }, [anchorCell, fp, ocupado, overrides, edgeStyles, pinceles])
  // El techo se apoya en el muro más alto del cuarto (no en una altura fija).
  const alturaTecho = alturaTechoDeSegs(segs)
  const conTechoGlobal = useHouse((s) => s.conTecho)
  const conTecho = forzarTecho ?? conTechoGlobal
  // Tema global: reemplaza las texturas del shell (muros/piso/techo) por las del
  // tema (hoja 4 del Excel), mezclándolas con el color del cuarto para conservar
  // su identidad. Sin tema, se usa el color del cuarto con tintes relativos.
  const temaGlobalRaw = useDiseño((s) => s.temaGlobal)
  const tema = getTema(temaGlobalRaw)
  const techoTipoGlobal = useDiseño((s) => s.techoTipo)
  const roomTechoTipos = useDiseño((s) => s.roomTechoTipos)
  const roomTechoFormas = useDiseño((s) => s.roomTechoFormas)
  const roomTechoParams = useDiseño((s) => s.roomTechoParams)
  const roomTechoFormasCelda = useDiseño((s) => s.roomTechoFormasCelda)
  const roomTechoColors = useDiseño((s) => s.roomTechoColors)
  const roomTechoImagenes = useDiseño((s) => s.roomTechoImagenes)
  const roomTechoImagenActiva = useDiseño((s) => s.roomTechoImagenActiva)
  const roomTechoImagenAjuste = useDiseño((s) => s.roomTechoImagenAjuste)
  const roomMuroImagenes = useDiseño((s) => s.roomMuroImagenes)
  const roomMuroImagenActiva = useDiseño((s) => s.roomMuroImagenActiva)
  const roomMuroImagenAjuste = useDiseño((s) => s.roomMuroImagenAjuste)
  const roomTechoExtraAll = useDiseño((s) => s.roomTechoExtra)
  const roomTechoExtra = roomTechoExtraAll[id] ?? []
  // Material del techo: override del cuarto si existe, si no el global de la casa.
  const techoTipo = id in roomTechoTipos ? roomTechoTipos[id] : techoTipoGlobal
  const techoTinte = roomTechoColors[id]
  const techoImagen = roomTechoImagenActiva[id] ? roomTechoImagenes[id] : undefined
  const techoImagenAjuste = roomTechoImagenAjuste[id] ?? 'x1'
  const techoFormaPropia = roomTechoFormas[id] ?? 'plano'
  const techoParamsPropia = roomTechoParams[id] ?? TECHO_PARAMS_DEFAULT

  // Techo: losa por celda (footprint + extensiones), con visibilidad por celda.
  const ocupadoNivelSup = ocupadoPorNivel.get(nivel + 1)

  const offsetsTechoAll = anchorCell ? offsetsTecho(anchorCell, fp, roomTechoExtra) : fp
  const boundsTechoRect = footprintBoundsRect(offsetsTechoAll)
  const Wt = boundsTechoRect.w * SIZE
  const Ht = boundsTechoRect.h * SIZE
  const [techoDx, techoDz] = centroRelativo(boundsFpRect, boundsTechoRect)
  const absDeOffset = (off: { col: number; row: number }) =>
    anchorCell
      ? { col: anchorCell.col + off.col, row: anchorCell.row + off.row }
      : { col: 0, row: 0 }
  const esCeldaFootprint = (off: { col: number; row: number }) =>
    fp.some((o) => o.col === off.col && o.row === off.row)

  const celdaTechoVisible = (off: { col: number; row: number }) => {
    const abs = absDeOffset(off)
    if (ocupadoNivelSup && tileOcupado(ocupadoNivelSup, abs.col, abs.row)) return false
    if (techoExtraDeOtroEnCelda(abs, id, nivel, roomTechoExtraAll, placed, niveles)) return false
    // Extensiones solo sobre celdas con cuarto (no terrazas en vacío).
    if (!esCeldaFootprint(off) && !tileOcupado(ocupado, abs.col, abs.row)) return false
    return true
  }
  const offsetsTechoVisibles = offsetsTechoAll.filter(celdaTechoVisible)
  const hayTechoVisible = offsetsTechoVisibles.length > 0
  // Celdas absolutas con losa visible: para alinear el techo con los muros.
  const visibleAbsSet = new Set(
    offsetsTechoVisibles.map((o) => { const a = absDeOffset(o); return cellId(a.col, a.row) }),
  )
  // Rendija decorativa entre losas del mismo techo.
  const INSET_TECHO = 0.06
  /**
   * Margen del techo en un lado (desde el eje del muro): hacia la cara exterior
   * del muro en fachada (sin vecino), 0 al lindar con otro cuarto (se encuentran
   * en el eje sin solaparse) y rendija negativa entre losas del propio techo.
   */
  const margenLado = (off: { col: number; row: number }, dCol: number, dRow: number) => {
    const abs = absDeOffset(off)
    const kVec = cellId(abs.col + dCol, abs.row + dRow)
    if (visibleAbsSet.has(kVec)) return -INSET_TECHO // losa propia adyacente
    if (tileOcupado(ocupado, abs.col + dCol, abs.row + dRow)) return 0 // otro cuarto: encuentro en el eje
    return WALL_T / 2 // fachada: cubrir la cara exterior del muro
  }
  // Forma única (no plana): margen por lado de la caja contenedora. Solo se
  // extiende a la fachada si TODO el borde es fachada (si no, queda en el eje
  // para no solaparse con un cuarto vecino).
  const maxRowTecho = boundsTechoRect.minRow + boundsTechoRect.h - 1
  const maxColTecho = boundsTechoRect.minCol + boundsTechoRect.w - 1
  const ladoCajaFachada = (
    celdas: { col: number; row: number }[],
    dCol: number,
    dRow: number,
  ) =>
    celdas.length > 0 &&
    celdas.every((off) => {
      const abs = absDeOffset(off)
      const kVec = cellId(abs.col + dCol, abs.row + dRow)
      return !tileOcupado(ocupado, abs.col + dCol, abs.row + dRow) && !visibleAbsSet.has(kVec)
    })
  const margenCaja = {
    N: ladoCajaFachada(offsetsTechoVisibles.filter((o) => o.row === boundsTechoRect.minRow), 0, -1) ? WALL_T / 2 : 0,
    S: ladoCajaFachada(offsetsTechoVisibles.filter((o) => o.row === maxRowTecho), 0, 1) ? WALL_T / 2 : 0,
    O: ladoCajaFachada(offsetsTechoVisibles.filter((o) => o.col === boundsTechoRect.minCol), -1, 0) ? WALL_T / 2 : 0,
    E: ladoCajaFachada(offsetsTechoVisibles.filter((o) => o.col === maxColTecho), 1, 0) ? WALL_T / 2 : 0,
  }

  // Si hay un cuarto directamente abajo sin override propio, heredamos su forma de techo.
  const idAbajo: string | undefined =
    nivel > 0
      ? Object.keys(placed).find(
          (rid) =>
            placed[rid] &&
            (niveles[rid] ?? 0) === nivel - 1 &&
            cells[rid]?.col === cells[id]?.col &&
            cells[rid]?.row === cells[id]?.row,
        )
      : undefined
  const techoForma =
    id in roomTechoFormas
      ? techoFormaPropia
      : idAbajo !== undefined
        ? (roomTechoFormas[idAbajo] ?? techoFormaPropia)
        : techoFormaPropia
  const techoParams =
    id in roomTechoParams
      ? techoParamsPropia
      : idAbajo !== undefined
        ? (roomTechoParams[idAbajo] ?? techoParamsPropia)
        : techoParamsPropia

  // Fabricación de techo POR CELDA (rejilla): si el cuarto tiene formas de celda,
  // cada celda se dibuja con su propia forma (las no tocadas quedan planas).
  const techoCeldas = roomTechoFormasCelda[id] ?? {}
  const hayTechoPorCelda = Object.keys(techoCeldas).length > 0

  // Plano sin inclinación = losetas por celda; cualquier otra forma (o plano inclinado) = pieza única.
  const techoPlanoLosetas = techoForma === 'plano' && techoParams.inclinacion <= 0

  // Dos aguas: si el muro del lado del hastial ya tiene forma "triángulo" lo
  // bastante ancha para cerrar todo ese lado, el muro hace de hastial (apoya
  // la silueta) y se omite la cara duplicada del techo (si no, dejaría un hueco).
  const ladoTieneForma = (lado: 'N' | 'S' | 'E' | 'O', forma: 'triangulo' | 'arco') => {
    const delLado = segs.filter((s) => s.clave?.endsWith(`,${lado}`) && s.alturaM == null)
    return (
      delLado.length > 0 &&
      delLado.every((s) => s.forma === forma && (forma !== 'triangulo' || (s.formaAncho ?? 0.32) >= 0.9))
    )
  }
  const aguasDir = ((techoParams.dir % 4) + 4) % 4
  const ridgeZ = aguasDir % 2 === 0 ? Wt >= Ht : !(Wt >= Ht)
  const esDosAguas = techoForma === 'dos_aguas' && techoParams.aguas === 2
  const esAbovedado = techoForma === 'abovedado'
  const ocultarHastialNeg = (esDosAguas || esAbovedado) && ladoTieneForma(ridgeZ ? 'N' : 'O', 'triangulo')
  const ocultarHastialPos = (esDosAguas || esAbovedado) && ladoTieneForma(ridgeZ ? 'S' : 'E', 'triangulo')
  const shell = tema?.shell
  // El color del cuarto es el color dominante en todas las superficies.
  // Con tema: el tema aporta variación sutil pero el color del cuarto siempre es mayoría.
  const baseColor = shell ? mezclar(color, shell.muroInt, 0.4) : colorConTema(color, tema)
  const roomPisoTipos = useDiseño((s) => s.roomPisoTipos)
  const roomPisoColors = useDiseño((s) => s.roomPisoColors)
  const roomPisoImagenes = useDiseño((s) => s.roomPisoImagenes)
  const roomPisoImagenActiva = useDiseño((s) => s.roomPisoImagenActiva)
  const roomPisoImagenAjuste = useDiseño((s) => s.roomPisoImagenAjuste)
  // La imagen solo se muestra en 3D cuando está explícitamente activa
  const pisoImagen = roomPisoImagenActiva[id] ? roomPisoImagenes[id] : undefined
  const pisoImagenAjuste = roomPisoImagenAjuste[id] ?? 'x1'
  const tienePisoCustom = id in roomPisoTipos
  const pisoTipoCuarto = roomPisoTipos[id]
  const sinPiso = esSinPiso(pisoTipoCuarto)
  const pisoConfCuarto = pisoTipoCuarto && !sinPiso ? getPisoTipo(pisoTipoCuarto) : null
  let floorColor = shell ? mezclar(color, shell.piso, 0.3) : tint(baseColor, 35)
  if (tienePisoCustom) {
    const tinte = roomPisoColors[id]
    if (pisoConfCuarto?.textura) {
      // Textura siempre nativa (blanco = sin oscurecer). El tinte se aplica como
      // emisivo dentro de PisoCelda para teñir sin perder brillo ni detalle.
      floorColor = '#ffffff'
    } else if (pisoConfCuarto) {
      // Tipo sin textura: los procedurales (mosaico, ajedrez, grid neón) se dibujan aparte;
      // los planos (pasto rosa, niebla) usan su color del tipo, tintado si hay color elegido.
      floorColor = tinte ? mezclar(pisoConfCuarto.color, tinte, 0.6) : pisoConfCuarto.color
    } else {
      // Color sólido: el color elegido o el del cuarto.
      floorColor = tinte ?? color
    }
  }
  const floorRough = pisoConfCuarto?.roughness ?? 0.85
  const floorMetal = pisoConfCuarto?.metalness ?? 0
  const floorEmissiveMat = pisoConfCuarto?.emissive ?? '#000000'
  const floorEmissiveIntMat = pisoConfCuarto?.emissiveIntensity ?? 0
  const techoColor = shell ? mezclar(color, shell.techo, 0.35) : tint(baseColor, -25)
  const wallRough = tema?.roughness ?? 0.6
  const wallMetal = tema?.metalness ?? 0
  const wallEmissive = tema?.emissive ?? '#000000'
  const wallEmissiveInt = tema?.emissiveIntensity ?? 0
  // Fachada exterior: más oscura que el interior para distinguir el perímetro.
  const muroExtColor = shell ? mezclar(color, shell.muroExt, 0.4) : tint(baseColor, -28)
  const extRough = Math.min(1, wallRough + 0.2)
  // Ventanas (solo en fachada de pisos ≥ 1): marco oscuro + cristal celeste.
  const marcoColor = tint(baseColor, -55)
  const cristalColor = '#bcdcff'
  const setTarget = useHouse((s) => s.setTarget)
  const selectMueble = useInteractUi((s) => s.selectMueble)
  const clearInteract = useInteractUi((s) => s.clear)
  const selectedRoomId = useHouse((s) => s.selectedRoomId)
  const nearRoomId = useHouse((s) => s.nearRoomId)
  const seleccionado = selectedRoomId === id
  const cerca = nearRoomId === id
  const arrastrando = draggingId === id
  const celdaValida =
    !arrastrando ||
    !previewCell ||
    !cells[id] ||
    puedeMoverCuartoRegistro({
      roomId: id,
      origen: dragOriginCell ?? cells[id],
      preview: previewCell,
      fp,
      nivel,
      placed,
      cells,
      footprints,
      niveles,
      zonas: planosActivo ? zonas : [],
    })
  const objetos = useDiseño((s) => s.objetos)
  const draggingObjeto = useDiseño((s) => s.draggingObjeto)
  const startObjetoDrag = useDiseño((s) => s.startObjetoDrag)
  const objetosCuarto = objetos.filter((o) => o.roomId === id)
  const objetosEditables = editMode && editingRoomId === id && !preview

  // Overrides de piso por cuadrante (sub-celdas, coords de ¼) que caen dentro del cuarto.
  const pisosOverride = pisosExteriorRepo.useAll() ?? []
  // Overrides del nivel por coord (¼ = cuadrante; entera = relleno de celda con forma).
  const overrideMap = useMemo(() => {
    const m = new Map<string, (typeof pisosOverride)[0]>()
    for (const p of pisosOverride) {
      if ((p.nivel ?? 0) !== nivel) continue
      m.set(`${p.col},${p.row}`, p)
    }
    return m
  }, [pisosOverride, nivel])
  const overrideBlobs = useMemo(() => {
    if (!anchorCell) return []
    const out: { key: string; blob?: Blob; activa: boolean }[] = []
    const add = (k: string) => {
      const rec = overrideMap.get(k)
      out.push({ key: k, blob: rec?.pisoImagen, activa: !!(rec?.pisoImagenActiva && rec?.pisoImagen) })
    }
    for (const off of fp) {
      const ac = anchorCell.col + off.col
      const ar = anchorCell.row + off.row
      add(`${ac},${ar}`) // relleno de celda con forma
      for (const o of CUADRANTES_OFF) add(`${ac + o.dc},${ar + o.dr}`)
    }
    return out
  }, [anchorCell, fp, overrideMap])
  const overrideUrls = useBlobUrlMap(overrideBlobs)
  const colorJardin = colorExteriorDefecto(temaGlobalRaw)

  /** Posición de una ranura de decoración (esquinas de la caja contenedora). */
  const slotPos = (slot: number): [number, number] => [
    (slot % 2 === 0 ? -1 : 1) * (W / 2 - 1.4),
    (slot < 2 ? -1 : 1) * (H / 2 - 1.4),
  ]

  const onFloorClick = (e: ThreeEvent<MouseEvent>) => {
    if (editMode || atenuado || preview) return
    // En 1ª/3ª persona el clic en el suelo no mueve (el arrastre gira la cámara).
    if (useCam.getState().vista !== 'iso') return
    e.stopPropagation()
    clearInteract()
    setTarget(e.point.x, e.point.z)
  }
  // Mover cuartos en Editar mapa, o en Planos con herramienta Mover.
  const planosMover =
    planosActivo && planosCapa === 'cuartos' && planosHerramienta === 'mover'
  const planosAgregar =
    planosActivo && planosCapa === 'cuartos' && planosHerramienta === 'agregar'
  const planosEditarForma =
    planosActivo && planosCapa === 'cuartos' && planosHerramienta === 'editar-forma'
  const puedeMoverCuarto =
    editMode && !editingRoomId && !atenuado && !preview && (!planosActivo || planosMover)
  const onFloorDown = (e: ThreeEvent<PointerEvent>) => {
    if (!puedeMoverCuarto) return
    e.stopPropagation()
    if (planosMover) setSeleccionPlano({ tipo: 'cuarto', roomId: id })
    startDrag(id)
  }

  return (
    <group position={position}>
      {/* Piso: una loseta por celda del footprint */}
      {anchorCell &&
        fp.map((off, i) => {
        const [lx, lz] = tileLocalEnCuarto(anchorCell, off, fp)
        const emissiveSel = atenuado
          ? '#000000'
          : resaltadoPlano
            ? color
            : arrastrando && !celdaValida
              ? '#ef4444'
              : color
        const emissiveIntSel = atenuado
          ? 0
          : resaltadoPlano
            ? 0.45
            : arrastrando
              ? celdaValida
                ? 0.5
                : 0.35
              : cerca
                ? 0.35
                : seleccionado
                  ? 0.18
                  : 0
        const ac = anchorCell.col + off.col
        const ar = anchorCell.row + off.row
        const { hayAlguno, recs } = cuadrantesDeCelda(ac, ar, (c, r) => overrideMap.get(`${c},${r}`))
        if (hayAlguno) {
          const base: MatPiso = {
            sinPiso,
            color: floorColor,
            roughness: floorRough,
            metalness: floorMetal,
            pisoConf: tienePisoCustom && !pisoImagen ? pisoConfCuarto : null,
            pisoImagen,
            pisoImagenAjuste,
          }
          const overrides = recs.map((q, qi) =>
            q
              ? matDeRegistroPiso(
                  q,
                  overrideUrls.get(`${ac + CUADRANTES_OFF[qi].dc},${ar + CUADRANTES_OFF[qi].dr}`),
                  floorColor,
                )
              : null,
          )
          return (
            <group key={i}>
              <PisoCuadrantes3D cx={lx} cz={lz} base={base} overrides={overrides} atenuado={atenuado} />
            </group>
          )
        }
        if (sinPiso) return null
        const formaEf = formaEnCelda(formasEfectivas, claveCeldaOff(off.col, off.row))
        const losetaForma = (
          <PisoCelda
            lx={lx}
            lz={lz}
            formaLoseta={formaEf}
            color={floorColor}
            roughness={floorRough}
            metalness={floorMetal}
            emissive={emissiveSel !== color ? emissiveSel : floorEmissiveMat}
            emissiveIntensity={emissiveIntSel || floorEmissiveIntMat}
            pisoConf={tienePisoCustom && !pisoImagen ? pisoConfCuarto : null}
            pisoImagen={pisoImagen}
            pisoImagenAjuste={pisoImagenAjuste}
            colorTinte={roomPisoColors[id]}
            atenuado={atenuado}
            onClick={atenuado || planosAgregar || planosEditarForma ? undefined : onFloorClick}
            onPointerDown={atenuado || planosAgregar || planosEditarForma ? undefined : onFloorDown}
            onPointerOver={
              atenuado || planosAgregar || planosEditarForma
                ? undefined
                : (e) => {
                    e.stopPropagation()
                    if (!editMode) document.body.style.cursor = 'pointer'
                    else if (puedeMoverCuarto && !arrastrando)
                      document.body.style.cursor = 'grab'
                    else document.body.style.cursor = 'default'
                  }
            }
            onPointerOut={
              atenuado || planosAgregar || planosEditarForma
                ? undefined
                : () => {
                    if (!useLayout.getState().draggingId)
                      document.body.style.cursor = 'default'
                  }
            }
          />
        )
        if (esFormaCuadrada(formaEf)) return <group key={i}>{losetaForma}</group>
        // Celda con forma: relleno bajo la loseta (jardín u override de celda entera) para tapar el hueco.
        const recRelleno = overrideMap.get(`${ac},${ar}`)
        const matRelleno: MatPiso = recRelleno
          ? matDeRegistroPiso(recRelleno, overrideUrls.get(`${ac},${ar}`), colorJardin)
          : { sinPiso: false, color: colorJardin, roughness: 0.85, metalness: 0, pisoConf: null, pisoImagenAjuste: 'x1' }
        return (
          <group key={i}>
            {!matRelleno.sinPiso && (
              <group position={[0, -0.02, 0]}>
                <PisoCelda
                  lx={lx}
                  lz={lz}
                  formaLoseta={matRelleno.forma}
                  color={matRelleno.color}
                  roughness={matRelleno.roughness}
                  metalness={matRelleno.metalness}
                  emissive="#000000"
                  emissiveIntensity={0}
                  pisoConf={matRelleno.pisoConf}
                  pisoImagen={matRelleno.pisoImagen}
                  pisoImagenAjuste={matRelleno.pisoImagenAjuste}
                  atenuado={atenuado}
                />
              </group>
            )}
            {losetaForma}
          </group>
        )
      })}

      {/* Paredes: la fachada (exterior) se viste distinto al muro interior; los
          pisos ≥ 1 llevan ventanas en la fachada para diferenciarse de la base. */}
      {segs.map((s, i) => {
        const mk = s.clave ? `${id}::${s.clave}` : ''
        const imagen = mk && roomMuroImagenActiva[mk] ? roomMuroImagenes[mk] : undefined
        const resaltadoArista =
          seleccionPlano?.tipo === 'arista' &&
          seleccionPlano.roomId === id &&
          s.clave === `${seleccionPlano.off.col},${seleccionPlano.off.row},${seleccionPlano.side}`
        return (
          <MuroSegment
            key={i}
            cx={s.cx}
            cz={s.cz}
            sx={s.sx}
            sz={s.sz}
            exterior={s.exterior}
            tipoMuro={s.tipoMuro}
            colorMuro={s.colorMuro}
            alto={s.alto}
            alturaM={s.alturaM}
            yBase={s.yBase}
            ventana={s.ventana}
            ventAncho={s.ventAncho}
            ventAlto={s.ventAlto}
            ventPosY={s.ventPosY}
            ventPosX={s.ventPosX}
            ventForma={s.ventForma}
            ventRot={s.ventRot}
            ventColor={s.ventColor}
            ventMosaico={s.ventMosaico}
            ventMulticolor={s.ventMulticolor}
            forma={s.forma}
            formaAlto={s.formaAlto}
            formaAncho={s.formaAncho}
            formaPosX={s.formaPosX}
            formaDividir={s.formaDividir}
            formaColor={s.formaColor}
            imagen={imagen}
            imagenAjuste={mk ? roomMuroImagenAjuste[mk] : undefined}
            baseColor={baseColor}
            extColor={muroExtColor}
            roughness={wallRough}
            extRough={extRough}
            metalness={wallMetal}
            emissive={resaltadoArista ? '#fde047' : wallEmissive}
            emissiveInt={resaltadoArista ? 1.3 : wallEmissiveInt}
            atenuado={atenuado}
            marcoVentana={marcoColor}
            cristal={cristalColor}
          />
        )
      })}

      {anchorCell && (
        <MurosPerimetroFormaCuarto
          anchor={anchorCell}
          fp={fp}
          formasCelda={formasEfectivas}
          baseColor={baseColor}
          extColor={muroExtColor}
          roughness={wallRough}
          extRough={extRough}
          metalness={wallMetal}
          atenuado={atenuado}
        />
      )}

      {/* Puertas y portones de la FACHADA (en cualquier nivel): la hoja se abre al
          acercarse el avatar (entrar/salir). Decorativas: no añaden colisión. */}
      {!atenuado &&
        vanos
          .filter((v) => v.exterior)
          .map((v, i) => (
            <VanoFachada
              key={i}
              vano={v}
              roomPos={position}
              marco={marcoColor}
              nivel={nivel}
            />
          ))}

      {/* Techo (toggle 🏠): losa por celda o forma única según configuración. */}
      {conTecho && hayTechoVisible && !hayTechoPorCelda && techoPlanoLosetas &&
        offsetsTechoVisibles.map((off, i) => {
          const [lx, lz] = cellLocalRect(off, boundsTechoRect)
          return (
            <TechoLoseta
              key={i}
              tipo={techoTipo}
              colorCuarto={techoColor}
              tinte={techoTinte}
              imagen={techoImagen}
              imagenAjuste={techoImagenAjuste}
              y={alturaTecho + 0.06}
              lx={lx}
              lz={lz}
              mN={margenLado(off, 0, -1)}
              mS={margenLado(off, 0, 1)}
              mO={margenLado(off, -1, 0)}
              mE={margenLado(off, 1, 0)}
              atenuado={atenuado}
              formaLoseta={formaEnCelda(formasEfectivas, claveCeldaOff(off.col, off.row))}
            />
          )
        })}
      {conTecho && hayTechoVisible && !hayTechoPorCelda && !techoPlanoLosetas && (
        <group position={[techoDx, 0, techoDz]}>
          <TechoForma
            forma={techoForma}
            params={techoParams}
            tipo={techoTipo}
            colorCuarto={techoColor}
            tinte={techoTinte}
            imagen={techoImagen}
            imagenAjuste={techoImagenAjuste}
            W={Wt}
            H={Ht}
            yBase={alturaTecho + 0.06}
            margenN={margenCaja.N}
            margenS={margenCaja.S}
            margenO={margenCaja.O}
            margenE={margenCaja.E}
            ocultarHastialNeg={ocultarHastialNeg}
            ocultarHastialPos={ocultarHastialPos}
            atenuado={atenuado}
          />
        </group>
      )}

      {/* Techo POR CELDA (rejilla): cada celda con su forma; las no tocadas, planas.
          Por ahora la forma 3D solo se aplica a celdas CUADRADAS (triángulo/círculo: losa plana). */}
      {conTecho && hayTechoVisible && hayTechoPorCelda &&
        offsetsTechoVisibles.map((off, i) => {
          const [lx, lz] = cellLocalRect(off, boundsTechoRect)
          const clave = claveCeldaOff(off.col, off.row)
          const cf = techoCeldas[clave]
          const formaPiso = formaEnCelda(formasEfectivas, clave)
          const esFlat = !cf || (cf.forma === 'plano' && cf.params.inclinacion <= 0)
          if (esFlat) {
            return (
              <TechoLoseta
                key={i}
                tipo={techoTipo}
                colorCuarto={techoColor}
                tinte={techoTinte}
                imagen={techoImagen}
                imagenAjuste={techoImagenAjuste}
                y={alturaTecho + 0.06}
                lx={lx}
                lz={lz}
                mN={margenLado(off, 0, -1)}
                mS={margenLado(off, 0, 1)}
                mO={margenLado(off, -1, 0)}
                mE={margenLado(off, 1, 0)}
                atenuado={atenuado}
                formaLoseta={formaPiso}
              />
            )
          }
          // Celda cuadrada: caja TechoForma a escala de celda.
          if (esFormaCuadrada(formaPiso)) {
            return (
              <group key={i} position={[lx, alturaTecho + 0.06, lz]}>
                <TechoForma
                  forma={cf.forma}
                  params={cf.params}
                  tipo={techoTipo}
                  colorCuarto={techoColor}
                  tinte={techoTinte}
                  imagen={techoImagen}
                  imagenAjuste={techoImagenAjuste}
                  W={SIZE}
                  H={SIZE}
                  yBase={0}
                  margenN={margenLado(off, 0, -1)}
                  margenS={margenLado(off, 0, 1)}
                  margenO={margenLado(off, -1, 0)}
                  margenE={margenLado(off, 1, 0)}
                  atenuado={atenuado}
                />
              </group>
            )
          }
          // Celda triangular/circular: geometría propia siguiendo su silueta.
          return (
            <group key={i} position={[lx, alturaTecho + 0.06, lz]}>
              <TechoCeldaNoCuadrada
                formaLoseta={formaPiso}
                cf={cf}
                tipo={techoTipo}
                colorCuarto={techoColor}
                tinte={techoTinte}
                tile={SIZE}
                atenuado={atenuado}
              />
            </group>
          )
        })}

      {/* Objetos (mueble + decoración) — ocultos en cuartos atenuados.
          El tema activo re-viste sus primitivas vía TemaContext. */}
      {!atenuado && (
        <TemaContext.Provider value={tema}>
          {objetosCuarto.map((o) => {
          const ox = o.x ?? slotPos(o.slot)[0]
          const oz = o.z ?? slotPos(o.slot)[1]
          const drag = draggingObjeto === o.id
          const rotY = ((o.rotY ?? 0) * Math.PI) / 180
          const esPrincipal = esMueblePrincipal(o)
          return (
            <group
              key={o.id}
              position={[ox, drag ? 0.6 : 0.2, oz]}
              rotation={[0, rotY, 0]}
              onClick={
                !editMode && esPrincipal && !preview
                  ? (e) => {
                      e.stopPropagation()
                      selectMueble(id)
                    }
                  : undefined
              }
              onPointerDown={
                objetosEditables
                  ? (e) => {
                      e.stopPropagation()
                      if (o.id != null) startObjetoDrag(o.id)
                    }
                  : undefined
              }
              onPointerOver={(e) => {
                e.stopPropagation()
                if (objetosEditables) document.body.style.cursor = 'grab'
                else if (!editMode && esPrincipal)
                  document.body.style.cursor = 'pointer'
              }}
              onPointerOut={() => {
                if (!useDiseño.getState().draggingObjeto && !editMode)
                  document.body.style.cursor = 'default'
              }}
            >
              <ObjetoView tipo={o.tipo} color={o.color} />
              {esPrincipal && <MarcadorEntrada y={altoDeTipo(o.tipo) + 0.45} />}
            </group>
          )
          })}
        </TemaContext.Provider>
      )}
    </group>
  )
}
