import type { Rutina } from '../../core/data/db'
import { rutinasRepo } from '../../core/data/repository'

/** Color e icono del bloque de sueño en el calendario (los de la app de Descanso). */
const COLOR_SUENO = '#22d3ee'
const EMOJI_SUENO = '🛏️'

/** La rutina espejo del horario de sueño (solo hay una). */
export const buscarRutinaSueno = (rutinas: Rutina[] | undefined) =>
  rutinas?.find((r) => r.origen === 'sueno')

/**
 * Deja el bloque diario de sueño del calendario igual al horario de Descanso:
 * lo crea si no existe y solo lo actualiza cuando cambió algo.
 *
 * `dias: []` + `repeticion: 'indefinido'` = todos los días, y sin `fechaInicio`
 * para que también aparezca en los días ya pasados. Va sin pasos y con
 * `avisar: false`: el horario de dormir se pinta, pero no te notifica cada noche.
 */
export async function sincronizarRutinaSueno(
  actual: Rutina | undefined,
  horaDormir: string,
  horaDespertar: string,
  nombre: string,
): Promise<void> {
  if (!actual) {
    await rutinasRepo.add({
      nombre,
      emoji: EMOJI_SUENO,
      hora: horaDormir,
      horaFin: horaDespertar,
      dias: [],
      repeticion: 'indefinido',
      color: COLOR_SUENO,
      pasos: [],
      activa: true,
      creadoEn: new Date().toISOString(),
      origen: 'sueno',
      avisar: false,
      // De Descanso, aunque lo escriba el calendario: sin esto el bloque salía
      // suelto, sin app a la que llevar al tocarlo. Lo mismo que rellena la v125
      // en las bases que ya lo tenían creado.
      plantillaId: 'descanso',
      seccion: 'sueno',
    })
    return
  }
  if (actual.hora === horaDormir && actual.horaFin === horaDespertar) return
  if (actual.id != null) {
    await rutinasRepo.update(actual.id, { hora: horaDormir, horaFin: horaDespertar })
  }
}
