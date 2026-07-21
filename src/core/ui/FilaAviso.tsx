import { Icono } from './iconos/Icono'
import type { NombreIcono } from './iconos/catalogo'

/**
 * Fila de un aviso: etiqueta, pastilla de encendido y su nota cuando está activo.
 *
 * Vivía dentro de `rooms/descanso/DescansoApp.tsx`; se movió aquí al necesitarla
 * también el control de horario de las actividades. Se MOVIÓ en vez de exportarla
 * desde el cuarto porque `core/ui/` no puede importar de `rooms/`: sería invertir
 * la dependencia del repo.
 */
export function FilaAviso({
  icono,
  texto,
  hint,
  activo,
  onCambio,
  on,
  off,
}: {
  icono: NombreIcono
  texto: string
  hint: string
  activo: boolean
  onCambio: (v: boolean) => void
  on: string
  off: string
}) {
  return (
    <div>
      <div className="flex items-center justify-between gap-3 rounded-lg bg-black/25 px-3 py-2.5">
        <span className="text-sm font-semibold">
          <Icono nombre={icono} /> {texto}
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={activo}
          onClick={() => onCambio(!activo)}
          className={`shrink-0 rounded-lg border px-3 py-1 text-xs font-bold transition ${
            activo
              ? 'border-amber-400/60 bg-amber-400/15 text-amber-400'
              : 'border-white/15 text-white/50 hover:text-white/80'
          }`}
        >
          {activo ? on : off}
        </button>
      </div>
      {activo && <p className="mt-1 text-xs text-white/40">{hint}</p>}
    </div>
  )
}
