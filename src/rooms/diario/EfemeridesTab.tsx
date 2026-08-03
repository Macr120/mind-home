import type { Efemeride } from '../../core/data/db'
import { useT } from '../../core/i18n/useT'
import { TarjetaEfemeride } from './TarjetaEfemeride'

export function EfemeridesTab({ efemerides }: { efemerides: Efemeride[] }) {
  const t = useT()

  if (efemerides.length === 0) {
    return (
      <p className="rounded-xl border border-white/10 bg-white/5 p-4 text-center text-xs text-white/45">
        {t('diario.ef.vacio', 'Hoy no se pudieron cargar las efemérides. Prueba actualizar.')}
      </p>
    )
  }

  return (
    <div data-tut="diario.efemerides.lista" className="space-y-4">
      {efemerides.map((e) => (
        <TarjetaEfemeride key={e.tipo} efemeride={e} />
      ))}
    </div>
  )
}
