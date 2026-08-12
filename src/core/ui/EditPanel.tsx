import { useEffect, type ReactNode } from 'react'
import { getCuarto } from '../state/cuartosStore'
import { useHistorialEditor } from '../state/historialEditorStore'
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
import { useEditorSeccionesConfig } from './editor/useEditorSecciones'
import type { ConfigGrupoId } from './editor/configSecciones'
import { useT } from '../i18n/useT'
import { useNombreCuarto } from './roomDisplay'
import { esDemo, esDemoAutor } from '../edicion'
import { Icono } from './iconos/Icono'
import type { NombreIcono } from './iconos/catalogo'
import { vivo } from './estilos'

const TABS: { id: EditorTab; labelEs: string }[] = [
  { id: 'mapa', labelEs: 'Mapa' },
  { id: 'personajes', labelEs: 'Personajes' },
  { id: 'objetos', labelEs: 'Objetos' },
  { id: 'config', labelEs: 'Configuraciones' },
]

/** Traductor del hook `useT` (el registro de grupos pide el título ya traducido). */
type Traducir = ReturnType<typeof useT>

/**
 * Los 8 grupos de Configuraciones. El ORDEN no vive aquí: lo pone el usuario
 * arrastrando (`useEditorSeccionesConfig`).
 */
const GRUPOS_CONFIG: Record<
  ConfigGrupoId,
  { icono: NombreIcono; titulo: (t: Traducir) => string; Contenido: () => ReactNode }
> = {
  cuenta: {
    icono: 'perfil',
    titulo: (t) => t('cuenta.titulo', 'Cuenta'),
    Contenido: () => <EditorCuentaSection embed sinTitulo />,
  },
  estilo: {
    icono: 'paleta',
    titulo: (t) => t('ajustes.estiloMapa', 'Estilo visual del mapa'),
    Contenido: () => <EditorEstiloSection embed sinTitulo />,
  },
  interfaz: {
    icono: 'idiomas',
    titulo: (t) => t('config.grupo.interfaz', 'Interfaz e idioma'),
    Contenido: () => <EditorAjustesSection embed />,
  },
  musica: {
    icono: 'musica',
    titulo: (t) => t('ajustes.musica', 'Música'),
    Contenido: () => <EditorMusicaSection embed sinTitulo />,
  },
  tutoriales: {
    icono: 'tutorial',
    titulo: (t) => t('ajustes.tutoriales', 'Tutoriales y bienvenida'),
    Contenido: () => <EditorTutorialesSection embed sinTitulo />,
  },
  notificaciones: {
    icono: 'campana',
    titulo: (t) => t('notif.titulo', 'Notificaciones'),
    Contenido: () => <EditorNotificacionesSection embed sinTitulo />,
  },
  ia: {
    icono: 'brillo',
    titulo: (t) => t('ia.titulo', 'IA: activar y precios'),
    Contenido: () => <EditorIASection embed sinTitulo />,
  },
  respaldo: {
    icono: 'guardar',
    titulo: (t) => t('respaldo.titulo', 'Respaldo de datos'),
    Contenido: () => <EditorRespaldoSection embed sinTitulo />,
  },
}

/** Grupos de la cuenta real: no salen en una casa demo prestada. */
const OCULTOS_SIN_CUENTA = new Set<ConfigGrupoId>(['cuenta', 'respaldo'])

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
  const nombreCuarto = useNombreCuarto()
  const tab = useEditorUi((s) => s.tab)
  const setTab = useEditorUi((s) => s.setTab)
  const secConfig = useEditorSeccionesConfig()
  const pasos = useHistorialEditor((s) => s.pasos.length)
  const rehechos = useHistorialEditor((s) => s.rehechos.length)
  const deshacer = useHistorialEditor((s) => s.deshacer)
  const rehacer = useHistorialEditor((s) => s.rehacer)
  const vigilar = useHistorialEditor((s) => s.vigilar)

  // El historial es POR PESTAÑA: cambiar de pestaña (o salir del editor) lo
  // vacía. El componente sigue montado fuera del modo edición (el `return null`
  // va después de los hooks), así que el efecto también dispara al salir.
  useEffect(() => {
    vigilar(editMode ? tab : null)
  }, [editMode, tab, vigilar])

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
  const tituloHeader = room ? nombreCuarto(room) : t('editor.titulo', 'Editor')

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
        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            disabled={pasos === 0}
            onClick={() => void deshacer()}
            title={t('editor.hist.deshacer', 'Deshacer')}
            aria-label={t('editor.hist.deshacer', 'Deshacer')}
            className="grid h-7 w-7 place-items-center rounded-md text-white/70 transition hover:bg-white/10 disabled:opacity-25"
          >
            <Icono nombre="deshacer" />
          </button>
          <button
            type="button"
            disabled={rehechos === 0}
            onClick={() => void rehacer()}
            title={t('editor.hist.rehacer', 'Rehacer')}
            aria-label={t('editor.hist.rehacer', 'Rehacer')}
            className="grid h-7 w-7 place-items-center rounded-md text-white/70 transition hover:bg-white/10 disabled:opacity-25"
          >
            <Icono nombre="rehacer" />
          </button>
          <button
            data-tut="editor.listo"
            onClick={() => setEditMode(false)}
            className="rounded-lg bg-accent px-3 py-1.5 text-xs font-bold text-accent-ink transition hover:brightness-110"
          >
            <Icono nombre="confirmar" /> {t('mapa.listo', 'Listo')}
          </button>
        </div>
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
            {/* Los grupos de la cuenta se filtran AL PINTAR, nunca al guardar el
                orden: así conservan su sitio al volver de la casa demo. */}
            {secConfig.orden
              .filter((id) => !(sinCuenta && OCULTOS_SIN_CUENTA.has(id)))
              .map((id) => {
                const g = GRUPOS_CONFIG[id]
                return (
                  <ConfigGrupo
                    key={id}
                    id={id}
                    icono={g.icono}
                    titulo={g.titulo(t)}
                    onDragStart={(x) => secConfig.iniciarArrastre(x as ConfigGrupoId)}
                    onDragEnter={(x) => secConfig.entrarObjetivo(x as ConfigGrupoId)}
                    onDragEnd={secConfig.finArrastre}
                    onDrop={(x) => secConfig.soltar(x as ConfigGrupoId)}
                    esObjetivo={secConfig.objetivo === id && secConfig.arrastrando !== id}
                    esArrastrado={secConfig.arrastrando === id}
                  >
                    <g.Contenido />
                  </ConfigGrupo>
                )
              })}
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
