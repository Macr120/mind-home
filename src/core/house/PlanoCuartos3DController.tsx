import { useCallback, useEffect, useMemo, useState } from 'react'
import { useThree } from '@react-three/fiber'
import { useCuartos } from '../state/cuartosStore'
import { useLayout } from '../state/layoutStore'
import { useHouse } from '../state/houseStore'
import { usePlanos } from '../state/planosStore'
import { zonasRepo } from '../data/repository'
import {
  SIZE,
  cellToWorld,
  nivelBaseY,
  type Cell,
} from './walls'
import { trasladarCeldasZona, celdaEnteraEsLibre, normalizarCeldasEnteras, zonaEnCelda, cuartoIdEnTile } from './planoGeometria'
import { celdaEnteraBajoCursor } from './arrastreCelda'
import { finalizarArrastreZona } from '../ui/planos/planoZonaDrag'
import { aplicarFormaEnPlano } from '../ui/planos/planoEditarForma'

/** Marcadores de espacio interior al agregar cuarto (celdas enteras). */
function CeldasMarcadas3D({ nivel, celdas }: { nivel: number; celdas: Cell[] }) {
  const conTecho = useHouse((s) => s.conTecho)
  const y = nivelBaseY(nivel, conTecho) + 0.1
  const enteras = useMemo(() => normalizarCeldasEnteras(celdas), [celdas])

  return (
    <>
      {enteras.map((c) => {
        const [x, , z] = cellToWorld(c.col, c.row)
        const tile = SIZE - 0.12
        return (
          <mesh key={`mk3d-${c.col},${c.row}`} position={[x, y, z]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[tile, tile]} />
            <meshStandardMaterial color="#a8a29e" transparent opacity={0.75} depthWrite={false} />
          </mesh>
        )
      })}
    </>
  )
}

/** Resaltado de la celda bajo el cursor (Agregar / Editar forma / Borrar). */
function HoverCelda3D({ nivel, cell, color = '#34d399' }: { nivel: number; cell: Cell; color?: string }) {
  const conTecho = useHouse((s) => s.conTecho)
  const [x, , z] = cellToWorld(cell.col, cell.row)
  const y = nivelBaseY(nivel, conTecho) + 0.25
  return (
    <mesh position={[x, y, z]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[SIZE - 0.2, SIZE - 0.2]} />
      <meshStandardMaterial color={color} transparent opacity={0.5} depthWrite={false} />
    </mesh>
  )
}

/**
 * Interacción 3D en Planos → capa Cuartos:
 * - Agregar: clic en suelo (2D o 3D) para marcar celdas.
 * - Mover zonas: arrastre con proyección unificada 2D + 3D.
 * - Cuartos del registro: `RoomDragController` (misma proyección).
 */
