import { useCallback, useEffect, useMemo, useState } from 'react'
import * as THREE from 'three'
import { useThree } from '@react-three/fiber'
import { useCuartos } from '../state/cuartosStore'
import { useLayout, SIN_OCUPACION } from '../state/layoutStore'
import { useHouse } from '../state/houseStore'
import { usePlanos } from '../state/planosStore'
import { VACIO, zonasRepo } from '../data/repository'
import {
  SIZE,
  WALL_H,
  WALL_T,
  cellToWorld,
  nivelBaseY,
  roomWallSegments,
  type Cell,
} from './walls'
import { trasladarCeldasZona, zonaEnCelda, cuartoIdEnTile } from './planoGeometria'
import { celdaEnteraBajoCursor, celdaBajoCursor, cuadranteBajoCursor } from './arrastreCelda'
import { finalizarArrastreZona } from '../ui/planos/planoZonaDrag'
import { aplicarFormaEnPlano } from '../ui/planos/planoEditarForma'
import { aplicarPincelCuarto, aplicarPincelCuartoFino } from '../ui/planos/planoPincelCuarto'
import { geometriaLoseta3D, outlineCeldaXZ, type FormaLoseta } from './formasLoseta'
import { filtrarSegmentosPorForma, perimetroFormaCelda } from './murosPerimetroLoseta'
import { PINCELES_DEFAULT } from './murosPuertas'

/** Resaltado de la celda (o cuadrante fino) bajo el cursor (Editar forma / Borrar / Pincel fino). */
function HoverCelda3D({
  nivel,
  cell,
  color = '#34d399',
  lado = SIZE - 0.2,
}: {
  nivel: number
  cell: Cell
  color?: string
  lado?: number
}) {
  const apilado = !useHouse((s) => s.explotado)
  const [x, , z] = cellToWorld(cell.col, cell.row)
  const y = nivelBaseY(nivel, apilado) + 0.25
  return (
    <mesh position={[x, y, z]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[lado, lado]} />
      <meshStandardMaterial color={color} transparent opacity={0.5} depthWrite={false} />
    </mesh>
  )
}

const COLOR_FANTASMA_CUARTO = '#34d399'
const SEG_ARCO_FANTASMA = 14

/** Material translúcido verde compartido por las paredes del fantasma. */
function MatFantasma() {
  return (
    <meshStandardMaterial
      color={COLOR_FANTASMA_CUARTO}
      transparent
      opacity={0.4}
      emissive={COLOR_FANTASMA_CUARTO}
      emissiveIntensity={0.4}
    />
  )
}

/** Altura de la silueta de piso del fantasma sobre la rejilla exterior (ver `ContornoPiso3D`). */
const Y_CONTORNO_FANTASMA = 0.32

/**
 * Sótano: contorno blanco sobre la rejilla exterior (como el fantasma del piso
 * exterior) marcando la celda a excavar. Va del tamaño real del muro (centro de la
 * arista en ±SIZE/2, ver `roomEdges`), no el inset de `HoverCelda3D` (pensado para
 * resaltar selección de piso, no para calibrar con el borde de un cuarto).
 */
function ContornoRejillaFantasma3D({ x, z, forma, rotacion }: { x: number; z: number; forma: FormaLoseta; rotacion: 0 | 90 | 180 | 270 }) {
  const geo = useMemo(() => {
    const pts = outlineCeldaXZ({ forma, rotacion }, SIZE)
    return new THREE.BufferGeometry().setFromPoints(pts.map((p) => new THREE.Vector3(p.x, 0, p.z)))
  }, [forma, rotacion])
  return (
    <lineLoop position={[x, Y_CONTORNO_FANTASMA, z]} geometry={geo}>
      <lineBasicMaterial color="#ffffff" transparent opacity={0.9} depthTest={false} />
    </lineLoop>
  )
}

