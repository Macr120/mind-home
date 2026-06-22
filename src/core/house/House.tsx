import { useEffect } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { useHouse } from '../state/houseStore'
import { useDiseño } from '../state/disenoStore'
import { useLayout } from '../state/layoutStore'
import { useCuartos } from '../state/cuartosStore'
import { Character } from './Character'
import { Asistente3D } from './Asistente3D'
import { RoomProximity } from './RoomProximity'
import { Room3D } from './Room3D'
import { Accesos, AccesoProximity, AccesoDrag } from './Accesos'
import { CameraRig } from './CameraRig'
import { FollowCamera } from './FollowCamera'
import { CameraControls } from './CameraControls'
import { RoomDragController } from './RoomDragController'
import { ObjetoDragController } from './ObjetoDragController'
import {
  centroCuarto3D,
  SPACING,
  nivelBaseY,
  cellToWorld,
  footprintCells,
  FOOTPRINT_DEFAULT,
} from './walls'
import { getTema, mezclar } from './temas'
import { CieloDiaNoche } from './CieloDiaNoche'
import { FondoEscena } from './FondoEscena'
import { FondoAnimaciones } from './FondoAnimaciones'
import { TechoLoseta } from './TechoLoseta'
import { FocosCasa } from './FocosCasa'
import { TemaContext } from './primitivas'
import { ObjetoView } from './catalogo'
import { esObjetoMapa } from '../state/disenoStore'
import { NavControls } from '../ui/NavControls'
import { EditPanel } from '../ui/EditPanel'
import { InteractAnchor } from './InteractAnchor'
import { TechoCeldaEditor } from './TechoCeldaEditor'
import { PlanoTechos3DEditor } from './PlanoTechos3DEditor'
import { GridResizer } from './GridResizer'
import { RoomCellEditor } from './RoomCellEditor'
import { usePlanos } from '../state/planosStore'
import { ZonasPlano3D } from './ZonasPlano3D'
import { PisosExterior3D } from './PisosExterior3D'
import { PlanoPisosSeleccion3D } from './PlanoPisosSeleccion3D'
import { PlanoCuartos3DController } from './PlanoCuartos3DController'
import { PlanoPisos3DController } from './PlanoPisos3DController'
import { PlanoParedes3DEditor } from './PlanoParedes3DEditor'
import { MapaBase3D } from './MapaBase3D'

/** En modo edición las sombras quedan congeladas y dejan “fantasmas” al mover objetos. */
function ShadowMode() {
  const gl = useThree((s) => s.gl)
  const editMode = useLayout((s) => s.editMode)
  useEffect(() => {
    gl.shadowMap.enabled = !editMode
    if (!editMode) gl.shadowMap.needsUpdate = true
  }, [editMode, gl])
  return null
}

/** Reactiva la sombra estática cuando cambia el layout (solo fuera de edición). */
function ShadowUpdater() {
  const gl = useThree((s) => s.gl)
  const editMode = useLayout((s) => s.editMode)
  const placed = useLayout((s) => s.placed)
  const cells = useLayout((s) => s.cells)
  const editingRoomId = useLayout((s) => s.editingRoomId)
  const conTecho = useHouse((s) => s.conTecho)
  useEffect(() => {
    if (editMode) return
    gl.shadowMap.needsUpdate = true
  }, [gl, editMode, placed, cells, editingRoomId, conTecho])
  return null
}

/** Cuadrícula alineada al rectángulo exacto de celdas disponibles. */
function RejillaMapa({
  gridCols,
  gridRows,
  colorFuerte,
  colorSuave,
}: {
  gridCols: number
  gridRows: number
  colorFuerte: string
  colorSuave: string
}) {
  const ancho = gridCols * SPACING
  const alto = gridRows * SPACING
  const escalaZ = alto / ancho
  return (
    <>
      <gridHelper
        args={[ancho, gridCols * 2, colorSuave, colorSuave]}
        position={[0, 0.018, 0]}
        scale={[1, 1, escalaZ]}
        material-transparent
        material-opacity={0.12}
      />
      <gridHelper
        args={[ancho, gridCols, colorFuerte, colorFuerte]}
        position={[0, 0.02, 0]}
        scale={[1, 1, escalaZ]}
        material-transparent
        material-opacity={0.22}
      />
    </>
  )
}

