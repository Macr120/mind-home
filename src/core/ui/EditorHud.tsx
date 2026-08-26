import { lazy, Suspense } from 'react'
import { useLayout } from '../state/layoutStore'
import { useDiseño } from '../state/disenoStore'
import { useCam } from '../state/cameraStore'
import { useEditorUi } from '../state/editorUiStore'
import { useEditorAnchor } from '../state/editorAnchorStore'
import { RelojWidget } from './CicloPanel'
import { ControlMusica } from './ControlMusica'
import { useT } from '../i18n/useT'
import { Icono } from './iconos/Icono'
import { useHud } from '../state/hudStore'
import { useAjustes } from '../state/ajustesStore'
import { useConstruyendo } from '../state/construyendo'
import { BotonPlegarHud, TiradorHud } from './HudPlegable'

/**
 * Piezas LIGERAS del editor: las que están en pantalla aunque nunca se abra el
 * panel. Viven aparte de `EditPanel.tsx` a propósito — ese archivo arrastra las
 * 11 secciones del editor y todo `ui/editor` + `ui/planos` (~630 KB gz), y
 * mientras se importara desde aquí ese peso entraba en el arranque de todos.
 *
 * Aquí solo va lo que se monta siempre; el panel gordo se carga bajo demanda
 * (ver `EditorMontaje`).
 */

/** El panel real solo se descarga al entrar en modo edición. */
const PanelEditor = lazy(() => import('./EditPanel'))

/**
 * Punto de montaje del editor: fuera del modo edición solo pinta la barra de la
 * esquina (reloj, música y el botón «Editor»); al entrar, descarga el panel.
 */
export function EditorMontaje() {
  const editMode = useLayout((s) => s.editMode)
  const setEditMode = useLayout((s) => s.setEditMode)
  if (!editMode) return <ToolbarPermanente onEditar={() => setEditMode(true)} />
  return (
    <Suspense fallback={null}>
      <PanelEditor />
    </Suspense>
  )
}

function ToolbarPermanente({ onEditar }: { onEditar: () => void }) {
  const t = useT()
  const menuAbierto = useHud((s) => s.menuAbierto)
  const movilVertical = useHud((s) => s.movilVertical)
  const hudMusica = useAjustes((s) => s.hudMusica)
  // Los editores de infraestructura traen su propio encabezado centrado arriba:
  // esta esquina se pliega para dejarle la franja (espejo en FloatingMenuButton).
  const construyendo = useConstruyendo()
  // En vertical el side menu (RoomSideMenu) ocupa casi todo el ancho: este disparador se
  // pliega mientras esté abierto para no traslaparse (espejo en FloatingMenuButton).
  const plegado = useHud((s) => s.plegado.supDer) || (movilVertical && menuAbierto) || construyendo

  // Plegado: queda solo el engrane, que devuelve música + reloj + Editor.
  if (plegado) {
    return (
      <div className="safe-sup safe-fin absolute end-4 top-4 z-20">
        <TiradorHud zona="supDer">
          <Icono nombre="ajustes" />
        </TiradorHud>
      </div>
    )
  }

  return (
    <div className="safe-sup safe-fin absolute end-4 top-4 z-20 flex items-start gap-2">
      <div className="flex flex-col items-center gap-1">
        {/* El botón de música puede apagarse en Configuraciones › Música. */}
        {hudMusica && (
          <ControlMusica botonClase="ui-hud rounded-lg border border-white/10 px-3 py-2 text-sm text-white/85 transition hover:bg-white/15" />
        )}
        <BotonPlegarHud zona="supDer" />
      </div>
      <RelojWidget />
      <button
        type="button"
        data-tut="toolbar.editor"
        data-tut-zona="editor-mapa"
        onClick={onEditar}
        className="ui-hud rounded-lg border border-white/10 px-3 py-2 text-sm font-semibold text-white/85 transition hover:bg-white/15"
        title={t('editor.abrir', 'Abrir el editor de la casa')}
      >
        <Icono nombre="editar" /> {t('editor.titulo', 'Editor')}
      </button>
    </div>
  )
}

