import { rooms, type RoomModule } from '../registry'
import { useHouse } from '../state/houseStore'
import { useCam } from '../state/cameraStore'

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

  const irACuarto = (room: RoomModule) => {
    focusRoom(room.posicion)
    useHouse.setState({ selectedRoomId: room.id })
  }

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
          <b className="text-white/70">Ir</b> acerca la cámara al cuarto ·{' '}
          <b className="text-white/70">Entrar</b> abre su app. Muévete con
          WASD/flechas o el pad.
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 py-3">
        {CATEGORIAS.map(({ key, label }) => {
          const grupo = rooms.filter((r) => r.categoria === key)
          if (grupo.length === 0) return null
          return (
            <section key={key} className="mb-4">
              <h2 className="mb-1.5 px-2 text-[10px] font-bold uppercase tracking-wider text-white/30">
                {label}
              </h2>
              <ul className="flex flex-col gap-1.5">
                {grupo.map((room) => {
                  const activo = selectedRoomId === room.id
                  return (
                    <li
                      key={room.id}
                      className="rounded-lg border transition"
                      style={{
                        borderColor: activo
                          ? room.color
                          : 'rgba(255,255,255,0.06)',
                        background: activo
                          ? `${room.color}1f`
                          : 'rgba(255,255,255,0.02)',
                      }}
                    >
                      {/* Encabezado del cuarto */}
                      <div className="flex items-center gap-2.5 px-2.5 pt-2">
                        <span
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-lg"
                          style={{
                            background: activo
                              ? `${room.color}44`
                              : 'rgba(255,255,255,0.06)',
                          }}
                        >
                          {room.icon}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold text-white/90">
                            {room.nombre.split(' · ')[0]}
                          </span>
                          {room.nombre.includes(' · ') && (
                            <span className="block truncate text-[10px] text-white/40">
                              {room.nombre.split(' · ')[1]}
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
                          style={{ background: room.color, color: '#0f1115' }}
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
      </div>
    </aside>
  )
}