export function PlanoCuartos3DController() {
  const gl = useThree((s) => s.gl)
  const camera = useThree((s) => s.camera)

  const planosActivo = usePlanos((s) => s.activo)
  const capa = usePlanos((s) => s.capa)
  const herramienta = usePlanos((s) => s.herramienta)
  const nivel = usePlanos((s) => s.nivel)
  const celdasMarcadas = usePlanos((s) => s.celdasMarcadas)
  const toggleCeldaMarcada = usePlanos((s) => s.toggleCeldaMarcada)
  const setAviso = usePlanos((s) => s.setAviso)
  const setSeleccion = usePlanos((s) => s.setSeleccion)
  const draggingZonaId = usePlanos((s) => s.draggingZonaId)
  const setZonaDragPreview = usePlanos((s) => s.setZonaDragPreview)

  const placed = useLayout((s) => s.placed)
  const cells = useLayout((s) => s.cells)
  const footprints = useLayout((s) => s.footprints)
  const niveles = useLayout((s) => s.niveles)
  const gridCols = useLayout((s) => s.gridCols)
  const gridRows = useLayout((s) => s.gridRows)
  const toggleRoom = useLayout((s) => s.toggleRoom)
  const conTecho = useHouse((s) => s.conTecho)
  const cuartos = useCuartos((s) => s.cuartos)

  const zonas = zonasRepo.useAll() ?? []

  const formaLoseta = usePlanos((s) => s.formaLoseta)

  const cuartos3D = planosActivo && capa === 'cuartos'
  const agregar = cuartos3D && herramienta === 'agregar'
  const moverZona = cuartos3D && herramienta === 'mover'
  const editarForma = cuartos3D && herramienta === 'editar-forma'
  const borrar = cuartos3D && herramienta === 'borrar'
  const [hover, setHover] = useState<Cell | null>(null)

  const idsCuartosNivel = useMemo(
    () =>
      cuartos
        .filter((r) => placed[r.id] && (niveles[r.id] ?? 0) === nivel)
        .map((r) => r.id),
    [cuartos, placed, niveles, nivel],
  )
  const anchorDe = useCallback((id: string) => cells[id], [cells])

  const proyectarAgregar = useCallback(
    (clientX: number, clientY: number) =>
      celdaEnteraBajoCursor(clientX, clientY, {
        canvas: gl.domElement,
        camera,
        nivel,
        conTecho,
        gridCols,
        gridRows,
      }),
    [gl, camera, nivel, conTecho, gridCols, gridRows],
  )

  // Mover zona hace snap a celda ENTERA (igual que Agregar): las zonas son de
  // celdas enteras, así que soltar a ½ celda metía coordenadas fraccionarias que
  // descuadraban muros y dejaban piso exterior bajo el origen.
  const proyectar = useCallback(
    (clientX: number, clientY: number) =>
      celdaEnteraBajoCursor(clientX, clientY, {
        canvas: gl.domElement,
        camera,
        nivel,
        conTecho,
        gridCols,
        gridRows,
      }),
    [gl, camera, nivel, conTecho, gridCols, gridRows],
  )

  const onAgregarDown = useCallback(
    (clientX: number, clientY: number) => {
      const c = proyectarAgregar(clientX, clientY)
      if (!c) return
      const celda = { col: Math.round(c.col), row: Math.round(c.row) }
      const k = `${celda.col},${celda.row}`
      const yaMarcada = usePlanos.getState().celdasMarcadas.some((m) => `${m.col},${m.row}` === k)
      if (
        !yaMarcada &&
        !celdaEnteraEsLibre(
          celda,
          nivel,
          placed,
          cells,
          footprints,
          niveles,
          zonas,
          idsCuartosNivel,
          anchorDe,
        )
      ) {
        setAviso('Esa celda ya está ocupada. Elige un espacio libre.')
        return
      }
      setAviso(null)
      toggleCeldaMarcada(celda)
    },
    [
      proyectarAgregar,
      nivel,
      placed,
      cells,
      footprints,
      niveles,
      zonas,
      idsCuartosNivel,
      anchorDe,
      setAviso,
      toggleCeldaMarcada,
    ],
  )

  const onBorrarDown = useCallback(
    (clientX: number, clientY: number) => {
      const c = proyectarAgregar(clientX, clientY)
      if (!c) return
      const col = Math.round(c.col)
      const row = Math.round(c.row)
      // Primero intenta zona, luego cuarto del registro
      const z = zonaEnCelda(zonas, nivel, col, row)
      if (z?.id != null) {
        void zonasRepo.remove(z.id)
        setSeleccion(null)
        return
      }
      const roomId = cuartoIdEnTile({ col, row }, idsCuartosNivel, cells, footprints, anchorDe)
      if (roomId) {
        void toggleRoom(roomId)
        setSeleccion(null)
      }
    },
    [proyectarAgregar, zonas, nivel, cells, footprints, idsCuartosNivel, anchorDe, toggleRoom, setSeleccion],
  )

  const onEditarFormaDown = useCallback(
    (clientX: number, clientY: number) => {
      const c = proyectarAgregar(clientX, clientY)
      if (!c) return
      void aplicarFormaEnPlano({
        col: c.col,
        row: c.row,
        nivel,
        forma: formaLoseta,
        zonas,
        placed,
        cells,
        footprints,
        idsCuartosNivel,
        setAviso,
      })
    },
    [proyectarAgregar, nivel, formaLoseta, zonas, placed, cells, footprints, idsCuartosNivel, setAviso],
  )

  useEffect(() => {
    if (!borrar) return
    const dom = gl.domElement
    const onDown = (ev: PointerEvent) => {
      if (ev.button !== 0) return
      const rect = dom.getBoundingClientRect()
      if (ev.clientX < rect.left || ev.clientX > rect.right || ev.clientY < rect.top || ev.clientY > rect.bottom) return
      onBorrarDown(ev.clientX, ev.clientY)
    }
    dom.addEventListener('pointerdown', onDown)
    return () => dom.removeEventListener('pointerdown', onDown)
  }, [borrar, gl, onBorrarDown])

  // Hover: resaltar la celda bajo el cursor (Agregar / Editar forma / Borrar).
  useEffect(() => {
    if (!agregar && !editarForma && !borrar) {
      setHover(null)
      return
    }
    const dom = gl.domElement
    const onMove = (ev: PointerEvent) => {
      const rect = dom.getBoundingClientRect()
      if (
        ev.clientX < rect.left ||
        ev.clientX > rect.right ||
        ev.clientY < rect.top ||
        ev.clientY > rect.bottom
      ) {
        setHover(null)
        return
      }
      const c = proyectarAgregar(ev.clientX, ev.clientY)
      setHover(c ? { col: Math.round(c.col), row: Math.round(c.row) } : null)
    }
    dom.addEventListener('pointermove', onMove)
    return () => {
      dom.removeEventListener('pointermove', onMove)
      setHover(null)
    }
  }, [agregar, editarForma, borrar, gl, proyectarAgregar])

  useEffect(() => {
    if (!editarForma) return
    const dom = gl.domElement
    const onDown = (ev: PointerEvent) => {
      if (ev.button !== 0) return
      const rect = dom.getBoundingClientRect()
      if (
        ev.clientX < rect.left ||
        ev.clientX > rect.right ||
        ev.clientY < rect.top ||
        ev.clientY > rect.bottom
      ) {
        return
      }
      onEditarFormaDown(ev.clientX, ev.clientY)
    }
    dom.addEventListener('pointerdown', onDown)
    return () => dom.removeEventListener('pointerdown', onDown)
  }, [editarForma, gl, onEditarFormaDown])

  useEffect(() => {
    if (!agregar) return
    const dom = gl.domElement
    const onDown = (ev: PointerEvent) => {
      if (ev.button !== 0) return
      const rect = dom.getBoundingClientRect()
      if (
        ev.clientX < rect.left ||
        ev.clientX > rect.right ||
        ev.clientY < rect.top ||
        ev.clientY > rect.bottom
      ) {
        return
      }
      onAgregarDown(ev.clientX, ev.clientY)
    }
    dom.addEventListener('pointerdown', onDown)
    return () => dom.removeEventListener('pointerdown', onDown)
  }, [agregar, gl, onAgregarDown])

  useEffect(() => {
    if (!moverZona || draggingZonaId == null) return

    const onMove = (e: PointerEvent) => {
      const { zonaDragOrigen } = usePlanos.getState()
      if (zonaDragOrigen.length === 0) return
      const c = proyectar(e.clientX, e.clientY)
      if (!c) return
      const preview = trasladarCeldasZona(zonaDragOrigen, c)
      const prev = usePlanos.getState().previewZonaCeldas
      const k = (xs: Cell[]) => xs.map((x) => `${x.col},${x.row}`).join('|')
      if (k(prev) !== k(preview)) setZonaDragPreview(draggingZonaId, preview)
      document.body.style.cursor = 'grabbing'
    }

    const soltar = () => {
      const st = usePlanos.getState()
      if (st.draggingZonaId == null) return
      void finalizarArrastreZona({
        zonaId: st.draggingZonaId,
        origen: st.zonaDragOrigen,
        preview: st.previewZonaCeldas,
        nivel,
        gridCols,
        gridRows,
        placed,
        cells,
        footprints,
        niveles,
        zonas,
        idsCuartosNivel,
        anchorDe,
        setAviso,
      })
      setZonaDragPreview(null, [])
      setSeleccion({ tipo: 'zona', zonaId: st.draggingZonaId })
      document.body.style.cursor = 'default'
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', soltar)
    window.addEventListener('pointercancel', soltar)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', soltar)
      window.removeEventListener('pointercancel', soltar)
      if (usePlanos.getState().draggingZonaId == null) document.body.style.cursor = 'default'
    }
  }, [
    moverZona,
    draggingZonaId,
    proyectar,
    nivel,
    gridCols,
    gridRows,
    placed,
    cells,
    footprints,
    niveles,
    zonas,
    idsCuartosNivel,
    anchorDe,
    setAviso,
    setSeleccion,
    setZonaDragPreview,
  ])

  if (!cuartos3D) return null

  return (
    <>
      {agregar && <CeldasMarcadas3D nivel={nivel} celdas={celdasMarcadas} />}
      {(agregar || editarForma || borrar) && hover && (
        <HoverCelda3D nivel={nivel} cell={hover} color={borrar ? '#f87171' : '#34d399'} />
      )}
    </>
  )
}

/** Inicia arrastre de zona desde el piso 3D (herramienta Mover). */
export function useIniciarZonaDrag3D(zonaId: number, celdas: Cell[]) {
  const planosActivo = usePlanos((s) => s.activo)
  const capa = usePlanos((s) => s.capa)
  const herramienta = usePlanos((s) => s.herramienta)
  const setZonaDragPreview = usePlanos((s) => s.setZonaDragPreview)
  const setSeleccion = usePlanos((s) => s.setSeleccion)

  const puede =
    planosActivo && capa === 'cuartos' && herramienta === 'mover'

  return useCallback(
    (e: { stopPropagation: () => void }) => {
      if (!puede) return
      e.stopPropagation()
      setZonaDragPreview(zonaId, celdas.map((c) => ({ ...c })))
      setSeleccion({ tipo: 'zona', zonaId })
    },
    [puede, zonaId, celdas, setZonaDragPreview, setSeleccion],
  )
}
