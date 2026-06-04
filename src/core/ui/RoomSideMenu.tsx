import { rooms, type RoomModule } from '../registry'
import { useHouse } from '../state/houseStore'

const CATEGORIAS: { key: RoomModule['categoria']; label: string }[] = [
  { key: 'cuerpo', label: 'Cuerpo' },
  { key: 'mente', label: 'Mente' },
  { key: 'complemento', label: 'Complemento' },
  { key: 'config', label: 'Configuración' },
]

export function RoomSideMenu() {
  const selectedRoomId = useHouse((s) => s.selectedRoomId)
  const nearRoomId = useHouse((s) => s.nearRoomId)
  const canEnterSelected = useHouse((s) => s.canEnterSelected)
  const selectRoom = useHouse((s) => s.selectRoom)
  const tryEnterRoom = useHouse((s) => s.tryEnterRoom)

  const selected = rooms.find((r) => r.id === selectedRoomId)
  const puedeEntrar = Boolean(selected && canEnterSelected)

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
          Al elegir un cuarto, tu personaje camina hasta su puerta. Cuando llegue,
          pulsa Entrar.
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
              <ul className="flex flex-col gap-0.5">
                {grupo.map((room) => {
                  const activo = selectedRoomId === room.id
                  const enPuerta = nearRoomId === room.id
                  return (
                    <li key={room.id}>
                      <button
                        type="button"
                        onClick={() => selectRoom(room.id)}
                        aria-current={activo ? 'true' : undefined}
                        className="flex w-full items-center gap-2.5 rounded-lg border px-2.5 py-2 text-left text-sm transition"
                        style={{
                          borderColor: activo
                            ? room.color
                            : 'rgba(255,255,255,0.06)',
                          background: activo
                            ? `${room.color}28`
                            : 'transparent',
                          boxShadow: activo
                            ? `inset 3px 0 0 ${room.color}`
                            : 'none',
                        }}
                      >
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
                          <span className="block truncate font-semibold text-white/90">
                            {room.nombre.split(' · ')[0]}
                          </span>
                          {room.nombre.includes(' · ') && (
                            <span className="block truncate text-[10px] text-white/40">
                              {room.nombre.split(' · ')[1]}
                            </span>
                          )}
                        </span>
                        {enPuerta && (
                          <span
                            className="h-2 w-2 shrink-0 rounded-full"
                            style={{ background: room.color }}
                            title="En la puerta"
                          />
                        )}
                      </button>
                    </li>
                  )
                })}
              </ul>
            </section>
          )
        })}
      </div>

      {selected && (
        <div
          className="shrink-0 border-t border-white/10 px-3 py-3"
          style={{ borderTopColor: `${selected.color}44` }}
        >
          <p className="text-[10px] font-bold uppercase tracking-wider text-white/35">
            Seleccionado
          </p>
          <p className="mt-1 truncate text-sm font-bold text-white/90">
            {selected.icon} {selected.nombre}
          </p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => selectRoom(selected.id)}
              className="flex-1 rounded-lg border border-white/15 bg-white/5 px-2 py-2 text-xs font-semibold text-white/80 transition hover:bg-white/10"
            >
              Ir a la puerta
            </button>
            <button
              type="button"
              disabled={!puedeEntrar}
              onClick={() => tryEnterRoom(selected.id)}
              className="flex-1 rounded-lg px-2 py-2 text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-35"
              style={{
                background: puedeEntrar ? selected.color : 'rgba(255,255,255,0.08)',
                color: puedeEntrar ? '#0f1115' : 'rgba(255,255,255,0.4)',
              }}
            >
              Entrar ›
            </button>
          </div>
          {!puedeEntrar && (
            <p className="mt-2 text-center text-[10px] text-white/35">
              Espera a que llegue a la puerta (punto de color en la lista)
            </p>
          )}
          {puedeEntrar && (
            <p className="mt-2 text-center text-[10px] font-semibold" style={{ color: selected.color }}>
              Listo — pulsa Entrar
            </p>
          )}
        </div>
      )}
    </aside>
  )
}
