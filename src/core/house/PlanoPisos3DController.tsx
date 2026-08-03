import { useCallback, useEffect, useMemo, useState } from 'react'
import * as THREE from 'three'
import { useThree } from '@react-three/fiber'
import { useCuartos } from '../state/cuartosStore'
import { usePlanos } from '../state/planosStore'
import { useLayout } from '../state/layoutStore'
import { useHouse } from '../state/houseStore'
import { VACIO, zonasRepo } from '../data/repository'
import { cuadranteBajoCursor, celdaEnteraBajoCursor, celdaBajoCursor } from './arrastreCelda'
import { cuartoIdEnTile, zonaEnTile } from './planoGeometria'
import { cellToWorld, centroCuarto3D, footprintBounds, nivelBaseY, SIZE, type Cell } from './walls'

/**
 * Selección de pisos directamente en el 3D (capa Pisos + Seleccionar):
 * - Piso interior: el clic SOLO selecciona el piso del cuarto/zona bajo el cursor.
 * - Piso exterior: pinta celdas/cuadrantes exteriores (o el relleno de celdas con forma).
 * Al pasar el cursor muestra un fantasma de la celda; desaparece cuando ya está seleccionada.
 */
export function PlanoPisos3DController() {
  const gl = useThree((s) => s.gl)
  const camera = useThree((s) => s.camera)

  const planosActivo = usePlanos((s) => s.activo)
  const capa = usePlanos((s) => s.capa)
  const modo = usePlanos((s) => s.modo)
  const herramienta = usePlanos((s) => s.herramienta)
  const detalle = usePlanos((s) => s.detalleRejilla)
  const nivel = usePlanos((s) => s.nivel)
  const seleccion = usePlanos((s) => s.seleccion)
  const toggleCeldaExterior = usePlanos((s) => s.toggleCeldaExterior)
  const setSeleccion = usePlanos((s) => s.setSeleccion)

  const apilado = !useHouse((s) => s.explotado)
  const placed = useLayout((s) => s.placed)
  const cells = useLayout((s) => s.cells)
  const footprints = useLayout((s) => s.footprints)
  const niveles = useLayout((s) => s.niveles)
  const gridCols = useLayout((s) => s.gridCols)
  const gridRows = useLayout((s) => s.gridRows)
  const cuartos = useCuartos((s) => s.cuartos)
  const zonas = zonasRepo.useAll() ?? VACIO

  const activo = planosActivo && capa === 'pisos' && herramienta === 'seleccionar'

  const idsNivel = useMemo(
    () => cuartos.filter((r) => placed[r.id] && (niveles[r.id] ?? 0) === nivel).map((r) => r.id),
    [cuartos, placed, niveles, nivel],
  )
  const anchorDe = useCallback((id: string) => cells[id], [cells])

  // Ocupante (cuarto/zona) de una celda entera.
  const ocupanteDe = useCallback(
    (celda: Cell): { tipo: 'cuarto'; roomId: string } | { tipo: 'zona'; zonaId: number } | null => {
      const roomId = cuartoIdEnTile(celda, idsNivel, cells, footprints, anchorDe)
      if (roomId) return { tipo: 'cuarto', roomId }
      const z = zonaEnTile(zonas, nivel, celda)
      if (z?.id != null) return { tipo: 'zona', zonaId: z.id }
      return null
    },
    [idsNivel, cells, footprints, anchorDe, zonas, nivel],
  )

  const [hover, setHover] = useState<{ cell: Cell; fino: boolean } | null>(null)
  // Piso interior: cuarto resaltado bajo el cursor (se resalta la figura, como techos).
  const [hoverRoomPiso, setHoverRoomPiso] = useState<string | null>(null)

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

      // Piso interior: SOLO selecciona el cuarto/zona bajo el cursor (a ½), como en techos.
      // Sin pisos finos en interior: la rejilla fina no aplica aquí.
      if (modo === 'piso-int') {
        const cf = celdaBajoCursor(ev.clientX, ev.clientY, {
          canvas: dom,
          camera,
          nivel,
          apilado,
          gridCols,
          gridRows,
        })
        if (!cf) return
        const occ = ocupanteDe(cf)
        if (occ?.tipo === 'cuarto') setSeleccion({ tipo: 'cuarto', roomId: occ.roomId })
        else if (occ?.tipo === 'zona') setSeleccion({ tipo: 'zona', zonaId: occ.zonaId })
        return
      }

      // Piso exterior · rejilla fina: pinta cuadrantes (sub-celdas ½×½) para cambiar el
      // tamaño del piso, incluso bajo los cuartos (la capa exterior va por debajo).
      if (detalle === 'subcelda') {
        const q = cuadranteBajoCursor(ev.clientX, ev.clientY, { canvas: dom, camera, nivel, apilado })
        if (q) toggleCeldaExterior(q)
        return
      }

      // Piso exterior (no-fina): es la CAPA de abajo; se pinta en cualquier celda, incluso
      // debajo de un cuarto. Siempre alterna la celda exterior (entera).
      const c = celdaEnteraBajoCursor(ev.clientX, ev.clientY, {
        canvas: dom,
        camera,
        nivel,
        apilado,
        gridCols,
        gridRows,
      })
      if (!c) return
      toggleCeldaExterior({ col: Math.round(c.col), row: Math.round(c.row) })
    }

    // Fantasma: celda bajo el cursor (cuarto en piso-int; exterior en piso-ext).
    const onMove = (ev: PointerEvent) => {
      const rect = dom.getBoundingClientRect()
      if (
        ev.clientX < rect.left ||
        ev.clientX > rect.right ||
        ev.clientY < rect.top ||
        ev.clientY > rect.bottom
      ) {
        setHover(null)
        setHoverRoomPiso(null)
        return
      }
      // Piso interior: resalta la FIGURA del cuarto bajo el cursor (como techos), no una celda.
      if (modo === 'piso-int') {
        const cc = celdaBajoCursor(ev.clientX, ev.clientY, {
          canvas: dom,
          camera,
          nivel,
          apilado,
          gridCols,
          gridRows,
        })
        const occ = cc ? ocupanteDe(cc) : null
        setHoverRoomPiso(occ?.tipo === 'cuarto' ? occ.roomId : null)
        return
      }
      // Piso exterior · rejilla fina: el fantasma sigue al cuadrante bajo el cursor.
      if (detalle === 'subcelda') {
        const q = cuadranteBajoCursor(ev.clientX, ev.clientY, { canvas: dom, camera, nivel, apilado })
        setHover(q ? { cell: q, fino: true } : null)
        return
      }
      const c = celdaEnteraBajoCursor(ev.clientX, ev.clientY, {
        canvas: dom,
        camera,
        nivel,
        apilado,
        gridCols,
        gridRows,
      })
      if (!c) {
        setHover(null)
        return
      }
      setHover({ cell: { col: Math.round(c.col), row: Math.round(c.row) }, fino: false })
    }
    const onLeave = () => {
      setHover(null)
      setHoverRoomPiso(null)
    }

    dom.addEventListener('pointerdown', onDown)
    dom.addEventListener('pointerup', onUp)
    dom.addEventListener('pointermove', onMove)
    dom.addEventListener('pointerleave', onLeave)
    return () => {
      dom.removeEventListener('pointerdown', onDown)
      dom.removeEventListener('pointerup', onUp)
      dom.removeEventListener('pointermove', onMove)
      dom.removeEventListener('pointerleave', onLeave)
      setHover(null)
      setHoverRoomPiso(null)
    }
  }, [
    activo,
    gl,
    camera,
    modo,
    detalle,
    nivel,
    apilado,
    gridCols,
    gridRows,
    toggleCeldaExterior,
    setSeleccion,
    idsNivel,
    cells,
    footprints,
    anchorDe,
    zonas,
    ocupanteDe,
  ])

  if (!activo) return null

  // Piso interior: resalta la FIGURA del cuarto (caja del footprint, como techos) bajo el
  // cursor, seleccionado, o TODOS cuando está activo "todos los interiores". No es la rejilla.
  if (modo === 'piso-int') {
    const roomSel = hoverRoomPiso ?? (seleccion?.tipo === 'cuarto' ? seleccion.roomId : null)
    const ids = seleccion?.tipo === 'pisos-interiores' ? idsNivel : roomSel ? [roomSel] : []
    if (ids.length === 0) return null
    const hy = nivelBaseY(nivel, apilado) + 0.33
    return (
      <>
        {ids.map((roomId) => {
          const anchor = cells[roomId]
          const fp = footprints[roomId]
          if (!anchor || !fp) return null
          const [hx, , hz] = centroCuarto3D(anchor, fp)
          const bounds = footprintBounds(fp)
          return (
            <mesh key={roomId} position={[hx, hy, hz]} rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[bounds.w * SIZE - 0.15, bounds.h * SIZE - 0.15]} />
              <meshBasicMaterial color="#ffffff" transparent opacity={0.28} depthWrite={false} />
            </mesh>
          )
        })}
      </>
    )
  }

  // Piso exterior: contorno de la celda/cuadrante bajo el cursor (desaparece si ya está
  // seleccionada).
  if (!hover) return null
  const seleccionado =
    seleccion?.tipo === 'exterior' &&
    seleccion.celdas.some((c) => c.col === hover.cell.col && c.row === hover.cell.row)
  if (seleccionado) return null

  const [hx, , hz] = cellToWorld(hover.cell.col, hover.cell.row)
  const hy = nivelBaseY(nivel, apilado) + 0.32
  // Fantasma SOLO CONTORNO: cuadrante (½) en rejilla fina; celda completa en no-fina.
  const lado = hover.fino ? SIZE / 2 - 0.1 : SIZE - 0.15
  return <ContornoPiso3D cx={hx} cz={hz} y={hy} lado={lado} />
}

/** Contorno blanco (cuadro) sobre el piso: fantasma de la celda/cuadrante bajo el cursor. */
function ContornoPiso3D({ cx, cz, y, lado }: { cx: number; cz: number; y: number; lado: number }) {
  const geo = useMemo(() => {
    const h = lado / 2
    return new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-h, 0, -h),
      new THREE.Vector3(h, 0, -h),
      new THREE.Vector3(h, 0, h),
      new THREE.Vector3(-h, 0, h),
    ])
  }, [lado])
  return (
    <lineLoop position={[cx, y, cz]} geometry={geo}>
      <lineBasicMaterial color="#ffffff" transparent opacity={0.9} depthTest={false} />
    </lineLoop>
  )
}
