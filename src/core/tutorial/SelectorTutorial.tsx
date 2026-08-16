import { useEffect, useState } from 'react'
import { create } from 'zustand'
import { useT } from '../i18n/useT'
import { useTutorial } from './tutorialStore'
import {
  FLUJOS_NUCLEO,
  claveNucleoDe,
  flujosDeApp,
  lanzarFlujo,
  tutorialDeApp,
  tutorialMenuPorId,
} from './registro'
import { tutorialCasa } from './menus.meta'
import { getPlantilla, plantillasCuarto, plantillasInfraestructura } from '../registry'
import { esDemo } from '../edicion'
import { entrarDemo } from '../../demo/modo'
import { useAjustes } from '../state/ajustesStore'
import { Carpeta } from '../ui/comun/Carpeta'
import { Icono } from '../ui/iconos/Icono'
import type { NombreIcono } from '../ui/iconos/catalogo'
import type { TutorialDef } from './tipos'

/**
 * Selector de tutoriales: hay UN solo botón "?" por página (junto al botón de
 * techos). Al abrirlo se iluminan en amarillo las zonas de la pantalla que
 * tienen tutorial (marcadas con `data-tut-zona="<id>"`) y el usuario toca una
 * para ver su tour, o elige el tutorial general de la casa.
 */

/** Los dos tours del reloj que se quedan en la página 1; el resto baja al grupo del progreso. */
const TOURS_CALENDARIO = ['calendario', 'metas']

/**
 * Los grupos plegables de la página 2, uno por menú de la casa. Se listan por id
 * y se resuelven con `tutorialMenuPorId`, que encuentra igual los de menú y los
 * del núcleo (el reloj tiene más tours de los dos que quedan en la página 1). El
 * general ('casa') no está: es el botón «Tutorial general» de la página 1.
 */
const GRUPOS_MENU: { clave: string; es: string; icono: NombreIcono; ids: string[] }[] = [
  {
    clave: 'tut.selector.gMenu',
    es: 'El menú',
    icono: 'cuartos',
    ids: ['menu-cuartos', 'menu-plantillas', 'plantillas-custom', 'menu-inventario'],
  },
  {
    clave: 'tut.selector.gEditor',
    es: 'El editor',
    icono: 'editar',
    ids: ['editor-mapa', 'editor-personajes', 'editor-objetos', 'editor-cuarto'],
  },
  {
    clave: 'tut.selector.gConfig',
    es: 'Configuraciones',
    icono: 'ajustes',
    ids: ['editor-config', 'respaldo', 'cuenta-ia', 'musica'],
  },
  {
    clave: 'tut.selector.gCasa',
    es: 'La casa',
    icono: 'casa',
    ids: ['herramientas', 'navegacion', 'ejemplos'],
  },
  {
    clave: 'tut.selector.gChat',
    es: 'El chat',
    icono: 'chat',
    ids: ['chat', 'chat-registros'],
  },
  {
    clave: 'tut.selector.gProgreso',
    es: 'Tu día y tu progreso',
    icono: 'progreso',
    ids: ['hoy', 'rutinas', 'enlaces', 'progreso', 'wrapped'],
  },
]

interface SelectorState {
  abierto: boolean
  /** Página de la tarjeta: 1 = lo esencial, 2 = el resto de los recorridos. */
  pagina: 1 | 2
  abrir(): void
  cerrar(): void
  setPagina(p: 1 | 2): void
}

export const useSelectorTut = create<SelectorState>((set) => ({
  abierto: false,
  pagina: 1,
  // El overlay no se desmonta al cerrar (App.tsx lo monta siempre y solo
  // devuelve null): la página se reinicia aquí para que cada apertura empiece
  // en la primera.
  abrir: () => set({ abierto: true, pagina: 1 }),
  cerrar: () => set({ abierto: false }),
  setPagina: (pagina) => set({ pagina }),
}))

/**
 * Botón "?" que abre/cierra el selector; en amarillo mientras está seleccionado.
 * Se puede apagar en Configuraciones › Tutoriales (entonces los tours se lanzan
 * desde ahí), igual que el botón de música.
 */
