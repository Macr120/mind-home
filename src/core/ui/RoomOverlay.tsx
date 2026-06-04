import { useHouse } from '../state/houseStore'
import { getRoom } from '../registry'

/**
 * Cuando hay un cuarto activo, dibuja su mini-app 2D a pantalla completa
 * por encima de la casa, con cabecera y botón para volver.
 */
export function RoomOverlay() {
  const activeRoom = useHouse((s) => s.activeRoom)
  const closeRoom = useHouse((s) => s.closeRoom)
  if (!activeRoom) return null

  const room = getRoom(activeRoom)
  if (!room) return null

  const { App } = room

  return (
    <div className="absolute inset-0 z-20 flex flex-col bg-[#0f1115]">
      <header
        className="flex items-center gap-3 px-4 py-3 border-b border-white/10"
        style={{ borderTopColor: room.color }}
      >
        <button
          onClick={closeRoom}
          className="rounded-lg px-3 py-1.5 text-sm font-semibold bg-white/10 hover:bg-white/20 transition"
        >
          ‹ Volver a la casa
        </button>
        <h1 className="text-lg font-bold" style={{ color: room.color }}>
          {room.nombre}
        </h1>
        <span className="ml-auto text-xs uppercase tracking-wide text-white/40">
          {room.categoria}
        </span>
      </header>
      <main className="flex-1 overflow-auto p-4 md:p-6">
        <App />
      </main>
    </div>
  )
}
