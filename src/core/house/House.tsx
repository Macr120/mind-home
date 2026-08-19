import { memo, useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { Canvas, useThree } from '@react-three/fiber'
import { useShallow } from 'zustand/react/shallow'
import type { Cuarto, CuadranteMapa } from '../data/db'
import { useHouse } from '../state/houseStore'
import { useDiseño } from '../state/disenoStore'
import { esGamaBaja } from '../gamaDispositivo'
import { useLayout } from '../state/layoutStore'
import { useCuartos } from '../state/cuartosStore'
import { Character } from './Character'
import { Asistente3D, AsistenteProximity } from './Asistente3D'
import { RoomProximity } from './RoomProximity'
import { Room3D } from './Room3D'
import { Accesos, AccesoProximity, AccesoDrag } from './Accesos'
import { CameraRig } from './CameraRig'
import { CapturaCasa } from '../widgets/CapturaCasa'
import { FollowCamera } from './FollowCamera'
import { CameraControls } from './CameraControls'
import { RoomDragController } from './RoomDragController'
import { ObjetoDragController } from './ObjetoDragController'
import { CharacterDragController } from './CharacterDragController'
import {
  centroCuarto3D,
  SPACING,
  nivelBaseY,
  cellToWorld,
  worldToCeldaEntera,
  tileOcupado,
  FOOTPRINT_DEFAULT,
} from './walls'
import { celdaEnCuadrante, cuadrantePorId, cuartoEnCuadrante } from './cuadrantesMapa'
import { useTemaActivo } from './useTema'
import { CieloDiaNoche } from './CieloDiaNoche'
import { EfectosPost } from './EfectosPost'
import { EntornoIBL } from './EntornoIBL'
import { FondoEscena } from './FondoEscena'
import { FondoAnimaciones } from './FondoAnimaciones'
import { FocosCasa } from './FocosCasa'
import { TemaContext } from './primitivas'
import { ObjetoView } from './catalogo'
import { GrupoAnimado } from './Animado'
import { objetosMapaIdx } from '../state/disenoStore'
import { useMontura } from '../state/monturaStore'
import { useCargar, ALTURA_CARGA_OBJETO, ALTURA_CARGA_CUARTO } from '../state/cargarStore'
import { ContextoProximity } from './ContextoProximity'
import { CargaController } from './CargaController'
import { VehiculoProximity } from './vehiculos'
import { RafagasLaser } from './proyectiles'
import { Portales } from './portales'
import { Fuegos } from './fuegos'
import { Burbujas } from './burbujas'
import { GrafitiController } from './grafiti'
import { Caminos3D, CaminosController } from './caminos'
import { MarcasDerrape } from './derrape'
import { CarreraRuntime, RivalCarrera } from './carrera'
import { ItemsCarreraRuntime, ItemsCarrera3D } from './itemsCarrera'
import { PaintballController } from './paintball'
import { PistaLibre3D, TrazoLibreController } from './pistaLibre'
import { Huerto3D, HuertoController } from './huerto'
import { CanchasController } from './canchas'
import { Granja3D, GranjaController, GranjaProximity } from './granja'
import { TrenProximity, TrenesAutonomos } from './tren'
import { MinijuegosCanchas } from './minijuegos'
import { useCanchas, esCancha, escalaCancha } from '../state/canchasStore'
import { NavControls } from '../ui/NavControls'
import { EditorMontaje, SalirCuartoFlotante } from '../ui/EditorHud'
import { InteractAnchor } from './InteractAnchor'
import { EtiquetasMapaProjector } from './etiquetasMapa'
import { ZonaTutProjector } from './ZonaTutProjector'
import { EditorAnchor } from './EditorAnchor'
import { TechoCeldaEditor } from './TechoCeldaEditor'
import { PlanoTechos3DEditor } from './PlanoTechos3DEditor'
import { GridResizer } from './GridResizer'
import { RoomCellEditor } from './RoomCellEditor'
import { usePlanos } from '../state/planosStore'
import { useEditorUi } from '../state/editorUiStore'
import { HidratarMapaTablas } from '../state/mapaTablasStore'
import { SeguirFoco, cercaDelFoco, cercaDelFocoMundo, useCercania } from './cercaniaFoco'
import { ZonasPlano3D } from './ZonasPlano3D'
import { PisosExterior3D } from './PisosExterior3D'
import { MurosLibres3D } from './MurosLibres3D'
import { PlanoPisosSeleccion3D } from './PlanoPisosSeleccion3D'
import { CuadranteGhost3D } from './CuadranteGhost3D'
import { DibujoCuadrante3D } from './DibujoCuadrante3D'
import { PlanoCuartos3DController } from './PlanoCuartos3DController'
import { PlanoPisos3DController } from './PlanoPisos3DController'
import { PlanoMuros3DController } from './PlanoMuros3DController'
import { PlanoParedes3DEditor } from './PlanoParedes3DEditor'
import { PlanoMuroSelector3D } from './PlanoMuroSelector3D'
import { MapaBase3D } from './MapaBase3D'

/** DEV: expone escena/gl/advance en window (mismo patrón que los stores) para depurar. */
function ExponerEscenaDev() {
  const state = useThree()
  useEffect(() => {
    ;(window as unknown as { __r3f?: unknown }).__r3f = state.get
  }, [state])
  return null
}

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
  // Techo y explosión cambian la silueta que proyecta sombra: ambos la re-disparan.
  const conTecho = useHouse((s) => s.conTecho)
  const explotado = useHouse((s) => s.explotado)
  useEffect(() => {
    if (editMode) return
    gl.shadowMap.needsUpdate = true
  }, [gl, editMode, placed, cells, editingRoomId, conTecho, explotado])
  return null
}

