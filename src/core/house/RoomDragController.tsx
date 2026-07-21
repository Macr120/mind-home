import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import { useLayout } from '../state/layoutStore'
import { useHouse } from '../state/houseStore'
import { celdaBajoCursor } from './arrastreCelda'

/**
 * Arrastre de cuartos del registro: sigue el puntero en ventana (2D + 3D)
 * y confirma al soltar (pointerup / pointercancel).
 */
export function RoomDragController() {
  const gl = useThree((s) => s.gl)
  const camera = useThree((s) => s.camera)
  const draggingId = useLayout((s) => s.draggingId)
  const setPreview = useLayout((s) => s.setPreview)
  const endDrag = useLayout((s) => s.endDrag)
  const gridCols = useLayout((s) => s.gridCols)
  const gridRows = useLayout((s) => s.gridRows)
  const niveles = useLayout((s) => s.niveles)
  const apilado = !useHouse((s) => s.explotado)

  useEffect(() => {
    if (!draggingId) return

    const nivel = niveles[draggingId] ?? 0

    const proyectar = (clientX: number, clientY: number) =>
      celdaBajoCursor(clientX, clientY, {
        canvas: gl.domElement,
        camera,
        nivel,
        apilado,
        gridCols,
        gridRows,
      })

    const onMove = (e: PointerEvent) => {
      const cell = proyectar(e.clientX, e.clientY)
      if (!cell) return
      const prev = useLayout.getState().previewCell
      if (!prev || prev.col !== cell.col || prev.row !== cell.row) setPreview(cell)
      document.body.style.cursor = 'grabbing'
    }

    const soltar = () => {
      void endDrag()
      document.body.style.cursor = 'default'
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', soltar)
    window.addEventListener('pointercancel', soltar)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', soltar)
      window.removeEventListener('pointercancel', soltar)
      if (!useLayout.getState().draggingId) document.body.style.cursor = 'default'
    }
  }, [draggingId, gl, camera, niveles, apilado, gridCols, gridRows, setPreview, endDrag])

  return null
}
