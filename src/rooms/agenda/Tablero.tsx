import { useState } from 'react'
import type { EventoAgenda, ProyectoAgenda } from '../../core/data/db'
import { deIso } from '../../core/fechaLocal'
import { localeActual, useT } from '../../core/i18n/useT'
import { Icono } from '../../core/ui/iconos/Icono'
import { vivo } from '../../core/ui/estilos'
import { COLOR_AREA, PRIORIDADES } from './constantes'
import { columnaDe, moverEnTablero, type ColumnaTablero } from './crear'

/**
 * Tablero Kanban de Trabajo. No es otro modelo de datos: es una VISTA de los
 * mismos `EventoAgenda` (pendientes sin fecha y eventos agendados juntos), y la
 * columna sale de `hecho` + `enCurso`. Por eso palomear en la lista mueve la
 * tarjeta aquí, y soltarla en «Hecho» palomea también su bloque del calendario.
 *
 * Las tarjetas se mueven con las flechas ‹ › en vez de arrastrando: en el
 * teléfono —que es donde se usa la casa— arrastrar entre columnas que además
 * hacen scroll horizontal pelea con el propio scroll.
 */

const COLUMNAS: { id: ColumnaTablero; es: string; color: string }[] = [
  { id: 'porhacer', es: 'Por hacer', color: '#94a3b8' },
  { id: 'encurso', es: 'En curso', color: COLOR_AREA.trabajo },
  { id: 'hecho', es: 'Hecho', color: '#34d399' },
]

export function Tablero({
  eventos,
  proyectos,
  onEditar,
}: {
  eventos: EventoAgenda[]
  proyectos: ProyectoAgenda[]
  onEditar: (ev: EventoAgenda) => void
}) {
  const t = useT()
  const [filtro, setFiltro] = useState('')

  const visibles = filtro ? eventos.filter((e) => e.proyectoId === filtro) : eventos
  // Lo urgente arriba: por prioridad y, a igual prioridad, por fecha.
  const deColumna = (id: ColumnaTablero) =>
    visibles
      .filter((e) => columnaDe(e) === id)
      .sort(
        (a, b) =>
          (a.prioridad ?? 2) - (b.prioridad ?? 2) || (a.fecha ?? '9999').localeCompare(b.fecha ?? '9999'),
      )

  return (
    <div className="space-y-2">
      {proyectos.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          <ChipFiltro activo={!filtro} color={COLOR_AREA.trabajo} onClick={() => setFiltro('')}>
            {t('agenda.tablero.todos', 'Todos')}
          </ChipFiltro>
          {proyectos.map((p) => (
            <ChipFiltro
              key={p.proyId}
              activo={filtro === p.proyId}
              color={p.color ?? COLOR_AREA.trabajo}
              onClick={() => setFiltro(filtro === p.proyId ? '' : p.proyId)}
            >
              {p.nombre}
            </ChipFiltro>
          ))}
        </div>
      )}

      <div className="flex gap-2 overflow-x-auto pb-2">
        {COLUMNAS.map((col, i) => {
          const filas = deColumna(col.id)
          return (
            <div
              key={col.id}
              data-tut={`agenda.tablero.${col.id}`}
              className="flex min-w-[190px] flex-1 flex-col gap-2 rounded-xl border border-white/10 bg-white/5 p-2"
            >
              <div className="flex items-center gap-1.5 px-0.5">
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: col.color }} />
                <span className="min-w-0 flex-1 truncate text-xs font-bold">
                  {t(`agenda.tablero.${col.id}`, col.es)}
                </span>
                <span className="rounded-full bg-white/10 px-1.5 text-[10px] font-semibold text-white/50">
                  {filas.length}
                </span>
              </div>

              {filas.length === 0 ? (
                <p className="py-3 text-center text-[11px] text-white/25">
                  {t('agenda.tablero.columnaVacia', 'Nada aquí')}
                </p>
              ) : (
                filas.map((ev) => (
                  <TarjetaTablero
                    key={ev.id}
                    ev={ev}
                    proyectos={proyectos}
                    hayAntes={i > 0}
                    hayDespues={i < COLUMNAS.length - 1}
                    onMover={(paso) => void moverEnTablero(ev, COLUMNAS[i + paso].id)}
                    onEditar={() => onEditar(ev)}
                  />
                ))
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function ChipFiltro({
  activo,
  color,
  onClick,
  children,
}: {
  activo: boolean
  color: string
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition ${
        activo ? 'texto-cta' : 'bg-white/5 text-white/50 hover:bg-white/10'
      }`}
      style={activo ? { background: color } : undefined}
    >
      {children}
    </button>
  )
}

/** Tarjeta compacta: cabe en una columna estrecha y se mueve con las flechas. */
function TarjetaTablero({
  ev,
  proyectos,
  hayAntes,
  hayDespues,
  onMover,
  onEditar,
}: {
  ev: EventoAgenda
  proyectos: ProyectoAgenda[]
  hayAntes: boolean
  hayDespues: boolean
  onMover: (paso: -1 | 1) => void
  onEditar: () => void
}) {
  const t = useT()
  const proyecto = proyectos.find((p) => p.proyId === ev.proyectoId)
  const prioridad = PRIORIDADES.find((p) => p.valor === (ev.prioridad ?? 2))
  const cuando = ev.fecha
    ? deIso(ev.fecha).toLocaleDateString(localeActual(), { day: 'numeric', month: 'short' })
    : null

  return (
    <div className="rounded-lg border border-white/10 bg-black/20 p-2">
      <button type="button" onClick={onEditar} className="w-full text-left">
        <p className={`text-xs font-semibold leading-snug ${ev.hecho ? 'text-white/40 line-through' : ''}`}>
          {ev.titulo}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[10px] text-white/45">
          {cuando && (
            <span>
              {cuando}
              {ev.hora ? ` · ${ev.hora}` : ''}
            </span>
          )}
          {!ev.fecha && prioridad && prioridad.valor !== 2 && (
            <span className="texto-vivo" style={vivo(prioridad.color)}>
              {t(prioridad.clave, prioridad.es)}
            </span>
          )}
          {proyecto && (
            <span
              className="truncate rounded-full px-1.5 py-0.5 font-semibold"
              style={{ background: `${proyecto.color ?? '#6366f1'}33` }}
            >
              {proyecto.nombre}
            </span>
          )}
        </div>
      </button>

      <div className="mt-1.5 flex items-center justify-between">
        <BotonMover
          visible={hayAntes}
          icono="izquierda"
          etiqueta={t('agenda.tablero.atras', 'Mover a la columna anterior')}
          onClick={() => onMover(-1)}
        />
        <BotonMover
          visible={hayDespues}
          icono="derecha"
          etiqueta={t('agenda.tablero.adelante', 'Mover a la siguiente columna')}
          onClick={() => onMover(1)}
        />
      </div>
    </div>
  )
}

function BotonMover({
  visible,
  icono,
  etiqueta,
  onClick,
}: {
  visible: boolean
  icono: 'izquierda' | 'derecha'
  etiqueta: string
  onClick: () => void
}) {
  if (!visible) return <span />
  return (
    <button
      type="button"
      onClick={onClick}
      title={etiqueta}
      aria-label={etiqueta}
      className="rounded-md px-2 py-0.5 text-white/35 transition hover:bg-white/10 hover:text-white/80"
    >
      <Icono nombre={icono} />
    </button>
  )
}