/**
 * Cuadrícula del mapa: dibuja SOLO el borde de las celdas exteriores (sin cuarto en
 * planta baja ni hueco de sótano debajo). Así la rejilla no cruza por encima de los
 * cuartos ni de las albercas —que la opacaban—, pero sigue delineando el terreno libre.
 */
function RejillaMapa({
  gridCols,
  gridRows,
  colorFuerte,
}: {
  gridCols: number
  gridRows: number
  colorFuerte: string
  colorSuave: string
}) {
  const ocupadoPorNivel = useLayout((s) => s.ocupadoPorNivel)
  const geometry = useMemo(() => {
    const occ0 = ocupadoPorNivel.get(0)
    const occNeg = ocupadoPorNivel.get(-1)
    const h = SPACING / 2
    const pts: number[] = []
    for (let col = 0; col < gridCols; col++) {
      for (let row = 0; row < gridRows; row++) {
        // Celda cubierta por un cuarto (nivel 0) o excavada por un sótano: sin rejilla.
        if ((occ0 && tileOcupado(occ0, col, row)) || (occNeg && tileOcupado(occNeg, col, row))) continue
        const [x, , z] = cellToWorld(col, row)
        const x0 = x - h
        const x1 = x + h
        const z0 = z - h
        const z1 = z + h
        pts.push(x0, 0, z0, x1, 0, z0, x0, 0, z1, x1, 0, z1, x0, 0, z0, x0, 0, z1, x1, 0, z0, x1, 0, z1)
      }
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3))
    return g
  }, [gridCols, gridRows, ocupadoPorNivel])
  useEffect(() => () => geometry.dispose(), [geometry])
  return (
    <lineSegments position={[0, 0.02, 0]} geometry={geometry}>
      <lineBasicMaterial color={colorFuerte} transparent opacity={0.55} />
    </lineSegments>
  )
}

