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
import { EditorFondoEscritorioSection } from './editor/EditorFondoEscritorioSection'
import { EditorIdiomaSection } from './editor/EditorIdiomaSection'
import { hayFondoEscritorio } from '../plataforma'
import { EditorEstiloSection } from './editor/EditorEstiloSection'
import { EditorMusicaSection } from './editor/EditorMusicaSection'
import { EditorTutorialesSection } from './editor/EditorTutorialesSection'
import { EditorNotificacionesSection } from './editor/EditorNotificacionesSection'
import { EditorCuentaSection } from './editor/EditorCuentaSection'
import { EditorRedesSection } from './editor/EditorRedesSection'
import { EditorIASection } from './editor/EditorIASection'
import { EditorRespaldoSection } from './editor/EditorRespaldoSection'
import { ConfigGrupo } from './editor/ConfigGrupo'
import { useDosColumnas, useZonaPreview } from './editor/zonaPreview'
import { useEditorSeccionesConfig } from './editor/useEditorSecciones'
import type { ConfigGrupoId } from './editor/configSecciones'
import { useT } from '../i18n/useT'
import { useNombreCuarto } from './roomDisplay'
import { esDemo, esDemoAutor, esProbar } from '../edicion'
import { Icono } from './iconos/Icono'
import { IconoMarca } from './iconos/glifosApps'
import type { NombreIcono } from './iconos/catalogo'
import { vivo } from './estilos'

const TABS: { id: EditorTab; labelEs: string }[] = [
  { id: 'mapa', labelEs: 'Mapa' },
  { id: 'personajes', labelEs: 'Personajes' },
  { id: 'objetos', labelEs: 'Objetos' },
  { id: 'config', labelEs: 'Configuraciones' },
]

