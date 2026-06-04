import type { JuegoMesa } from '../../core/data/db'
import { juegosMesaRepo } from '../../core/data/repository'
import { COLOR, getCategoriaMesa, getEstadoMesa } from './constantes'
import { Estrellas } from './Estrellas'
import { formatearFecha, hoyISO } from './fecha'

export function TarjetaJuegoMesa({
  item,
  onEditar,
  onEliminar,
}: {
  item: JuegoMesa
  onEditar: () => void
  onEliminar: () => void
}) {
  const cat = getCategoriaMesa(item.categoria)
  const estado = getEstadoMesa(item.estado)
  const jugadores =
    item.jugadoresMin === item.jugadoresMax
      ? `${item.jugadoresMin}`
      : `${item.jugadoresMin}–${item.jugadoresMax}`

  const registrarPartida = async () => {
    if (!item.id) return
    await juegosMesaRepo.update(item.id, {
      vecesJugado: item.vecesJugado + 1,
      ultimaPartida: hoyISO(),
    })
  }

  return (
    <article
      className="rounded-xl border border-white/10 bg-white/5 p-3.5"
      style={{ borderLeftColor: COLOR, borderLeftWidth: 3 }}
    >
      <div className="flex items-start gap-2">
        <span className="text-2xl">{cat.icon}</span>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-white/95">{item.nombre}</h3>
          {item.editorial && <p className="text-xs text-white/45">{item.editorial}</p>}
          <div className="mt-1.5 flex flex-wrap gap-1.5 text-[10px]">
            <span className="rounded-md px-2 py-0.5 font-semibold" style={{ background: `${COLOR}33`, color: COLOR }}>
              {cat.label}
            </span>
            <span className="rounded-md bg-white/10 px-2 py-0.5 text-white/55">
              👥 {jugadores} jug.
            </span>
            {item.duracionMin != null && (
              <span className="rounded-md bg-white/10 px-2 py-0.5 text-white/55">
                ⏱ {item.duracionMin} min
              </span>
            )}
            <span className="rounded-md bg-white/10 px-2 py-0.5 text-white/55">{estado.label}</span>
          </div>
        </div>
        {item.calificacion > 0 && <Estrellas valor={item.calificacion} soloLectura />}
      </div>

      <p className="mt-2 text-xs text-white/50">
        Jugado {item.vecesJugado} {item.vecesJugado === 1 ? 'vez' : 'veces'}
        {item.ultimaPartida && ` · Última: ${formatearFecha(item.ultimaPartida)}`}
      </p>

      {item.notas && <p className="mt-2 text-sm text-white/65 line-clamp-3">{item.notas}</p>}

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void registrarPartida()}
          className="rounded-lg px-2.5 py-1 text-xs font-bold text-black"
          style={{ background: COLOR }}
        >
          +1 partida hoy
        </button>
        <button type="button" onClick={onEditar} className="text-xs font-semibold hover:underline" style={{ color: COLOR }}>
          Editar
        </button>
        <button type="button" onClick={onEliminar} className="text-xs text-white/35 hover:text-red-400">
          Eliminar
        </button>
      </div>
    </article>
  )
}
