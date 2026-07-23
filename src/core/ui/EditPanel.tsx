import type { ReactNode } from 'react'
import { getCuarto } from '../state/cuartosStore'
import { useLayout } from '../state/layoutStore'
import { useDiseño } from '../state/disenoStore'
import { useEditorUi, type EditorTab } from '../state/editorUiStore'
import { useEditorAnchor } from '../state/editorAnchorStore'
import { EditorPanelMapa } from './editor/EditorPanelMapa'
import { EditorPersonajesSection } from './editor/EditorPersonajesSection'
import { EditorObjetosSection } from './editor/EditorObjetosSection'
import { EditorAjustesSection } from './editor/EditorAjustesSection'
import { EditorEstiloSection } from './editor/EditorEstiloSection'
import { EditorMusicaSection } from './editor/EditorMusicaSection'
import { EditorNotificacionesSection } from './editor/EditorNotificacionesSection'
import { EditorCuentaSection } from './editor/EditorCuentaSection'
import { EditorRespaldoSection } from './editor/EditorRespaldoSection'
import { ConfigGrupo } from './editor/ConfigGrupo'
import { RelojWidget } from './CicloPanel'
import { ControlMusica } from './ControlMusica'
import { useT } from '../i18n/useT'
import { Icono } from './iconos/Icono'
import { useHud } from '../state/hudStore'
import { BotonPlegarHud, TiradorHud } from './HudPlegable'

const TABS: { id: EditorTab; labelEs: string }[] = [
  { id: 'mapa', labelEs: 'Mapa' },
  { id: 'personajes', labelEs: 'Personajes' },
  { id: 'objetos', labelEs: 'Objetos' },
  { id: 'config', labelEs: 'Configuraciones' },
]

/**
 * Modo edición. Panel "Editor" con pestañas (Mapa / Personajes / Objetos / Configuraciones).
 * - Editar un cuarto (engrane ⚙️) usa el MISMO editor de mapa, con el croquis enfocado en
 *   ese cuarto (ver `editRoom`): sus paredes/piso/techo se editan por modos del croquis.
 */
