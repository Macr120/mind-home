import { useState } from 'react'
import { rooms, DESCRIPCIONES, type RoomModule } from '../registry'
import { useHouse } from '../state/houseStore'
import { useCam } from '../state/cameraStore'
import { useDiseño } from '../state/disenoStore'
import { useLayout, roomWorldPos } from '../state/layoutStore'

const CATEGORIAS: { key: RoomModule['categoria']; label: string }[] = [
  { key: 'cuerpo', label: 'Cuerpo' },
  { key: 'mente', label: 'Mente' },
  { key: 'complemento', label: 'Complemento' },
  { key: 'config', label: 'Configuración' },
]

export function RoomSideMenu() {
  const selectedRoomId = useHouse((s) => s.selectedRoomId)
  const openRoom = useHouse((s) => s.openRoom)
  const focusRoom = useCam((s) => s.focusRoom)
  const roomColors = useDiseño((s) => s.roomColors)
  const roomNames = useDiseño((s) => s.roomNames)
  const placed = useLayout((s) => s.placed)
  const editRoom = useLayout((s) => s.editRoom)
  const [mostrarAgregar, setMostrarAgregar] = useState(false)

  const irACuarto = (room: RoomModule) => {
    focusRoom(roomWorldPos(room.id))
    useHouse.setState({ selectedRoomId: room.id })
  }

  /** Engrane: edita el cuarto específico (zoom + panel de objetos). */
  const editarCuarto = (room: RoomModule) => {
    focusRoom(roomWorldPos(room.id))
    editRoom(room.id)
  }

  const disponibles = rooms.filter((r) => !placed[r.id])

  return (
    <aside
      className="flex h-full min-h-0 w-60 shrink-0 flex-col border-r border-white/10 bg-[#12151c]"
      aria-label="Menú de cuartos"
    >
      <div className="border-b border-white/10 px-4 py-4">
        <h1 className="text-lg font-black tracking-tight text-white/90">
          🏠 Mind Home
        </h1>
        <p className="mt-1 text-[11px] leading-snug text-white/45">
          <b className="text-white/70">Ir</b> acerca la cámara ·{' '}
          <b className="text-white/70">Entrar</b> abre la app ·{' '}
          <b className="text-white/70">⚙️</b> edita el cuarto.
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 py-3">
        {CATEGORIAS.map(({ key, label }) => {
          const grupo = rooms.filter(
            (r) => r.categoria === key && placed[r.id],
          )
          if (grupo.length === 0) return null
          return (
            <section key={key} className="mb-4">
              <h2 className="mb-1.5 px-2 text-[10px] font-bold uppercase tracking-wider text-white/30">
                {label}
              </h2>
              <ul className="flex flex-col gap-1.5">
                {grupo.map((room) => {
                  const activo = selectedRoomId === room.id
                  const color = roomColors[room.id] ?? room.color
                  const nombre = roomNames[room.id] || room.nombre
                  return (
                    <li
                      key={room.id}
                      className="relative rounded-lg border transition"
                      style={{
                        borderColor: activo ? color : 'rgba(255,255,255,0.06)',
                        background: activo ? `${color}1f` : 'rgba(255,255,255,0.02)',
                      }}
                    >
                      {/* Engrane de edición (esquina superior derecha) */}
                      <button
                        type="button"
                        onClick={() => editarCuarto(room)}
                        title="Editar este cuarto"
                        className="absolute right-1.5 top-1.5 z-10 flex h-6 w-6 items-center justify-center rounded-md text-sm text-white/40 transition hover:bg-white/10 hover:text-white/90"
                      >
                        ⚙️
                      </button>

                      {/* Encabezado del cuarto */}
                      <div className="flex items-center gap-2.5 px-2.5 pt-2 pr-8">
                        <span
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-lg"
                          style={{
                            background: activo ? `${color}44` : 'rgba(255,255,255,0.06)',
                          }}
                        >
                          {room.icon}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold text-white/90">
                            {nombre.split(' · ')[0]}
                          </span>
                          {nombre.includes(' · ') && (
                            <span className="block truncate text-[10px] text-white/40">
                              {nombre.split(' · ')[1]}
                            </span>
                          )}
                        </span>
                      </div>

                      {/* Dos acciones */}
                      <div className="flex gap-1.5 px-2 pb-2 pt-2">
                        <button
                          type="button"
                          onClick={() => irACuarto(room)}
                          className="flex-1 rounded-md border border-white/10 bg-white/5 py-1.5 text-xs font-semibold text-white/75 transition hover:bg-white/10"
                        >
                          📍 Ir
                        </button>
                        <button
                          type="button"
                          onClick={() => openRoom(room.id)}
                          className="flex-1 rounded-md py-1.5 text-xs font-bold transition hover:brightness-110"
                          style={{ background: color, color: '#0f1115' }}
                        >
                          Entrar ›
                        </button>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </section>
          )
        })}

        {/* Agregar cuarto nuevo */}
        <button
          type="button"
          onClick={() => setMostrarAgregar((v) => !v)}
          className="mt-1 flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-white/15 py-2.5 text-sm font-semibold text-white/60 transition hover:border-white/30 hover:text-white/90"
        >
          ➕ Agregar cuarto {disponibles.length > 0 && `(${disponibles.length})`}
        </button>

        {mostrarAgregar && (
          <div className="mt-2 space-y-2">
            {disponibles.length === 0 && (
              <p className="px-2 py-3 text-center text-xs text-white/40">
                Todos los cuartos ya están en tu casa.
              </p>
            )}
            {disponibles.map((room) => (
              <CuartoDisponible key={room.id} room={room} />
            ))}
          </div>
        )}
      </div>
    </aside>
  )
}

/** Tarjeta de un cuarto disponible (no colocado) con descripción y botón. */
function CuartoDisponible({ room }: { room: RoomModule }) {
  const toggleRoom = useLayout((s) => s.toggleRoom)
  const focusRoom = useCam((s) => s.focusRoom)

  const agregar = async () => {
    await toggleRoom(room.id) // lo coloca en el mapa
    focusRoom(roomWorldPos(room.id))
  }

  return (
    <div
      className="rounded-lg border p-2.5"
      style={{ borderColor: `${room.color}44`, background: `${room.color}10` }}
    >
      <div className="flex items-center gap-2">
        <span
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-base"
          style={{ background: `${room.color}33` }}
        >
          {room.icon}
        </span>
        <span className="truncate text-sm font-semibold text-white/90">
          {room.nombre.split(' · ')[0]}
        </span>
      </div>
      <p className="mt-1.5 text-[11px] leading-snug text-white/50">
        {DESCRIPCIONES[room.id] ?? ''}
      </p>
      <button
        type="button"
        onClick={agregar}
        className="mt-2 w-full rounded-md py-1.5 text-xs font-bold text-black transition hover:brightness-110"
        style={{ background: room.color }}
      >
        Agregar a la casa
      </button>
    </div>
  )
}