/**
 * Preview del pincel: fantasma del cuarto bajo el cursor con sus paredes levantadas
 * (igual que el cuarto real). Solo se muestra sobre celdas libres: al hacer clic el
 * cuarto se materializa y el fantasma desaparece; los siguientes clics rotan la forma
 * real. El arco del círculo se segmenta igual que `MuroArcoPerimetro` para que coincida
 * con el muro curvo del cuarto real. En sótano (nivel < 0) se añade además el contorno
 * de `ContornoRejillaFantasma3D` sobre la rejilla exterior, para calibrar la celda a
 * excavar contra el borde real del muro.
 */
function HoverFormaCelda3D({
  nivel,
  cell,
  forma,
  rotacion,
}: {
  nivel: number
  cell: Cell
  forma: FormaLoseta
  rotacion: 0 | 90 | 180 | 270
}) {
  const apilado = !useHouse((s) => s.explotado)
  const [x, , z] = cellToWorld(cell.col, cell.row)
  const esSotano = nivel < 0
  const yBase = nivelBaseY(nivel, apilado)
  // `cell` es un prop que el padre puede recrear en cada render: se depende de sus
  // dos números y la celda se arma dentro (Cell es exactamente {col,row}).
  const { col: cellCol, row: cellRow } = cell
  const { geoPiso, segs, diagonales, arcos } = useMemo(() => {
    const fc = { forma, rotacion }
    const formas = { '0,0': fc }
    const raw = roomWallSegments({ col: cellCol, row: cellRow }, [{ col: 0, row: 0 }], SIN_OCUPACION, undefined, undefined, PINCELES_DEFAULT, formas)
    const extras = perimetroFormaCelda(fc, 0, 0)?.extras ?? []
    return {
      geoPiso: geometriaLoseta3D(fc, SIZE - 0.2, 'plano'),
      segs: filtrarSegmentosPorForma(raw, formas),
      diagonales: extras.filter((e) => e.tipo === 'diagonal'),
      arcos: extras.filter((e) => e.tipo === 'arco'),
    }
  }, [forma, rotacion, cellCol, cellRow])

  return (
    <group>
      {esSotano && <ContornoRejillaFantasma3D x={x} z={z} forma={forma} rotacion={rotacion} />}
      {/* Silueta del piso */}
      <mesh position={[x, yBase + 0.25, z]} rotation={[-Math.PI / 2, 0, 0]} geometry={geoPiso}>
        <meshStandardMaterial color={COLOR_FANTASMA_CUARTO} transparent opacity={0.5} depthWrite={false} />
      </mesh>
      {/* Muros rectos del perímetro */}
      {segs.map((s, i) => (
        <mesh key={`s${i}`} position={[x + s.cx, yBase + WALL_H / 2, z + s.cz]}>
          <boxGeometry args={[s.sx, WALL_H, s.sz]} />
          <MatFantasma />
        </mesh>
      ))}
      {/* Muro diagonal (triángulo) */}
      {diagonales.map((m, i) => {
        const dx = m.x2 - m.x1
        const dz = m.z2 - m.z1
        const len = Math.hypot(dx, dz)
        const yaw = Math.atan2(dz, dx)
        return (
          <mesh
            key={`d${i}`}
            position={[x + (m.x1 + m.x2) / 2, yBase + WALL_H / 2, z + (m.z1 + m.z2) / 2]}
            rotation={[0, -yaw, 0]}
          >
            <boxGeometry args={[len, WALL_H, WALL_T]} />
            <MatFantasma />
          </mesh>
        )
      })}
      {/* Muro curvo (círculo) en segmentos finos, idéntico al del cuarto real */}
      {arcos.map((m, ai) => {
        let da = m.a1 - m.a0
        while (da > Math.PI) da -= 2 * Math.PI
        while (da <= -Math.PI) da += 2 * Math.PI
        const paso = da / SEG_ARCO_FANTASMA
        return Array.from({ length: SEG_ARCO_FANTASMA }, (_, i) => {
          const a = m.a0 + paso * (i + 0.5)
          const px = m.cx + m.r * Math.cos(a)
          const pz = m.cz + m.r * Math.sin(a)
          const chord = m.r * Math.abs(paso) * 1.02
          return (
            <mesh
              key={`a${ai}-${i}`}
              position={[x + px, yBase + WALL_H / 2, z + pz]}
              rotation={[0, -(a + Math.PI / 2), 0]}
            >
              <boxGeometry args={[chord, WALL_H, WALL_T]} />
              <MatFantasma />
            </mesh>
          )
        })
      })}
    </group>
  )
}

