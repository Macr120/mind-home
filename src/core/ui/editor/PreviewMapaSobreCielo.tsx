import { useMemo } from 'react'
import { useLayout } from '../../state/layoutStore'
import { useDiseño } from '../../state/disenoStore'
import { useCuartos } from '../../state/cuartosStore'
import { cellToWorld, footprintCells, SIZE } from '../../house/walls'
import { crearProyectorCielo } from '../../house/proyectarPreviewCielo'

interface Props {
  ancho: number
  alto: number
}

/** Silueta del mapa en coordenadas del viewport 3D (fija; no se mueve con el pan). */
export function PreviewMapaSobreCielo({ ancho, alto }: Props) {
  const editMode = useLayout((s) => s.editMode)
  const placed = useLayout((s) => s.placed)
  const cells = useLayout((s) => s.cells)
  const footprints = useLayout((s) => s.footprints)
  const roomColors = useDiseño((s) => s.roomColors)
  const cuartos = useCuartos((s) => s.cuartos)

  const bloques = useMemo(() => {
    if (ancho < 1 || alto < 1) return []
    const proyectar = crearProyectorCielo(ancho, alto, editMode)
    const half = SIZE / 2
    const out: { x: number; y: number; w: number; h: number; color: string }[] = []

    for (const room of cuartos) {
      if (!placed[room.id]) continue
      const anchor = cells[room.id]
      const fp = footprints[room.id]
      if (!anchor || !fp?.length) continue

      let minX = Infinity
      let minY = Infinity
      let maxX = -Infinity
      let maxY = -Infinity

      for (const c of footprintCells(anchor, fp)) {
        const [cx, , cz] = cellToWorld(c.col, c.row)
        for (const [wx, wz] of [
          [cx - half, cz - half],
          [cx + half, cz - half],
          [cx + half, cz + half],
          [cx - half, cz + half],
        ] as const) {
          const p = proyectar(wx, 0, wz)
          minX = Math.min(minX, p.x)
          minY = Math.min(minY, p.y)
          maxX = Math.max(maxX, p.x)
          maxY = Math.max(maxY, p.y)
        }
      }

      if (!Number.isFinite(minX)) continue
      out.push({
        x: minX,
        y: minY,
        w: Math.max(2, maxX - minX),
        h: Math.max(2, maxY - minY),
        color: roomColors[room.id] ?? room.color,
      })
    }
    return out
  }, [cuartos, placed, cells, footprints, roomColors, ancho, alto, editMode])

  if (bloques.length === 0) return null

  return (
    <svg
      className="pointer-events-none absolute inset-0 h-full w-full"
      viewBox={`0 0 ${ancho} ${alto}`}
      preserveAspectRatio="none"
      aria-hidden
    >
      {bloques.map((b, i) => (
        <rect
          key={i}
          x={b.x}
          y={b.y}
          width={b.w}
          height={b.h}
          fill={b.color}
          fillOpacity={0.78}
          stroke="rgba(0,0,0,0.55)"
          strokeWidth={1.5}
          rx={1}
        />
      ))}
    </svg>
  )
}