export function EditPanel() {
  const t = useT()
  const editMode = useLayout((s) => s.editMode)
  const editingRoomId = useLayout((s) => s.editingRoomId)
  const editRoom = useLayout((s) => s.editRoom)
  const setEditMode = useLayout((s) => s.setEditMode)
  const roomColors = useDiseño((s) => s.roomColors)
  const roomNames = useDiseño((s) => s.roomNames)
  const tab = useEditorUi((s) => s.tab)
  const setTab = useEditorUi((s) => s.setTab)

  const editar = (id: string | null) => editRoom(id)

  if (!editMode) {
    return <ToolbarPermanente onEditar={() => setEditMode(true)} />
  }

  const room = editingRoomId ? getCuarto(editingRoomId) : null
  const color = room ? roomColors[room.id] ?? room.color : '#94a3b8'
  const nombre = room ? roomNames[room.id] || room.nombre : ''

  const tituloHeader = room ? nombre.split(' · ')[0] : t('editor.titulo', 'Editor')

  return (
    <div data-tut-zona="editor-mapa" className="ui-panel-glass absolute right-0 top-0 z-[35] flex h-full w-80 flex-col border-l border-white/10 backdrop-blur-md">
      <header className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
        {/* Editando un cuarto: botón para SALIR del cuarto y volver al editor de mapa completo. */}
        {room && (
          <button
            type="button"
            data-tut="editor.volverMapa"
            onClick={() => editar(null)}
            title={t('editor.salirCuarto', 'Salir del cuarto (volver al mapa)')}
            className="-ml-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-white/70 transition hover:bg-white/10 hover:text-white"
          >
            <Icono nombre="volver" />
          </button>
        )}
        <span className="truncate text-base font-black" style={{ color }}>
          <Icono nombre="editar" /> {tituloHeader}
        </span>
        <button
          data-tut="editor.listo"
          onClick={() => setEditMode(false)}
          className="ml-auto rounded-lg bg-accent px-3 py-1.5 text-xs font-bold text-accent-ink transition hover:brightness-110"
        >
          <Icono nombre="confirmar" /> {t('mapa.listo', 'Listo')}
        </button>
      </header>

      <div className="border-b border-white/10 px-3 py-2">
        <div data-tut="editor.tabs" className="flex overflow-hidden rounded-lg border border-white/10 bg-black/30">
          {TABS.map((tb) => (
            <button
              key={tb.id}
              type="button"
              onClick={() => setTab(tb.id)}
              className={`h-8 flex-1 whitespace-nowrap px-1 text-[11px] font-semibold transition ${
                tab === tb.id
                  ? 'bg-white/15 text-white'
                  : 'text-white/50 hover:bg-white/8 hover:text-white/75'
              }`}
            >
              {t(`editor.tab.${tb.id}`, tb.labelEs)}
            </button>
          ))}
        </div>
      </div>

      {/* Sin padding-top en el contenedor de scroll: el hueco superior lo pone el
          `pt-3` de adentro (contenido que sí se desplaza). Así el preview `sticky`
          se ancla a ras del borde superior, sin dejar una franja de contenido
          asomando por el padding. */}
      <div data-tut="editor.contenido" className="min-h-0 flex-1 overflow-y-auto px-3 pb-3">
        {tab === 'mapa' ? (
          <div className="pt-3">
            <EditorPanelMapa />
            <AyudaPie>
              {t('editor.ayuda.mapa.a', 'Elige un')} <b className="text-white/65">{t('editor.ayuda.mapa.b', 'modo')}</b>{' '}
              {t('editor.ayuda.mapa.c', 'arriba y edita en el')}{' '}
              <b className="text-white/65">{t('editor.ayuda.mapa.d', 'croquis')}</b>{' '}
              {t('editor.ayuda.mapa.e', 'o en el mapa 3D. Más abajo, personaliza la casa.')}
            </AyudaPie>
          </div>
        ) : tab === 'personajes' ? (
          <div className="pt-3">
            <EditorPersonajesSection />
            <AyudaPie>
              {t('editor.ayuda.pers.a', 'Elige un')} <b className="text-white/65">{t('editor.ayuda.pers.b', 'personaje')}</b>{' '}
              {t('editor.ayuda.pers.c', 'y edita su')} <b className="text-white/65">{t('editor.ayuda.pers.d', 'nombre, cuerpo y avatar 3D')}</b>.
            </AyudaPie>
          </div>
        ) : tab === 'objetos' ? (
          <div className="pt-3">
            <EditorObjetosSection />
            <AyudaPie>
              {t('editor.ayuda.obj.a', 'Elige un')} <b className="text-white/65">{t('editor.ayuda.obj.b', 'objeto')}</b>{' '}
              {t('editor.ayuda.obj.c', 'y edita su')} <b className="text-white/65">{t('editor.ayuda.obj.d', 'color, tamaño y rotación')}</b>.
            </AyudaPie>
          </div>
        ) : (
          <div className="space-y-2 pt-3">
            <ConfigGrupo id="cuenta" icono="perfil" titulo={t('cuenta.titulo', 'Cuenta')}>
              <EditorCuentaSection embed sinTitulo />
            </ConfigGrupo>
            <ConfigGrupo
              id="estilo"
              icono="paleta"
              titulo={t('ajustes.estiloMapa', 'Estilo visual del mapa')}
            >
              <EditorEstiloSection embed sinTitulo />
            </ConfigGrupo>
            <ConfigGrupo
              id="interfaz"
              icono="idiomas"
              titulo={t('config.grupo.interfaz', 'Interfaz e idioma')}
            >
              <EditorAjustesSection embed />
            </ConfigGrupo>
            <ConfigGrupo id="musica" icono="musica" titulo={t('ajustes.musica', 'Música')}>
              <EditorMusicaSection embed sinTitulo />
            </ConfigGrupo>
            <ConfigGrupo
              id="notificaciones"
              icono="campana"
              titulo={t('notif.titulo', 'Notificaciones')}
            >
              <EditorNotificacionesSection embed sinTitulo />
            </ConfigGrupo>
            <ConfigGrupo
              id="respaldo"
              icono="guardar"
              titulo={t('respaldo.titulo', 'Respaldo de datos')}
            >
              <EditorRespaldoSection embed sinTitulo />
            </ConfigGrupo>
            <AyudaPie>
              {t('editor.ayuda.conf.a', 'El')} <b className="text-white/65">{t('editor.ayuda.conf.b', 'estilo visual del mapa')}</b>
              {t('editor.ayuda.conf.c', ', idioma e')} <b className="text-white/65">{t('editor.ayuda.conf.d', 'interfaz')}</b>.
            </AyudaPie>
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * Botón flotante ARRIBA del cuarto en edición (posición proyectada en 3D por
 * `EditorAnchor`): forma directa de salir del cuarto sin buscar la flechita
 * del panel derecho. Mismo destino que ese botón: vuelve al editor de mapa
 * completo (`editRoom(null)`), sin salir del modo edición.
 */
export function SalirCuartoFlotante() {
  const t = useT()
  const editingRoomId = useLayout((s) => s.editingRoomId)
  const moverObjetosRoomId = useLayout((s) => s.moverObjetosRoomId)
  const editRoom = useLayout((s) => s.editRoom)
  const setMoverObjetos = useLayout((s) => s.setMoverObjetos)
  const screenX = useEditorAnchor((s) => s.screenX)
  const screenY = useEditorAnchor((s) => s.screenY)

  // Modo "mover objetos": botón verde de confirmación que sale del modo.
  if (moverObjetosRoomId) {
    return (
      <div
        className="pointer-events-none absolute z-20"
        style={{ left: screenX, top: screenY, transform: 'translate(-50%, -100%)' }}
      >
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            setMoverObjetos(null)
          }}
          title={t('editor.moverObjetos.listo', 'Terminar de mover objetos')}
          className="ui-panel-glass pointer-events-auto flex items-center gap-1.5 rounded-full border-2 border-accent/60 bg-accent px-3.5 py-2 text-xs font-bold text-accent-ink shadow-xl backdrop-blur-md transition hover:scale-105 active:scale-95"
        >
          <Icono nombre="confirmar" />
          {t('mapa.listo', 'Listo')}
        </button>
      </div>
    )
  }

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

/** Texto de ayuda al final de cada pestaña del editor (antes iba fijo arriba, entre las
 * pestañas y el contenido; ahora cierra el contenido con scroll de cada una). */
function AyudaPie({ children }: { children: ReactNode }) {
  return (
    <p className="mt-3 border-t border-white/10 pt-3 text-[11px] leading-snug text-white/45">
      {children}
    </p>
  )
}

function ToolbarPermanente({ onEditar }: { onEditar: () => void }) {
  const t = useT()
  const menuAbierto = useHud((s) => s.menuAbierto)
  const movilVertical = useHud((s) => s.movilVertical)
  // En vertical el side menu (RoomSideMenu) ocupa casi todo el ancho: este disparador se
  // pliega mientras esté abierto para no traslaparse (espejo en FloatingMenuButton).
  const plegado = useHud((s) => s.plegado.supDer) || (movilVertical && menuAbierto)

  // Plegado: queda solo el engrane, que devuelve música + reloj + Editor.
  if (plegado) {
    return (
      <div className="absolute right-4 top-4 z-20">
        <TiradorHud zona="supDer">
          <Icono nombre="ajustes" />
        </TiradorHud>
      </div>
    )
  }

  return (
    <div className="absolute right-4 top-4 z-20 flex items-start gap-2">
      <div className="flex flex-col items-center gap-1">
        <ControlMusica botonClase="ui-hud rounded-lg border border-white/10 px-3 py-2 text-sm text-white/85 transition hover:bg-white/15" />
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
