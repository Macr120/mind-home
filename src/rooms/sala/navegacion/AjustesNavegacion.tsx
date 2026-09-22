import { useT } from '../../../core/i18n/useT'
import { Icono } from '../../../core/ui/iconos/Icono'
import { claveConfigurada } from './config'
import { MODOS_NAV, type ModoNav } from './modos'
import { usePrefsNavegacion } from './preferencias'

/**
 * Ajustes de «Cómo llegar» (el ⚙ del menú «Tus lugares» del chat): modos con
 * los que arranca cada búsqueda, voz al navegar y estado del servicio de rutas.
 */
export function AjustesNavegacion() {
  const t = useT()
  const modos = usePrefsNavegacion((s) => s.modos)
  const voz = usePrefsNavegacion((s) => s.voz)
  const optimo = usePrefsNavegacion((s) => s.optimo)
  const conClave = claveConfigurada()

  const alternar = (id: ModoNav) => {
    // Elegir modos concretos es justo lo contrario de «Óptimo».
    usePrefsNavegacion.getState().setOptimo(false)
    usePrefsNavegacion.getState().setModos(modos.includes(id) ? modos.filter((m) => m !== id) : [...modos, id])
  }

  return (
    <div className="space-y-3 px-1">
      <section>
        <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-white/35">
          {t('sala.nav.prefs.modos', 'Modos por defecto')}
        </p>
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => usePrefsNavegacion.getState().setOptimo(true)}
            aria-pressed={optimo}
            className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
              optimo ? 'border-accent ui-accent-bg' : 'border-white/10 bg-black/25 text-white/60 hover:bg-black/40'
            }`}
          >
            <Icono nombre="estrella" /> {t('sala.nav.optimo', 'Óptimo')}
          </button>
          {MODOS_NAV.map((m) => {
            const on = !optimo && modos.includes(m.id)
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => alternar(m.id)}
                aria-pressed={on}
                className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                  on ? 'border-accent ui-accent-bg' : 'border-white/10 bg-black/25 text-white/60 hover:bg-black/40'
                }`}
              >
                <Icono nombre={m.icono} /> {t(m.clave, m.es)}
              </button>
            )
          })}
        </div>
        <p className="mt-1 text-[10px] text-white/35">
          {t('sala.nav.prefs.modosExplica', 'Vienen marcados al abrir «Cómo llegar»; en cada búsqueda puedes cambiarlos.')}
        </p>
      </section>

      <label className="flex cursor-pointer items-start gap-2 rounded-lg px-1.5 py-1 transition hover:bg-white/5">
        <input
          type="checkbox"
          checked={voz}
          onChange={(e) => usePrefsNavegacion.getState().setVoz(e.target.checked)}
          className="mt-0.5 accent-current"
        />
        <span className="min-w-0 flex-1">
          <span className="block text-xs text-white/85">{t('sala.nav.prefs.voz', 'Voz encendida al navegar')}</span>
          <span className="block text-[10px] leading-snug text-white/35">
            {t('sala.nav.prefs.vozExplica', 'Lee en voz alta cada maniobra durante la navegación en vivo.')}
          </span>
        </span>
      </label>

      <section>
        <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-white/35">
          {t('sala.nav.prefs.servicio', 'Servicio de rutas')}
        </p>
        <p className={`text-xs ${conClave ? 'text-white/70' : 'text-amber-300/90'}`}>
          <Icono nombre={conClave ? 'confirmar' : 'alerta'} />{' '}
          {conClave
            ? t('sala.nav.prefs.servicioOk', 'Configurado: rutas a pie, en bici, en moto, en auto y en transporte público.')
            : t('sala.nav.prefs.servicioFalta', 'Sin configurar (falta VITE_HERE_KEY): solo se ven los trayectos guardados.')}
        </p>
      </section>
    </div>
  )
}
