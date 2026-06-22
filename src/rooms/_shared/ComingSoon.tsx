import { useT } from '../../core/i18n/useT'

/** Placeholder para cuartos aún no desarrollados. */
export function ComingSoon() {
  const t = useT()
  return (
    <div className="flex h-full items-center justify-center">
      <div className="text-center">
        <div className="text-7xl mb-4">🚧</div>
        <h2 className="text-2xl font-bold">{t('ui.pronto', 'Próximamente')}</h2>
        <p className="mt-2 text-white/50">
          {t('ui.prontoDesc', 'Este cuarto está en construcción.')}
        </p>
      </div>
    </div>
  )
}
