import { getRoom } from '../registry'
import { useLayout } from '../state/layoutStore'
import {
  effectiveWall,
  SIZE_DEFAULT,
  SIDE_KEYS,
  type SideKey,
  type WallState,
} from '../house/walls'

const INFO: Record<WallState, { label: string; color: string }> = {
  pared: { label: 'Pared', color: '#b45309' },
  puerta: { label: 'Puerta', color: '#22c55e' },
  abierto: { label: 'Abierto', color: '#38bdf8' },
}

const NOMBRE_LADO: Record<SideKey, string> = {
  N: 'Norte',
  S: 'Sur',
  E: 'Este',
  O: 'Oeste',
}

/**
 * Editor de paredes/vanos: mini-mapa del cuarto con sus 4 lados clicables.
 * Muestra el estado actual de cada lado y cicla: Pared → Puerta → Abierto.
 */
export function WallEditor({ roomId }: { roomId: string }) {
  const overrides = useLayout((s) => s.wallOverrides[roomId])
  const ocupado = useLayout((s) => s.ocupado)
  const cell = useLayout((s) => s.cells[roomId])
  const size = useLayout((s) => s.sizes[roomId]) ?? SIZE_DEFAULT
  const cycleWall = useLayout((s) => s.cycleWall)
  const slideDoor = useLayout((s) => s.slideDoor)
  const doorPos = useLayout((s) => s.doorPos[roomId])
  const room = getRoom(roomId)

  const estado = (side: SideKey): WallState =>
    effectiveWall(cell, size, ocupado, overrides, side)

  const puertas = SIDE_KEYS.filter((s) => estado(s) === 'puerta')

  const Lado = ({ side, className }: { side: SideKey; className: string }) => (
    <button
      type="button"
      onClick={() => cycleWall(roomId, side)}
      title={`${INFO[estado(side)].label} (clic para cambiar)`}
      className={`absolute rounded-sm transition hover:brightness-125 ${className}`}
      style={{ background: INFO[estado(side)].color }}
    />
  )

  return (
    <div>
      <p className="mb-2 text-sm font-semibold">Paredes y vanos</p>
      <div className="relative mx-auto h-28 w-28">
        <Lado side="N" className="left-4 right-4 top-0 h-3" />
        <Lado side="S" className="bottom-0 left-4 right-4 h-3" />
        <Lado side="O" className="bottom-4 left-0 top-4 w-3" />
        <Lado side="E" className="bottom-4 right-0 top-4 w-3" />
        <div className="absolute inset-3.5 flex items-center justify-center rounded-md bg-white/5 text-2xl">
          {room?.icon}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap justify-center gap-x-3 gap-y-1">
        {(['pared', 'puerta', 'abierto'] as const).map((e) => (
          <span key={e} className="flex items-center gap-1 text-[10px] text-white/55">
            <span
              className="h-2.5 w-2.5 rounded-sm"
              style={{ background: INFO[e].color }}
            />
            {INFO[e].label}
          </span>
        ))}
      </div>
      <p className="mt-1.5 text-center text-[10px] text-white/35">
        Toca un lado para cambiarlo.
      </p>

      {/* Deslizar las puertas a lo largo de su muro */}
      {puertas.length > 0 && (
        <div className="mt-3 border-t border-white/10 pt-3">
          <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-white/40">
            Posición de la puerta
          </p>
          <div className="space-y-1.5">
            {puertas.map((side) => (
              <div key={side} className="flex items-center gap-2">
                <span className="w-12 text-xs text-white/60">
                  {NOMBRE_LADO[side]}
                </span>
                <button
                  type="button"
                  onClick={() => slideDoor(roomId, side, -0.2)}
                  className="h-7 w-9 rounded-md bg-white/10 text-sm transition hover:bg-white/20"
                  title="Deslizar puerta"
                >
                  ◀
                </button>
                <div className="relative h-1.5 flex-1 rounded-full bg-black/40">
                  <span
                    className="absolute top-1/2 h-3 w-3 -translate-y-1/2 rounded-full bg-emerald-400"
                    style={{ left: `calc(${(((doorPos?.[side] ?? 0) + 1) / 2) * 100}% - 6px)` }}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => slideDoor(roomId, side, 0.2)}
                  className="h-7 w-9 rounded-md bg-white/10 text-sm transition hover:bg-white/20"
                  title="Deslizar puerta"
                >
                  ▶
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
