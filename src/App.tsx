import { lazy, Suspense, useEffect, useState } from 'react'
import { House } from './core/house/House'
import { InteractOverlay } from './core/ui/InteractOverlay'
import { EtiquetasMapaOverlay } from './core/ui/EtiquetasMapaOverlay'
import { AccesoOverlay } from './core/ui/AccesoOverlay'
import { VehiculoOverlay } from './core/ui/VehiculoOverlay'
import { TrenOverlay } from './core/ui/TrenOverlay'
import { MarcadorCancha } from './core/ui/MarcadorCancha'
import { GranjaCercaOverlay } from './core/ui/GranjaCercaOverlay'
import { CarreraOverlay } from './core/ui/CarreraOverlay'
import { AsignarPlantillaDialog } from './core/ui/AsignarPlantillaDialog'
import { AmueblarDialog } from './core/ui/AmueblarDialog'
import { AccesoNivelDialog } from './core/ui/AccesoNivelDialog'
import { RoomOverlay } from './core/ui/RoomOverlay'
import { RoomSideMenu, FloatingMenuButton } from './core/ui/RoomSideMenu'
import { MoveControls } from './core/ui/MoveControls'
import { MenuHerramientas } from './core/ui/MenuHerramientas'
import { EditorGrafiti } from './core/ui/EditorGrafiti'
import { EditorCaminos } from './core/ui/EditorCaminos'
import { EditorCanchas } from './core/ui/EditorCanchas'
import { EditorHuerto } from './core/ui/EditorHuerto'
import { EditorGranja } from './core/ui/EditorGranja'
import { InfraNota } from './core/ui/InfraNota'
import { ChatBox } from './core/chat/ChatBox'
import { RutinasPanel } from './core/ui/RutinasPanel'
import { AvisoRespaldo } from './core/ui/AvisoRespaldo'
import { Calendario } from './core/ui/Calendario'
import { AsistenteBurbuja } from './core/ui/AsistenteBurbuja'
import { AsistenteCercaOverlay } from './core/ui/AsistenteCercaOverlay'
import { DialogoOverlay } from './core/ui/DialogoOverlay'
import { GeneradorMiniaturas } from './core/house/Miniatura'
import { TutorialOverlay } from './core/tutorial/TutorialOverlay'
import { SelectorTutorialOverlay } from './core/tutorial/SelectorTutorial'
import { BienvenidaOverlay } from './core/bienvenida/BienvenidaOverlay'
import { useHouse } from './core/state/houseStore'
import { useLayout } from './core/state/layoutStore'
import { useGrafitis } from './core/state/grafitiStore'
import { useCaminos } from './core/state/caminosStore'
import { useCanchas } from './core/state/canchasStore'
import { useHuerto } from './core/state/huertoStore'
import { useGranja } from './core/state/granjaStore'
import { useEditorUi } from './core/state/editorUiStore'
import { useCam } from './core/state/cameraStore'
import { useDialogo } from './core/state/dialogoStore'
import { useDiarioProgramado } from './rooms/diario/reparto'
import { useAvisos } from './core/avisos'
import { useMusicaAmbiental } from './core/audio/useMusicaAmbiental'
import { useVozAsistente } from './core/audio/voz'
import { useCorazon } from './core/chat/corazon'
import { useWrappedUi } from './core/state/wrappedUiStore'

// Wrapped (resumen del periodo): lazy, solo se descarga al abrirlo.
const WrappedOverlay = lazy(() => import('./core/wrapped/WrappedOverlay'))

