import type { Rutina, TipoEntrenamiento } from '../../core/data/db'
import { tocaFecha } from '../../core/rutinas'

/**
 * Lo que toca hoy, leído del calendario en vez de la tabla `planEjercicio`.
 *
 * Antes el plan vivía aparte, con una fila por día y sin hora, y no llegaba al
 * calendario. Ahora las rutinas agendadas SON bloques del calendario
 * (`HorarioActividad`), y esto solo las traduce a la forma que los tres tabs ya
 * sabían consumir: conserva `rutinaNombre` y `duracionMin`, así que el banner
 * «Plan del día» y el precargado de «Usar rutina» siguen igual.
 */

/** Un hueco agendado de hoy. Mismos campos que usaba `RutinaProgramada`. */
export interface PlanDelDia {
  rutinaId: number
  rutinaNombre: string
  duracionMin: number
  /** 'HH:mm'; las que vienen del plan viejo aún no tienen. */
  hora?: string
}

/** Lo agendado de un tipo de entrenamiento para esa fecha. */
export function agendaDelDia(
  rutinas: Rutina[] | undefined,
  tipo: TipoEntrenamiento,
  fecha: string,
): PlanDelDia[] {
  const dia = new Date(`${fecha}T12:00`)
  return (rutinas ?? [])
    .filter(
      (r) =>
        r.plantillaId === 'ejercicio' &&
        r.actividadId?.startsWith(`${tipo}:`) &&
        tocaFecha(r, dia),
    )
    .map((r) => ({
      rutinaId: r.id!,
      rutinaNombre: r.nombre,
      // La duración vive en el paso que registra la sesión (ver TarjetaRutina).
      duracionMin: Number(r.pasos[0]?.valores?.duracionMin ?? 0),
      hora: r.hora,
    }))
}
