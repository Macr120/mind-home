import { useAsistentes } from '../../state/asistentesStore'
import type { Asistente } from '../../chat/mascotas'
import { Icono } from '../iconos/Icono'

/**
 * Fila de asistentes para elegir uno: el rival de una carrera o de un partido,
 * el maquinista del tren… Estaba clonada en `CarreraOverlay` y en
 * `MarcadorCancha`; aquí vive una sola vez.
 */
export function SelectorAsistente({
  titulo,
  elegidoId,
  onElegir,
}: {
  titulo?: string
  /** Marca uno como puesto (el maquinista actual, p. ej.). */
  elegidoId?: string | null
  onElegir: (a: Asistente) => void
}) {
  const asistentes = useAsistentes((s) => s.lista)
  return (
    <>
      {titulo && <p className="text-center text-[11px] font-semibold text-white/50">{titulo}</p>}
      <div className="flex max-h-32 flex-wrap items-center justify-center gap-1.5 overflow-y-auto">
        {asistentes.map((a) => (
          <button
            key={a.id}
            type="button"
            onClick={() => onElegir(a)}
            className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold text-white transition active:scale-95 ${
              elegidoId === a.id
                ? 'border-sky-400/60 bg-sky-600'
                : 'border-white/10 bg-white/10 hover:bg-white/20'
            }`}
          >
            <Icono emoji={a.emoji} /> {a.nombre}
          </button>
        ))}
      </div>
    </>
  )
}