/**
 * Interacción 3D en Planos → capa Cuartos:
 * - Pincel de forma: clic en suelo (2D o 3D) para crear/alterar celdas con preview.
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
  const apilado = !useHouse((s) => s.explotado)
  const cuartos = useCuartos((s) => s.cuartos)

  const zonas = zonasRepo.useAll() ?? VACIO

  const formaLoseta = usePlanos((s) => s.formaLoseta)
  const pincelForma = usePlanos((s) => s.pincelForma)
  const rotForma = usePlanos((s) => s.rotForma)
  const detalleRejilla = usePlanos((s) => s.detalleRejilla)

  const cuartos3D = planosActivo && capa === 'cuartos'
  const pincel = cuartos3D && pincelForma != null
  // Pincel + rejilla fina: el clic recorta el CUADRANTE (esquina fina) del cuarto.
  const pincelFino = pincel && detalleRejilla === 'subcelda'
  const moverZona = cuartos3D && herramienta === 'mover' && !pincel
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
        apilado,
        gridCols,
        gridRows,
      }),
    [gl, camera, nivel, apilado, gridCols, gridRows],
  )

  // Pincel: snap a ½ celda (los cuartos se colocan en media rejilla, igual que al mover).
  const proyectarPincel = useCallback(
    (clientX: number, clientY: number) =>
      celdaBajoCursor(clientX, clientY, {
        canvas: gl.domElement,
        camera,
        nivel,
        apilado,
        gridCols,
        gridRows,
      }),
    [gl, camera, nivel, apilado, gridCols, gridRows],
  )

  // Proyección del MISMO clic sobre el plano del SUELO (nivel 0): en pisos altos, la
  // rejilla visual y los cuartos de abajo (la referencia con la que el usuario alinea a
  // ojo) se ven a su altura real, no a la altura —vacía, invisible— del piso que se está
  // construyendo. Al proyectar sobre esa altura superior, la vista isométrica desvía el
  // resultado (más con la vista "explotada"). Se usa como celda alterna cuando la
  // proyección al nivel actual no tiene soporte (ver `crearCuartoEnCeldaLibre`).
  const proyectarPincelSuelo = useCallback(
    (clientX: number, clientY: number) =>
      celdaBajoCursor(clientX, clientY, {
        canvas: gl.domElement,
        camera,
        nivel: 0,
        apilado,
        gridCols,
        gridRows,
      }),
    [gl, camera, apilado, gridCols, gridRows],
  )

  // Pincel fino: esquina del CUADRANTE bajo el cursor (solo suelo 3D; el croquis tiene
  // su propio hit-test). `cuadranteBajoCursor` da el centro (±¼): +0.25 da la esquina.
  const proyectarCuadrante = useCallback(
    (clientX: number, clientY: number): Cell | null => {
      const q = cuadranteBajoCursor(clientX, clientY, {
        canvas: gl.domElement,
        camera,
        nivel,
        apilado,
      })
      return q ? { col: q.col + 0.25, row: q.row + 0.25 } : null
    },
    [gl, camera, nivel, apilado],
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
        apilado,
        gridCols,
        gridRows,
      }),
    [gl, camera, nivel, apilado, gridCols, gridRows],
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

  const onPincelDown = useCallback(
    (clientX: number, clientY: number) => {
      if (!pincelForma) return
      // Rejilla fina: recorta la esquina del cuadrante tocado en el 3D.
      if (detalleRejilla === 'subcelda') {
        const q = proyectarCuadrante(clientX, clientY)
        if (!q) return
        void aplicarPincelCuartoFino({
          col: q.col,
          row: q.row,
          forma: pincelForma,
          nivel,
          placed,
          cells,
          footprints,
          niveles,
          zonas,
          idsCuartosNivel,
          setAviso,
          setSeleccion,
        })
        return
      }
      const c = proyectarPincel(clientX, clientY)
      if (!c) return
      // En pisos altos, si la celda del nivel actual no tiene soporte, se reintenta con
      // la proyección del MISMO clic al suelo (ver proyectarPincelSuelo).
      const celdaAlterna = nivel > 0 ? (proyectarPincelSuelo(clientX, clientY) ?? undefined) : undefined
      void aplicarPincelCuarto({
        col: c.col,
        row: c.row,
        forma: pincelForma,
        rotacion: rotForma,
        nivel,
        placed,
        cells,
        footprints,
        niveles,
        zonas,
        idsCuartosNivel,
        celdaAlterna,
        setAviso,
        setSeleccion,
        onCuartoCreado: () => usePlanos.getState().setHerramienta('expandir'),
      })
    },
    [pincelForma, rotForma, detalleRejilla, proyectarCuadrante, proyectarPincel, proyectarPincelSuelo, nivel, placed, cells, footprints, niveles, zonas, idsCuartosNivel, setAviso, setSeleccion],
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

  useEffect(() => {
    if (!pincel) return
    const dom = gl.domElement
    const onDown = (ev: PointerEvent) => {
      if (ev.button !== 0) return
      const rect = dom.getBoundingClientRect()
      if (ev.clientX < rect.left || ev.clientX > rect.right || ev.clientY < rect.top || ev.clientY > rect.bottom) return
      onPincelDown(ev.clientX, ev.clientY)
    }
    dom.addEventListener('pointerdown', onDown)
    return () => dom.removeEventListener('pointerdown', onDown)
  }, [pincel, gl, onPincelDown])

  // Hover: resaltar la celda bajo el cursor (Pincel / Editar forma / Borrar).
  useEffect(() => {
    // Sin herramienta activa no hay hover: el cleanup previo ya lo dejó en null.
    if (!editarForma && !borrar && !pincel) return
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
      // Pincel: hover en ½ celda (o cuadrante con la rejilla fina); el resto, celda entera.
      const c = pincelFino
        ? proyectarCuadrante(ev.clientX, ev.clientY)
        : pincel
          ? proyectarPincel(ev.clientX, ev.clientY)
          : proyectarAgregar(ev.clientX, ev.clientY)
      setHover(c ? (pincel ? c : { col: Math.round(c.col), row: Math.round(c.row) }) : null)
    }
    dom.addEventListener('pointermove', onMove)
    return () => {
      dom.removeEventListener('pointermove', onMove)
      setHover(null)
    }
  }, [editarForma, borrar, pincel, pincelFino, gl, proyectarAgregar, proyectarPincel, proyectarCuadrante])

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
      {/* Pincel fino: resalta el cuadrante que se va a recortar. */}
      {pincelFino && hover && (
        <HoverCelda3D
          nivel={nivel}
          cell={{ col: hover.col - 0.25, row: hover.row - 0.25 }}
          lado={SIZE / 2 - 0.15}
        />
      )}
      {/* El fantasma solo sobre celdas libres: al materializar el cuarto desaparece. */}
      {pincel && !pincelFino && pincelForma && hover &&
        !cuartoIdEnTile(hover, idsCuartosNivel, cells, footprints, anchorDe) &&
        !zonaEnCelda(zonas, nivel, hover.col, hover.row) && (
          <HoverFormaCelda3D nivel={nivel} cell={hover} forma={pincelForma} rotacion={pincelForma === 'cuadrado' ? 0 : rotForma} />
        )}
      {!pincel && (editarForma || borrar) && hover && (
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
