import { useT } from '../../core/i18n/useT'
import { PERIODOS, type Periodo } from './periodo'

/**
 * Semana / Mes / Año / Todo. Lo usan Progreso (las tres modalidades) y Metas,
 * para que el mismo filtro recorte estadísticas y objetivos por igual.
 */
export function FiltroPeriodo({
  valor,
  onChange,
  acento,
}: {
  valor: Periodo
  onChange: (p: Periodo) => void
  /** Clases del botón activo, con el color de la pestaña. */
  acento: string
}) {
  const t = useT()
  return (
    <div className="flex gap-1.5">
      {PERIODOS.map((p) => (
        <button
          key={p.id}
          type="button"
          onClick={() => onChange(p.id)}
          className={`flex-1 rounded-lg px-2 py-1 text-[11px] font-semibold ${
            valor === p.id ? acento : 'bg-white/5 border border-white/10 hover:bg-white/10'
          }`}
        >
          {t(`ejercicio.periodo.${p.id}`, p.labelEs)}
        </button>
      ))}
    </div>
  )
}
