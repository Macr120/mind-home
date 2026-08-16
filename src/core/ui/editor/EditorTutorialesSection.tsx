import { useLayout } from '../../state/layoutStore'
import { useAjustes } from '../../state/ajustesStore'
import { useBienvenida } from '../../bienvenida/bienvenidaStore'
import { useTutorial } from '../../tutorial/tutorialStore'
import { useSelectorTut } from '../../tutorial/SelectorTutorial'
import { TUTORIALES_MENU } from '../../tutorial/menus.meta'
import { FLUJOS_NUCLEO, flujosDeApp, lanzarFlujo } from '../../tutorial/registro'
import { hayNarracion } from '../../tutorial/narracion'
import { plantillasCuarto, plantillasInfraestructura } from '../../registry'
import { esDemo } from '../../edicion'
import { entrarDemo } from '../../../demo/modo'
import type { TutorialDef } from '../../tutorial/tipos'
import { useT } from '../../i18n/useT'
import { Icono } from '../iconos/Icono'

/**
 * Sección de Configuraciones: los tutoriales y la bienvenida, igual que la
 * música. Además del "?" del HUD (que puede apagarse aquí), desde este panel se
 * lanza cualquier tour: el general de la casa, los de menús y los de cada app.
 */
export function EditorTutorialesSection({
  embed,
  sinTitulo,
}: { embed?: boolean; sinTitulo?: boolean } = {}) {
  const t = useT()
  const hudTutoriales = useAjustes((s) => s.hudTutoriales)
  const setHudTutoriales = useAjustes((s) => s.setHudTutoriales)
  const vozTutoriales = useAjustes((s) => s.vozTutoriales)
  const setVozTutoriales = useAjustes((s) => s.setVozTutoriales)

  // Los tours apuntan al HUD y a los menús: el editor tapa media pantalla, así
  // que se cierra antes. El que necesita el editor lo reabre en su `preparar`.
  const lanzar = (def: TutorialDef) => {
    useLayout.getState().setEditMode(false)
    void useTutorial.getState().iniciar(def)
  }

  const elegirEnPantalla = () => {
    useLayout.getState().setEditMode(false)
    useSelectorTut.getState().abrir()
  }

  return (
    <div
      className={embed ? 'space-y-4' : 'rounded-xl border border-white/10 bg-white/5 p-3 space-y-4'}
    >
      {!sinTitulo && (
        <p className="text-[10px] font-bold uppercase tracking-wider text-white/35">
          <Icono nombre="tutorial" /> {t('ajustes.tutoriales', 'Tutoriales y bienvenida')}
        </p>
      )}

      {/* Interruptor del "?" del HUD */}
      <div className="space-y-1.5">
        <button
          type="button"
          onClick={() => setHudTutoriales(!hudTutoriales)}
          className={`flex w-full min-w-0 items-center gap-2 rounded-md border px-2 py-1.5 text-start text-xs font-semibold transition ${
            hudTutoriales
              ? 'ui-accent-bg border-transparent'
              : 'border-white/10 bg-white/5 text-white/50 hover:bg-white/10'
          }`}
        >
          <span className="shrink-0 text-[11px]">{hudTutoriales ? '✓' : '○'}</span>
          <span className="min-w-0 flex-1 truncate">
            {t('ajustes.tutoriales.hud', 'Mostrar en la pantalla principal')}
          </span>
        </button>
        <p className="text-[11px] leading-snug text-white/45">
          {t(
            'ajustes.tutoriales.hudDesc',
            'Apagado, la casa queda más limpia: los tutoriales se lanzan desde aquí.',
          )}
        </p>
      </div>

      {/* Narración por voz. Sin voces del sistema no se ofrece: no sonaría nada. */}
      {hayNarracion() && (
        <div className="space-y-1.5">
          <button
            type="button"
            onClick={() => setVozTutoriales(!vozTutoriales)}
            className={`flex w-full min-w-0 items-center gap-2 rounded-md border px-2 py-1.5 text-start text-xs font-semibold transition ${
              vozTutoriales
                ? 'ui-accent-bg border-transparent'
                : 'border-white/10 bg-white/5 text-white/50 hover:bg-white/10'
            }`}
          >
            <span className="shrink-0 text-[11px]">{vozTutoriales ? '✓' : '○'}</span>
            <span className="min-w-0 flex-1 truncate">
              {t('ajustes.tutoriales.voz', 'Leer los pasos en voz alta')}
            </span>
          </button>
          <p className="text-[11px] leading-snug text-white/45">
            {t(
              'ajustes.tutoriales.vozDesc',
              'El mago narra cada paso con la voz de su ficha. También se enciende con el altavoz de la tarjeta.',
            )}
          </p>
        </div>
      )}

      {/* Mismo flujo del "?": ilumina en amarillo las zonas con tutorial */}
      <button
        type="button"
        onClick={elegirEnPantalla}
        className="ui-accent-bg w-full rounded-md px-2 py-1.5 text-xs font-semibold transition hover:brightness-110"
      >
        {t('ajustes.tutoriales.enPantalla', 'Elegir un tutorial en la pantalla')}
      </button>

      {/* Casa y menús */}
      <div className="space-y-1.5">
        <p className="text-[10px] font-bold uppercase tracking-wider text-white/35">
          {t('ajustes.tutoriales.casa', 'La casa y sus menús')}
        </p>
        <div className="grid grid-cols-1 gap-1.5">
          {TUTORIALES_MENU.map((def) => (
            <button
              key={def.id}
              type="button"
              onClick={() => lanzar(def)}
              className="flex items-center gap-2 rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-start text-xs font-semibold text-white/75 transition hover:bg-white/10"
            >
              <span className="min-w-0 flex-1 truncate">{t(def.titulo.clave, def.titulo.es)}</span>
              <Icono nombre="play" />
            </button>
          ))}
        </div>
      </div>

      {/* El calendario del reloj: no es una app, pero sus dos tours corren sobre el
          año de Pep@ igual que los de las apps (por eso van con `lanzarFlujo`). Van
          antes que las apps, como en el selector del "?". */}
      <div className="space-y-1.5">
        <p className="text-[10px] font-bold uppercase tracking-wider text-white/35">
          {t('ajustes.tutoriales.nucleo', 'El calendario y las metas')}
        </p>
        <div className="grid grid-cols-1 gap-1.5">
          {Object.entries(FLUJOS_NUCLEO).flatMap(([clave, defs]) =>
            defs.map((def) => (
              <button
                key={def.id}
                type="button"
                onClick={() => {
                  useLayout.getState().setEditMode(false)
                  void lanzarFlujo(clave, def)
                }}
                className="flex items-center gap-2 rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-start text-xs font-semibold text-white/75 transition hover:bg-white/10"
              >
                <span className="min-w-0 flex-1 truncate">{t(def.titulo.clave, def.titulo.es)}</span>
                <Icono nombre="play" />
              </button>
            )),
          )}
        </div>
      </div>

      {/* Apps: se abren desde aquí aunque su cuarto esté cerrado */}
      <div className="space-y-1.5">
        <p className="text-[10px] font-bold uppercase tracking-wider text-white/35">
          {t('ajustes.tutoriales.apps', 'Las apps')}
        </p>
        <div className="flex flex-wrap gap-1">
          {plantillasCuarto().map((p) => {
            const nombre = t(`room.${p.id}.nombre`, p.nombre).split(' · ')[0]
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  // Con flujos, el primero es la introducción de la app.
                  useLayout.getState().setEditMode(false)
                  void lanzarFlujo(p.id, flujosDeApp(p.id)[0])
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
      </div>

      {/* Infraestructura: se construye sobre el mapa, no ocupa cuarto */}
      <div className="space-y-1.5">
        <p className="text-[10px] font-bold uppercase tracking-wider text-white/35">
          {t('ajustes.tutoriales.infra', 'Las construcciones del mapa')}
        </p>
        <div className="flex flex-wrap gap-1">
          {plantillasInfraestructura().map((p) => {
            const nombre = t(`room.${p.id}.nombre`, p.nombre).split(' · ')[0]
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  // Con flujos, el primero es la introducción (igual que las apps).
                  useLayout.getState().setEditMode(false)
                  void lanzarFlujo(p.id, flujosDeApp(p.id)[0])
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
      </div>

      {/* Casa demo: la casa de Pep@ con un año de vida (los flujos corren allí).
          Dentro del demo sobra: ya se está ahí. */}
      {!esDemo() && (
        <div className="space-y-1.5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-white/35">
            {t('demo.barra.titulo', 'Casa demo')}
          </p>
          <button
            type="button"
            onClick={() => entrarDemo()}
            className="w-full rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-xs font-semibold text-white/70 transition hover:bg-white/10"
          >
            {t('demo.visitar', 'Visitar la casa demo')}
          </button>
          <p className="text-[11px] leading-snug text-white/45">
            {t(
              'demo.visitar.desc',
              'La casa de Pep@ con un año de uso real dentro. Tu casa y tus datos quedan intactos; se vuelve con un botón.',
            )}
          </p>
        </div>
      )}

      {/* Bienvenida: relanzar el menú de primera vez (no duplica cuartos). */}
      <div className="space-y-1.5">
        <p className="text-[10px] font-bold uppercase tracking-wider text-white/35">
          {t('ajustes.bienvenida', 'Bienvenida')}
        </p>
        <button
          type="button"
          onClick={() => {
            useLayout.getState().setEditMode(false)
            useBienvenida.getState().abrir()
          }}
          className="w-full rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-xs font-semibold text-white/70 transition hover:bg-white/10"
        >
          {t('ajustes.bienvenida.btn', 'Volver a ver la bienvenida')}
        </button>
        <p className="text-[11px] leading-snug text-white/45">
          {t(
            'ajustes.bienvenida.desc',
            'El menú de primera vez: elige apps, avatar y tema. No duplica lo que ya tienes.',
          )}
        </p>
      </div>
    </div>
  )
}
