import type { Viaje } from '../../core/data/db'
import { Estrellas } from './Estrellas'
import { COLOR, getEstado, getTipo } from './constantes'
import { diasEntre, dinero, formatearRango } from './fecha'

export function TarjetaViaje({
  viaje,
  gastado,
  onAbrir,
  onEliminar,
}: {
  viaje: Viaje
  gastado?: number
  onAbrir: () => void
  onEliminar: () => void
}) {
  const estado = getEstado(viaje.estado)
  const tipo = getTipo(viaje.tipoViaje)
  const dias = diasEntre(viaje.fechaInicio, viaje.fechaFin)
  const pct =
    viaje.presupuesto > 0 && gastado !== undefined
      ? Math.min(100, (gastado / viaje.presupuesto) * 100)
      : 0

  return (
    <article
      className="rounded-xl border border-white/10 bg-white/5 overflow-hidden cursor-pointer hover:bg-white/[0.07] transition"
      style={{ borderLeftColor: COLOR, borderLeftWidth: 3 }}
      onClick={onAbrir}
      onKeyDown={(e) => e.key === 'Enter' && onAbrir()}
      role="button"
      tabIndex={0}
    >
      <div className="p-3.5">
        <div className="flex items-start gap-2">
          <span className="text-2xl">{tipo.icon}</span>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-white/95">{viaje.titulo}</h3>
            <p className="text-sm text-white/55">
              {viaje.destino}, {viaje.pais}
            </p>
            <p className="text-xs text-white/40 mt-1">{formatearRango(viaje.fechaInicio, viaje.fechaFin)} · {dias} días</p>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onEliminar()
            }}
            className="text-white/30 hover:text-red-400 text-lg px-1"
            aria-label="Eliminar"
          >
            ×
          </button>
        </div>

        <div className="mt-2 flex flex-wrap gap-1.5 text-[10px]">
          <span className="rounded-md bg-teal-500/25 px-2 py-0.5 font-semibold text-teal-100">
            {estado.icon} {estado.label}
          </span>
          {viaje.presupuesto > 0 && (
            <span className="rounded-md bg-white/10 px-2 py-0.5 text-white/60">
              {dinero(viaje.presupuesto)}
            </span>
          )}
        </div>

        {gastado !== undefined && viaje.presupuesto > 0 && (
          <div className="mt-2">
            <div className="h-1.5 rounded-full bg-black/40 overflow-hidden">
              <div
                className="h-full rounded-full bg-teal-400"
                style={{
                  width: `${pct}%`,
                  background: pct > 100 ? '#ef4444' : COLOR,
                }}
              />
            </div>
            <p className="text-[10px] text-white/40 mt-0.5">
              Gastado {dinero(gastado)} ({Math.round(pct)}%)
            </p>
          </div>
        )}

        {viaje.calificacion > 0 && (
          <div className="mt-2" onClick={(e) => e.stopPropagation()}>
            <Estrellas valor={viaje.calificacion} soloLectura />
          </div>
        )}
      </div>
    </article>
  )
}