/** Objetos LIBRES sobre el mapa (fuera de cuartos): coordenadas de mundo. */
const ObjetosMapa = memo(function ObjetosMapa({
  cuadranteVista,
}: {
  cuadranteVista: CuadranteMapa | null
}) {
  // Solo los objetos del mapa: mover objetos DE CUARTO no re-renderiza esta lista.
  const objetos = useDiseño((s) => objetosMapaIdx(s.objetos))
  const draggingObjeto = useDiseño((s) => s.draggingObjeto)
  const arrastreElevado = useDiseño((s) => s.arrastreElevado)
  const startObjetoDrag = useDiseño((s) => s.startObjetoDrag)
  const editMode = useLayout((s) => s.editMode)
  const editingRoomId = useLayout((s) => s.editingRoomId)
  const tab = useEditorUi((s) => s.tab)
  const setObjetoSel = useEditorUi((s) => s.setObjetoSel)
  const objetoSel = useEditorUi((s) => s.objetoSel)
  const setTab = useEditorUi((s) => s.setTab)
  const editor3d = useEditorUi((s) => s.editor3d)
  const inventarioObjetosActivo = useEditorUi((s) => s.inventarioObjetosActivo)
  // El vehículo que se está conduciendo se dibuja dentro del Character, no aquí.
  const montadoId = useMontura((s) => s.instanciaId)
  const centro = useCercania((s) => s.centro)
  const tema = useTemaActivo()
  // En el editor de canchas (modo Editar) las canchas también se pueden ARRASTRAR.
  const canchasEditar = useCanchas((s) => s.activo && s.clase === null)
  const editables =
    editor3d || (editMode && !editingRoomId && tab === 'objetos') || inventarioObjetosActivo
  // Fuera del radio del foco no se montan: son los árboles, la fuente, el
  // espectacular… de la otra punta del mapa. Editando sí, que ahí se colocan —
  // salvo con un cuadrante en vista, cuyo recorte manda también en el editor
  // (con excepción del objeto seleccionado o en arrastre).
  const enVista = (x: number, z: number) => {
    if (!cuadranteVista) return true
    const { col, row } = worldToCeldaEntera(x, z)
    return celdaEnCuadrante(col, row, cuadranteVista)
  }
  const items = objetos.filter(
    (o) =>
      o.id !== montadoId &&
      (draggingObjeto === o.id ||
        (o.id != null && o.id === objetoSel) ||
        (enVista(o.x ?? 0, o.z ?? 0) &&
          (editables || cercaDelFocoMundo(o.x ?? 0, o.z ?? 0, centro)))),
  )
  if (items.length === 0) return null
  return (
    <TemaContext.Provider value={tema}>
      {items.map((o) => {
        const drag = draggingObjeto === o.id
        const D = Math.PI / 180
        const arrastrable = editables || (canchasEditar && esCancha(o.tipo))
        // Las canchas siguen a la rejilla; el resto de objetos conserva su tamaño.
        const escala = esCancha(o.tipo) ? escalaCancha(o.escala) : (o.escala ?? 1)
        const alturaDrag = drag ? (arrastreElevado ? ALTURA_CARGA_OBJETO : 0.6) : 0.2
        return (
          <group
            key={o.id}
            position={[o.x ?? 0, alturaDrag + (o.y ?? 0), o.z ?? 0]}
            rotation={[(o.rotX ?? 0) * D, (o.rotY ?? 0) * D, (o.rotZ ?? 0) * D]}
            scale={escala}
            onPointerDown={
              arrastrable
                ? (e) => {
                    e.stopPropagation()
                    if (o.id != null) {
                      if (editor3d) setTab('objetos')
                      if (!canchasEditar || editables) setObjetoSel(o.id)
                      startObjetoDrag(o.id)
                    }
                  }
                : undefined
            }
            onPointerOver={(e) => {
              e.stopPropagation()
              if (arrastrable) document.body.style.cursor = 'grab'
            }}
            onPointerOut={() => {
              if (!useDiseño.getState().draggingObjeto) document.body.style.cursor = 'default'
            }}
          >
            <GrupoAnimado anim={o.animacion} nivel={0} objetoId={o.id}>
              <ObjetoView
                tipo={o.tipo}
                color={o.color}
                piezas={o.piezas}
                modeloGlb={o.modeloGlb}
                foto={o.foto}
                texto={o.texto}
                anim={o.animacion}
                nivelAnim={0}
                objetoId={o.id}
                fx={o.fx}
                grupoAccion={o.grupoAccion}
              />
            </GrupoAnimado>
          </group>
        )
      })}
    </TemaContext.Provider>
  )
})

/**
 * Un cuarto colocado en el mapa, con sus suscripciones POR CUARTO (celda, nivel, color,
 * arrastre, atenuado/resaltado): mover o editar un cuarto no re-renderiza a los demás,
 * y los re-renders de House no cascan en los cuartos (memo con prop `room` estable).
 */
