import { usePlanos } from '../../state/planosStore'
import { useT } from '../../i18n/useT'

function IconoCuadro({ activo }: { activo: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden>
      <rect
        x="4"
        y="4"
        width="16"
        height="16"
        rx="2"
        stroke="currentColor"
        strokeWidth={activo ? 2.2 : 1.6}
      />
      <path d="M4 9h16" stroke="currentColor" strokeWidth={1.2} opacity={0.55} />
    </svg>
  )
}

function IconoPlano({ activo }: { activo: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden>
      <rect
        x="3"
        y="5"
        width="18"
        height="14"
        rx="1.5"
        stroke="currentColor"
        strokeWidth={activo ? 2.2 : 1.6}
      />
      <path d="M7 10h4M7 13h7M7 16h5" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" />
      <path d="M14 8.5v7M17 10v4" stroke="currentColor" strokeWidth={1.2} strokeLinecap="round" opacity={0.7} />
    </svg>
  )
}

const btnFlotante = (activo: boolean) =>
  [
    'flex h-9 flex-1 items-center justify-center transition active:scale-95',
    activo
      ? 'bg-emerald-100 text-emerald-800'
      : 'text-white/70 hover:bg-white/10',
  ].join(' ')

/** Botones flotantes: abren la sección correspondiente en el panel lateral. */
export function PlanoAccionesFlotantes() {
  const t = useT()
  const menuPlano = usePlanos((s) => s.menuPlano)
  const toggleMenuPlano = usePlanos((s) => s.toggleMenuPlano)

  return (
    <div className="ui-panel-glass flex w-full overflow-hidden rounded-lg border border-white/10 shadow-md backdrop-blur-sm">
      <button
        type="button"
        title={t('planos.menu.cielo', 'Fondo de cielo')}
        onClick={() => toggleMenuPlano('cielo')}
        className={btnFlotante(menuPlano === 'cielo')}
      >
        <IconoCuadro activo={menuPlano === 'cielo'} />
      </button>
      <button
        type="button"
        title={t('planos.menu.superficie', 'Superficie del mapa')}
        onClick={() => toggleMenuPlano('superficie')}
        className={[btnFlotante(menuPlano === 'superficie'), 'border-l border-stone-200'].join(' ')}
      >
        <IconoPlano activo={menuPlano === 'superficie'} />
      </button>
    </div>
  )
}