/** Objetos LIBRES sobre el mapa (fuera de cuartos): coordenadas de mundo. */
function ObjetosMapa() {
  const objetos = useDiseño((s) => s.objetos)
  const draggingObjeto = useDiseño((s) => s.draggingObjeto)
  const startObjetoDrag = useDiseño((s) => s.startObjetoDrag)
  const editMode = useLayout((s) => s.editMode)
  const editingRoomId = useLayout((s) => s.editingRoomId)
  const tema = getTema(useDiseño((s) => s.temaGlobal))
  const editables = editMode && !editingRoomId
  const items = objetos.filter(esObjetoMapa)
  if (items.length === 0) return null
  return (
    <TemaContext.Provider value={tema}>
      {items.map((o) => {
        const drag = draggingObjeto === o.id
        const rotY = ((o.rotY ?? 0) * Math.PI) / 180
        return (
          <group
            key={o.id}
            position={[o.x ?? 0, drag ? 0.6 : 0.2, o.z ?? 0]}
            rotation={[0, rotY, 0]}
            onPointerDown={
              editables
                ? (e) => {
                    e.stopPropagation()
                    if (o.id != null) startObjetoDrag(o.id)
                  }
                : undefined
            }
            onPointerOver={(e) => {
              e.stopPropagation()
              if (editables) document.body.style.cursor = 'grab'
            }}
            onPointerOut={() => {
              if (!useDiseño.getState().draggingObjeto) document.body.style.cursor = 'default'
            }}
          >
            <ObjetoView tipo={o.tipo} color={o.color} />
          </group>
        )
      })}
    </TemaContext.Provider>
  )
}

/**
 * Techos caminables (terraza): sobre cada celda con cuarto pero SIN nada encima, dibuja
 * una loseta sólida a la altura del nivel de arriba. Es el techo del cuarto de abajo y
 * sirve de piso para caminar en el nivel superior (ver `pisoPorNivel`). Antes era una
 * rejilla vacía; ahora es superficie real. Se muestra al haber niveles o en edición.
 */
function TechosCaminables() {
  const accesos = useLayout((s) => s.accesos)
  const editMode = useLayout((s) => s.editMode)
  const placed = useLayout((s) => s.placed)
  const niveles = useLayout((s) => s.niveles)
  const cells = useLayout((s) => s.cells)
  const footprints = useLayout((s) => s.footprints)
  const roomColors = useDiseño((s) => s.roomColors)
  const techoTipo = useDiseño((s) => s.techoTipo)
  const roomTechoTipos = useDiseño((s) => s.roomTechoTipos)
  const conTecho = useHouse((s) => s.conTecho)
  const cuartos = useCuartos((s) => s.cuartos)

  if (accesos.length === 0 && !editMode) return null

  // Bases con techo expuesto: cuartos colocados sin otro directamente encima.
  const colocados = cuartos.filter((r) => placed[r.id] && cells[r.id])
  const bases = colocados.filter((base) => {
    const bc = cells[base.id]
    const bn = niveles[base.id] ?? 0
    return !colocados.some(
      (o) =>
        o.id !== base.id &&
        (niveles[o.id] ?? 0) === bn + 1 &&
        cells[o.id].col === bc.col &&
        cells[o.id].row === bc.row,
    )
  })
  if (bases.length === 0) return null

  return (
    <>
      {bases.flatMap((base) => {
        const nivel = (niveles[base.id] ?? 0) + 1
        const y = nivelBaseY(nivel, conTecho)
        const fp = footprints[base.id] ?? FOOTPRINT_DEFAULT
        const anchor = cells[base.id]
        if (!anchor) return []
        // El techo toma el color del cuarto de abajo, oscurecido (aspecto de losa).
        const techoColor = mezclar(roomColors[base.id] ?? base.color, '#0b0d12', 0.55)
        // Material: override del cuarto si existe, si no el global (terraza siempre plana).
        const tipoBase = base.id in roomTechoTipos ? roomTechoTipos[base.id] : techoTipo
        return footprintCells(anchor, fp).map((c) => {
          const [x, , z] = cellToWorld(c.col, c.row)
          return (
            <TechoLoseta
              key={`tc-${base.id}-${c.col}-${c.row}`}
              tipo={tipoBase}
              colorCuarto={techoColor}
              y={y + 0.1}
              lx={x}
              lz={z}
            />
          )
        })
      })}
    </>
  )
}

