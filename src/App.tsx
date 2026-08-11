import { lazy, Suspense, useEffect } from 'react'
import { House } from './core/house/House'
import { InteractOverlay } from './core/ui/InteractOverlay'
import { EtiquetasMapaOverlay } from './core/ui/EtiquetasMapaOverlay'
import { MarcadorCancha } from './core/ui/MarcadorCancha'
import { CarreraOverlay } from './core/ui/CarreraOverlay'
import { PaintballOverlay } from './core/ui/PaintballOverlay'
import { Mira } from './core/ui/Mira'
import { AsignarPlantillaDialog } from './core/ui/AsignarPlantillaDialog'
import { AmueblarDialog } from './core/ui/AmueblarDialog'
import { DestinoObjetoDialog } from './core/ui/DestinoObjetoDialog'
import { AccesoNivelDialog } from './core/ui/AccesoNivelDialog'
import { ConfirmarDialog } from './core/ui/ConfirmarDialog'
import { EliminarCuartoDialog } from './core/ui/EliminarCuartoDialog'
import { RoomOverlay } from './core/ui/RoomOverlay'
import { RoomSideMenu, FloatingMenuButton } from './core/ui/RoomSideMenu'
import { PilaPrompts } from './core/ui/HudPlegable'
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
import { AvisosPlan } from './core/ui/AvisosPlan'
import { BarraDemo } from './demo/BarraDemo'
import { VolverDemoDialog } from './demo/VolverDemoDialog'
import { esDemo } from './core/edicion'
import { BienvenidaOverlay } from './core/bienvenida/BienvenidaOverlay'
import { useHouse } from './core/state/houseStore'
import { useLayout } from './core/state/layoutStore'
import { useGrafitis } from './core/state/grafitiStore'
import { useConstruyendo } from './core/state/construyendo'
import { useEditorUi } from './core/state/editorUiStore'
import { useCam } from './core/state/cameraStore'
import { useCarrera } from './core/state/carreraStore'
import { usePaintball } from './core/state/paintballStore'
import { useDialogo } from './core/state/dialogoStore'
import { useDiarioProgramado } from './rooms/diario/reparto'
import { useAvisos } from './core/avisos'
import { useWidgets } from './core/widgets/useWidgets'
import { useMusicaAmbiental } from './core/audio/useMusicaAmbiental'
import { useVozAsistente } from './core/audio/voz'
import { useCorazon } from './core/chat/corazon'
import { useVidrioSegunLuz } from './core/ui/useVidrioSegunLuz'
import { useWrappedUi } from './core/state/wrappedUiStore'
import { useHud } from './core/state/hudStore'
import { useSisifoUi } from './core/state/sisifoUiStore'
import { SisifoFestejo } from './core/gamificacion/SisifoFestejo'

// Wrapped (resumen del periodo): lazy, solo se descarga al abrirlo.
const WrappedOverlay = lazy(() => import('./core/wrapped/WrappedOverlay'))
// Montaña de Sísifo (ascenso anual): lazy, solo se descarga al abrirla.
const MontanaSisifoOverlay = lazy(() => import('./core/gamificacion/MontanaSisifoOverlay'))

