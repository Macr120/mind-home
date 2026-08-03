import type { AreaAgenda } from '../../core/data/db'

/** Color de la app (el del chip único del filtro del calendario). */
export const COLOR = '#a855f7'

/**
 * Un color por sección. El filtro del calendario es por app —un solo chip
 * «Agenda»—, así que el color es lo que distingue de un vistazo una junta de
 * una cita médica o de un cumpleaños.
 */
export const COLOR_AREA: Record<AreaAgenda, string> = {
  trabajo: '#6366f1',
  salud: '#14b8a6',
  personas: '#fb923c',
}

/** Emoji del bloque en el calendario: es un DATO de la rutina, no un icono de UI. */
export const EMOJI_AREA: Record<AreaAgenda, string> = {
  trabajo: '💼',
  salud: '🩺',
  personas: '🎂',
}

export const EMOJI_MEDICAMENTO = '💊'

/** Hora del recordatorio de cumpleaños cuando el contacto no fija una. */
export const HORA_CUMPLE = '09:00'

/** Duración de un bloque con hora de inicio y sin hora de fin. */
export const DURACION_DEFECTO_MIN = 60

/** Lo que dura el bloque de una toma de medicamento. */
export const DURACION_TOMA_MIN = 15

export const AREAS: AreaAgenda[] = ['trabajo', 'salud', 'personas']

/** 1 alta · 2 media · 3 baja. Sin valor se trata como media. */
export const PRIORIDADES = [
  { valor: 1, clave: 'agenda.prioridad.alta', es: 'Alta', color: '#f87171' },
  { valor: 2, clave: 'agenda.prioridad.media', es: 'Media', color: '#fbbf24' },
  { valor: 3, clave: 'agenda.prioridad.baja', es: 'Baja', color: '#94a3b8' },
] as const
