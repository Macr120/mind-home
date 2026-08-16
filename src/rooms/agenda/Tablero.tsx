import type { EventoAgenda } from '../../core/data/db'
import { deIso } from '../../core/fechaLocal'
import { localeActual, useT } from '../../core/i18n/useT'
import { Icono } from '../../core/ui/iconos/Icono'
import { vivo } from '../../core/ui/estilos'
import { useArrastre, type PropsArrastre } from './arrastre'
import { COLOR_AREA, PRIORIDADES } from './constantes'
import { columnaDe, moverEnTablero, type ColumnaTablero } from './crear'

/**
 * Tablero Kanban de Trabajo. No es otro modelo de datos: es una VISTA de los
 * mismos `EventoAgenda` (pendientes sin fecha y eventos agendados juntos), y la
 * columna sale de `hecho` + `enCurso`. Por eso palomear en la lista mueve la
 * tarjeta aquí, y soltarla en «Hecho» palomea también su bloque del calendario.
 *
 * La tarjeta se levanta manteniéndola pulsada (el gesto compartido de
 * `arrastre.tsx`, que deja vivos sus botones) y solo cae DENTRO del tablero: si
 * el dedo no está sobre una columna, no hay destino y la tarjeta se queda donde
 * estaba. Las flechas ‹ › siguen ahí porque el tablero hace scroll horizontal en
 * el teléfono y la columna de destino puede no estar a la vista.
 */

const COLUMNAS: { id: ColumnaTablero; es: string; color: string }[] = [
  { id: 'porhacer', es: 'Por hacer', color: '#94a3b8' },
  { id: 'encurso', es: 'En curso', color: COLOR_AREA.trabajo },
  { id: 'hecho', es: 'Hecho', color: '#34d399' },
]

export function Tablero({
  eventos,
  onEditar,
}: {
  eventos: EventoAgenda[]
  onEditar: (ev: EventoAgenda) => void
}) {
  const t = useT()

  // Lo urgente arriba: por prioridad y, a igual prioridad, por fecha.
  const deColumna = (id: ColumnaTablero) =>
    eventos
      .filter((e) => columnaDe(e) === id)
      .sort(
        (a, b) =>
          (a.prioridad ?? 2) - (b.prioridad ?? 2) || (a.fecha ?? '9999').localeCompare(b.fecha ?? '9999'),
      )

  const suyo = (clave: string) => eventos.find((e) => String(e.id) === clave)

  const { props, enMano, destino } = useArrastre<ColumnaTablero>(
    (e, clave) => {
      const ev = suyo(clave)
      const col = document
        .elementFromPoint(e.clientX, e.clientY)
        ?.closest('[data-columna]')
        ?.getAttribute('data-columna') as ColumnaTablero | undefined
      // Fuera del tablero, o en la columna de la que salió, no hay nada que hacer.
      return ev && col && col !== columnaDe(ev) ? col : null
    },
    (clave, col) => {
      const ev = suyo(clave)
      if (ev) void moverEnTablero(ev, col)
    },
  )

  return (
    <div className="flex gap-2 overflow-x-auto pb-2">
      {COLUMNAS.map((col, i) => {
        const filas = deColumna(col.id)
        return (
          <div
            key={col.id}
            data-tut={`agenda.tablero.${col.id}`}
            data-columna={col.id}
            className={`flex min-w-[190px] flex-1 flex-col gap-2 rounded-xl border border-white/10 bg-white/5 p-2 ${
              destino === col.id ? 'ring-2 ring-emerald-400/70' : ''
            }`}
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
                  enMano={enMano === String(ev.id)}
                  hayAntes={i > 0}
                  hayDespues={i < COLUMNAS.length - 1}
                  arrastre={props(String(ev.id))}
                  onMover={(paso) => void moverEnTablero(ev, COLUMNAS[i + paso].id)}
                  onEditar={() => onEditar(ev)}
                />
              ))
            )}
          </div>
        )
      })}
    </div>
  )
}

/** Tarjeta compacta: cabe en una columna estrecha y se arrastra entera. */
function TarjetaTablero({
  ev,
  enMano,
  hayAntes,
  hayDespues,
  arrastre,
  onMover,
  onEditar,
}: {
  ev: EventoAgenda
  enMano: boolean
  hayAntes: boolean
  hayDespues: boolean
  arrastre: PropsArrastre
  onMover: (paso: -1 | 1) => void
  onEditar: () => void
}) {
  const t = useT()
  const prioridad = PRIORIDADES.find((p) => p.valor === (ev.prioridad ?? 2))
  const cuando = ev.fecha
    ? deIso(ev.fecha).toLocaleDateString(localeActual(), { day: 'numeric', month: 'short' })
    : null

  return (
    <div
      {...arrastre}
      className={`cursor-grab rounded-lg border border-white/10 bg-black/20 p-2 ${enMano ? 'opacity-40' : ''}`}
    >
      <button type="button" onClick={onEditar} className="w-full text-start">
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