const RoomEnMapa = memo(function RoomEnMapa({
  room,
  cuadranteVista,
}: {
  room: Cuarto
  cuadranteVista: CuadranteMapa | null
}) {
  const arrastrando = useLayout((s) => s.draggingId === room.id)
  const editMode = useLayout((s) => s.editMode)
  // Cargado con la herramienta "mover": se dibuja sobre la cabeza del personaje
  // (todo el cuarto cuelga del mismo group, así que basta el offset en Y).
  const cargado = useCargar((s) => s.sujeto?.tipo === 'cuarto' && s.sujeto.id === room.id)
  const cell = useLayout((s) => (s.draggingId === room.id && s.previewCell ? s.previewCell : s.cells[room.id]))
  const fp = useLayout((s) => s.footprints[room.id] ?? FOOTPRINT_DEFAULT)
  const nivel = useLayout((s) => s.niveles[room.id] ?? 0)
  // Editando un cuarto: los DEMÁS se ven atenuados (contexto), el editado a tope.
  const editandoOtro = useLayout((s) => Boolean(s.editingRoomId) && s.editingRoomId !== room.id)
  const apilado = !useHouse((s) => s.explotado)
  const color = useDiseño((s) => s.roomColors[room.id]) ?? room.color
  const editor3d = useEditorUi((s) => s.editor3d)
  const { planosActivo, planosNivel } = usePlanos(
    useShallow((s) => ({ planosActivo: s.activo, planosNivel: s.nivel })),
  )
  // El resaltado y el techo forzado siguen al MOTOR de planos (activo también con el
  // atajo de construcción de la rueda, sin panel del editor).
  const resaltado = usePlanos((s) => s.activo && s.seleccion?.tipo === 'cuarto' && s.seleccion.roomId === room.id)
  // En el editor de mapa el techo sigue al modo: oculto por defecto (para ver el interior)
  // y visible —con la forma real del cuarto— solo en modo Techos. Fuera del editor manda 🏠.
  const forzarTecho = usePlanos((s) => (s.activo ? s.modo === 'techos' : undefined))
  // Lejos del foco de cámara el cuarto conserva su casco (la silueta del mapa no
  // debe parpadear) pero se queda sin objetos, que es la masa de mallas y de
  // lejos casi no se distinguen. En el editor el mismo recorte lo gobierna el
  // cuadrante en vista: fuera de él, casco. Arrastrando, cargado o editándose
  // NO se recorta: ahí el usuario está mirando ese cuarto en concreto.
  const editandoEste = useLayout((s) => s.editingRoomId === room.id)
  const centro = useCercania((s) => s.centro)
  const fueraDeVista =
    cuadranteVista != null && !editandoEste && !cuartoEnCuadrante(cell, fp, cuadranteVista)
  const lejos =
    !arrastrando && !cargado && (editMode ? fueraDeVista : !cercaDelFoco(cell, centro))
  const [x, , z] = centroCuarto3D(cell, fp)
  const y = nivelBaseY(nivel, apilado)
  const otroNivel = planosActivo && nivel !== planosNivel
  return (
    <Room3D
      id={room.id}
      position={[x, y + (cargado ? ALTURA_CARGA_CUARTO : arrastrando ? 0.8 : 0), z]}
      color={color}
      atenuado={otroNivel || (editandoOtro && !editor3d)}
      sinObjetos={lejos}
      resaltadoPlano={resaltado}
      forzarTecho={forzarTecho}
    />
  )
})

/** Resolución de render: fija por sesión (la gama del equipo no cambia en caliente). */
const DPR: [number, number] = esGamaBaja() ? [1, 1] : [1, 1.5]

