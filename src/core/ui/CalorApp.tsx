import { DIAS_CALOR, type ProgresoPlantilla } from '../gamificacion/actividad'
import { useT } from '../i18n/useT'

/** Intensidad por registros del día: 1 ya se nota y 4 o más es el máximo. */
const mezcla = (n: number) => (n <= 0 ? 0 : [0, 35, 60, 80, 100][Math.min(4, n)])

/**
 * La actividad de una app en las últimas 4 semanas como mapa de calor (la vista
 * «Calor» del panel de apps y del menú lateral): una celda por día, más intensa
 * cuantos más registros, y hoy marcado con un anillo. `filas` reparte los 28 días:
 * 4 filas de una semana en la tarjeta del panel, 2 de dos semanas en el menú.
 */
export function CalorApp({
  enfoque,
  color,
  filas = 4,
}: {
  enfoque: ProgresoPlantilla | undefined
  color: string
  filas?: 2 | 4
}) {
  const t = useT()
  const porDia = enfoque?.porDia ?? Array<number>(DIAS_CALOR).fill(0)
  const activos = porDia.filter((n) => n > 0).length
  return (
    // En la tarjeta del panel, tope de ancho: a dos columnas las celdas salían enormes.
    <div className={`w-full space-y-1 ${filas === 4 ? 'mx-auto max-w-44' : ''}`}>
      <div
        className="grid w-full gap-[3px]"
        style={{ gridTemplateColumns: `repeat(${DIAS_CALOR / filas}, minmax(0, 1fr))` }}
        aria-hidden
      >
        {porDia.map((n, i) => (
          <span
            key={i}
            className={`aspect-square rounded-[3px] ${i === DIAS_CALOR - 1 ? 'ring-1 ring-white/70' : ''}`}
            style={{
              background:
                n > 0
                  ? `color-mix(in srgb, ${color} ${mezcla(n)}%, transparent)`
                  : 'color-mix(in srgb, var(--ui-ink) 7%, transparent)',
            }}
          />
        ))}
      </div>
      <p className="truncate text-center text-[10px] font-semibold tabular-nums text-white/60">
        {t('nav.calor.dias', '{n} de 28 días activos', { n: activos })}
      </p>
    </div>
  )
}
