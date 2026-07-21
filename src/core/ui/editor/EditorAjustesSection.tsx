import type { ReactNode } from 'react'
import { Shapes } from 'lucide-react'
import { useAjustes, type EstiloIconos, type Idioma } from '../../state/ajustesStore'
import { useT } from '../../i18n/useT'
import { TEMAS_UI, modoBase, type ModoUI } from '../temasUI'
import { TIPOGRAFIAS } from '../tipografias'
import { Icono } from '../iconos/Icono'
import { useBienvenida } from '../../bienvenida/bienvenidaStore'

/**
 * Sección del editor de mapa: ajustes de la interfaz (idioma, apariencia,
 * tema y tipografía). Distinto del "Tema de la casa" (escena 3D estacional);
 * esto reviste el chrome.
 */
export function EditorAjustesSection({ embed }: { embed?: boolean } = {}) {
  const t = useT()
  const idioma = useAjustes((s) => s.idioma)
  const setIdioma = useAjustes((s) => s.setIdioma)
  const temaUI = useAjustes((s) => s.temaUI)
  const setTemaUI = useAjustes((s) => s.setTemaUI)
  const modoUI = useAjustes((s) => s.modoUI)
  const setModoUI = useAjustes((s) => s.setModoUI)
  const tipografia = useAjustes((s) => s.tipografia)
  const setTipografia = useAjustes((s) => s.setTipografia)
  const estiloIconos = useAjustes((s) => s.estiloIconos)
  const setEstiloIconos = useAjustes((s) => s.setEstiloIconos)
  const vidrioTransparencia = useAjustes((s) => s.vidrioTransparencia)
  const setVidrioTransparencia = useAjustes((s) => s.setVidrioTransparencia)
  const vidrioIntensidad = useAjustes((s) => s.vidrioIntensidad)
  const setVidrioIntensidad = useAjustes((s) => s.setVidrioIntensidad)

  // Banderas: excepción deliberada, se muestran igual en ambos estilos de iconos.
  const idiomas: { id: Idioma; label: string; flag: string }[] = [
    { id: 'es', label: t('ajustes.idioma.es', 'Español'), flag: '🇪🇸' },
    { id: 'en', label: t('ajustes.idioma.en', 'Inglés'), flag: '🇬🇧' },
  ]

  const modos: { id: ModoUI; label: string; icono: 'dia' | 'noche' | 'burbujas' }[] = [
    { id: 'claro', label: t('ajustes.modo.claro', 'Claro'), icono: 'dia' },
    { id: 'oscuro', label: t('ajustes.modo.oscuro', 'Oscuro'), icono: 'noche' },
    {
      id: 'transparente',
      label: t('ajustes.modo.transparente', 'Transparente'),
      icono: 'burbujas',
    },
  ]

  // Cada botón previsualiza su propio estilo (emoji fijo / SVG fijo).
  const estilos: { id: EstiloIconos; label: string; muestra: ReactNode }[] = [
    { id: 'emoji', label: t('ajustes.iconos.emoji', 'Emojis'), muestra: <span>😀</span> },
    {
      id: 'profesional',
      label: t('ajustes.iconos.profesional', 'Profesional'),
      muestra: <Shapes size="1em" strokeWidth={2} className="inline-block" />,
    },
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

      {/* Apariencia: modo claro / oscuro */}
      <div className="space-y-1.5">
        <p className="text-[10px] font-bold uppercase tracking-wider text-white/35">
          {t('ajustes.modo', 'Apariencia')}
        </p>
        <div className="grid grid-cols-2 gap-1.5">
          {modos.map((m) => {
            const activo = modoUI === m.id
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => setModoUI(m.id)}
                className={`flex items-center justify-center gap-1.5 rounded-md border px-2 py-1.5 text-xs font-semibold transition ${
                  m.id === 'transparente' ? 'col-span-2' : ''
                } ${
                  activo
                    ? 'ui-accent-bg border-transparent'
                    : 'border-white/10 bg-white/5 text-white/70 hover:bg-white/10'
                }`}
              >
                <Icono nombre={m.icono} />
                <span>{m.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Estilo de iconos: emojis (clásico) o SVG (profesional) */}
      <div className="space-y-1.5">
        <p className="text-[10px] font-bold uppercase tracking-wider text-white/35">
          {t('ajustes.iconos', 'Estilo de iconos')}
        </p>
        <div className="grid grid-cols-2 gap-1.5">
          {estilos.map((e) => {
            const activo = estiloIconos === e.id
            return (
              <button
                key={e.id}
                type="button"
                onClick={() => setEstiloIconos(e.id)}
                className={`flex items-center justify-center gap-1.5 rounded-md border px-2 py-1.5 text-xs font-semibold transition ${
                  activo
                    ? 'ui-accent-bg border-transparent'
                    : 'border-white/10 bg-white/5 text-white/70 hover:bg-white/10'
                }`}
              >
                {e.muestra}
                <span>{e.label}</span>
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
                  style={{ background: tema.vars[modoBase(modoUI)]['--ui-accent'] }}
                />
                <Icono emoji={tema.icon} />
                <span className="flex-1 text-left">
                  {t(`temaUI.${tema.id}`, tema.nombre)}
                </span>
                {activo && <span className="text-accent">●</span>}
              </button>
            )
          })}
        </div>
      </div>

      {/* Vidrio de la interfaz: transparencia + desenfoque de paneles flotantes */}
      <div className="space-y-1.5">
        <p className="text-[10px] font-bold uppercase tracking-wider text-white/35">
          {t('ajustes.vidrio', 'Estilo de la interfaz')}
        </p>
        {(
          [
            {
              clave: 'transparencia',
              label: t('ajustes.vidrio.transparencia', 'Transparencia'),
              valor: vidrioTransparencia,
              setter: setVidrioTransparencia,
            },
            {
              clave: 'intensidad',
              label: t('ajustes.vidrio.intensidad', 'Intensidad'),
              valor: vidrioIntensidad,
              setter: setVidrioIntensidad,
            },
          ] as const
        ).map((s) => (
          <div key={s.clave} className="rounded-md border border-white/10 bg-white/5 px-2 py-1.5">
            <div className="flex items-center gap-2">
              <span className="flex-1 truncate text-xs text-white/75">{s.label}</span>
              <span className="text-[10px] tabular-nums text-white/40">
                {Math.round(s.valor * 100)}%
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={s.valor}
              onChange={(e) => s.setter(parseFloat(e.target.value))}
              className="mt-1.5 w-full"
              style={{ accentColor: 'var(--ui-accent)' }}
            />
          </div>
        ))}
        <p className="text-[11px] leading-snug text-white/45">
          {t(
            'ajustes.vidrio.desc',
            'Qué tanto se transparentan y desenfocan los paneles y botones que flotan sobre el mapa.',
          )}
        </p>
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

      {/* Bienvenida: relanzar el menú de primera vez (no duplica cuartos). */}
      <div className="space-y-1.5">
        <p className="text-[10px] font-bold uppercase tracking-wider text-white/35">
          {t('ajustes.bienvenida', 'Bienvenida')}
        </p>
        <button
          type="button"
          onClick={() => useBienvenida.getState().abrir()}
          className="w-full rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-xs font-semibold text-white/70 transition hover:bg-white/10"
        >
          {t('ajustes.bienvenida.btn', 'Volver a ver la bienvenida')}
        </button>
      </div>
    </div>
  )
}