export function SalirCuartoFlotante() {
  const t = useT()
  const editingRoomId = useLayout((s) => s.editingRoomId)
  const editRoom = useLayout((s) => s.editRoom)
  const screenX = useEditorAnchor((s) => s.screenX)
  const screenY = useEditorAnchor((s) => s.screenY)

  // El modo "mover objetos" tiene su propio botón "Listo" fijo junto al cubo de
  // navegación (NavControls), fuera del cuarto: ver `BotonListoMoverObjetos`.
  if (!editingRoomId) return null

  return (
    <div
      className="pointer-events-none absolute z-20"
      style={{ left: screenX, top: screenY, transform: 'translate(-50%, -100%)' }}
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          editRoom(null)
        }}
        title={t('editor.salirCuarto', 'Salir del cuarto (volver al mapa)')}
        className="ui-panel-glass pointer-events-auto flex items-center gap-1.5 rounded-full border-2 border-white/20 px-3.5 py-2 text-xs font-bold text-white/85 shadow-xl backdrop-blur-md transition hover:scale-105 hover:border-white/40 active:scale-95"
      >
        <Icono nombre="volver" />
        {t('editor.salirCuartoBoton', 'Salir del cuarto')}
      </button>
    </div>
  )
}

/** Distancia que avanza el objeto por cada toque de flecha. */
const PASO_MOVER = 0.3

/**
 * Botón "Listo" del modo "mover objetos": fijo junto al cubo de navegación (fuera del
 * cuarto, no proyectado sobre él), para no taparse con el propio objeto ni con las
 * flechas. Lo monta `NavControls` cuando `moverObjetosRoomId` está activo.
 */
export function BotonListoMoverObjetos() {
  const t = useT()
  const setMoverObjetos = useLayout((s) => s.setMoverObjetos)
  return (
    <button
      type="button"
      onClick={() => setMoverObjetos(null)}
      title={t('editor.moverObjetos.listo', 'Terminar de mover objetos')}
      className="flex h-8 w-full items-center justify-center gap-1.5 rounded-lg border-2 border-accent/60 bg-accent text-xs font-bold text-accent-ink transition hover:brightness-110 active:scale-95"
    >
      <Icono nombre="confirmar" />
      {t('mapa.listo', 'Listo')}
    </button>
  )
}

/**
 * Flechas de movimiento fino: en modo "mover objetos" (vista de planta), al seleccionar
 * un objeto este D-pad ocupa el hueco del cubo de navegación (`NavControls`) para
 * desplazarlo izquierda/derecha/adelante/atrás sin depender del arrastre táctil
 * (impreciso en móvil). Las direcciones se calculan a partir del azimut actual de la
 * cámara para que "arriba" siempre sea arriba en pantalla, sin importar cómo quedó
 * rotada la vista de planta.
 */
export function FlechasMoverObjeto() {
  const t = useT()
  const objetoSel = useEditorUi((s) => s.objetoSel)
  const nudgeObjeto = useDiseño((s) => s.nudgeObjeto)

  if (objetoSel == null) return null

  const mover = (right: number, fwd: number) => {
    const az = useCam.getState().az
    // Vectores de pantalla en espacio de mundo, verificados contra la base real de
    // la cámara (lookAt): a diferencia de `panFocusByPixels` (que desplaza el FOCO, con
    // signo invertido a propósito para que el contenido seleccione la dirección del
    // arrastre), aquí movemos el OBJETO en sí, así que "derecha" debe ser la derecha real.
    const rightX = Math.sin(az)
    const rightZ = -Math.cos(az)
    const fwdX = -Math.cos(az)
    const fwdZ = -Math.sin(az)
    nudgeObjeto(
      objetoSel,
      (rightX * right + fwdX * fwd) * PASO_MOVER,
      (rightZ * right + fwdZ * fwd) * PASO_MOVER,
    )
  }

  // dir=ltr: es un D-pad, geometría real — «izquierda» debe quedar a la izquierda también en RTL.
  return (
    <div dir="ltr" className="ui-hud grid w-full grid-cols-3 grid-rows-3 gap-1 rounded-lg border border-white/10 p-1.5">
      <div />
      <BotonFlecha icono="subir" titulo={t('mover.adelante', 'Mover hacia adelante')} onClick={() => mover(0, 1)} />
      <div />
      <BotonFlecha icono="izquierda" titulo={t('mover.izquierda', 'Mover a la izquierda')} onClick={() => mover(-1, 0)} />
      <div className="flex items-center justify-center text-white/25">
        <Icono nombre="mover" />
      </div>
      <BotonFlecha icono="derecha" titulo={t('mover.derecha', 'Mover a la derecha')} onClick={() => mover(1, 0)} />
      <div />
      <BotonFlecha icono="bajar" titulo={t('mover.atras', 'Mover hacia atrás')} onClick={() => mover(0, -1)} />
      <div />
    </div>
  )
}

function BotonFlecha({ icono, titulo, onClick }: { icono: 'subir' | 'bajar' | 'izquierda' | 'derecha'; titulo: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      title={titulo}
      className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white/80 transition hover:bg-white/12 active:scale-90"
    >
      <Icono nombre={icono} />
    </button>
  )
}
