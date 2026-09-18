import type { ItinerarioNav, PuntoNav } from '../../../core/data/db'
import type { TFunc } from '../../../core/i18n/useT'
import { formatoDistancia, formatoDuracion, formatoHora, resumenPierna } from './formato'
import { familiaModo } from './modos'

/** Texto plano del trayecto para compartirlo (tramos numerados; las caminatas con sus maniobras). */
export function textoTrayecto(t: TFunc, origen: PuntoNav, destino: PuntoNav, it: ItinerarioNav, locale: string): string {
  const lineas = [
    `${origen.nombre} → ${destino.nombre}`,
    `${formatoHora(it.salida, locale)} – ${formatoHora(it.llegada, locale)} · ${formatoDuracion(t, it.duracion)}`,
    '',
  ]
  it.piernas.forEach((p, i) => {
    lineas.push(`${i + 1}. ${resumenPierna(t, p, locale)} (${formatoHora(p.salida, locale)})`)
    if (familiaModo(p.modo) === 'WALK') {
      for (const paso of p.pasos ?? []) {
        lineas.push(`   – ${paso.texto} · ${formatoDistancia(paso.distancia, locale)}`)
      }
    }
  })
  lineas.push('', t('sala.nav.fuentesCortas', 'Rutas y horarios: HERE'))
  return lineas.join('\n')
}
