import type { ItinerarioNav, PuntoNav } from '../../../core/data/db'
import type { TFunc } from '../../../core/i18n/useT'
import { formatoDuracion, formatoHora, resumenPierna } from './formato'

/**
 * Texto plano del trayecto para compartirlo: tramos numerados con los HECHOS
 * del viaje (hora, línea, parada donde se baja, minutos a pie).
 *
 * A propósito NO lleva las maniobras paso a paso: esas frases las redacta HERE
 * y la cláusula 8 h de sus condiciones prohíbe entregar su contenido a otra
 * persona. Quien lo reciba ve el plan; para las indicaciones abre su trayecto
 * en la app (ver `docs/HERE.md`).
 */
export function textoTrayecto(t: TFunc, origen: PuntoNav, destino: PuntoNav, it: ItinerarioNav, locale: string): string {
  const lineas = [
    `${origen.nombre} → ${destino.nombre}`,
    `${formatoHora(it.salida, locale)} – ${formatoHora(it.llegada, locale)} · ${formatoDuracion(t, it.duracion)}`,
    '',
  ]
  it.piernas.forEach((p, i) => {
    lineas.push(`${i + 1}. ${resumenPierna(t, p, locale)} (${formatoHora(p.salida, locale)})`)
  })
  lineas.push('', t('sala.nav.fuentesCortas', 'Rutas y horarios: HERE'))
  return lineas.join('\n')
}
