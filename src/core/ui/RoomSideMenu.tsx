import { useState } from 'react'
import { rooms, DESCRIPCIONES, type RoomModule } from '../registry'
import { useHouse } from '../state/houseStore'
import { useDiseño } from '../state/disenoStore'
import { useLayout, roomWorldPos } from '../state/layoutStore'
import { useCam } from '../state/cameraStore'
import { tituloSubtituloCuarto } from './roomDisplay'
import { TechoToggleButton } from './TechoToggleButton'

const CATEGORIAS: { key: RoomModule['categoria']; label: string }[] = [
  { key: 'cuerpo', label: 'Cuerpo' },
  { key: 'mente', label: 'Mente' },
  { key: 'complemento', label: 'Complemento' },
  { key: 'config', label: 'Configuración' },
]

export function RoomSideMenu({ onToggle }: { onToggle: () => void }) {
  const openRoom = useHouse((s) => s.openRoom)
  const roomColors = useDiseño((s) => s.roomColors)
  const roomNames = useDiseño((s) => s.roomNames)
  const placed = useLayout((s) => s.placed)
  const editRoom = useLayout((s) => s.editRoom)
  const [mostrarAgregar, setMostrarAgregar] = useState(false)

  /** Editar cuarto (zoom + panel de objetos). */
  const editarCuarto = (room: RoomModule) => editRoom(room.id)

  const disponibles = rooms.filter((r) => !placed[r.id])

  return (
    <aside
      className="flex h-full min-h-0 w-60 shrink-0 flex-col border-r border-white/10 bg-[#12151c]"
      aria-label="Menú de cuartos"
    >
      <div className="border-b border-white/10 px-4 py-4">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onToggle}
            title="Retraer menú"
            className="flex h-7 w-7 shrink-0 flex-col items-center justify-center gap-[3px] rounded-md transition hover:bg-white/10"
          >
            <span className="h-0.5 w-4 rounded bg-white/70" />
            <span className="h-0.5 w-4 rounded bg-white/70" />
            <span className="h-0.5 w-4 rounded bg-white/70" />
          </button>
          <h1 className="min-w-0 flex-1 truncate text-lg font-black tracking-tight text-white/90">
            🏠 Mind Home
          </h1>
          <TechoToggleButton />
        </div>
        <p className="mt-1 text-[11px] leading-snug text-white/45">
          <b className="text-white/70">Editar</b> personaliza el cuarto ·{' '}
          <b className="text-white/70">Entrar</b> abre la app.
        </p>
      </div>

      <div className="scroll-sutil min-h-0 flex-1 overflow-y-auto px-2 py-3">
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
                  const color = roomColors[room.id] ?? room.color
                  const nombre = roomNames[room.id] || room.nombre
                  const { titulo, subtitulo } = tituloSubtituloCuarto(room, nombre)
                  return (
                    <li
                      key={room.id}
                      className="rounded-lg border px-2 py-1.5 transition"
                      style={{
                        borderColor: 'rgba(255,255,255,0.06)',
                        background: 'rgba(255,255,255,0.02)',
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <div className="flex min-w-0 flex-1 items-center gap-2">
                          <span
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-lg"
                            style={{ background: `${color}33` }}
                          >
                            {room.icon}
                          </span>
                          <span className="min-w-0 flex-1 leading-tight">
                            <span className="block truncate text-sm font-semibold text-white/90">
                              {titulo}
                            </span>
                            {subtitulo && (
                              <span className="block truncate text-[11px] text-white/45">
                                {subtitulo}
                              </span>
                            )}
                          </span>
                        </div>

                        <div className="flex shrink-0 flex-col gap-1">
                          <button
                            type="button"
                            onClick={() => editarCuarto(room)}
                            title="Editar este cuarto"
                            className="flex min-w-[5.25rem] items-center justify-center gap-1 rounded-md border border-white/10 bg-white/5 px-2 py-2 text-xs font-bold text-white/80 transition hover:bg-white/12"
                          >
                            <span className="text-sm leading-none">⚙️</span>
                            <span>Editar</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => openRoom(room.id)}
                            className="min-w-[5.25rem] rounded-md px-2 py-2 text-xs font-bold transition hover:brightness-110"
                            style={{ background: color, color: '#0f1115' }}
                          >
                            Entrar ›
                          </button>
                        </div>
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

/** Menú retraído: botón flotante (3 líneas + Mind Home) y toggle de techo. */
export function FloatingMenuButton({ onToggle }: { onToggle: () => void }) {
  return (
    <div className="absolute left-3 top-3 z-30 flex items-center gap-2">
      <button
        type="button"
        onClick={onToggle}
        title="Abrir menú"
        className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/55 px-3 py-2 backdrop-blur-sm transition hover:bg-white/15"
      >
        <span className="flex flex-col items-center justify-center gap-[3px]">
          <span className="h-0.5 w-4 rounded bg-white/80" />
          <span className="h-0.5 w-4 rounded bg-white/80" />
          <span className="h-0.5 w-4 rounded bg-white/80" />
        </span>
        <span className="text-sm font-black text-white/90">🏠 Mind Home</span>
      </button>
      <TechoToggleButton />
    </div>
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
          {tituloSubtituloCuarto(room, room.nombre).titulo}
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
