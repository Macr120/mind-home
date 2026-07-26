import { Fragment, useState } from 'react'
import type { Rutina } from '../../data/db'
import { useT } from '../../i18n/useT'
import { Icono } from '../iconos/Icono'
import { colorDe } from '../coloresRutina'
import { DespliegueFila } from './DespliegueFila'
import { diaSemanaCorta, type MetricasRango } from './metricas'

/** Hábitos que se listan antes de plegar el resto. */
const TOPE_FILAS = 12

/**
 * La tabla de hábitos del periodo: una fila por hábito, una columna por día, y
 * los checkboxes que registran el cumplimiento (igual que la lista de Metas).
 * En la vista Día hay una sola columna, así que queda como una lista vertical.
 *
 * Solo la usan Día y Semana: en Mes y Año el detalle por hábito serían cientos de
 * casillas ilegibles, y ahí manda el resumen por semana/mes.
 */
export function MatrizHabitos({
  metricas,
  metas,
  desplegada,
  onDesplegar,
  onToggle,
  onEditar,
  onIrACronograma,
}: {
  metricas: MetricasRango
  /** El árbol de metas completo (sub-metas, borrado en cascada). */
  metas: Rutina[]
  /** Id de la fila abierta, o null. Lo lleva el panel: al crear una meta la abre sola. */
  desplegada: number | null
  onDesplegar: (id: number | null) => void
  onToggle: (r: Rutina, iso: string) => void
  onEditar: (r: Rutina) => void
  onIrACronograma: () => void
}) {
  const t = useT()
  const [abierto, setAbierto] = useState(false)
  const { columnas, filas } = metricas
  const visibles = abierto ? filas : filas.slice(0, TOPE_FILAS)
  const cols = `minmax(6rem, 1fr) repeat(${columnas.length}, 1.75rem)`

  return (
    <div className="overflow-x-auto">
      <div className="min-w-min">
        {/* Mismas siglas L/M/M/J/V/S/D que la cabecera de la rejilla de arriba, para
            que las columnas se lean como los mismos días sin tener que contar. */}
        <div className="grid items-center gap-y-0.5" style={{ gridTemplateColumns: cols }}>
          <div />
          {columnas.map((c) => (
            <div key={c.columna.clave} className="text-center leading-tight">
              <p className="text-[8px] font-bold uppercase text-white/35">{diaSemanaCorta(c.columna.isos[0])}</p>
              <p className="text-[10px] font-bold tabular-nums text-white/55">{c.columna.etiqueta}</p>
            </div>
          ))}

          {visibles.map((f) => (
            <Fragment key={f.rutina.id}>
              <FilaHabitoUI
                fila={f}
                columnas={columnas}
                abierta={desplegada === f.rutina.id}
                onToggle={onToggle}
                onDesplegar={() => onDesplegar(desplegada === f.rutina.id ? null : (f.rutina.id ?? null))}
              />
              {desplegada === f.rutina.id && (
                // Ocupa la fila entera del grid: el detalle se lee a lo ancho, no en la
                // columna del nombre.
                <div style={{ gridColumn: '1 / -1' }}>
                  <DespliegueFila
                    rutina={f.rutina}
                    metas={metas}
                    onEditar={onEditar}
                    onIrACronograma={onIrACronograma}
                    onCerrar={() => onDesplegar(null)}
                  />
                </div>
              )}
            </Fragment>
          ))}
        </div>

        {filas.length > TOPE_FILAS && (
          <button
            type="button"
            onClick={() => setAbierto((v) => !v)}
            className="mt-1 w-full rounded-lg py-0.5 text-[10px] font-semibold text-white/40 transition hover:bg-white/5 hover:text-white/70"
          >
            {abierto ? t('cal.verMenos', 'Ver menos') : t('cal.verMas', '+{n} más', { n: filas.length - TOPE_FILAS })}
          </button>
        )}

        {/* Pie: el desglose por columna, como en una hoja de hábitos. */}
        <div className="mt-1.5 grid items-center gap-y-0.5 border-t border-white/10 pt-1.5" style={{ gridTemplateColumns: cols }}>
          {(
            [
              [t('cal.met.progreso', 'Progreso'), (i: number) => (columnas[i].vacio ? '–' : `${columnas[i].pct}%`)],
              [t('cal.met.hechas', 'Hechas'), (i: number) => String(columnas[i].hechas)],
              [t('cal.met.faltan', 'Faltan'), (i: number) => String(columnas[i].total - columnas[i].hechas)],
            ] as const
          ).map(([label, valor]) => (
            <div key={label} className="contents">
              <p className="truncate pr-2 text-[10px] font-semibold text-white/45">{label}</p>
              {columnas.map((c, i) => (
                <p key={c.columna.clave} className="text-center text-[9px] tabular-nums text-white/60">
                  {valor(i)}
                </p>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function FilaHabitoUI({
  fila,
  columnas,
  abierta,
  onToggle,
  onDesplegar,
}: {
  fila: MetricasRango['filas'][number]
  columnas: MetricasRango['columnas']
  abierta: boolean
  onToggle: (r: Rutina, iso: string) => void
  onDesplegar: () => void
}) {
  const t = useT()
  const color = colorDe(fila.rutina)

  return (
    <div className="contents">
      <button
        type="button"
        onClick={onDesplegar}
        className="flex min-w-0 items-center gap-1.5 pr-2 text-left transition hover:text-white"
      >
        <span className={`w-2 shrink-0 text-[9px] text-white/30 ${abierta ? '' : 'opacity-60'}`}>
          {abierta ? '▾' : '▸'}
        </span>
        <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />
        <span className="min-w-0 flex-1 truncate text-[11px] text-white/85">
          <Icono emoji={fila.rutina.emoji} /> {fila.rutina.nombre}
          {fila.rutina.hora && <span className="text-white/40"> · {fila.rutina.hora}</span>}
        </span>
        <span className="shrink-0 text-[9px] tabular-nums text-white/35">
          {fila.hechas}/{fila.tocan}
        </span>
      </button>
      {fila.celdas.map((celda, i) => {
        const iso = columnas[i].columna.isos[0]
        if (celda.tocan === 0) {
          // Sin ocurrencia no hay casilla; la del día que aún no llega se ve, pero
          // no se palomea (marcar mañana como hecho no querría decir nada).
          return (
            <span
              key={columnas[i].columna.clave}
              className={`mx-auto h-4 w-4 rounded border ${celda.futuras > 0 ? 'border-white/15' : 'border-white/5'}`}
            />
          )
        }
        const hecha = celda.hechas >= celda.tocan
        return (
          <button
            key={columnas[i].columna.clave}
            type="button"
            onClick={() => onToggle(fila.rutina, iso)}
            title={t('cal.marcarHecho', 'Marcar como hecho')}
            className={`mx-auto grid h-4 w-4 place-items-center rounded border text-[9px] transition ${
              hecha ? 'border-emerald-400 bg-emerald-500/30 text-emerald-400' : 'border-white/25 hover:border-white/60'
            }`}
          >
            {hecha ? '✓' : ''}
          </button>
        )
      })}
    </div>
  )
}
