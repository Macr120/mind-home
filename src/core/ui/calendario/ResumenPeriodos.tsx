import { useT } from '../../i18n/useT'
import { colorPct, type ColumnaRango, type MetricasRango } from './metricas'

/**
 * Cómo fue cada sub-periodo: en la vista Mes una fila por semana, en Año una por
 * mes. Aquí no hay hábitos ni casillas — la pregunta es "¿cómo me fue?", y el
 * detalle se consigue bajando de nivel con el clic (mes → semana → día).
 */
export function ResumenPeriodos({
  metricas,
  onAbrir,
}: {
  metricas: MetricasRango
  onAbrir: (columna: ColumnaRango) => void
}) {
  const t = useT()

  return (
    <div className="space-y-0.5">
      {metricas.columnas.map((c) => (
        <button
          key={c.columna.clave}
          type="button"
          onClick={() => onAbrir(c.columna)}
          disabled={c.vacio}
          className="flex w-full items-center gap-2 rounded-lg px-1 py-1 text-left transition enabled:hover:bg-white/5 disabled:opacity-40"
        >
          <span className="w-14 shrink-0 truncate text-[11px] font-semibold capitalize text-white/70">
            {c.columna.etiqueta}
          </span>
          <span className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-white/10">
            <span
              className="block h-full rounded-full transition-all"
              style={{ width: `${c.pct}%`, backgroundColor: colorPct(c.pct) }}
            />
          </span>
          <span className="w-9 shrink-0 text-right text-[11px] font-bold tabular-nums text-white/75">
            {c.vacio ? '–' : `${c.pct}%`}
          </span>
          <span className="w-12 shrink-0 text-right text-[10px] tabular-nums text-white/35">
            {c.vacio ? t('cal.met.nada', 'Nada') : `${c.hechas}/${c.total}`}
          </span>
        </button>
      ))}
    </div>
  )
}
