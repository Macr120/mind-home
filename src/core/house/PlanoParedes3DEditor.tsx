import { useMemo, useState } from 'react'
import type { ThreeEvent } from '@react-three/fiber'
import { usePlanos } from '../state/planosStore'
import { useLayout } from '../state/layoutStore'
import { useHouse } from '../state/houseStore'
import { VACIO, zonasRepo } from '../data/repository'
import { aristasEnNivel } from './planoGeometria'
import { aristasZonasEnNivel } from './murosZona'
import { paintZonaMuro } from '../ui/planos/paintZonaMuro'
import {
  centroCuarto3D,
  tileLocalEnCuarto,
  nivelBaseY,
  HALF,
  WALL_H,
  WALL_T,
  SIZE,
  FOOTPRINT_DEFAULT,
  type Cell,
  type SideKey,
  type WallState,
} from './walls'
import { zonaAnchorFootprint } from './planoGeometria'

const DELTA: Record<SideKey, [number, number]> = {
  N: [0, -HALF],
  S: [0, HALF],
  O: [-HALF, 0],
  E: [HALF, 0],
}

// Verde: colocar muro en arista vacía. Ámbar: muro existente seleccionable.
const COLOR_GHOST_VACIO = '#34d399'

/** Nivel sin celdas ocupadas: referencia estable (un `new Set()` por render rompía el memo). */
const SIN_OCUPADAS: Set<string> = new Set()
const COLOR_GHOST_MURO = '#fde047'

// Evita que el colocador de muros libres cree un muro duplicado cuando el clic fue
// sobre una arista de cuarto/zona (que solo selecciona/edita). Se marca en el pointerdown
// de la arista y PlanoMuros3DController lo consume (una sola vez) en su pointerup.
let _clicAristaEn = 0
function marcarClicArista() {
  _clicAristaEn = performance.now()
}
export function consumirClicArista(): boolean {
  const reciente = _clicAristaEn > 0 && performance.now() - _clicAristaEn < 1000
  _clicAristaEn = 0
  return reciente
}

/** Caja del muro de una arista según su lado (N/S a lo largo de X; E/O a lo largo de Z). */
function dimsArista(side: SideKey): [number, number, number] {
  return side === 'N' || side === 'S' ? [SIZE, WALL_H, WALL_T] : [WALL_T, WALL_H, SIZE]
}

/**
 * Arista de muro clicable en 3D: invisible en reposo (sin cubos). Al pasar el cursor (o si
 * está seleccionada) muestra un ghost translúcido del muro — verde si la arista está vacía
 * (colocar) o ámbar si ya hay muro (seleccionar/editar). Clic aplica la herramienta.
 */
function AristaMuro3D({
  x,
  y,
  z,
  side,
  vacia,
  resaltado,
  onClick,
}: {
  x: number
  y: number
  z: number
  side: SideKey
  vacia: boolean
  resaltado: boolean
  onClick: (e: ThreeEvent<MouseEvent>) => void
}) {
  const [hover, setHover] = useState(false)
  const activo = hover || resaltado
  const color = vacia ? COLOR_GHOST_VACIO : COLOR_GHOST_MURO
  return (
    <mesh
      position={[x, y, z]}
      onClick={onClick}
      onPointerDown={(e) => {
        e.stopPropagation()
        marcarClicArista()
      }}
      onPointerOver={(e) => {
        e.stopPropagation()
        setHover(true)
        document.body.style.cursor = 'pointer'
      }}
      onPointerOut={() => {
        setHover(false)
        document.body.style.cursor = 'default'
      }}
    >
      <boxGeometry args={dimsArista(side)} />
      <meshStandardMaterial
        color={color}
        transparent
        opacity={activo ? 0.4 : 0}
        emissive={color}
        emissiveIntensity={activo ? 0.5 : 0}
        depthWrite={false}
      />
    </mesh>
  )
}

/**
 * Edición de paredes en 3D (capa Paredes): un marcador por arista de cada cuarto/zona. Clic
 * aplica la herramienta (muro/puerta/ventana) o selecciona la arista para el panel.
 */