export default function App() {
  // Reloj del diario: rollover de medianoche + reparto de noticias por asistentes.
  useDiarioProgramado()
  // Avisos de lo agendado y de las metas del día. Va aquí, y no en RutinasPanel,
  // porque ese panel se desmonta al entrar a un cuarto (y dejaba de avisar).
  useAvisos()
  // Widgets nativos de Android: publica el snapshot del día y aplica los taps
  // hechos desde el launcher. Fuera de la app (Capacitor) no hace nada.
  useWidgets()
  // Música ambiental de la casa (sigue sonando dentro de los cuartos).
  useMusicaAmbiental()
  // Voz (TTS) de los asistentes cuando hablan por la burbuja.
  useVozAsistente()
  // Corazón: comentarios espontáneos de los asistentes del mapa.
  useCorazon()
  // Modo transparente: la paleta del chrome sigue la luz de la casa (el vidrio
  // toma el color de la escena que deja pasar).
  useVidrioSegunLuz()
  const editMode = useLayout((s) => s.editMode)
  const editor3d = useEditorUi((s) => s.editor3d)
  const activeRoom = useHouse((s) => s.activeRoom)
  // Pintando grafiti: el overlay del lienzo sustituye a los controles de juego.
  const pintando = useGrafitis((s) => !!s.modo)
  // Construyendo infraestructura (caminos/canchas/huerto/granja): su editor sustituye
  // al HUD de juego y pliega las esquinas superiores de la casa.
  const construyendo = useConstruyendo()
  // En plena carrera el bajo lo ocupan el ítem y el derrape (CarreraOverlay): el
  // chat estorbaría encima de ellos, así que cede la banda mientras dure.
  const enCarrera = useCarrera((s) => s.fase === 'semaforo' || s.fase === 'corriendo')
  // En batalla de paintball (y en sus resultados) el bajo lo ocupa el botón de
  // disparo y los asistentes están en el campo (desmontados del paseo): ceden
  // el chat, la rueda y sus burbujas hasta salir del modo.
  const enPaintball = usePaintball(
    (s) => s.fase === 'cuenta' || s.fase === 'jugando' || s.fase === 'fin',
  )
  const wrappedAbierto = useWrappedUi((s) => s.abierto)
  const sisifoAbierto = useSisifoUi((s) => s.abierto)
  // En diálogo cara a cara la caja RPG sustituye a la burbuja flotante.
  const dialogoActivo = useDialogo((s) => !!s.asistenteId)
  // Vive en hudStore (no como estado local) para que ToolbarPermanente sepa que debe
  // plegarse en vertical cuando este menú está abierto (ver FloatingMenuButton, espejo).
  const sidebarOpen = useHud((s) => s.menuAbierto)
  const setSidebarOpen = useHud((s) => s.setMenuAbierto)

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
    [setSidebarOpen],
  )

  /**
   * Abrir la app de un cuarto también cierra el menú lateral: si no, la app se
   * abre en el hueco que deja el menú (en vertical, casi sin ancho). Al salir de
   * la app el menú NO se reabre solo; se vuelve con el botón flotante.
   */
  useEffect(
    () =>
      useHouse.subscribe((s, prev) => {
        if (s.activeRoom && !prev.activeRoom) setSidebarOpen(false)
      }),
    [setSidebarOpen],
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

  // El fondo lo pinta `#root`: esta raíz no lleva `ui-app` para que el vidrio del
  // modo transparente afecte solo a las apps, no al contenedor de todo.
  return (
    <div className="relative flex h-full w-full overflow-hidden">
      {sidebarOpen && <RoomSideMenu onToggle={() => setSidebarOpen(false)} />}
      <div className="relative min-h-0 min-w-0 flex-1 h-full">
        <House />
        {!sidebarOpen && (
          // Abrir MPH solo OCULTA el editor si estaba abierto (un solo panel a la
          // vez); si se estaba editando un cuarto, se retoma tal cual al cerrar este menú.
          // Para salir de verdad del cuarto, usa el botón flotante sobre él (SalirCuartoFlotante).
          <FloatingMenuButton onToggle={() => setSidebarOpen(true)} />
        )}
        {/* El joystick de movimiento sigue activo en el editor 3D (caminar mientras editas). */}
        {(!editMode || editor3d) && !sidebarOpen && !pintando && !construyendo && !dialogoActivo && <MoveControls />}
        {/* Rueda de herramientas: solo en juego (los editores conservan el cubo). */}
        {!editMode && !sidebarOpen && !pintando && !construyendo && !enPaintball && <MenuHerramientas />}
        {!editMode && <InteractOverlay />}
        <EtiquetasMapaOverlay />
        {/* Prompts contextuales (secundarios): apilados SIEMPRE por encima de los
            controles de las esquinas y del chat, nunca sobre ellos. */}
        {!editMode && !activeRoom && (
          <PilaPrompts>
            {/* El tren y los accesos ya no tienen prompt propio: montar, bajarse y
                cambiar de piso son botones del hueco del cubo, con el resto de
                acciones contextuales. */}
            {/* Burbuja del asistente: la más cercana al chat, justo encima de él. */}
            {!construyendo && !dialogoActivo && !enPaintball && <AsistenteBurbuja />}
          </PilaPrompts>
        )}
        {!editMode && !activeRoom && !construyendo && <MarcadorCancha />}
        {!editMode && !activeRoom && !construyendo && !dialogoActivo && !enPaintball && <AsistenteCercaOverlay />}
        {!editMode && !activeRoom && !construyendo && <CarreraOverlay />}
        {!editMode && !activeRoom && !construyendo && <PaintballOverlay />}
        {/* Mira central: con un arma equipada o en batalla, en vista de perspectiva. */}
        {!editMode && !activeRoom && !construyendo && !pintando && <Mira />}
        {!editMode && !activeRoom && !construyendo && <DialogoOverlay />}
        {!editMode && !activeRoom && !construyendo && !enCarrera && !enPaintball && <ChatBox menuAbierto={sidebarOpen} />}
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
      <DestinoObjetoDialog />
      <AccesoNivelDialog />
      <EliminarCuartoDialog />
      {/* Confirmaciones y peticiones de texto de toda la app (`confirmar`/`pedirTexto`). */}
      <ConfirmarDialog />
      {/* Menú de bienvenida de primera vez (idioma → apariencia → gustos → personaje → asistente). */}
      <BienvenidaOverlay />
      {/* Único canvas oculto que rasteriza las miniaturas del catálogo/inventario: montado
          aquí (fuera de ambos paneles) para no duplicar el generador entre ellos. */}
      <GeneradorMiniaturas />
      {/* Festejo del personaje: notificación de rango/insignia + festejo silencioso al
          salir de un cuarto con algo registrado. Siempre montado (no depende de la UI). */}
      <SisifoFestejo />
      {/* Wrapped: resumen del periodo a pantalla completa. */}
      {wrappedAbierto && (
        <Suspense fallback={null}>
          <WrappedOverlay />
        </Suspense>
      )}
      {/* Montaña de Sísifo: el ascenso anual a pantalla completa. */}
      {sisifoAbierto && (
        <Suspense fallback={null}>
          <MontanaSisifoOverlay />
        </Suspense>
      )}
      {/* Tutorial guiado activo (spotlight + mago): por encima de todos los diálogos. */}
      <TutorialOverlay />
      {/* Selector de tutoriales (botón "?"): ilumina en amarillo las zonas con tour. */}
      <SelectorTutorialOverlay />
      {/* Avisos del plan: renovar suscripción (ex-Pro) y cuota de IA agotada. */}
      <AvisosPlan />
      {/* Píldora persistente de la casa demo: salir / suscribirse / reiniciar. */}
      {esDemo() && <BarraDemo />}
      {/* «¿Volver a tu casa?» al terminar el flujo que trajo al visitante. */}
      {esDemo() && <VolverDemoDialog />}
    </div>
  )
}
