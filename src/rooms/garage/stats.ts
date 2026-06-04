import type { RegistroMantenimiento, Vehiculo } from '../../core/data/db'
import { hoyISO } from './fecha'

export type AlertaMantenimiento = {
  vehiculoId: number
  vehiculoNombre: string
  registroId?: number
  titulo: string
  motivo: 'fecha' | 'odometro'
  detalle: string
  urgencia: 'vencido' | 'proximo'
}

const KM_AVISO = 500
const DIAS_AVISO = 30

export function alertasMantenimiento(
  vehiculos: Vehiculo[],
  registros: RegistroMantenimiento[],
): AlertaMantenimiento[] {
  const hoy = hoyISO()
  const porId = new Map(vehiculos.map((v) => [v.id!, v]))
  const alertas: AlertaMantenimiento[] = []

  for (const r of registros) {
    const v = porId.get(r.vehiculoId)
    if (!v) continue

    if (r.proximaFecha) {
      const dias = Math.round(
        (new Date(`${r.proximaFecha}T12:00:00`).getTime() -
          new Date(`${hoy}T12:00:00`).getTime()) /
          86400000,
      )
      if (dias <= DIAS_AVISO) {
        alertas.push({
          vehiculoId: r.vehiculoId,
          vehiculoNombre: v.nombre,
          registroId: r.id,
          titulo: r.titulo,
          motivo: 'fecha',
          detalle:
            dias < 0
              ? `Venció hace ${Math.abs(dias)} días (${r.proximaFecha})`
              : dias === 0
                ? 'Vence hoy'
                : `En ${dias} días (${r.proximaFecha})`,
          urgencia: dias < 0 ? 'vencido' : 'proximo',
        })
      }
    }

    if (r.proximoOdometro != null && v.odometroActual != null) {
      const restante = r.proximoOdometro - v.odometroActual
      if (restante <= KM_AVISO) {
        alertas.push({
          vehiculoId: r.vehiculoId,
          vehiculoNombre: v.nombre,
          registroId: r.id,
          titulo: r.titulo,
          motivo: 'odometro',
          detalle:
            restante < 0
              ? `Pasó ${Math.abs(restante)} ${v.unidad} del objetivo`
              : restante === 0
                ? 'Alcanzó el kilometraje programado'
                : `Faltan ${restante} ${v.unidad}`,
          urgencia: restante < 0 ? 'vencido' : 'proximo',
        })
      }
    }
  }

  const orden = { vencido: 0, proximo: 1 }
  return alertas.sort((a, b) => orden[a.urgencia] - orden[b.urgencia])
}

export function gastoAnio(registros: RegistroMantenimiento[], año: string) {
  return registros
    .filter((r) => r.fecha.startsWith(año) && r.costo)
    .reduce((s, r) => s + (r.costo ?? 0), 0)
}

export function ultimoServicio(registros: RegistroMantenimiento[], vehiculoId: number) {
  return registros.find((r) => r.vehiculoId === vehiculoId)
}
