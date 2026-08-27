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
import { MoveControls } from './core/ui/MoveControls'
import { MenuHerramientas } from './core/ui/MenuHerramientas'
import { EditorGrafiti } from './core/ui/EditorGrafiti'
import { EditorCaminos } from './core/ui/EditorCaminos'
import { EditorCanchas } from './core/ui/EditorCanchas'
import { EditorHuerto } from './core/ui/EditorHuerto'
import { EditorGranja } from './core/ui/EditorGranja'
import { InfraNota } from './core/ui/InfraNota'
import { ChatBox } from './core/chat/ChatBox'
import { AvisoRespaldo } from './core/ui/AvisoRespaldo'
import { AsistenteCercaOverlay } from './core/ui/AsistenteCercaOverlay'
import { DialogoOverlay } from './core/ui/DialogoOverlay'
import { GeneradorMiniaturas } from './core/house/Miniatura'
import { useTutorial } from './core/tutorial/tutorialStore'
import { SelectorTutorialOverlay } from './core/tutorial/SelectorTutorial'
import { AvisosPlan } from './core/ui/AvisosPlan'
import { BarraDemo } from './demo/BarraDemo'
import { BarraProbar } from './probar/BarraProbar'
import { RecuperarPrueba } from './core/bienvenida/RecuperarPrueba'
import { VolverDemoDialog } from './demo/VolverDemoDialog'
import { esDemo, esProbar } from './core/edicion'
import { esModoFondo } from './core/plataforma'
import { acercarEncuadre, aplicarEncuadre, moverEncuadre } from './core/fondoEncuadre'
import { ExtrasFondo } from './core/ui/ExtrasFondo'
import { useBienvenida } from './core/bienvenida/bienvenidaStore'
import { PrimeraVezGate } from './core/bienvenida/PrimeraVezGate'
import { useHouse } from './core/state/houseStore'
import { useLayout } from './core/state/layoutStore'
import { useGrafitis } from './core/state/grafitiStore'
import { useConstruyendo } from './core/state/construyendo'
import { useEditorUi } from './core/state/editorUiStore'
import { useCarrera } from './core/state/carreraStore'
import { usePaintball } from './core/state/paintballStore'
import { useDialogo } from './core/state/dialogoStore'
import { useDiarioProgramado } from './rooms/diario/reparto'
import { useAvisos } from './core/avisos'
import { useSondaPendientes } from './core/state/pendientesStore'
import { useWidgets } from './core/widgets/useWidgets'
import { useMusicaAmbiental } from './core/audio/useMusicaAmbiental'
import { useVozAsistente } from './core/audio/voz'
import { useCorazon } from './core/chat/corazon'
import { useVidrioSegunLuz } from './core/ui/useVidrioSegunLuz'
import { useWrappedUi } from './core/state/wrappedUiStore'
import { useHud } from './core/state/hudStore'
import { useSisifoUi } from './core/state/sisifoUiStore'
import { useMascaraUi } from './core/state/mascaraUiStore'
import { useChatArUi } from './core/state/chatArUiStore'
import { usePreviaPlantilla } from './core/state/previaPlantillaStore'
import { useRutinasUI } from './core/state/rutinasUiStore'
import { SisifoFestejo } from './core/gamificacion/SisifoFestejo'
import { CelebracionesOverlay } from './core/gamificacion/CelebracionesOverlay'

// Wrapped (resumen del periodo): lazy, solo se descarga al abrirlo.
const WrappedOverlay = lazy(() => import('./core/wrapped/WrappedOverlay'))
// Montaña de Sísifo (ascenso anual): lazy, solo se descarga al abrirla.
const MontanaSisifoOverlay = lazy(() => import('./core/gamificacion/MontanaSisifoOverlay'))
// Máscara AR (cámara + MediaPipe): lazy, solo se descarga al abrirla desde el chat.
const MascaraOverlay = lazy(() => import('./core/ui/MascaraOverlay'))
// Chat AR (cámara + asistente 3D para conversar): lazy, se abre desde el menú «+» del chat.
const ChatArOverlay = lazy(() => import('./core/chat/ChatArOverlay'))
// Previa de una app del catálogo («Entrar a la app»): en la raíz para que su
// `fixed` no quede encajonado por el stacking context del menú lateral.
const PlantillaPreviaOverlay = lazy(() => import('./core/ui/PlantillaPreviaOverlay'))
// Calendario (y todo `ui/calendario` + el grueso de `ui/metas`): ~400 KB de
// fuente que solo hacen falta al abrir el reloj del HUD — lazy.
const Calendario = lazy(() => import('./core/ui/Calendario').then((m) => ({ default: m.Calendario })))
// Bienvenida (primera vez) y tutorial activo: lazy, casi nunca están abiertos.
const BienvenidaOverlay = lazy(() =>
  import('./core/bienvenida/BienvenidaOverlay').then((m) => ({ default: m.BienvenidaOverlay })),
)
const TutorialOverlay = lazy(() =>
  import('./core/tutorial/TutorialOverlay').then((m) => ({ default: m.TutorialOverlay })),
)

