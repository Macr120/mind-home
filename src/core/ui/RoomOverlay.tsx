import { Suspense } from 'react'
import { useHouse } from '../state/houseStore'
import { getRoom } from '../registry'
import { useRoomVisual } from '../state/disenoStore'
import { ErrorBoundary } from './ErrorBoundary'

/**
 * Cuando hay un cuarto activo, dibuja su mini-app 2D a pantalla completa
 * por encima de la casa, con cabecera y botón para volver.
 */
export function RoomOverlay({ menuFlotante = false }: { menuFlotante?: boolean }) {
  const activeRoom = useHouse((s) => s.activeRoom)
  const closeRoom = useHouse((s) => s.closeRoom)
  const room = activeRoom ? getRoom(activeRoom) : null
  // Color/nombre efectivos (ligados con el menú y la casa). Hook antes de cualquier return.
  const { color, nombre } = useRoomVisual(
    room?.id ?? '',
    room?.color ?? '#94a3b8',
    room?.nombre ?? '',
  )
  if (!room) return null

  const { App } = room

  return (
    <div className="absolute inset-0 z-20 flex flex-col bg-[#0f1115]">
      <header
        className={`flex items-center gap-3 border-b border-white/10 py-3 pr-4 ${menuFlotante ? 'pl-52' : 'pl-4'}`}
        style={{ borderTopColor: color }}
      >
        <h1 className="min-w-0 truncate text-lg font-bold" style={{ color }}>
          {nombre}
        </h1>
        <span className="hidden shrink-0 text-xs uppercase tracking-wide text-white/40 sm:inline">
          {room.categoria}
        </span>
        <button
          type="button"
          onClick={closeRoom}
          className="ml-auto shrink-0 rounded-lg bg-white/10 px-3 py-1.5 text-sm font-semibold transition hover:bg-white/20"
        >
          ‹ Volver a la casa
        </button>
      </header>
      <main className="min-h-0 flex-1 overflow-auto p-4 md:p-6">
        <ErrorBoundary titulo={`Error en ${room.nombre}`}>
          <Suspense
            fallback={
              <div className="flex min-h-[40vh] items-center justify-center text-white/50">
                Cargando {room.nombre}…
              </div>
            }
          >
            <App />
          </Suspense>
        </ErrorBoundary>
      </main>
    </div>
  )
}
