import { rooms, getRoom } from '../registry'
import { useLayout, roomWorldPos } from '../state/layoutStore'
import { useCam } from '../state/cameraStore'
import { useDiseño } from '../state/disenoStore'
import { ObjetosTab } from '../../rooms/diseno/ObjetosTab'
import { ColorPicker } from '../../rooms/diseno/ColorPicker'
import { WallEditor } from './WallEditor'

/**
 * Modo edición.
 * - Sin cuarto seleccionado: mover cuartos (drag) + recursos del mapa (piso),
 *   sin zoom.
 * - Con cuarto (engrane ⚙️): edita paredes y objetos de ese cuarto, con zoom.
 */
export function EditPanel() {
  const editMode = useLayout((s) => s.editMode)
  const editingRoomId = useLayout((s) => s.editingRoomId)
  const editRoom = useLayout((s) => s.editRoom)
  const setEditMode = useLayout((s) => s.setEditMode)
  const toggleRoom = useLayout((s) => s.toggleRoom)
  const placed = useLayout((s) => s.placed)
  const focusRoom = useCam((s) => s.focusRoom)
  const roomColors = useDiseño((s) => s.roomColors)
  const roomNames = useDiseño((s) => s.roomNames)
  const setRoomColor = useDiseño((s) => s.setRoomColor)

  const editar = (id: string | null) => {
    editRoom(id)
    if (id) focusRoom(roomWorldPos(id))
  }

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

  const room = editingRoomId ? getRoom(editingRoomId) : null
  const color = room ? roomColors[room.id] ?? room.color : '#94a3b8'
  const nombre = room ? roomNames[room.id] || room.nombre : ''
  const floorColor = roomColors['__piso__'] ?? '#0c0e13'

  const quitarDelMapa = () => {
    if (!room) return
    toggleRoom(room.id)
    const otro = rooms.find((r) => r.id !== room.id && placed[r.id])
    editar(otro ? otro.id : null)
  }

  return (
    <div className="absolute right-0 top-0 z-20 flex h-full w-80 flex-col border-l border-white/10 bg-[#12151c]/95 backdrop-blur-sm">
      <header className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
        <span className="truncate text-base font-black" style={{ color }}>
          ✏️ {room ? nombre.split(' · ')[0] : 'Editar mapa'}
        </span>
        <button
          onClick={() => setEditMode(false)}
          className="ml-auto rounded-lg bg-emerald-400 px-3 py-1.5 text-xs font-bold text-black transition hover:bg-emerald-300"
        >
          ✓ Listo
        </button>
      </header>

      <p className="border-b border-white/10 px-4 py-2 text-[11px] leading-snug text-white/45">
        {room ? (
          <>Edita paredes y objetos del cuarto.</>
        ) : (
          <>
            <b className="text-white/65">Arrastra los cuartos</b> para moverlos, o
            usa el <b className="text-white/65">⚙️</b> de un cuarto para editarlo.
          </>
        )}
      </p>

      <div className="scroll-sutil min-h-0 flex-1 space-y-4 overflow-y-auto p-3">
        {room ? (
          <>
            <div className="rounded-xl border border-white/10 bg-white/5 p-3">
              <WallEditor roomId={room.id} />
            </div>
            <ObjetosTab roomId={editingRoomId ?? undefined} onRoomChange={editar} />
          </>
        ) : (
          <div className="rounded-xl border border-white/10 bg-white/5 p-3">
            <p className="mb-3 text-sm font-semibold">Piso de la casa</p>
            <ColorPicker
              value={floorColor}
              onChange={(c) => setRoomColor('__piso__', c)}
            />
          </div>
        )}
      </div>

      {room && (
        <div className="border-t border-white/10 p-3">
          <button
            onClick={quitarDelMapa}
            className="w-full rounded-lg border border-red-400/30 bg-red-400/10 py-2 text-sm font-semibold text-red-400 transition hover:bg-red-400/20"
          >
            Quitar del mapa
          </button>
        </div>
      )}
    </div>
  )
}
