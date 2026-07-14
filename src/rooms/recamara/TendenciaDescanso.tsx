import { CYAN, formatHoras, type NocheTendencia } from './descanso'

/**
 * Tendencia de las últimas 14 noches: barras de horas por noche con línea de
 * meta. Las noches que alcanzan la meta van a color pleno; las cortas, tenues.
 */
export function TendenciaDescanso({
  datos,
  objetivo,
}: {
  datos: NocheTendencia[]
  objetivo: number
}) {
  const maxH = Math.max(objetivo + 1, ...datos.map((d) => d.horas), 1)
  const pctMeta = (objetivo / maxH) * 100

  return (
    <div className="rounded-2xl bg-white/5 p-4 border border-white/10">
      <div className="flex items-baseline justify-between mb-3">
        <p className="text-sm font-semibold">Tendencia · 14 noches</p>
        <p className="text-[11px] text-white/40">Meta {formatHoras(objetivo)}</p>
      </div>

      <div className="relative h-28">
        {/* Línea de meta */}
        <div
          className="absolute inset-x-0 border-t border-dashed border-white/25"
          style={{ bottom: `${pctMeta}%` }}
        >
          <span className="absolute -top-2 right-0 text-[9px] text-white/40 bg-[#0f1115] px-1">
            meta
          </span>
        </div>

        <div className="absolute inset-0 flex items-end justify-between gap-1">
          {datos.map((d) => {
            const alto = d.hay ? Math.max(4, (d.horas / maxH) * 100) : 0
            const cumple = d.horas >= objetivo
            return (
              <div
                key={d.fecha}
                className="group relative flex-1 flex items-end justify-center h-full"
                title={d.hay ? `${d.fecha} · ${formatHoras(d.horas)}` : `${d.fecha} · sin registro`}
              >
                {d.hay ? (
                  <div
                    className="w-full max-w-6 rounded-t-md transition-all"
                    style={{
                      height: `${alto}%`,
                      background: cumple ? CYAN : `${CYAN}55`,
                    }}
                  />
                ) : (
                  <div className="w-full max-w-6 h-1 rounded bg-white/8" />
                )}
              </div>
            )
          })}
        </div>
      </div>

      <div className="mt-1 flex justify-between">
        {datos.map((d, i) => (
          <span
            key={d.fecha}
            className="flex-1 text-center text-[8px] text-white/30"
          >
            {i % 2 === 0 ? d.fecha.slice(8) : ''}
          </span>
        ))}
      </div>
    </div>
  )
}