export function PlanoParedes3DEditor() {
  const planosActivo = usePlanos((s) => s.activo)
  const capa = usePlanos((s) => s.capa)
  const herramienta = usePlanos((s) => s.herramienta)
  const nivel = usePlanos((s) => s.nivel)
  const seleccion = usePlanos((s) => s.seleccion)
  const setSeleccion = usePlanos((s) => s.setSeleccion)

  const apilado = !useHouse((s) => s.explotado)
  const placed = useLayout((s) => s.placed)
  const cells = useLayout((s) => s.cells)
  const footprints = useLayout((s) => s.footprints)
  const niveles = useLayout((s) => s.niveles)
  const ocupadoPorNivel = useLayout((s) => s.ocupadoPorNivel)
  const wallOverrides = useLayout((s) => s.wallOverrides)
  const edgeStyles = useLayout((s) => s.edgeStyles)
  const paintEdge = useLayout((s) => s.paintEdge)
  const setEdgeEstilo = useLayout((s) => s.setEdgeEstilo)
  const zonas = zonasRepo.useAll() ?? VACIO

  // Marcadores por arista solo al CREAR (herramienta 'muro'). En Seleccionar/Puertas/Ventanas
  // la selección la hace PlanoMuroSelector3D por raycast de la malla real (sin ghost de caja).
  const activo = planosActivo && capa === 'paredes' && herramienta === 'muro'
  const baseY = nivelBaseY(nivel, apilado) + WALL_H * 0.5

  const aristasCuartos = useMemo(
    () =>
      activo
        ? aristasEnNivel(nivel, placed, cells, footprints, niveles, ocupadoPorNivel, wallOverrides)
        : [],
    [activo, nivel, placed, cells, footprints, niveles, ocupadoPorNivel, wallOverrides],
  )

  const ocupadoLayout = ocupadoPorNivel.get(nivel) ?? SIN_OCUPADAS
  const aristasZonas = useMemo(
    () => (activo ? aristasZonasEnNivel(nivel, zonas, ocupadoLayout) : []),
    [activo, nivel, zonas, ocupadoLayout],
  )

  if (!activo) return null

  // Solo modo Crear (herramienta 'muro'): si la arista está vacía, se coloca muro; si ya hay
  // muro, el clic solo la selecciona. (Puerta/ventana se aplican con PlanoMuroSelector3D.)
  const accionCuarto = (roomId: string, off: Cell, side: SideKey, estado: WallState) => {
    setSeleccion({ tipo: 'arista', roomId, off, side })
    if (estado === 'abierto') {
      void paintEdge(roomId, off, side, 'pared')
      void setEdgeEstilo(roomId, off, side, { muro: { ventana: false } })
    }
  }

  const accionZona = (zonaId: number, off: Cell, side: SideKey, estado: WallState) => {
    setSeleccion({ tipo: 'arista-zona', zonaId, off, side })
    if (estado === 'abierto') void paintZonaMuro(zonaId, off, side, 'pared')
  }

  return (
    <>
      {aristasCuartos.map(({ roomId, edge, estado }, i) => {
        const anchor = cells[roomId]
        const fp = footprints[roomId] ?? FOOTPRINT_DEFAULT
        if (!anchor) return null
        const [rx, , rz] = centroCuarto3D(anchor, fp)
        const [lx, lz] = tileLocalEnCuarto(anchor, edge.off, fp)
        const [dx, dz] = DELTA[edge.side]
        const ventana = !!edgeStyles[roomId]?.[`${edge.off.col},${edge.off.row},${edge.side}`]?.muro?.ventana
        const vacia = estado === 'abierto' && !ventana
        const sel =
          seleccion?.tipo === 'arista' &&
          seleccion.roomId === roomId &&
          seleccion.off.col === edge.off.col &&
          seleccion.off.row === edge.off.row &&
          seleccion.side === edge.side
        return (
          <AristaMuro3D
            key={`mc-${roomId}-${i}`}
            x={rx + lx + dx}
            y={baseY}
            z={rz + lz + dz}
            side={edge.side}
            vacia={vacia}
            resaltado={sel}
            onClick={(e) => {
              e.stopPropagation()
              accionCuarto(roomId, edge.off, edge.side, estado)
            }}
          />
        )
      })}

      {aristasZonas.map(({ zonaId, edge, estado }, i) => {
        const z = zonas.find((zz) => zz.id === zonaId)
        if (!z) return null
        const { anchor, footprint } = zonaAnchorFootprint(z.celdas)
        const [rx, , rz] = centroCuarto3D(anchor, footprint)
        const [lx, lz] = tileLocalEnCuarto(anchor, edge.off, footprint)
        const [dx, dz] = DELTA[edge.side]
        const vacia = estado === 'abierto'
        const sel =
          seleccion?.tipo === 'arista-zona' &&
          seleccion.zonaId === zonaId &&
          seleccion.off.col === edge.off.col &&
          seleccion.off.row === edge.off.row &&
          seleccion.side === edge.side
        return (
          <AristaMuro3D
            key={`mz-${zonaId}-${i}`}
            x={rx + lx + dx}
            y={baseY}
            z={rz + lz + dz}
            side={edge.side}
            vacia={vacia}
            resaltado={sel}
            onClick={(e) => {
              e.stopPropagation()
              accionZona(zonaId, edge.off, edge.side, estado)
            }}
          />
        )
      })}
    </>
  )
}
