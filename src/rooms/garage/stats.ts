import type { RegistroMantenimiento, TramiteVehiculo, Vehiculo } from '../../core/data/db'
import { tGlobal } from '../../core/i18n/useT'
import { getTipoTramite } from './constantes'
import { diasHasta, formatearFecha, hoyISO, textoRestante } from './fecha'
import type { NombreIcono } from '../../core/ui/iconos/catalogo'

export type AlertaMantenimiento = {
  vehiculoId: number
  vehiculoNombre: string
  registroId?: number
  titulo: string
  /** Icono de la fila: distingue el papeleo del servicio mecánico. */
  icono: NombreIcono
  motivo: 'fecha' | 'odometro' | 'tramite'
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
          icono: 'herramienta',
          motivo: 'fecha',
          detalle: `${textoRestante(dias)} · ${formatearFecha(r.proximaFecha)}`,
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
          icono: 'medida',
          motivo: 'odometro',
          detalle:
            restante < 0
              ? tGlobal('garage.r.odoPasado', 'pasó {n} {u} del objetivo', {
                  n: String(Math.abs(restante)),
                  u: v.unidad,
                })
              : restante === 0
                ? tGlobal('garage.r.odoAlcanzado', 'alcanzó el kilometraje programado')
                : tGlobal('garage.r.odoFaltan', 'faltan {n} {u}', {
                    n: String(restante),
                    u: v.unidad,
                  }),
          urgencia: restante < 0 ? 'vencido' : 'proximo',
        })
      }
    }
  }

  const orden = { vencido: 0, proximo: 1 }
  return alertas.sort((a, b) => orden[a.urgencia] - orden[b.urgencia])
}

/**
 * Trámites que vencen pronto o ya vencieron. Van al mismo panel del resumen que
 * los servicios: al usuario le da igual si lo que se le echa encima es el aceite
 * o la verificación, lo que quiere es la lista de lo que urge.
 */
export function alertasTramites(
  vehiculos: Vehiculo[],
  tramites: TramiteVehiculo[],
): AlertaMantenimiento[] {
  const porId = new Map(vehiculos.map((v) => [v.id!, v]))
  const alertas: AlertaMantenimiento[] = []

  for (const t of tramites) {
    if (!t.activo) continue
    const v = porId.get(t.vehiculoId)
    if (!v) continue
    // Un trámite avisa con la anticipación que se le puso (o el mes de siempre).
    const margen = Math.max(t.avisoDias ?? 0, DIAS_AVISO)
    const dias = diasHasta(t.fecha)
    if (dias > margen) continue
    alertas.push({
      vehiculoId: t.vehiculoId,
      vehiculoNombre: v.nombre,
      titulo: t.titulo,
      icono: getTipoTramite(t.tipo).icono,
      motivo: 'tramite',
      detalle: `${textoRestante(dias)} · ${formatearFecha(t.fecha)}`,
      urgencia: dias < 0 ? 'vencido' : 'proximo',
    })
  }

  return alertas
}

export function gastoAnio(registros: RegistroMantenimiento[], año: string) {
  return registros
    .filter((r) => r.fecha.startsWith(año) && r.costo)
    .reduce((s, r) => s + (r.costo ?? 0), 0)
}