export default function App() {
  // Reloj del diario: rollover de medianoche + reparto de noticias por asistentes.
  useDiarioProgramado()
  // Avisos de lo agendado y de las metas del día. Va aquí, y no en RutinasPanel,
  // porque ese panel se desmonta al entrar a un cuarto (y dejaba de avisar).
  useAvisos()
  // Música ambiental de la casa (sigue sonando dentro de los cuartos).
  useMusicaAmbiental()
  // Voz (TTS) de los asistentes cuando hablan por la burbuja.
  useVozAsistente()
  // Corazón: comentarios espontáneos de los asistentes del mapa.
  useCorazon()
  const editMode = useLayout((s) => s.editMode)
  const editor3d = useEditorUi((s) => s.editor3d)
  const activeRoom = useHouse((s) => s.activeRoom)
  // Pintando grafiti: el overlay del lienzo sustituye a los controles de juego.
  const pintando = useGrafitis((s) => !!s.modo)
  // Construyendo infraestructura (caminos/canchas/huerto): su editor sustituye al HUD de juego.
  // Los tres hooks se llaman SIEMPRE (un `||` directo saltaría hooks al corto-circuitar).
  const enCaminos = useCaminos((s) => s.activo)
  const enCanchas = useCanchas((s) => s.activo)
  const enHuerto = useHuerto((s) => s.activo)
  const enGranja = useGranja((s) => s.activo)
  const construyendo = enCaminos || enCanchas || enHuerto || enGranja
  const wrappedAbierto = useWrappedUi((s) => s.abierto)
  // En diálogo cara a cara la caja RPG sustituye a la burbuja flotante.
  const dialogoActivo = useDialogo((s) => !!s.asistenteId)
  const [sidebarOpen, setSidebarOpen] = useState(true)

  /**
   * Editar un cuarto (⚙️ + zoom) o abrir "Editar mapa" necesita espacio para el
   * panel derecho: cierra el menú lateral (un solo panel a la vez).
   */
  useEffect(
    () =>
      useLayout.subscribe((s, prev) => {
        if ((s.editingRoomId && !prev.editingRoomId) || (s.editMode && !prev.editMode)) {
          setSidebarOpen(false)
        }
      }),
    [],
  )

  /**
   * Y en sentido contrario: abrir el menú lateral OCULTA el editor (un solo panel a la
   * vez), sin mover la cámara ni salir del cuarto en edición — solo se esconde. Al
   * cerrar el menú de nuevo, se retoma el mismo editor tal cual se dejó. La única forma
   * real de salir de un cuarto es el botón flotante `SalirCuartoFlotante`.
   */
  useEffect(() => {
    const layout = useLayout.getState()
    if (sidebarOpen && layout.editMode) {
      useLayout.getState().setEditMode(false, { mantenerVista: true })
    } else if (!sidebarOpen && !layout.editMode && layout.editingRoomId) {
      useLayout.getState().setEditMode(true)
    }
  }, [sidebarOpen])

  /** El editor de mapa (iso) usa siempre la cámara isométrica; el editor 3D NO. */
  useEffect(() => {
    if (editMode && !editor3d) useCam.getState().setVista('iso')
  }, [editMode, editor3d])

  return (
    <div className="ui-app relative flex h-full w-full overflow-hidden">
      {sidebarOpen && <RoomSideMenu onToggle={() => setSidebarOpen(false)} />}
      <div className="relative min-h-0 min-w-0 flex-1 h-full">
        <House />
        {!sidebarOpen && (
          // Abrir Mind Home solo OCULTA el editor si estaba abierto (un solo panel a la
          // vez); si se estaba editando un cuarto, se retoma tal cual al cerrar este menú.
          // Para salir de verdad del cuarto, usa el botón flotante sobre él (SalirCuartoFlotante).
          <FloatingMenuButton onToggle={() => setSidebarOpen(true)} />
        )}
        {/* El joystick de movimiento sigue activo en el editor 3D (caminar mientras editas). */}
        {(!editMode || editor3d) && !sidebarOpen && !pintando && !construyendo && !dialogoActivo && <MoveControls />}
        {/* Rueda de herramientas: solo en juego (los editores conservan el cubo). */}
        {!editMode && !sidebarOpen && !pintando && !construyendo && <MenuHerramientas />}
        {!editMode && <InteractOverlay />}
        <EtiquetasMapaOverlay />
        {!editMode && !activeRoom && <AccesoOverlay />}
        {!editMode && !activeRoom && <VehiculoOverlay />}
        {!editMode && !activeRoom && !construyendo && <TrenOverlay />}
        {!editMode && !activeRoom && !construyendo && <MarcadorCancha />}
        {!editMode && !activeRoom && !construyendo && <GranjaCercaOverlay />}
        {!editMode && !activeRoom && !construyendo && !dialogoActivo && <AsistenteCercaOverlay />}
        {!editMode && !activeRoom && !construyendo && <CarreraOverlay />}
        {!editMode && !activeRoom && !construyendo && !dialogoActivo && <AsistenteBurbuja />}
        {!editMode && !activeRoom && !construyendo && <DialogoOverlay />}
        {!editMode && !activeRoom && !construyendo && <ChatBox menuAbierto={sidebarOpen} />}
        {!editMode && !activeRoom && !construyendo && <RutinasPanel />}
        {!editMode && !activeRoom && <AvisoRespaldo />}
        <Calendario />
        <RoomOverlay menuFlotante={!sidebarOpen} />
        {!editMode && <EditorGrafiti />}
        {!editMode && <EditorCaminos />}
        {!editMode && <EditorCanchas />}
        {!editMode && <EditorHuerto />}
        {!editMode && <EditorGranja />}
        {/* Respuesta del chat dentro de un editor (allí el ChatBox está desmontado). */}
        {construyendo && <InfraNota />}
      </div>
      <AsignarPlantillaDialog />
      <AmueblarDialog />
      <AccesoNivelDialog />
      {/* Menú de bienvenida de primera vez (idioma → gustos → plan). */}
      <BienvenidaOverlay />
      {/* Único canvas oculto que rasteriza las miniaturas del catálogo/inventario: montado
          aquí (fuera de ambos paneles) para no duplicar el generador entre ellos. */}
      <GeneradorMiniaturas />
      {/* Wrapped: resumen del periodo a pantalla completa. */}
      {wrappedAbierto && (
        <Suspense fallback={null}>
          <WrappedOverlay />
        </Suspense>
      )}
      {/* Tutorial guiado activo (spotlight + mago): por encima de todos los diálogos. */}
      <TutorialOverlay />
      {/* Selector de tutoriales (botón "?"): ilumina en amarillo las zonas con tour. */}
      <SelectorTutorialOverlay />
    </div>
  )
}
