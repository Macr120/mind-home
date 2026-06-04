import type { MediaArchivo } from '../../core/data/db'
import { COLOR, getEstadoMedia, getTipoMedia } from './constantes'
import { Estrellas } from './Estrellas'
import { formatearFecha } from './fecha'

export function TarjetaMedia({
  item,
  onEditar,
  onEliminar,
}: {
  item: MediaArchivo
  onEditar: () => void
  onEliminar: () => void
}) {
  const tipo = getTipoMedia(item.tipo)
  const estado = getEstadoMedia(item.estado)

  return (
    <article
      className="rounded-xl border border-white/10 bg-white/5 overflow-hidden"
      style={{ borderLeftColor: COLOR, borderLeftWidth: 3 }}
    >
      <div className="p-3.5">
        <div className="flex items-start gap-2">
          <span className="text-2xl shrink-0">{tipo.icon}</span>
          <div className="min-w-0 flex-1">
            <h3 className="font-bold text-white/95 leading-snug">{item.titulo}</h3>
            {item.autor && <p className="text-xs text-white/45 mt-0.5">{item.autor}</p>}
            <div className="mt-1.5 flex flex-wrap gap-1.5 text-[10px]">
              <span
                className="rounded-md px-2 py-0.5 font-semibold"
                style={{ background: `${COLOR}33`, color: COLOR }}
              >
                {item.genero}
              </span>
              <span className="rounded-md bg-white/10 px-2 py-0.5 text-white/55">
                {formatearFecha(item.fecha)}
              </span>
              <span className="rounded-md bg-white/10 px-2 py-0.5 text-white/55">
                {estado.label}
              </span>
            </div>
          </div>
          {item.calificacion > 0 && <Estrellas valor={item.calificacion} soloLectura />}
        </div>

        {item.resena && (
          <p className="mt-3 text-sm text-white/70 leading-relaxed line-clamp-4">{item.resena}</p>
        )}

        <div className="mt-3 flex gap-2">
          <button type="button" onClick={onEditar} className="text-xs font-semibold hover:underline" style={{ color: COLOR }}>
            Editar
          </button>
          <button type="button" onClick={onEliminar} className="text-xs text-white/35 hover:text-red-400">
            Eliminar
          </button>
        </div>
      </div>
    </article>
  )
}
