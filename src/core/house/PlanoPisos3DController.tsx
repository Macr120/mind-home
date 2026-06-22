import { useCallback, useEffect, useMemo } from 'react'
import { useThree } from '@react-three/fiber'
import { useCuartos } from '../state/cuartosStore'
import { usePlanos } from '../state/planosStore'
import { useLayout } from '../state/layoutStore'
import { useHouse } from '../state/houseStore'
import { zonasRepo } from '../data/repository'
import { cuadranteBajoCursor, celdaEnteraBajoCursor } from './arrastreCelda'
import { cuartoIdEnTile, zonaEnTile } from './planoGeometria'
import { formaEnCelda, esFormaCuadrada, claveCeldaOff, claveCeldaAbs } from './formasLoseta'
import type { Cell } from './walls'

/**
 * Pintar pisos directamente en el 3D: en capa Pisos + Seleccionar, un clic en el suelo
 * selecciona la celda (cuadro) o el cuadrante (fino) igual que el croquis: pinta exterior,
 * elige cuarto/zona, o (si la celda tiene forma) marca su relleno. Distingue clic de arrastre
 * para no pintar al mover la cámara.
 */
export function PlanoPisos3DController() {
  const gl = useThree((s) => s.gl)
  const camera = useThree((s) => s.camera)

  const planosActivo = usePlanos((s) => s.activo)
  const capa = usePlanos((s) => s.capa)
  const herramienta = usePlanos((s) => s.herramienta)
  const detalle = usePlanos((s) => s.detalleRejilla)
  const nivel = usePlanos((s) => s.nivel)
  const toggleCeldaExterior = usePlanos((s) => s.toggleCeldaExterior)
  const setSeleccion = usePlanos((s) => s.setSeleccion)

  const conTecho = useHouse((s) => s.conTecho)
  const placed = useLayout((s) => s.placed)
  const cells = useLayout((s) => s.cells)
  const footprints = useLayout((s) => s.footprints)
  const niveles = useLayout((s) => s.niveles)
  const gridCols = useLayout((s) => s.gridCols)
  const gridRows = useLayout((s) => s.gridRows)
  const formasCelda = useLayout((s) => s.formasCelda)
  const cuartos = useCuartos((s) => s.cuartos)
  const zonas = zonasRepo.useAll() ?? []

  const activo = planosActivo && capa === 'pisos' && herramienta === 'seleccionar'

  const idsNivel = useMemo(
    () => cuartos.filter((r) => placed[r.id] && (niveles[r.id] ?? 0) === nivel).map((r) => r.id),
    [cuartos, placed, niveles, nivel],
  )
  const anchorDe = useCallback((id: string) => cells[id], [cells])

  useEffect(() => {
    if (!activo) return
    const dom = gl.domElement
    let downX = 0
    let downY = 0
    const onDown = (ev: PointerEvent) => {
      downX = ev.clientX
      downY = ev.clientY
    }
    const onUp = (ev: PointerEvent) => {
      if (ev.button !== 0) return
      if (Math.hypot(ev.clientX - downX, ev.clientY - downY) > 6) return // fue arrastre de cámara
      const rect = dom.getBoundingClientRect()
      if (
        ev.clientX < rect.left ||
        ev.clientX > rect.right ||
        ev.clientY < rect.top ||
        ev.clientY > rect.bottom
      ) {
        return
      }

      if (detalle === 'subcelda') {
        const q = cuadranteBajoCursor(ev.clientX, ev.clientY, { canvas: dom, camera, nivel, conTecho })
        if (q) toggleCeldaExterior(q)
        return
      }

      const c = celdaEnteraBajoCursor(ev.clientX, ev.clientY, {
        canvas: dom,
        camera,
        nivel,
        conTecho,
        gridCols,
        gridRows,
      })
      if (!c) return
      const celda: Cell = { col: Math.round(c.col), row: Math.round(c.row) }

      const roomId = cuartoIdEnTile(celda, idsNivel, cells, footprints, anchorDe)
      if (roomId) {
        const a = anchorDe(roomId)
        const forma = a
          ? formaEnCelda(formasCelda[roomId], claveCeldaOff(celda.col - a.col, celda.row - a.row))
          : undefined
        if (forma && !esFormaCuadrada(forma)) toggleCeldaExterior(celda)
        else setSeleccion({ tipo: 'cuarto', roomId })
        return
      }
      const z = zonaEnTile(zonas, nivel, celda)
      if (z?.id != null) {
        const forma = formaEnCelda(z.formasCelda, claveCeldaAbs(celda.col, celda.row))
        if (!esFormaCuadrada(forma)) toggleCeldaExterior(celda)
        else setSeleccion({ tipo: 'zona', zonaId: z.id })
        return
      }
      toggleCeldaExterior(celda)
    }
    dom.addEventListener('pointerdown', onDown)
    dom.addEventListener('pointerup', onUp)
    return () => {
      dom.removeEventListener('pointerdown', onDown)
      dom.removeEventListener('pointerup', onUp)
    }
  }, [
    activo,
    gl,
    camera,
    detalle,
    nivel,
    conTecho,
    gridCols,
    gridRows,
    toggleCeldaExterior,
    setSeleccion,
    idsNivel,
    cells,
    footprints,
    anchorDe,
    zonas,
    formasCelda,
  ])

  return null
}
