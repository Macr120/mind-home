import { rooms } from '../registry'
import { useLayout } from '../state/layoutStore'
import { useDiseño } from '../state/disenoStore'

/**
 * Modo edición del mapa (Fase 1): botón para entrar/salir + panel para
 * agregar/quitar cuartos. El mapa puede quedar vacío, con todos, o un subconjunto.
 */
export function EditPanel() {
  const editMode = useLayout((s) => s.editMode)
  const setEditMode = useLayout((s) => s.setEditMode)

  if (!editMode) {
    return (
      <button
        type="button"
        onClick={() => setEditMode(true)}
        className="absolute right-4 top-4 z-10 rounded-lg border border-white/10 bg-black/50 px-3 py-2 text-sm font-semibold text-white/85 backdrop-blur-sm transition hover:bg-white/15"
        title="Editar el mapa de la casa"
      >
        ✏️ Editar mapa
      </button>
    )
  }

  return <PanelEdicion onClose={() => setEditMode(false)} />
}

function PanelEdicion({ onClose }: { onClose: () => void }) {
  const placed = useLayout((s) => s.placed)
  const toggleRoom = useLayout((s) => s.toggleRoom)
  const setAll = useLayout((s) => s.setAll)
  const roomColors = useDiseño((s) => s.roomColors)
  const roomNames = useDiseño((s) => s.roomNames)

  const total = rooms.filter((r) => placed[r.id]).length

  return (
    <div className="absolute right-0 top-0 z-20 flex h-full w-72 flex-col border-l border-white/10 bg-[#12151c]/95 backdrop-blur-sm">
      <header className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
        <span className="text-base font-black text-white/90">✏️ Editar mapa</span>
        <button
          onClick={onClose}
          className="ml-auto rounded-lg bg-emerald-400 px-3 py-1.5 text-xs font-bold text-black transition hover:bg-emerald-300"
        >
          ✓ Listo
        </button>
      </header>

      <div className="border-b border-white/10 px-4 py-3">
        <p className="text-[11px] leading-snug text-white/45">
          Activa los cuartos que quieres en tu casa. El mapa puede estar vacío,
          con todos, o solo los que elijas.{' '}
          <b className="text-white/65">Arrastra un cuarto</b> en el mapa para
          moverlo a otra celda.
        </p>
        <div className="mt-2 flex gap-2">
          <button
            onClick={() => setAll(true)}
            className="flex-1 rounded-lg bg-white/10 py-1.5 text-xs font-semibold transition hover:bg-white/20"
          >
            Todos
          </button>
          <button
            onClick={() => setAll(false)}
            className="flex-1 rounded-lg bg-white/10 py-1.5 text-xs font-semibold transition hover:bg-white/20"
          >
            Vaciar
          </button>
        </div>
        <p className="mt-2 text-center text-[11px] text-white/40">
          {total} / {rooms.length} cuartos en el mapa
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
        {rooms.map((room) => {
          const on = placed[room.id]
          const color = roomColors[room.id] ?? room.color
          const nombre = roomNames[room.id] || room.nombre
          return (
            <button
              key={room.id}
              onClick={() => toggleRoom(room.id)}
              className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition hover:bg-white/5"
            >
              <span
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-lg"
                style={{ background: on ? `${color}44` : 'rgba(255,255,255,0.05)' }}
              >
                {room.icon}
              </span>
              <span className="min-w-0 flex-1 truncate text-sm text-white/85">
                {nombre.split(' · ')[0]}
              </span>
              {/* Interruptor */}
              <span
                className="relative h-5 w-9 shrink-0 rounded-full transition"
                style={{ background: on ? color : 'rgba(255,255,255,0.15)' }}
              >
                <span
                  className="absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all"
                  style={{ left: on ? '18px' : '2px' }}
                />
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
