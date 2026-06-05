import { useLayout, esFootprintLibre } from '../state/layoutStore'
import { SIZE_DEFAULT, MAX_AREA, type Size } from '../house/walls'

/**
 * Control de tamaño del cuarto (multi-celda): ancho × largo.
 * Mínimo 1×1, máximo 4 veces el espacio estándar (área ≤ 4).
 */
export function ResizeControl({ roomId }: { roomId: string }) {
  const size = useLayout((s) => s.sizes[roomId] ?? SIZE_DEFAULT)
  const resizeRoom = useLayout((s) => s.resizeRoom)
  const placed = useLayout((s) => s.placed)
  const cells = useLayout((s) => s.cells)
  const sizes = useLayout((s) => s.sizes)

  const valido = (s: Size) =>
    s.w >= 1 &&
    s.h >= 1 &&
    s.w * s.h <= MAX_AREA &&
    esFootprintLibre(placed, cells, sizes, roomId, cells[roomId], s)

  const Stepper = ({ label, dim }: { label: string; dim: 'w' | 'h' }) => {
    const val = size[dim]
    const mas: Size = { ...size, [dim]: val + 1 }
    const menos: Size = { ...size, [dim]: val - 1 }
    return (
      <div className="flex items-center gap-2">
        <span className="w-12 text-xs text-white/60">{label}</span>
        <button
          type="button"
          disabled={!valido(menos)}
          onClick={() => resizeRoom(roomId, menos)}
          className="h-7 w-7 rounded-md bg-white/10 text-lg leading-none transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-30"
        >
          −
        </button>
        <span className="w-6 text-center text-sm font-bold">{val}</span>
        <button
          type="button"
          disabled={!valido(mas)}
          onClick={() => resizeRoom(roomId, mas)}
          className="h-7 w-7 rounded-md bg-white/10 text-lg leading-none transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-30"
        >
          +
        </button>
      </div>
    )
  }

  return (
    <div>
      <p className="mb-2 text-sm font-semibold">Tamaño del cuarto</p>
      <div className="space-y-2">
        <Stepper label="Ancho" dim="w" />
        <Stepper label="Largo" dim="h" />
      </div>
      <p className="mt-2 text-center text-[10px] text-white/40">
        {size.w} × {size.h} celdas · máx {MAX_AREA}× el espacio estándar
      </p>
    </div>
  )
}
