import { useEffect, useState } from 'react'
import { create } from 'zustand'
import { useT } from '../i18n/useT'
import { useTutorial } from './tutorialStore'
import { flujosDeApp, lanzarFlujo, tutorialDeApp, tutorialMenuPorId } from './registro'
import { tutorialCasa } from './menus'
import { plantillasCuarto, plantillasInfraestructura } from '../registry'
import { esDemo } from '../edicion'
import { entrarDemo } from '../../demo/modo'
import { useAjustes } from '../state/ajustesStore'
import { Icono } from '../ui/iconos/Icono'
import type { TutorialDef } from './tipos'

/**
 * Selector de tutoriales: hay UN solo botón "?" por página (junto al botón de
 * techos). Al abrirlo se iluminan en amarillo las zonas de la pantalla que
 * tienen tutorial (marcadas con `data-tut-zona="<id>"`) y el usuario toca una
 * para ver su tour, o elige el tutorial general de la casa.
 */

interface SelectorState {
  abierto: boolean
  abrir(): void
  cerrar(): void
}

export const useSelectorTut = create<SelectorState>((set) => ({
  abierto: false,
  abrir: () => set({ abierto: true }),
  cerrar: () => set({ abierto: false }),
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

  if (!abierto) return null

  const lanzar = (def: TutorialDef) => {
    useSelectorTut.getState().cerrar()
    void useTutorial.getState().iniciar(def)
  }

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
                lanzarFlujo(z.id.slice(4), z.def)
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
              className={`absolute left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-amber-400 px-2 py-0.5 text-[11px] font-bold text-amber-950 shadow-lg ${
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
        className="ui-panel ui-pop absolute left-1/2 top-14 w-72 max-w-[calc(100vw-16px)] -translate-x-1/2 rounded-2xl border border-white/10 p-3 text-center shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-accent text-sm font-bold">
          {t('tut.selector.titulo', '¿Qué tutorial quieres ver?')}
        </p>
        <p className="mt-1 text-xs leading-relaxed text-white/60">
          {t('tut.selector.hint', 'Toca una zona iluminada en amarillo, o empieza por el general.')}
        </p>
        <div className="mt-2.5 flex items-center justify-center gap-1.5">
          <button
            type="button"
            onClick={() => lanzar(tutorialCasa)}
            className="ui-accent-bg rounded-lg px-3 py-1.5 text-xs font-bold transition hover:brightness-110"
          >
            {t('tut.selector.general', 'Tutorial general')}
          </button>
          <button
            type="button"
            onClick={() => useSelectorTut.getState().cerrar()}
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white/70 transition hover:bg-white/10"
          >
            {t('tut.selector.cancelar', 'Cancelar')}
          </button>
        </div>

        {/* Tutoriales de las apps: se abren desde aquí aunque su cuarto esté cerrado.
            Con varios FLUJOS, el icono despliega la lista para elegir uno. */}
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
                    setAppFlujos((prev) => (prev === p.id ? null : p.id))
                    return
                  }
                  useSelectorTut.getState().cerrar()
                  lanzarFlujo(p.id, flujos[0])
                }}
                title={nombre}
                aria-label={nombre}
                className={`grid h-9 w-9 place-items-center rounded-lg border text-lg transition hover:border-amber-400/60 hover:bg-amber-400/15 ${
                  appFlujos === p.id ? 'border-amber-400/60 bg-amber-400/15' : 'border-white/10 bg-white/5'
                }`}
              >
                <Icono emoji={p.icon} />
              </button>
            )
          })}
        </div>
        {/* Infraestructura: no se asigna a cuartos, se construye sobre el mapa.
            Mismo trato que las apps: menú de flujos y salto a la casa demo. */}
        <p className="mt-3 border-t border-white/10 pt-2 text-[11px] font-semibold text-white/45">
          {t('tut.selector.infra', 'O una construcción del mapa:')}
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
                    setAppFlujos((prev) => (prev === p.id ? null : p.id))
                    return
                  }
                  useSelectorTut.getState().cerrar()
                  lanzarFlujo(p.id, flujos[0])
                }}
                title={nombre}
                aria-label={nombre}
                className={`grid h-9 w-9 place-items-center rounded-lg border text-lg transition hover:border-amber-400/60 hover:bg-amber-400/15 ${
                  appFlujos === p.id ? 'border-amber-400/60 bg-amber-400/15' : 'border-white/10 bg-white/5'
                }`}
              >
                <Icono emoji={p.icon} />
              </button>
            )
          })}
        </div>

        {/* Menú de flujos de la app o infraestructura elegida (bajo ambas rejillas). */}
        {appFlujos && (
          <div className="mt-1.5 space-y-1">
            {flujosDeApp(appFlujos).map((def) => (
              <button
                key={def.id}
                type="button"
                onClick={() => {
                  useSelectorTut.getState().cerrar()
                  lanzarFlujo(appFlujos, def)
                }}
                className="block w-full rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-left text-xs font-semibold text-white/75 transition hover:bg-white/10"
              >
                {t(def.titulo.clave, def.titulo.es)}
              </button>
            ))}
          </div>
        )}

        {/* La casa demo: el escenario donde corren estos tours. Los flujos ya
            saltan solos, pero desde aquí se puede entrar a pasearla sin tour.
            Dentro del demo sobra: ya se está ahí. */}
        {!esDemo() && (
          <div className="mt-3 space-y-1 border-t border-white/10 pt-2">
            <button
              type="button"
              onClick={() => entrarDemo()}
              className="flex w-full items-center justify-center gap-1.5 rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-xs font-semibold text-white/75 transition hover:bg-white/10"
            >
              <Icono nombre="casa" /> {t('demo.visitar', 'Visitar la casa demo')}
            </button>
            <p className="text-[10px] leading-snug text-white/40">
              {t(
                'demo.visitar.desc',
                'La casa de Pep@ con un año de uso real dentro. Tu casa y tus datos quedan intactos; se vuelve con un botón.',
              )}
            </p>
          </div>
        )}

        {/* Quitar el "?" del HUD desde el propio selector (vuelve en Configuraciones). */}
        <div className="mt-3 space-y-1 border-t border-white/10 pt-2">
          <button
            type="button"
            onClick={() => {
              setEnHud(!enHud)
              useSelectorTut.getState().cerrar()
            }}
            className={`flex w-full min-w-0 items-center gap-2 rounded-md border px-2 py-1.5 text-left text-xs font-semibold transition ${
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
      </div>
    </div>
  )
}
