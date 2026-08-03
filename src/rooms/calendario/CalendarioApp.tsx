import { CalendarioVista } from '../../core/ui/Calendario'
import { intencionApp } from '../../core/state/intencionApp'
import { BarraEjemplo } from '../_shared/ejemplos/BarraEjemplo'
import { ejemploCalendario } from './ejemplos'

/**
 * App del calendario: el mismo calendario del reloj del HUD, pero como app del
 * cuarto (sin ✕: se cierra con el overlay del cuarto).
 *
 * La barra del ejemplo va aquí y no dentro de `CalendarioVista` porque esa
 * vista la comparte el reloj del HUD, donde no pintaría nada.
 */
export function CalendarioApp() {
  return (
    <div className="flex h-full min-h-[32rem] flex-col gap-3">
      <div className="min-h-0 flex-1">
        <CalendarioVista vistaInicial={intencionApp('calendario')?.seccion} />
      </div>
      <BarraEjemplo paquete={ejemploCalendario} />
    </div>
  )
}
