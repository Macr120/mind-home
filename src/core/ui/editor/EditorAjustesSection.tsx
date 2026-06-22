import { useAjustes, type Idioma } from '../../state/ajustesStore'
import { useT } from '../../i18n/useT'
import { TEMAS_UI } from '../temasUI'
import { TIPOGRAFIAS } from '../tipografias'

/**
 * Sección del editor de mapa: ajustes de la interfaz (idioma, tema y tipografía).
 * Distinto del "Tema de la casa" (escena 3D estacional); esto reviste el chrome.
 */
export function EditorAjustesSection({ embed }: { embed?: boolean } = {}) {
  const t = useT()
  const idioma = useAjustes((s) => s.idioma)
  const setIdioma = useAjustes((s) => s.setIdioma)
  const temaUI = useAjustes((s) => s.temaUI)
  const setTemaUI = useAjustes((s) => s.setTemaUI)
  const tipografia = useAjustes((s) => s.tipografia)
  const setTipografia = useAjustes((s) => s.setTipografia)

  const idiomas: { id: Idioma; label: string; flag: string }[] = [
    { id: 'es', label: t('ajustes.idioma.es', 'Español'), flag: '🇪🇸' },
    { id: 'en', label: t('ajustes.idioma.en', 'Inglés'), flag: '🇬🇧' },
  ]

  return (
    <div className={embed ? 'space-y-4' : 'rounded-xl border border-white/10 bg-white/5 p-3 space-y-4'}>
      {!embed && <p className="text-sm font-semibold">{t('ajustes.titulo', 'Ajustes')}</p>}

      {/* Idioma */}
      <div className="space-y-1.5">
        <p className="text-[10px] font-bold uppercase tracking-wider text-white/35">
          {t('ajustes.idioma', 'Idioma')}
        </p>
        <div className="grid grid-cols-2 gap-1.5">
          {idiomas.map((it) => {
            const activo = idioma === it.id
            return (
              <button
                key={it.id}
                type="button"
                onClick={() => setIdioma(it.id)}
                className={`flex items-center justify-center gap-1.5 rounded-md border px-2 py-1.5 text-xs font-semibold transition ${
                  activo
                    ? 'ui-accent-bg border-transparent'
                    : 'border-white/10 bg-white/5 text-white/70 hover:bg-white/10'
                }`}
              >
                <span>{it.flag}</span>
                <span>{it.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Tema de interfaz */}
      <div className="space-y-1.5">
        <p className="text-[10px] font-bold uppercase tracking-wider text-white/35">
          {t('ajustes.tema', 'Tema de la interfaz')}
        </p>
        <div className="grid grid-cols-1 gap-1.5">
          {TEMAS_UI.map((tema) => {
            const activo = temaUI === tema.id
            return (
              <button
                key={tema.id}
                type="button"
                onClick={() => setTemaUI(tema.id)}
                className={`flex items-center gap-2 rounded-md border px-2 py-1.5 text-xs font-semibold transition ${
                  activo
                    ? 'border-accent bg-white/10 text-white'
                    : 'border-white/10 bg-white/5 text-white/70 hover:bg-white/10'
                }`}
              >
                <span
                  className="h-4 w-4 shrink-0 rounded-full border border-white/20"
                  style={{ background: tema.vars['--ui-accent'] }}
                />
                <span>{tema.icon}</span>
                <span className="flex-1 text-left">
                  {t(`temaUI.${tema.id}`, tema.nombre)}
                </span>
                {activo && <span className="text-accent">●</span>}
              </button>
            )
          })}
        </div>
      </div>

      {/* Tipografía */}
      <div className="space-y-1.5">
        <p className="text-[10px] font-bold uppercase tracking-wider text-white/35">
          {t('ajustes.tipografia', 'Tipografía')}
        </p>
        <div className="grid grid-cols-1 gap-1.5">
          {TIPOGRAFIAS.map((tip) => {
            const activo = tipografia === tip.id
            return (
              <button
                key={tip.id}
                type="button"
                onClick={() => setTipografia(tip.id)}
                style={{ fontFamily: tip.stack }}
                className={`flex items-center justify-between gap-2 rounded-md border px-2.5 py-1.5 text-sm transition ${
                  activo
                    ? 'border-accent bg-white/10 text-white'
                    : 'border-white/10 bg-white/5 text-white/70 hover:bg-white/10'
                }`}
              >
                <span>{t(`tipografia.${tip.id}`, tip.nombre)}</span>
                <span className="text-xs opacity-60">Aa</span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