export function House() {
  const { placed, niveles, gridCols, gridRows, tamCelda, editMode, cuadrantesPropios } = useLayout(
    useShallow((s) => ({
      placed: s.placed,
      niveles: s.niveles,
      gridCols: s.gridCols,
      gridRows: s.gridRows,
      tamCelda: s.tamCelda,
      editMode: s.editMode,
      cuadrantesPropios: s.cuadrantes,
    })),
  )
  const cuartos = useCuartos((s) => s.cuartos)
  const { planosActivo, planosNivel, planosModo, planosCapa, planosHerr, dibujandoCuadrante } = usePlanos(
    useShallow((s) => ({
      planosActivo: s.activo,
      planosNivel: s.nivel,
      planosModo: s.modo,
      planosCapa: s.capa,
      planosHerr: s.herramienta,
      dibujandoCuadrante: s.dibujandoCuadrante,
    })),
  )
  const mapaSuperficie = useDiseño((s) => s.mapaSuperficie)
  const editorTab = useEditorUi((s) => s.tab)
  const editor3d = useEditorUi((s) => s.editor3d)
  // Editar un cuarto ya NO aísla la escena: se usa el editor de mapa COMPLETO para poder
  // seleccionar muros/puertas/ventanas/piso/techos en 3D. La cámara y el croquis se enfocan
  // en el cuarto y los DEMÁS cuartos se atenúan (ver `atenuadoEdicion`).
  const aislarCuarto = false
  // El editor de mapa (planos) funciona también editando un cuarto y en perspectiva: los
  // controladores 3D de muros/pisos/techos editan igual desde iso, 3ª y 1ª persona.
  const modoPlanos = planosActivo && editMode
  // En el editor sin cuarto, la interacción 3D depende de la pestaña: solo "Mapa" edita
  // la rejilla y mueve cuartos; "Personajes" arrastra personajes; "Objetos" arrastra objetos.
  const tabMapa = editorTab === 'mapa'
  // Arrastre de cuartos del registro: en el tab Mapa del editor completo, o con el atajo
  // de construcción (Cuartos + botón Mover) — misma condición que Room3D.puedeMoverCuarto.
  const planosMoverCuartos = planosActivo && planosCapa === 'cuartos' && planosHerr === 'mover'
  // Dibujando una zona el arrastre es para marcar el rectángulo: no debe mover cuartos.
  const puedeArrastrarCuartos =
    !editor3d && !dibujandoCuadrante && (editMode ? tabMapa : planosMoverCuartos)

  // Herramienta Expandir: muestra los +/− de TODOS los cuartos del nivel para
  // crecerlos/recortarlos o eliminarlos, sin mover ni cambiar de panel.
  const editarCeldasPlano = planosActivo && planosModo === 'cuartos' && planosHerr === 'expandir'
  const cuartosExpandir = editarCeldasPlano
    ? cuartos.filter((r) => placed[r.id] && (niveles[r.id] ?? 0) === planosNivel)
    : []

  // Cuadrante en vista del editor, resuelto UNA vez: cuartos y objetos del mapa solo
  // comparan sus celdas contra él. Fuera del editor —o caminando en el editor 3D—
  // no recorta nada (queda el recorte por cercanía de siempre).
  const cuadranteVistaId = usePlanos((s) => s.cuadranteVista)
  const cuadranteVista = useMemo(
    () =>
      editMode && !editor3d
        ? cuadrantePorId(cuadranteVistaId, gridCols, gridRows, cuadrantesPropios)
        : null,
    [editMode, editor3d, cuadranteVistaId, gridCols, gridRows, cuadrantesPropios],
  )

  return (
    <>
      <div className="absolute inset-0 flex flex-col">
        <div className={`relative min-h-0 flex-1 ${modoPlanos ? 'pe-80' : ''}`}>
      <Canvas
        // Remonta la escena al cambiar el tamaño de celda: TODA la geometría memoizada
        // (pisos, muros, techos, agua) se regenera con el SIZE nuevo.
        key={tamCelda}
        data-lienzo-casa
        shadows
        orthographic
        // near/far holgados: con la rejilla al máximo (20×20 de celdas de 12 m) las
        // esquinas del mapa quedaban fuera del volumen ortográfico y se recortaban.
        camera={{ position: [22, 22, 22], zoom: 17, near: -400, far: 800 }}
        style={{ position: 'absolute', inset: 0 }}
        // Gama baja: rasterizar a dpr 1 (en una pantalla DPR 3, 1.5 son 2.25×
        // los píxeles de 1 — demasiado para su GPU).
        dpr={DPR}
        gl={{ toneMapping: THREE.ACESFilmicToneMapping }}
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
        {/* Foto de la casa para el widget de Android (solo cuando se le pide). */}
        <CapturaCasa />
        {import.meta.env.DEV && <ExponerEscenaDev />}
      <CieloDiaNoche />
      <EntornoIBL />
      <FondoEscena />
      <FondoAnimaciones />

      {!aislarCuarto && <PisosExterior3D />}
      {/* Infraestructura construida sobre el mapa (caminos, huerto y granja). */}
      {!aislarCuarto && <Caminos3D />}
      {!aislarCuarto && <PistaLibre3D />}
      {!aislarCuarto && <MarcasDerrape />}
      {!aislarCuarto && <Huerto3D />}
      {!aislarCuarto && <Granja3D />}
      {/* Al editar un cuarto se mantienen el suelo y la rejilla del mapa como contexto. */}
      <MapaBase3D />
      <RejillaMapa
        gridCols={gridCols}
        gridRows={gridRows}
        colorFuerte={mapaSuperficie.rejillaFuerte}
        colorSuave={mapaSuperficie.rejillaSuave}
      />
      <MurosLibres3D />

      {cuartos
        .filter((room) => placed[room.id])
        .map((room) => (
          <RoomEnMapa key={room.id} room={room} cuadranteVista={cuadranteVista} />
        ))}

      {!aislarCuarto && <ZonasPlano3D />}
      {!aislarCuarto && <PlanoPisosSeleccion3D />}
      {!aislarCuarto && <CuadranteGhost3D />}
      {!aislarCuarto && <DibujoCuadrante3D />}

      {!aislarCuarto && <PlanoCuartos3DController />}
      {!aislarCuarto && <PlanoPisos3DController />}
      {!aislarCuarto && <PlanoMuros3DController />}
      {!aislarCuarto && <PlanoParedes3DEditor />}
      {!aislarCuarto && <PlanoMuroSelector3D />}

      {!aislarCuarto && <FocosCasa />}
      {!aislarCuarto && <Accesos />}
      {!aislarCuarto && <AccesoProximity />}
      {!aislarCuarto && <VehiculoProximity />}
      {!aislarCuarto && <CarreraRuntime />}
      {!aislarCuarto && <RivalCarrera />}
      {!aislarCuarto && <ItemsCarreraRuntime />}
      {!aislarCuarto && <ItemsCarrera3D />}
      {!aislarCuarto && <TrenProximity />}
      {!aislarCuarto && <TrenesAutonomos />}
      {!aislarCuarto && <MinijuegosCanchas />}
      {!aislarCuarto && <GranjaProximity />}
      {!aislarCuarto && <AsistenteProximity />}
      {!aislarCuarto && <ObjetosMapa cuadranteVista={cuadranteVista} />}
      {!aislarCuarto && <RafagasLaser />}
      {!aislarCuarto && <PaintballController />}
      {!aislarCuarto && <Portales />}
      {!aislarCuarto && <Fuegos />}
      {!aislarCuarto && <Burbujas />}
      {!aislarCuarto && <GrafitiController />}
      {!aislarCuarto && <CaminosController />}
      {!aislarCuarto && <TrazoLibreController />}
      {!aislarCuarto && <CanchasController />}
      {!aislarCuarto && <HuertoController />}
      {!aislarCuarto && <GranjaController />}
      {!aislarCuarto && <RoomProximity />}
      {!aislarCuarto && <InteractAnchor />}
      {!aislarCuarto && <EtiquetasMapaProjector />}
      {!aislarCuarto && <ZonaTutProjector />}
      {!aislarCuarto && <EditorAnchor />}
      {!aislarCuarto && puedeArrastrarCuartos && <RoomDragController />}
      {!aislarCuarto && <AccesoDrag />}
      <ObjetoDragController />
      {!aislarCuarto && <ContextoProximity />}
      {!aislarCuarto && <CargaController />}
      {!aislarCuarto && editMode && editorTab === 'personajes' && !editor3d && <CharacterDragController />}
      {/* Grid: los botones +/− de tamaño del mapa. En el editor 3D se muestran siempre
          (en perspectiva) para redimensionar; en iso, solo fuera del modo planos. */}
      {tabMapa && (editor3d || !modoPlanos) && planosModo !== 'ascensos' && <GridResizer />}
      {!aislarCuarto &&
        cuartosExpandir.map((r) => <RoomCellEditor key={r.id} roomId={r.id} />)}
      {!aislarCuarto && planosActivo && <PlanoTechos3DEditor />}
      {!aislarCuarto && planosActivo && <TechoCeldaEditor />}
      {!aislarCuarto && <Character />}
      {!aislarCuarto && <Asistente3D />}

      {/* Editor 3D: esfera de cielo invisible. Solo se toca cuando el clic no pega en
          nada más (cielo) → abre el modo Fondo. */}
      {editor3d && (
        <mesh
          onClick={(e) => {
            e.stopPropagation()
            // Tocar el cielo abre Fondo SOLO si ya estás en el editor de mapa. Estando en
            // Objetos/Personajes, deseleccionar (clic al vacío) no te saca de ahí: el editor
            // se queda con el último objeto/personaje seleccionado.
            if (useEditorUi.getState().tab !== 'mapa') return
            usePlanos.getState().setModo('fondo')
          }}
        >
          <sphereGeometry args={[180, 16, 12]} />
          <meshBasicMaterial transparent opacity={0} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
      )}
      <EfectosPost />
      </Canvas>
        </div>
      </div>
      {/* Único suscriptor de `zonas` y `pisosExterior`: antes cada cuarto abría
          las suyas y una casa de 17 mantenía 34 consultas vivas sobre las
          MISMAS dos tablas. No pinta nada. */}
      <HidratarMapaTablas />
      {/* Publica la celda del foco de cámara; de ahí sale el recorte de objetos. */}
      <SeguirFoco cols={gridCols} rows={gridRows} />
      <NavControls />
      <EditorMontaje />
      <SalirCuartoFlotante />
    </>
  )
}