export function House() {
  const roomColors = useDiseño((s) => s.roomColors)
  const placed = useLayout((s) => s.placed)
  const cells = useLayout((s) => s.cells)
  const footprints = useLayout((s) => s.footprints)
  const niveles = useLayout((s) => s.niveles)
  const conTecho = useHouse((s) => s.conTecho)
  const draggingId = useLayout((s) => s.draggingId)
  const previewCell = useLayout((s) => s.previewCell)
  const editingRoomId = useLayout((s) => s.editingRoomId)
  const gridCols = useLayout((s) => s.gridCols)
  const gridRows = useLayout((s) => s.gridRows)
  const editMode = useLayout((s) => s.editMode)
  const cuartos = useCuartos((s) => s.cuartos)
  const planosActivo = usePlanos((s) => s.activo)
  const planosNivel = usePlanos((s) => s.nivel)
  const planosSeleccion = usePlanos((s) => s.seleccion)
  const mapaSuperficie = useDiseño((s) => s.mapaSuperficie)
  const aislarCuarto = Boolean(editingRoomId)
  const modoPlanos = planosActivo && editMode && !editingRoomId

  const resaltadoPlanoId =
    modoPlanos && planosSeleccion?.tipo === 'cuarto' ? planosSeleccion.roomId : null

  return (
    <>
      <div className="absolute inset-0 flex flex-col">
        <div className={`relative min-h-0 flex-1 ${modoPlanos ? 'pr-80' : ''}`}>
      <Canvas
        shadows
        orthographic
        camera={{ position: [22, 22, 22], zoom: 17, near: -100, far: 300 }}
        style={{ position: 'absolute', inset: 0 }}
        dpr={[1, 1.5]}
        onCreated={({ gl }) => {
          // La casa es estática: renderiza la sombra UNA vez y congélala.
          // (gran ahorro: no recalcular sombras de ~150 mallas cada frame)
          gl.shadowMap.autoUpdate = false
          gl.shadowMap.needsUpdate = true
        }}
      >
        <CameraRig />
        <FollowCamera />
        <CameraControls />
        <ShadowMode />
        <ShadowUpdater />
      <CieloDiaNoche />
      <FondoEscena />
      <FondoAnimaciones />

      {!aislarCuarto && <PisosExterior3D />}
      {!aislarCuarto && <MapaBase3D />}
      {!aislarCuarto && (
        <RejillaMapa
          gridCols={gridCols}
          gridRows={gridRows}
          colorFuerte={mapaSuperficie.rejillaFuerte}
          colorSuave={mapaSuperficie.rejillaSuave}
        />
      )}

      {cuartos
        .filter((room) => placed[room.id])
        .map((room) => {
          const arrastrando = draggingId === room.id
          const cell =
            arrastrando && previewCell ? previewCell : cells[room.id]
          const fp = footprints[room.id] ?? FOOTPRINT_DEFAULT
          const [x, , z] = centroCuarto3D(cell, fp)
          const y = nivelBaseY(niveles[room.id] ?? 0, conTecho)
          const roomNivel = niveles[room.id] ?? 0
          const otroNivel = modoPlanos && roomNivel !== planosNivel
          const resaltado = resaltadoPlanoId === room.id
          return (
            <Room3D
              key={room.id}
              id={room.id}
              position={[x, y + (arrastrando ? 0.8 : 0), z]}
              color={roomColors[room.id] ?? room.color}
              atenuado={otroNivel}
              resaltadoPlano={resaltado}
            />
          )
        })}

      {!aislarCuarto && <ZonasPlano3D />}
      {!aislarCuarto && <PlanoPisosSeleccion3D />}

      {!aislarCuarto && <PlanoCuartos3DController />}
      {!aislarCuarto && <PlanoPisos3DController />}
      {!aislarCuarto && <PlanoParedes3DEditor />}

      {!aislarCuarto && <FocosCasa />}
      {!aislarCuarto && <Accesos />}
      {!aislarCuarto && <TechosCaminables />}
      {!aislarCuarto && <AccesoProximity />}
      {!aislarCuarto && <ObjetosMapa />}
      {!aislarCuarto && <RoomProximity />}
      {!aislarCuarto && <InteractAnchor />}
      {!aislarCuarto && editMode && <RoomDragController />}
      {!aislarCuarto && <AccesoDrag />}
      <ObjetoDragController />
      {!modoPlanos && <GridResizer />}
      {aislarCuarto && <RoomCellEditor />}
      {aislarCuarto && <TechoCeldaEditor />}
      {!aislarCuarto && modoPlanos && <PlanoTechos3DEditor />}
      {!aislarCuarto && modoPlanos && <TechoCeldaEditor />}
      {!aislarCuarto && <Character />}
      {!aislarCuarto && <Asistente3D />}
      </Canvas>
        </div>
      </div>
      <NavControls />
      <EditPanel />
    </>
  )
}
