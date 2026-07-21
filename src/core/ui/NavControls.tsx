import { useEffect } from 'react'
import { useCam, type Vista } from '../state/cameraStore'
import { useLayout, mapFocusPos } from '../state/layoutStore'
import { usePlanos } from '../state/planosStore'
import { useEditorUi } from '../state/editorUiStore'
import { useT } from '../i18n/useT'
import { Icono } from './iconos/Icono'
import { ViewCube, VIEW_CUBE_PX } from './ViewCube'
import { LookPad } from './MoveControls'
import { ControlHerramienta } from './ControlHerramienta'
import { BotonAccionCancha } from './BotonAccionCancha'
import { useHerramienta } from '../state/herramientaStore'
import { useCarrera } from '../state/carreraStore'
import { useJuegoCancha } from '../state/juegoCanchaStore'
import { useHud } from '../state/hudStore'
import { BotonPlegarHud, TiradorHud } from './HudPlegable'

/**
 * Controles de vista 3D: selector iso/3ª/1ª, cubo y rotación debajo (mismo ancho).
 */
export function NavControls() {
  const t = useT()
  const editMode = useLayout((s) => s.editMode)
  const setEditMode = useLayout((s) => s.setEditMode)
  const planosActivo = usePlanos((s) => s.activo)
  const vista = useCam((s) => s.vista)
  const setVista = useCam((s) => s.setVista)
  const centrarIso = useCam((s) => s.centrarIso)
  const rotar = useCam((s) => s.rotar)
  const editor3d = useEditorUi((s) => s.editor3d)
  const setEditor3d = useEditorUi((s) => s.setEditor3d)
  const setTab = useEditorUi((s) => s.setTab)
  const equipadas = useHerramienta((s) => s.equipadas)
  const faseCarrera = useCarrera((s) => s.fase)
  // Jugando en una cancha: el botón de acción ocupa el hueco del cubo/LookPad.
  const jugandoCancha = useJuegoCancha((s) => s.fase === 'jugando')
  const plegado = useHud((s) => s.plegado.infDer)
  const movilVertical = useHud((s) => s.movilVertical)
  const chatPlegado = useHud((s) => s.plegado.chat)

  // El editor 3D solo vive en perspectiva: al volver a la vista iso se cierra.
  useEffect(() => {
    if (vista === 'iso' && useEditorUi.getState().editor3d) setEditMode(false)
  }, [vista, setEditMode])

  /** Abre el editor de MAPA en perspectiva (sin cambiar a la cámara iso). */
  const abrirEditor3d = () => {
    setEditor3d(true)
    setTab('mapa')
    setEditMode(true)
  }
  /** Cierra el editor y vuelve al juego en perspectiva. */
  const cerrarEditor3d = () => setEditMode(false)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== 'v') return
      const el = document.activeElement as HTMLElement | null
      if (
        el &&
        (el.tagName === 'INPUT' ||
          el.tagName === 'TEXTAREA' ||
          el.tagName === 'SELECT' ||
          el.isContentEditable)
      )
        return
      if (useLayout.getState().editMode) return
      useCam.getState().ciclarVista()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // En plena carrera el hueco lo ocupa la pila de carrera (derrape + ítem) de CarreraOverlay.
  if (faseCarrera === 'semaforo' || faseCarrera === 'corriendo') return null

  // Teléfono vertical con el chat abierto: los controles de vista ceden el bajo
  // (chat ⊕ esquinas). El editor sí conserva sus controles.
  if (movilVertical && !chatPlegado && !editMode) return null

  const reiniciarVista = () => centrarIso(mapFocusPos())
  const vistaIso = vista === 'iso'
  const vistaInterior = vista === 'interior'
  // El cubo y la rotación se muestran en iso y en la vista interior del cuarto.
  const mostrarCubo = vistaIso || vistaInterior
  // Herramientas equipadas: su pila de controles ocupa el hueco del cubo/LookPad (solo en juego).
  const conHerramienta = equipadas.length > 0 && !editMode

  const vistas: { id: Vista; etiqueta: string; title: string }[] = [
    { id: 'iso', etiqueta: t('nav3d.vistaIsoCorta', 'Iso'), title: t('nav3d.vistaIso', 'Vista isométrica') },
    { id: 'tercera', etiqueta: t('nav3d.vista3Corta', '3ª'), title: t('nav3d.vistaTercera', 'Tercera persona') },
    { id: 'primera', etiqueta: t('nav3d.vista1Corta', '1ª'), title: t('nav3d.vistaPrimera', 'Primera persona') },
  ]

  const ancho = { width: VIEW_CUBE_PX }

  // En el editor 3D los controles van a la izquierda del panel (que ocupa la derecha).
  const posControles = editor3d
    ? 'right-[21rem]'
    : !editMode
      ? 'right-4'
      : planosActivo
        ? 'right-[21rem]'
        : 'left-4'
  // El selector de vistas y el botón de editor 3D se ven en juego y en el editor 3D
  // (no en el editor iso, que usa su propio panel).
  const mostrarVistas = !editMode || editor3d

  // Plegado (solo en juego, el editor necesita sus controles): queda el cubo, que los devuelve.
  if (plegado && !editMode) {
    return (
      <div className={`absolute bottom-4 z-10 ${posControles}`}>
        <TiradorHud zona="infDer">
          <Icono nombre="cubo-vistas" />
        </TiradorHud>
      </div>
    )
  }

  return (
    <div
      data-tut="nav.controles"
      data-tut-zona="navegacion"
      className={`absolute bottom-4 z-10 flex flex-col items-stretch gap-1 ${posControles}`}
      style={ancho}
      aria-label={t('nav3d.aria', 'Controles de vista')}
    >
      {!editMode && (
        <div className="flex justify-end">
          <BotonPlegarHud zona="infDer" />
        </div>
      )}

      {/* Editor 3D: solo en 3ª/1ª persona, encima del selector de vistas. */}
      {mostrarVistas && (vista === 'tercera' || vista === 'primera') && (
        <button
          type="button"
          onClick={editor3d ? cerrarEditor3d : abrirEditor3d}
          title={t('nav3d.editor3dHint', 'Editar el mundo en perspectiva: toca un objeto, piso, muro o personaje para editarlo')}
          className={`flex h-8 w-full items-center justify-center gap-1.5 rounded-lg border text-xs font-semibold transition active:scale-95 ${
            editor3d
              ? 'border-emerald-400/60 bg-emerald-600 texto-cta'
              : 'ui-hud border-white/10 text-white/80 hover:bg-white/10'
          }`}
        >
          <Icono nombre="herramienta" className="text-sm leading-none" />
          {editor3d ? t('nav3d.editor3dOn', 'Cerrar editor') : t('nav3d.editor3d', 'Editor 3D')}
        </button>
      )}

      {mostrarVistas && (
        <div
          data-tut="nav.vistas"
          className="ui-hud flex w-full overflow-hidden rounded-lg border border-white/10"
          title={t('nav3d.cambiarVista', 'Cambiar vista (tecla V)')}
        >
          {vistas.map((v) => (
            <button
              key={v.id}
              type="button"
              onClick={() => setVista(v.id)}
              title={v.title}
              className={`h-8 flex-1 text-xs font-semibold transition active:scale-95 ${
                vista === v.id
                  ? 'bg-white/20 text-white'
                  : 'text-white/60 hover:bg-white/10 hover:text-white/90'
              }`}
            >
              {v.etiqueta}
            </button>
          ))}
        </div>
      )}

      {editMode && mostrarCubo && (
        <p className="ui-panel-glass self-center rounded-md px-2 py-0.5 text-center text-[10px] font-semibold uppercase tracking-wide text-white/50">
          {vistaInterior
            ? t('nav3d.vistaInterior', 'Mirando la pared')
            : t('nav3d.vistaCuarto', 'Vista del cuarto')}
        </p>
      )}

      {mostrarCubo && (
        <>
          {jugandoCancha ? <BotonAccionCancha /> : conHerramienta ? <ControlHerramienta /> : <ViewCube />}
          <div data-tut="nav.rotar" className="ui-hud flex w-full overflow-hidden rounded-lg border border-white/10">
            <button
              type="button"
              onClick={() => rotar(-1)}
              title={t('nav3d.rotarIzq', 'Rotar vista a la izquierda')}
              className="h-8 flex-1 text-base font-semibold text-white/60 transition hover:bg-white/10 hover:text-white/90 active:scale-95"
            >
              <Icono nombre="rotar-izq" />
            </button>
            <button
              type="button"
              onClick={() => rotar(1)}
              title={t('nav3d.rotarDer', 'Rotar vista a la derecha')}
              className="h-8 flex-1 text-base font-semibold text-white/60 transition hover:bg-white/10 hover:text-white/90 active:scale-95"
            >
              <Icono nombre="rotar-der" />
            </button>
            <button
              type="button"
              onClick={reiniciarVista}
              title={t('nav3d.centrarMapa', 'Centrar en el mapa')}
              className="h-8 flex-1 text-base font-semibold text-white/60 transition hover:bg-white/10 hover:text-white/90 active:scale-95"
            >
              <Icono nombre="centrar" />
            </button>
          </div>
        </>
      )}

      {!vistaIso && (
        <>
          {!(conHerramienta && !mostrarCubo) && (
            <p className="text-center text-[10px] leading-tight text-white/45">
              {vista === 'tercera'
                ? t('nav3d.ayuda3P', 'Clic derecho o joystick; rueda para zoom')
                : t('nav3d.ayuda1P', 'Clic derecho o joystick; rueda para zoom')}
            </p>
          )}
          <div className="flex justify-center">
            {jugandoCancha ? <BotonAccionCancha /> : conHerramienta && !mostrarCubo ? <ControlHerramienta /> : <LookPad />}
          </div>
        </>
      )}
    </div>
  )
}