export function BotonTutoriales({ className = '' }: { className?: string }) {
  const t = useT()
  const abierto = useSelectorTut((s) => s.abierto)
  const tourActivo = useTutorial((s) => !!s.def)
  const enHud = useAjustes((s) => s.hudTutoriales)
  const marcado = abierto || tourActivo

  if (!enHud) return null

  return (
    <button
      type="button"
      onClick={() => (abierto ? useSelectorTut.getState().cerrar() : useSelectorTut.getState().abrir())}
      title={t('tut.boton', 'Ver tutorial')}
      aria-label={t('tut.boton', 'Ver tutorial')}
      className={`ui-hud grid h-9 w-9 shrink-0 place-items-center rounded-lg border text-sm font-bold transition ${
        marcado
          ? 'border-amber-400/70 bg-amber-400/25 text-amber-300 shadow-[0_0_10px_rgba(251,191,36,0.35)]'
          : 'border-white/10 text-white/55 hover:bg-white/15 hover:text-white/90'
      } ${className}`}
    >
      ?
    </button>
  )
}

interface Zona {
  id: string
  def: TutorialDef
  left: number
  top: number
  width: number
  height: number
}

/** Overlay del selector: velo + zonas amarillas + tarjeta con el general. */
export function SelectorTutorialOverlay() {
  const t = useT()
  const abierto = useSelectorTut((s) => s.abierto)
  const pagina = useSelectorTut((s) => s.pagina)
  const enHud = useAjustes((s) => s.hudTutoriales)
  const setEnHud = useAjustes((s) => s.setHudTutoriales)
  const [zonas, setZonas] = useState<Zona[]>([])

  // Mide las zonas visibles y las sigue mientras el selector está abierto
  // (mismo patrón de intervalo que el spotlight del TutorialOverlay).
  useEffect(() => {
    if (!abierto) {
      // Al cerrar se sueltan las zonas medidas: la próxima apertura remide.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setZonas([])
      return
    }
    const medir = () => {
      const els = document.querySelectorAll<HTMLElement>('[data-tut-zona]')
      const vistos = new Set<string>()
      const zs: Zona[] = []
      els.forEach((el) => {
        const id = el.dataset.tutZona
        if (!id || vistos.has(id)) return
        // Zonas de app («app:<plantillaId>», p. ej. el cuarto abierto) o de menú/HUD.
        const def = id.startsWith('app:') ? tutorialDeApp(id.slice(4)) : tutorialMenuPorId(id)
        if (!def) return
        const r = el.getBoundingClientRect()
        if (r.width === 0 || r.height === 0) return
        vistos.add(id)
        zs.push({
          id,
          def,
          left: Math.round(r.left),
          top: Math.round(r.top),
          width: Math.round(r.width),
          height: Math.round(r.height),
        })
      })
      setZonas(zs)
    }
    medir()
    const interval = window.setInterval(medir, 200)
    window.addEventListener('resize', medir)
    return () => {
      clearInterval(interval)
      window.removeEventListener('resize', medir)
    }
  }, [abierto])

  // Escape cierra el selector.
  useEffect(() => {
    if (!abierto) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      useSelectorTut.getState().cerrar()
      e.stopPropagation()
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [abierto])

  // App con varios flujos: su icono despliega la lista en vez de lanzar directo.
  const [appFlujos, setAppFlujos] = useState<string | null>(null)
  // Grupos de la página 2: uno abierto a la vez, para que la lista quede corta.
  const [grupoAbierto, setGrupoAbierto] = useState<string | null>(null)

  if (!abierto) return null

  const lanzar = (def: TutorialDef) => {
    useSelectorTut.getState().cerrar()
    void useTutorial.getState().iniciar(def)
  }

  /**
   * Los tours del NÚCLEO (los del reloj, «Lo de hoy», el progreso) corren sobre
   * el año de Pep@, así que van por `lanzarFlujo` y saltan a la casa demo; los de
   * menú corren sobre la casa real. La clave la resuelve el propio registro.
   */
  const lanzarTour = (def: TutorialDef) => {
    const clave = claveNucleoDe(def.id)
    if (!clave) {
      lanzar(def)
      return
    }
    useSelectorTut.getState().cerrar()
    void lanzarFlujo(clave, def)
  }

  const irAPagina = (p: 1 | 2) => {
    useSelectorTut.getState().setPagina(p)
    // La sub-lista de flujos se dibuja en la página 1: no debe quedar colgando.
    setAppFlujos(null)
    setGrupoAbierto(null)
  }

  /** Cabecera de la lista de flujos: el cuarto elegido, o el tour del núcleo. */
  const cabecera = appFlujos ? getPlantilla(appFlujos) : undefined
  const tourNucleo = appFlujos && !cabecera ? tutorialMenuPorId(appFlujos) : undefined

  return (
    <div
      className="fixed inset-0 z-[60]"
      role="dialog"
      aria-modal="true"
      onClick={() => useSelectorTut.getState().cerrar()}
    >
      <div className="absolute inset-0 bg-black/55" />

      {/* Zonas con tutorial, iluminadas en amarillo. */}
      {zonas.map((z) => {
        const etiquetaArriba = z.top > window.innerHeight / 2
        return (
          <button
            key={z.id}
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              // Zonas de app: por lanzarFlujo — los flujos nuevos corren sobre
              // los datos de la casa DEMO (desde la casa real, saltan a ella).
              if (z.id.startsWith('app:')) {
                useSelectorTut.getState().cerrar()
                void lanzarFlujo(z.id.slice(4), z.def)
                return
              }
              // Zona del núcleo (el reloj): tiene dos tours, así que despliega la
              // lista en la tarjeta en vez de lanzar el primero. Esa lista vive
              // en la página 1, así que la tarjeta vuelve sola si andabas en la 2
              // (y entonces despliega, nunca cierra: si no, no verías nada).
              if (FLUJOS_NUCLEO[z.id]) {
                const enPag1 = pagina === 1
                useSelectorTut.getState().setPagina(1)
                setAppFlujos((prev) => (enPag1 && prev === z.id ? null : z.id))
                return
              }
              lanzar(z.def)
            }}
            className="absolute rounded-xl border-2 border-amber-400 bg-amber-400/15 transition hover:bg-amber-400/30"
            style={{
              left: z.left - 6,
              top: z.top - 6,
              width: z.width + 12,
              height: z.height + 12,
              boxShadow: '0 0 16px rgba(251, 191, 36, 0.45)',
            }}
          >
            <span
              // Ámbar 500: tono fijo (no se remapea en claro), así la tinta oscura de la
              // etiqueta contrasta igual en los dos modos.
              className={`absolute left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-amber-500 px-2 py-0.5 text-[11px] font-bold text-amber-950 shadow-lg ${
                etiquetaArriba ? 'bottom-full mb-1.5' : 'top-full mt-1.5'
              }`}
            >
              {t(z.def.titulo.clave, z.def.titulo.es)}
            </span>
          </button>
        )
      })}

      {/* Tarjeta: explica el modo y ofrece el tutorial general. */}
      <div
        className="ui-panel ui-pop absolute left-1/2 top-14 flex max-h-[80vh] w-72 max-w-[calc(100vw-16px)] -translate-x-1/2 flex-col rounded-2xl border border-white/10 p-3 text-center shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={() => useSelectorTut.getState().cerrar()}
          title={t('tut.selector.cerrar', 'Cerrar')}
          aria-label={t('tut.selector.cerrar', 'Cerrar')}
          className="absolute end-2 top-2 grid h-6 w-6 place-items-center rounded-lg text-white/45 transition hover:bg-white/10 hover:text-white/80"
        >
          <Icono nombre="cerrar" />
        </button>
        <p className="text-accent text-sm font-bold">
          {t('tut.selector.titulo', '¿Qué tutorial quieres ver?')}
        </p>
        <p className="mt-1 text-xs leading-relaxed text-white/60">
          {pagina === 1
            ? t('tut.selector.hint', 'Toca una zona iluminada en amarillo, o empieza por el general.')
            : t(
                'tut.selector.hint2',
                'Los recorridos de la casa y sus menús. Las zonas amarillas siguen activas.',
              )}
        </p>

        {/* Dos páginas: lo esencial (general, calendario, apps y complementos) y
            el resto (los tours de menús, la casa demo y el interruptor). */}
        <div className="mt-2.5 flex shrink-0 overflow-hidden rounded-lg border border-white/10 bg-black/30">
          <button
            type="button"
            onClick={() => irAPagina(1)}
            aria-current={pagina === 1}
            className={`h-8 flex-1 whitespace-nowrap text-[11px] font-semibold transition ${
              pagina === 1
                ? 'bg-white/15 text-white'
                : 'text-white/50 hover:bg-white/8 hover:text-white/75'
            }`}
          >
            {t('tut.selector.pag1', 'Lo esencial')}
          </button>
          <button
            type="button"
            onClick={() => irAPagina(2)}
            aria-current={pagina === 2}
            className={`h-8 flex-1 whitespace-nowrap text-[11px] font-semibold transition ${
              pagina === 2
                ? 'bg-white/15 text-white'
                : 'text-white/50 hover:bg-white/8 hover:text-white/75'
            }`}
          >
            {t('tut.selector.pag2', 'Todo lo demás')}
          </button>
        </div>

        <div className="mt-2.5 min-h-0 flex-1 overflow-y-auto">
          {pagina === 1 ? (
            <>
              {/* El general y, al lado, la casa demo: es el escenario donde corren
                  los tours de las apps, y desde aquí se pasea sin tour. Dentro
                  del demo ese botón sobra: ya se está ahí. */}
              <div className="flex items-stretch justify-center gap-1.5">
                <button
                  type="button"
                  onClick={() => lanzar(tutorialCasa)}
                  className="ui-accent-bg min-w-0 flex-1 rounded-lg px-3 py-1.5 text-xs font-bold transition hover:brightness-110"
                >
                  {t('tut.selector.general', 'Tutorial general')}
                </button>
                {!esDemo() && (
                  <button
                    type="button"
                    onClick={() => entrarDemo()}
                    title={t(
                      'demo.visitar.desc',
                      'La casa de Pep@ con un año de uso real dentro. Tu casa y tus datos quedan intactos; se vuelve con un botón.',
                    )}
                    className="flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white/75 transition hover:bg-white/10"
                  >
                    <Icono nombre="casa" /> {t('demo.visitar', 'Visitar la casa demo')}
                  </button>
                )}
              </div>

              {/* El calendario del reloj: no es una app ni se construye en el mapa, pero
                  tiene sus dos tours (la rejilla y el recorrido meta → plan → cronograma).
                  Va justo tras el general porque es lo que atraviesa toda la casa; también
                  se despliegan tocando el reloj en la escena. Sus demás tours (rutinas,
                  chips, hoy, progreso) están en la página 2, con los de menús. */}
              <p className="mt-3 border-t border-white/10 pt-2 text-[11px] font-semibold text-white/45">
                {t('tut.selector.nucleo', 'O el calendario y las metas:')}
              </p>
              <div className="mt-1.5 flex flex-wrap justify-center gap-1">
                {TOURS_CALENDARIO.map((id) => tutorialMenuPorId(id)).map(
                  (def) =>
                    def && (
                      <button
                        key={def.id}
                        type="button"
                        data-tut={`tut.nucleo.${def.id}`}
                        onClick={() => lanzarTour(def)}
                        className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-semibold text-white/75 transition hover:border-amber-400/60 hover:bg-amber-400/15"
                      >
                        {t(def.titulo.clave, def.titulo.es)}
                      </button>
                    ),
                )}
              </div>

              {/* Los flujos de la app elegida SUSTITUYEN a las dos rejillas. Pintarlos
                  debajo los dejaba fuera de la vista (esta tarjeta tiene scroll propio):
                  el icono se marcaba en ámbar y parecía no hacer nada. */}
              {appFlujos ? (
                <div className="mt-3 border-t border-white/10 pt-2">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setAppFlujos(null)}
                      title={t('tut.selector.volver', 'Volver')}
                      aria-label={t('tut.selector.volver', 'Volver')}
                      className="grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-white/10 bg-white/5 text-white/60 transition hover:bg-white/10 hover:text-white/90"
                    >
                      <Icono nombre="volver" />
                    </button>
                    <span className="grid h-7 w-7 shrink-0 place-items-center text-lg">
                      {cabecera ? <Icono emoji={cabecera.icon} /> : <Icono nombre="calendario" />}
                    </span>
                    <p className="min-w-0 flex-1 truncate text-start text-xs font-bold text-white/85">
                      {cabecera
                        ? t(`room.${cabecera.id}.nombre`, cabecera.nombre).split(' · ')[0]
                        : tourNucleo && t(tourNucleo.titulo.clave, tourNucleo.titulo.es)}
                    </p>
                  </div>
                  <div className="mt-1.5 space-y-1">
                    {flujosDeApp(appFlujos).map((def) => (
                      <button
                        key={def.id}
                        type="button"
                        onClick={() => {
                          useSelectorTut.getState().cerrar()
                          void lanzarFlujo(appFlujos, def)
                        }}
                        className="flex w-full items-center gap-2 rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-start text-xs font-semibold text-white/75 transition hover:bg-white/10"
                      >
                        <span className="min-w-0 flex-1 truncate">
                          {t(def.titulo.clave, def.titulo.es)}
                        </span>
                        <Icono nombre="play" />
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <>
                  {/* Tutoriales de las apps: se abren desde aquí aunque su cuarto esté
                      cerrado. Con varios FLUJOS, el icono abre la lista para elegir uno. */}
                  <p className="mt-3 border-t border-white/10 pt-2 text-[11px] font-semibold text-white/45">
                    {t('tut.selector.apps', 'O el tutorial de una app:')}
                  </p>
                  <div className="mt-1.5 flex flex-wrap justify-center gap-1">
                    {plantillasCuarto().map((p) => {
                      const nombre = t(`room.${p.id}.nombre`, p.nombre).split(' · ')[0]
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            const flujos = flujosDeApp(p.id)
                            if (flujos.length > 1) {
                              setAppFlujos(p.id)
                              return
                            }
                            useSelectorTut.getState().cerrar()
                            void lanzarFlujo(p.id, flujos[0])
                          }}
                          title={nombre}
                          aria-label={nombre}
                          className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 bg-white/5 text-lg transition hover:border-amber-400/60 hover:bg-amber-400/15"
                        >
                          <Icono emoji={p.icon} />
                        </button>
                      )
                    })}
                  </div>
                  {/* Infraestructura: no se asigna a cuartos, se construye sobre el mapa.
                      Mismo trato que las apps: menú de flujos y salto a la casa demo. */}
                  <p className="mt-3 border-t border-white/10 pt-2 text-[11px] font-semibold text-white/45">
                    {t('tut.selector.infra', 'O construir complementos en el mapa:')}
                  </p>
                  <div className="mt-1.5 flex flex-wrap justify-center gap-1">
                    {plantillasInfraestructura().map((p) => {
                      const nombre = t(`room.${p.id}.nombre`, p.nombre).split(' · ')[0]
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            const flujos = flujosDeApp(p.id)
                            if (flujos.length > 1) {
                              setAppFlujos(p.id)
                              return
                            }
                            useSelectorTut.getState().cerrar()
                            void lanzarFlujo(p.id, flujos[0])
                          }}
                          title={nombre}
                          aria-label={nombre}
                          className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 bg-white/5 text-lg transition hover:border-amber-400/60 hover:bg-amber-400/15"
                        >
                          <Icono emoji={p.icon} />
                        </button>
                      )
                    })}
                  </div>
                </>
              )}
            </>
          ) : (
            <>
              {/* Los tours de la casa y sus menús, agrupados por el menú donde
                  vive cada uno: desde aquí se lanzan de una lista, sin depender
                  de que su zona amarilla esté en pantalla. Una carpeta abierta a
                  la vez, para que la lista no se vuelva un muro de botones. */}
              <div className="space-y-1 text-start">
                {GRUPOS_MENU.map((grupo) => {
                  const tours = grupo.ids
                    .map((id) => tutorialMenuPorId(id))
                    .filter((def): def is TutorialDef => !!def)
                  return (
                    <Carpeta
                      key={grupo.clave}
                      nivel={0}
                      titulo={t(grupo.clave, grupo.es)}
                      icono={grupo.icono}
                      conteo={tours.length}
                      abierta={grupoAbierto === grupo.clave}
                      onAlternar={() =>
                        setGrupoAbierto((prev) => (prev === grupo.clave ? null : grupo.clave))
                      }
                    >
                      {tours.map((def) => (
                        <button
                          key={def.id}
                          type="button"
                          onClick={() => lanzarTour(def)}
                          className="flex w-full items-center gap-2 rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-start text-xs font-semibold text-white/75 transition hover:bg-white/10"
                        >
                          <span className="min-w-0 flex-1 truncate">
                            {t(def.titulo.clave, def.titulo.es)}
                          </span>
                          <Icono nombre="play" />
                        </button>
                      ))}
                    </Carpeta>
                  )
                })}
              </div>

              {/* Quitar el "?" del HUD desde el propio selector (vuelve en Configuraciones). */}
              <div className="mt-3 space-y-1 border-t border-white/10 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setEnHud(!enHud)
                    useSelectorTut.getState().cerrar()
                  }}
                  className={`flex w-full min-w-0 items-center gap-2 rounded-md border px-2 py-1.5 text-start text-xs font-semibold transition ${
                    enHud
                      ? 'ui-accent-bg border-transparent'
                      : 'border-white/10 bg-white/5 text-white/50 hover:bg-white/10'
                  }`}
                >
                  <span className="shrink-0 text-[11px]">{enHud ? '✓' : '○'}</span>
                  <span className="min-w-0 flex-1 truncate">
                    {t('ajustes.tutoriales.hud', 'Mostrar en la pantalla principal')}
                  </span>
                </button>
                <p className="text-[10px] leading-snug text-white/40">
                  {t(
                    'tut.selector.hudNota',
                    'Apagado, los tutoriales se lanzan en Editor › Configuraciones › Tutoriales.',
                  )}
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