/** Tour que ofrece el «?» sobre el panel: uno por pestaña, no el del mapa siempre. */
const ZONA_TUT: Record<EditorTab, string> = {
  mapa: 'editor-mapa',
  personajes: 'editor-personajes',
  objetos: 'editor-objetos',
  config: 'editor-config',
}

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
  conectadas: {
    icono: 'red',
    titulo: (t) => t('video.publicar.cuentas.titulo', 'Cuentas conectadas'),
    Contenido: () => <EditorRedesSection embed sinTitulo />,
  },
  estilo: {
    icono: 'paleta',
    titulo: (t) => t('ajustes.estiloMapa', 'Estilo visual del mapa'),
    Contenido: () => <EditorEstiloSection embed sinTitulo />,
  },
  idioma: {
    icono: 'idiomas',
    titulo: (t) => t('ajustes.idioma', 'Idioma'),
    Contenido: () => <EditorIdiomaSection />,
  },
  interfaz: {
    icono: 'pincel',
    titulo: (t) => t('config.grupo.interfaz', 'Interfaz'),
    Contenido: () => <EditorAjustesSection embed />,
  },
  fondo: {
    icono: 'pantallas',
    titulo: (t) => t('ajustes.fondoEscritorio', 'Fondo de pantalla'),
    Contenido: () => <EditorFondoEscritorioSection />,
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
const OCULTOS_SIN_CUENTA = new Set<ConfigGrupoId>(['cuenta', 'conectadas', 'respaldo'])

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
  const expandido = useEditorUi((s) => s.expandido)
  const setExpandido = useEditorUi((s) => s.setExpandido)
  const dosColumnas = useDosColumnas()
  const setZona = useZonaPreview((s) => s.setNodo)
  const previewsEnZona = useZonaPreview((s) => s.cuenta)
  const secConfig = useEditorSeccionesConfig()
  const pasos = useHistorialEditor((s) => s.pasos.length)
  const rehechos = useHistorialEditor((s) => s.rehechos.length)
  const deshacer = useHistorialEditor((s) => s.deshacer)
  const rehacer = useHistorialEditor((s) => s.rehacer)
  const vigilar = useHistorialEditor((s) => s.vigilar)

  // El historial es POR PESTAÑA: cambiar de pestaña (o salir del editor) lo
  // vacía. `EditorHud` desmonta este panel al salir del modo edición, así que la
  // limpieza del efecto es la que suelta la escucha: sin ella seguiría apilando
  // los cambios hechos fuera del editor y reaparecerían al volver a abrirlo.
  useEffect(() => {
    vigilar(editMode ? tab : null)
    return () => vigilar(null)
  }, [editMode, tab, vigilar])

  // Casas demo y probar: Configuraciones se abre entera salvo Cuenta y
  // Respaldo, que son de la cuenta real y no de esta casa prestada (en probar,
  // iniciar sesión pasa por salir a la puerta, no por aquí). Idioma, tema de
  // interfaz y demás preferencias son del dispositivo: se comparten.
  const sinCuenta = (esDemo() && !esDemoAutor()) || esProbar()

  const editar = (id: string | null) => editRoom(id)

  // Fuera del modo edición este panel ni se monta: `EditorHud` pinta la barra
  // ligera y solo descarga este módulo al entrar a editar.
  if (!editMode) return null

  const room = editingRoomId ? getCuarto(editingRoomId) : null
  const color = room ? roomColors[room.id] ?? room.color : '#94a3b8'
  const tituloHeader = room ? nombreCuarto(room) : t('editor.titulo', 'Editor')
  // Pantalla partida: solo a pantalla completa, con sitio de sobra y en una
  // pestaña que tenga qué previsualizar (Configuraciones no tiene).
  const partido = expandido && dosColumnas && tab !== 'config'

  return (
    <div
      data-tut-zona={ZONA_TUT[tab]}
      className={`ui-panel-glass ui-desliza-fin absolute top-0 z-[35] flex h-full flex-col pt-[var(--safe-top)] pb-[var(--safe-bottom)] pe-[var(--safe-right)] backdrop-blur-md ${
        expandido
          ? 'inset-0 w-full ps-[var(--safe-left)]'
          : 'end-0 w-80 border-s border-white/10'
      }`}
    >
      <header className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
        {/* Editando un cuarto: botón para SALIR del cuarto y volver al editor de mapa completo. */}
        {room && (
          <button
            type="button"
            data-tut="editor.volverMapa"
            onClick={() => editar(null)}
            title={t('editor.salirCuarto', 'Salir del cuarto (volver al mapa)')}
            className="-ms-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-white/70 transition hover:bg-white/10 hover:text-white"
          >
            <Icono nombre="volver" />
          </button>
        )}
        <span className="texto-vivo truncate text-base font-black" style={vivo(color)}>
          <Icono nombre="editar" /> {tituloHeader}
        </span>
        {/* Pantalla completa: la flecha señala hacia dónde crece el panel (y de
            vuelta, hacia su costado). */}
        <button
          type="button"
          onClick={() => setExpandido(!expandido)}
          title={
            expandido
              ? t('editor.contraer', 'Volver al panel lateral')
              : t('editor.expandir', 'Ver a pantalla completa')
          }
          aria-label={
            expandido
              ? t('editor.contraer', 'Volver al panel lateral')
              : t('editor.expandir', 'Ver a pantalla completa')
          }
          aria-pressed={expandido}
          className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-white/70 transition hover:bg-white/10 hover:text-white"
        >
          <Icono nombre={expandido ? 'derecha' : 'izquierda'} />
        </button>
        <div className="ms-auto flex items-center gap-1">
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
              className={`flex h-8 flex-1 items-center justify-center gap-0.5 whitespace-nowrap px-1 text-[11px] font-semibold transition ${
                tab === tb.id
                  ? 'bg-white/15 text-white'
                  : 'text-white/50 hover:bg-white/8 hover:text-white/75'
              }`}
            >
              <IconoMarca glifo={tb.id} size="1.1em" />
              {t(`editor.tab.${tb.id}`, tb.labelEs)}
            </button>
          ))}
        </div>
      </div>

      {/* A pantalla completa con sitio de sobra: controles a la izquierda y la
          columna de preview a la derecha (los previews se teletransportan solos,
          ver `zonaPreview`). Si no, una sola columna como siempre. */}
      <div className={`flex min-h-0 flex-1 ${partido ? 'flex-row' : 'flex-col'}`}>
        {/* Sin padding-top en el contenedor de scroll: el hueco superior lo pone el
            `pt-3` de adentro (contenido que sí se desplaza). Así el preview `sticky`
            se ancla a ras del borde superior, sin dejar una franja de contenido
            asomando por el padding. */}
        <div
          data-tut="editor.contenido"
          className={`min-h-0 overflow-y-auto px-3 pb-3 ${
            partido
              ? 'w-80 shrink-0'
              : expandido
                ? 'mx-auto w-full max-w-2xl flex-1'
                : 'flex-1'
          }`}
        >
          {tab === 'mapa' ? (
            <div className="pt-3">
              <EditorPanelMapa />
              <AyudaPie>
                {t('editor.ayuda.mapa.a', 'Elige un')} <b className="text-white/65">{t('editor.ayuda.mapa.b', 'modo')}</b>{' '}
                {t('editor.ayuda.mapa.c', 'arriba y edita en el')}{' '}
                <b className="text-white/65">{t('editor.ayuda.mapa.d', 'plano')}</b>{' '}
                {t('editor.ayuda.mapa.e', 'o en el mapa 3D. Más abajo, personaliza la MindHaOS.')}
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
                // El fondo de pantalla solo existe en el escritorio: en la web y en
                // el teléfono no hay ventana que colgar del escritorio.
                .filter((id) => id !== 'fondo' || hayFondoEscritorio())
                .map((id) => {
                  const g = GRUPOS_CONFIG[id]
                  return (
                    <ConfigGrupo
                      key={id}
                      id={id}
                      icono={g.icono}
                      titulo={g.titulo(t)}
                      gesto={secConfig.arrastre(id)}
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

        {/* Columna de preview. El contenedor del portal va VACÍO de hijos de React
            (la pista es hermana suya): mezclar hijos propios y portales en el mismo
            nodo deja a React peleando por el orden del DOM. */}
        {partido && (
          <div className="relative flex min-h-0 flex-1 flex-col">
            {previewsEnZona === 0 && (
              <p className="absolute inset-0 grid place-items-center px-8 text-center text-xs leading-snug text-white/35">
                {t('editor.zonaPreview', 'Aquí se ve lo que estás editando.')}
              </p>
            )}
            <div ref={setZona} className="flex min-h-0 flex-1 flex-col gap-2 p-3 ps-0" />
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
