import { getRoom } from '../registry'
import { useLayout } from '../state/layoutStore'
import type { SideKey, WallState } from '../house/walls'

const INFO: Record<WallState | 'auto', { label: string; color: string }> = {
  auto: { label: 'Auto', color: '#64748b' },
  pared: { label: 'Pared', color: '#b45309' },
  puerta: { label: 'Puerta', color: '#22c55e' },
  abierto: { label: 'Abierto', color: '#38bdf8' },
}

/**
 * Editor de paredes/vanos: mini-mapa del cuarto con sus 4 lados clicables.
 * Cada lado cicla: Auto → Pared → Puerta → Abierto.
 */
export function WallEditor({ roomId }: { roomId: string }) {
  const overrides = useLayout((s) => s.wallOverrides[roomId])
  const cycleWall = useLayout((s) => s.cycleWall)
  const room = getRoom(roomId)

  const estado = (side: SideKey) => overrides?.[side] ?? 'auto'
  const color = (side: SideKey) => INFO[estado(side)].color

  const Lado = ({ side, className }: { side: SideKey; className: string }) => (
    <button
      type="button"
      onClick={() => cycleWall(roomId, side)}
      title={`${side}: ${INFO[estado(side)].label} (clic para cambiar)`}
      className={`absolute rounded-sm transition hover:brightness-125 ${className}`}
      style={{ background: color(side) }}
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
        {(['auto', 'pared', 'puerta', 'abierto'] as const).map((e) => (
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
    </div>
  )
}
