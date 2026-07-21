import type { EventoApp } from '../../core/registry'
import { diasItinerarioRepo, lugaresViajeRepo } from '../../core/data/repository'
import { tGlobal } from '../../core/i18n/useT'

/**
 * Lo que la sala aporta al calendario: los lugares agendados y los días de la hoja
 * de plan de cada uno. Vivía dentro de `CalendarioVista`, que importaba estos repos
 * a mano; ahora es un proveedor más del contrato `eventos` de la plantilla.
 *
 * Solo lectura: el itinerario se edita en la sala, no arrastrando en el calendario.
 */
export async function eventosViaje(): Promise<EventoApp[]> {
  const lugares = await lugaresViajeRepo.list()
  const dias = await diasItinerarioRepo.list()
  const eventos: EventoApp[] = []

  // Solo los pendientes: un lugar ya visitado no vuelve a "tocar" ese día.
  for (const l of lugares) {
    if (l.visitado === 0 && l.fechaPlan) {
      eventos.push({
        fecha: l.fechaPlan,
        texto: `${l.nombre} (${l.pais})`,
        emoji: '🧭',
        seccion: 'porConocer',
      })
    }
  }

  const nombreLugar = new Map(lugares.map((l) => [l.id, l.nombre]))
  for (const d of dias) {
    if (!d.fecha) continue
    const tramo = [d.inicio, d.destino].filter(Boolean).join(' → ')
    const lugar = nombreLugar.get(d.lugarId) ?? tGlobal('sala.evento.viaje', 'Viaje')
    eventos.push({
      fecha: d.fecha,
      texto: `${lugar} · ${tGlobal('sala.evento.dia', 'Día {n}', { n: d.dia })}${tramo ? `: ${tramo}` : ''}`,
      emoji: '✈️',
      seccion: 'rutas',
    })
  }
  return eventos
}
