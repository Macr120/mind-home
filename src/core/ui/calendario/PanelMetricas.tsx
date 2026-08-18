import { useMemo, useState } from 'react'
import type { Rutina } from '../../data/db'
import { useT } from '../../i18n/useT'
import { esMeta } from '../../metas'
import { Icono } from '../iconos/Icono'
import { AnadirObjetivo } from '../hoy/AnadirObjetivo'
import { GraficaArea } from './GraficaArea'
import { MatrizHabitos } from './MatrizHabitos'
import { ResumenPeriodos } from './ResumenPeriodos'
import { colorPct, metricasRango, type ColumnaRango, type IndiceEjecuciones } from './metricas'

/** Color de la gráfica: el de la app del calendario. */
const COLOR = '#dc2626'

/**
 * «Objetivos»: lo que toca hacer estos días y se palomea. Para el calendario una
 * rutina que se repite y una meta del cronograma con periodo son lo mismo —algo
 * que toca un día y se cumple— así que viven en UN solo panel en vez de dos.
 *
 * Se llamaba «Metas» y el nombre mentía: aquí abajo están los objetivos (los de
 * las apps y los personales), mientras que las metas se ven arriba, en la banda
 * de la propia rejilla. Por eso su botón de alta crea un OBJETIVO y no una meta.
 *
 * En Día y Semana se ve hábito por hábito y se palomea desde aquí; en Mes y Año
 * ya no se listan ocurrencias sueltas, solo el resumen por semana/mes, y el
 * clic baja de nivel. La gráfica refleja EXACTAMENTE las columnas del periodo:
 * en Día es una sola columna, así que no hay línea que trazar (hacen falta 2
 * puntos) — con eso basta para que "sea solo del día" y no mezcle otros días.
 */
export function PanelMetricas({
  rutinas,
  idx,
  columnas,
  detalle,
  onToggle,
  onEditar,
  onIrACronograma,
  onAbrir,
}: {
  /** Ya filtradas por app. */
  rutinas: Rutina[]
  idx: IndiceEjecuciones
  columnas: ColumnaRango[]
  /** true = Día/Semana (casillas, se puede agregar una meta aquí mismo), false = Mes/Año (agregado). */
  detalle: boolean
  onToggle: (r: Rutina, iso: string) => void
  onEditar: (r: Rutina) => void
  onIrACronograma: () => void
  onAbrir: (columna: ColumnaRango) => void
}) {
  const t = useT()
  const [desplegada, setDesplegada] = useState<number | null>(null)
  const [anadiendo, setAnadiendo] = useState(false)
  const metricas = useMemo(() => metricasRango(rutinas, columnas, idx), [rutinas, columnas, idx])
  const metas = useMemo(() => rutinas.filter(esMeta), [rutinas])

  return (
    <div data-tut="cal.metas" className="mt-4 border-t border-white/10 pt-3">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="text-sm text-amber-400/80">
          <Icono nombre="objetivo" />
        </span>
        <p className="text-xs font-bold uppercase tracking-wider text-white/70">
          {t('cal.objetivos', 'Misiones')}
        </p>
        <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold tabular-nums text-white/60">
          {metricas.hechas}/{metricas.total}
        </span>
        {metricas.total > 0 && (
          <span className="text-xs font-black tabular-nums text-white/80">{metricas.pct}%</span>
        )}
        {/* Del catálogo de las apps o personal, con sus días: el mismo alta que el
            panel de Objetivos de cada cuarto, aquí sin app dada de antemano. */}
        {detalle && (
          <button
            type="button"
            onClick={() => setAnadiendo(true)}
            className="ms-auto flex shrink-0 items-center gap-1 rounded-lg border border-white/15 px-2 py-1 text-[11px] font-semibold text-white/60 transition hover:bg-white/10"
          >
            <Icono nombre="agregar" /> {t('cal.objetivo.nuevo', 'Misión')}
          </button>
        )}
      </div>

      {anadiendo && <AnadirObjetivo onCerrar={() => setAnadiendo(false)} />}

      {metricas.total === 0 ? (
        <p className="py-3 text-center text-[11px] text-white/35">
          {t('cal.met.vacio', 'Nada agendado en este periodo.')}
        </p>
      ) : (
        <>
          {detalle ? (
            <MatrizHabitos
              metricas={metricas}
              metas={metas}
              desplegada={desplegada}
              onDesplegar={setDesplegada}
              onToggle={onToggle}
              onEditar={onEditar}
              onIrACronograma={onIrACronograma}
            />
          ) : (
            <ResumenPeriodos metricas={metricas} onAbrir={onAbrir} />
          )}
          {/* Un solo día no da línea que trazar (una gráfica necesita dos puntos):
              ahí el avance se lee como barra. */}
          {columnas.length === 1 ? (
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${metricas.pct}%`, backgroundColor: colorPct(metricas.pct) }}
              />
            </div>
          ) : (
            <GraficaArea
              color={COLOR}
              puntos={metricas.columnas.map((c) => ({
                clave: c.columna.clave,
                etiqueta: c.columna.etiqueta,
                valor: c.pct,
                vacio: c.vacio,
              }))}
            />
          )}
        </>
      )}
    </div>
  )
}
