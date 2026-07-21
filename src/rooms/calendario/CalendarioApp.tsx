import { CalendarioVista } from '../../core/ui/Calendario'
import { intencionApp } from '../../core/state/intencionApp'

/**
 * App del calendario: el mismo calendario del reloj del HUD, pero como app del
 * cuarto (sin ✕: se cierra con el overlay del cuarto).
 */
export function CalendarioApp() {
  return (
    <div className="h-full min-h-[32rem]">
      <CalendarioVista vistaInicial={intencionApp('calendario')?.seccion} />
    </div>
  )
}
