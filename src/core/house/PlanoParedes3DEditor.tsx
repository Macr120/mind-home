import { useMemo } from 'react'
import type { ThreeEvent } from '@react-three/fiber'
import { usePlanos } from '../state/planosStore'
import { useLayout } from '../state/layoutStore'
import { useHouse } from '../state/houseStore'
import { zonasRepo } from '../data/repository'
import { aristasEnNivel, COLOR_ARISTA } from './planoGeometria'
import { aristasZonasEnNivel } from './murosZona'
import { paintZonaMuro } from '../ui/planos/paintZonaMuro'
import {
  centroCuarto3D,
  tileLocalEnCuarto,
  nivelBaseY,
  HALF,
  WALL_H,
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

/** Marcador clicable de una arista en 3D: color según estado, resaltado si está seleccionado. */
function MarcadorArista({
  x,
  y,
  z,
  color,
  resaltado,
  onClick,
}: {
  x: number
  y: number
  z: number
  color: string
  resaltado: boolean
  onClick: (e: ThreeEvent<MouseEvent>) => void
}) {
  return (
    <mesh
      position={[x, y, z]}
      onClick={onClick}
      onPointerOver={(e) => {
        e.stopPropagation()
        document.body.style.cursor = 'pointer'
      }}
      onPointerOut={() => {
        document.body.style.cursor = 'default'
      }}
    >
      <boxGeometry args={resaltado ? [0.7, 0.9, 0.7] : [0.5, 0.7, 0.5]} />
      <meshStandardMaterial
        color={color}
        emissive={resaltado ? '#ffffff' : color}
        emissiveIntensity={resaltado ? 0.6 : 0.25}
        roughness={0.4}
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

  const conTecho = useHouse((s) => s.conTecho)
  const placed = useLayout((s) => s.placed)
  const cells = useLayout((s) => s.cells)
  const footprints = useLayout((s) => s.footprints)
  const niveles = useLayout((s) => s.niveles)
  const ocupadoPorNivel = useLayout((s) => s.ocupadoPorNivel)
  const wallOverrides = useLayout((s) => s.wallOverrides)
  const edgeStyles = useLayout((s) => s.edgeStyles)
  const paintEdge = useLayout((s) => s.paintEdge)
  const setEdgeEstilo = useLayout((s) => s.setEdgeEstilo)
  const zonas = zonasRepo.useAll() ?? []

  const activo = planosActivo && capa === 'paredes'
  const baseY = nivelBaseY(nivel, conTecho) + WALL_H * 0.5

  const aristasCuartos = useMemo(
    () =>
      activo
        ? aristasEnNivel(nivel, placed, cells, footprints, niveles, ocupadoPorNivel, wallOverrides)
        : [],
    [activo, nivel, placed, cells, footprints, niveles, ocupadoPorNivel, wallOverrides],
  )

  const ocupadoLayout = ocupadoPorNivel.get(nivel) ?? new Set<string>()
  const aristasZonas = useMemo(
    () => (activo ? aristasZonasEnNivel(nivel, zonas, ocupadoLayout) : []),
    [activo, nivel, zonas, ocupadoLayout],
  )

  if (!activo) return null

  const colorDe = (estado: WallState, ventana: boolean) => {
    if (estado === 'puerta') return COLOR_ARISTA.puerta
    if (estado === 'abierto') return COLOR_ARISTA.abierto
    return ventana ? COLOR_ARISTA.abierto : COLOR_ARISTA.pared
  }

  const accionCuarto = (roomId: string, off: Cell, side: SideKey, estado: WallState) => {
    setSeleccion({ tipo: 'arista', roomId, off, side })
    if (herramienta === 'puerta') void paintEdge(roomId, off, side, 'puerta')
    else if (herramienta === 'ventana') {
      if (estado !== 'abierto') void setEdgeEstilo(roomId, off, side, { muro: { ventana: true } })
    } else if (herramienta === 'muro') {
      void paintEdge(roomId, off, side, 'pared')
      void setEdgeEstilo(roomId, off, side, { muro: { ventana: false } })
    }
  }

  const accionZona = (zonaId: number, off: Cell, side: SideKey) => {
    setSeleccion({ tipo: 'arista-zona', zonaId, off, side })
    if (herramienta === 'puerta') void paintZonaMuro(zonaId, off, side, 'puerta')
    else if (herramienta === 'muro') void paintZonaMuro(zonaId, off, side, 'pared')
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
        const sel =
          seleccion?.tipo === 'arista' &&
          seleccion.roomId === roomId &&
          seleccion.off.col === edge.off.col &&
          seleccion.off.row === edge.off.row &&
          seleccion.side === edge.side
        return (
          <MarcadorArista
            key={`mc-${roomId}-${i}`}
            x={rx + lx + dx}
            y={baseY}
            z={rz + lz + dz}
            color={colorDe(estado, ventana)}
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
        const sel =
          seleccion?.tipo === 'arista-zona' &&
          seleccion.zonaId === zonaId &&
          seleccion.off.col === edge.off.col &&
          seleccion.off.row === edge.off.row &&
          seleccion.side === edge.side
        return (
          <MarcadorArista
            key={`mz-${zonaId}-${i}`}
            x={rx + lx + dx}
            y={baseY}
            z={rz + lz + dz}
            color={colorDe(estado, false)}
            resaltado={sel}
            onClick={(e) => {
              e.stopPropagation()
              accionZona(zonaId, edge.off, edge.side)
            }}
          />
        )
      })}
    </>
  )
}
