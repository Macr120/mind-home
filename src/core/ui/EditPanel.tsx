import type { ReactNode } from 'react'
import { getCuarto } from '../state/cuartosStore'
import { useLayout } from '../state/layoutStore'
import { useDiseño } from '../state/disenoStore'
import { useEditorUi, type EditorTab } from '../state/editorUiStore'
import { EditorPanelMapa } from './editor/EditorPanelMapa'
import { EditorPersonajesSection } from './editor/EditorPersonajesSection'
import { EditorObjetosSection } from './editor/EditorObjetosSection'
import { EditorAjustesSection } from './editor/EditorAjustesSection'
import { EditorEstiloSection } from './editor/EditorEstiloSection'
import { EditorMusicaSection } from './editor/EditorMusicaSection'
import { EditorTutorialesSection } from './editor/EditorTutorialesSection'
import { EditorNotificacionesSection } from './editor/EditorNotificacionesSection'
import { EditorCuentaSection } from './editor/EditorCuentaSection'
import { EditorIASection } from './editor/EditorIASection'
import { EditorRespaldoSection } from './editor/EditorRespaldoSection'
import { ConfigGrupo } from './editor/ConfigGrupo'
import { useT } from '../i18n/useT'
import { esDemo, esDemoAutor } from '../edicion'
import { Icono } from './iconos/Icono'
import { vivo } from './estilos'

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

  // Casa demo: Configuraciones se abre entera salvo Cuenta y Respaldo, que son
  // de la cuenta real y no de esta casa prestada. Idioma, tema de interfaz y
  // demás preferencias son del dispositivo: se comparten con la casa real.
  const sinCuenta = esDemo() && !esDemoAutor()

  const editar = (id: string | null) => editRoom(id)

  // Fuera del modo edición este panel ni se monta: `EditorHud` pinta la barra
  // ligera y solo descarga este módulo al entrar a editar.
  if (!editMode) return null

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
        <span className="texto-vivo truncate text-base font-black" style={vivo(color)}>
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
            {!sinCuenta && (
              <ConfigGrupo id="cuenta" icono="perfil" titulo={t('cuenta.titulo', 'Cuenta')}>
                <EditorCuentaSection embed sinTitulo />
              </ConfigGrupo>
            )}
            {/* Sin el guard de cuenta: la tabla es informativa y es justo lo
                que hace falta para decidir si recargar. */}
            <ConfigGrupo id="ia" icono="brillo" titulo={t('ia.precios.titulo', 'Precios de la IA')}>
              <EditorIASection embed sinTitulo />
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
              id="tutoriales"
              icono="tutorial"
              titulo={t('ajustes.tutoriales', 'Tutoriales y bienvenida')}
            >
              <EditorTutorialesSection embed sinTitulo />
            </ConfigGrupo>
            <ConfigGrupo
              id="notificaciones"
              icono="campana"
              titulo={t('notif.titulo', 'Notificaciones')}
            >
              <EditorNotificacionesSection embed sinTitulo />
            </ConfigGrupo>
            {!sinCuenta && (
              <ConfigGrupo
                id="respaldo"
                icono="guardar"
                titulo={t('respaldo.titulo', 'Respaldo de datos')}
              >
                <EditorRespaldoSection embed sinTitulo />
              </ConfigGrupo>
            )}
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
/** Texto de ayuda al final de cada pestaña del editor (antes iba fijo arriba, entre las
 * pestañas y el contenido; ahora cierra el contenido con scroll de cada una). */
function AyudaPie({ children }: { children: ReactNode }) {
  return (
    <p className="mt-3 border-t border-white/10 pt-3 text-[11px] leading-snug text-white/45">
      {children}
    </p>
  )
}

export default EditPanel