export default function App() {
  // Reloj del diario: rollover de medianoche + reparto de noticias por asistentes.
  useDiarioProgramado()
  // Avisos de lo agendado y de las metas del día. Va aquí, montado una sola vez,
  // para que siga avisando estés en el cuarto o pantalla que estés.
  useAvisos()
  // Misiones pendientes por app: las leen el orbe sobre el mueble principal y su
  // burbuja de entrada. Una sola consulta para toda la casa.
  useSondaPendientes()
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
  const mascaraAbierta = useMascaraUi((s) => s.abierto)
  const chatArAbierto = useChatArUi((s) => s.abierto)
  const previaAbierta = usePreviaPlantilla((s) => !!s.plantillaId)
  const calendarioAbierto = useRutinasUI((s) => s.calendario)
  const bienvenidaAbierta = useBienvenida((s) => s.abierto)
  const recuperacionAbierta = useBienvenida((s) => s.recuperacion)
  const tourActivo = useTutorial((s) => !!s.def)
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
   * Abrir la app de un cuarto también cierra el menú lateral: aunque el menú ya
   * no roba ancho (flota encima), taparía el borde izquierdo de la app recién
   * abierta. Al salir de la app el menú NO se reabre solo; se vuelve con el
   * botón flotante.
   */
  useEffect(
    () =>
      useHouse.subscribe((s, prev) => {
        // `!== prev`: también al SALTAR de una app a otra desde el menú (antes solo
        // se cerraba viniendo del mapa, así que cambiar de cuarto lo dejaba abierto).
        if (!s.activeRoom || s.activeRoom === prev.activeRoom) return
        setSidebarOpen(false)
        // Entrar a una app cierra el editor DE VERDAD (no solo lo oculta): si el cuarto
        // siguiera en edición, al cerrarse el menú el efecto de abajo lo retomaría
        // encima de la app recién abierta.
        const { editMode, editingRoomId } = useLayout.getState()
        if (editMode || editingRoomId) useLayout.getState().setEditMode(false)
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

  // Modo fondo (wallpaper del escritorio): la escena sola, sin UI encima — la
  // ventana vive detrás de los iconos, no recibe foco y sus botones serían
  // intocables. El shell reenvía el mouse global, así que el puntero espacial
  // y el click-to-move del piso sí funcionan.
  if (esModoFondo()) {
    return (
      <div className="relative h-full w-full overflow-hidden">
        <EncuadreDelFondo />
        <House />
        <ExtrasFondo />
      </div>
    )
  }

  // El fondo lo pinta `#root`: esta raíz no lleva `ui-app` para que el vidrio del
  // modo transparente afecte solo a las apps, no al contenedor de todo.
  return (
    <div className="relative h-full w-full overflow-hidden">
      <div className="relative h-full w-full">
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
        {/* La nube del asistente ya no vive aquí: sale de su cabeza en la escena 3D
            (`NubeAsistente`), y solo si el personaje está a la vista. */}
        {!editMode && !activeRoom && !construyendo && <MarcadorCancha />}
        {!editMode && !activeRoom && !construyendo && !dialogoActivo && !enPaintball && <AsistenteCercaOverlay />}
        {!editMode && !activeRoom && !construyendo && <CarreraOverlay />}
        {!editMode && !activeRoom && !construyendo && <PaintballOverlay />}
        {/* Mira central: con un arma equipada o en batalla, en vista de perspectiva. */}
        {!editMode && !activeRoom && !construyendo && !pintando && <Mira />}
        {!editMode && !activeRoom && !construyendo && <DialogoOverlay />}
        {!editMode && !activeRoom && !construyendo && !enCarrera && !enPaintball && <ChatBox menuAbierto={sidebarOpen} />}
        {!editMode && !activeRoom && <AvisoRespaldo />}
        {/* Montaje condicional: su chunk (calendario + metas) solo se descarga al
            abrir el reloj; su propio `if (!abierto) return null` queda de red. */}
        {calendarioAbierto && (
          <Suspense fallback={null}>
            <Calendario />
          </Suspense>
        )}
        <RoomOverlay menuFlotante={!sidebarOpen} />
        {!editMode && <EditorGrafiti />}
        {!editMode && <EditorCaminos />}
        {!editMode && <EditorCanchas />}
        {!editMode && <EditorHuerto />}
        {!editMode && <EditorGranja />}
        {/* Respuesta del chat dentro de un editor (allí el ChatBox está desmontado). */}
        {construyendo && <InfraNota />}
      </div>
      {/* Menú lateral SUPERPUESTO (nunca en flujo): la app y la casa conservan su
          ancho completo detrás; ver el cazaclics dentro del propio menú. */}
      {sidebarOpen && <RoomSideMenu onToggle={() => setSidebarOpen(false)} />}
      <AsignarPlantillaDialog />
      <AmueblarDialog />
      <DestinoObjetoDialog />
      <AccesoNivelDialog />
      <EliminarCuartoDialog />
      {/* Confirmaciones y peticiones de texto de toda la app (`confirmar`/`pedirTexto`). */}
      <ConfirmarDialog />
      {/* Menú de bienvenida de primera vez (idioma → apariencia → gustos → personaje → asistente).
          El gate (siempre montado) decide la primera vez; el overlay es lazy. */}
      <PrimeraVezGate />
      {bienvenidaAbierta && (
        <Suspense fallback={null}>
          <BienvenidaOverlay />
        </Suspense>
      )}
      {/* Conversión del modo probar: ¿recuperar la casa de la prueba o hacer la
          bienvenida? Solo se abre en la casa real vacía con prueba pendiente. */}
      {recuperacionAbierta && <RecuperarPrueba />}
      {/* Único canvas oculto que rasteriza las miniaturas del catálogo/inventario: montado
          aquí (fuera de ambos paneles) para no duplicar el generador entre ellos. */}
      <GeneradorMiniaturas />
      {/* Festejo del personaje: notificación de rango/insignia + festejo silencioso al
          salir de un cuarto con algo registrado. Siempre montado (no depende de la UI). */}
      <SisifoFestejo />
      {/* Celebraciones de racha, lista cumplida y nivel. Siempre montado (las encola
          la gamificación al otorgar, sin acción del usuario); nulo en reposo. */}
      <CelebracionesOverlay />
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
      {/* Máscara AR: la cámara con la cabeza del avatar, a pantalla completa. */}
      {mascaraAbierta && (
        <Suspense fallback={null}>
          <MascaraOverlay />
        </Suspense>
      )}
      {/* Chat AR: la cámara con el asistente 3D encima para conversar cara a cara. */}
      {chatArAbierto && (
        <Suspense fallback={null}>
          <ChatArOverlay />
        </Suspense>
      )}
      {/* Previa de una app del catálogo, a pantalla completa sobre el menú. */}
      {previaAbierta && (
        <Suspense fallback={null}>
          <PlantillaPreviaOverlay />
        </Suspense>
      )}
      {/* Tutorial guiado activo (spotlight + mago): por encima de todos los diálogos. */}
      {tourActivo && (
        <Suspense fallback={null}>
          <TutorialOverlay />
        </Suspense>
      )}
      {/* Selector de tutoriales (botón "?"): ilumina en amarillo las zonas con tour. */}
      <SelectorTutorialOverlay />
      {/* Avisos del plan: renovar suscripción (ex-Pro) y cuota de IA agotada. */}
      <AvisosPlan />
      {/* Píldora persistente de la casa demo: salir / suscribirse / reiniciar. */}
      {esDemo() && <BarraDemo />}
      {/* Píldora persistente del modo probar: crear cuenta (la única salida). */}
      {esProbar() && <BarraProbar />}
      {/* «¿Volver a tu casa?» al terminar el flujo que trajo al visitante. */}
      {esDemo() && <VolverDemoDialog />}
    </div>
  )
}

/**
 * Solo en la ventana del fondo de pantalla: recupera el encuadre guardado y
 * obedece a la vista previa de Configuraciones, que manda los arrastres por el
 * puente del shell como eventos del DOM. No pinta nada.
 */
function EncuadreDelFondo() {
  useEffect(() => {
    // Tras un frame: el rig encuadra el mapa al montar y pisaría lo guardado.
    const t = setTimeout(aplicarEncuadre, 300)
    const mover = (e: Event) => {
      const d = (e as CustomEvent<{ fx?: number; fy?: number; zoom?: number }>).detail ?? {}
      if (d.zoom) acercarEncuadre(d.zoom)
      else moverEncuadre(d.fx ?? 0, d.fy ?? 0)
    }
    window.addEventListener('mph:fondo-mover', mover)
    return () => {
      clearTimeout(t)
      window.removeEventListener('mph:fondo-mover', mover)
    }
  }, [])
  return null
}
