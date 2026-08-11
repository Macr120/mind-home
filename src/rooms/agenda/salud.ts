import type { EspecialidadMedica, TipoCuidadoPersona } from '../../core/data/db'
import type { NombreIcono } from '../../core/ui/iconos/catalogo'

/**
 * Catálogos de la pestaña Salud: especialidades de las citas y cuidados que se
 * repiten (tuyos o de un prójimo).
 *
 * Mismo reparto que en `mascotas.ts`: el `emoji` es un DATO (viaja al bloque del
 * calendario) y el `icono` es lo que pinta la interfaz, para que respete el
 * ajuste `estiloIconos`.
 */

export interface DefEspecialidad {
  id: EspecialidadMedica
  emoji: string
  icono: NombreIcono
  clave: string
  es: string
  color: string
}

export const ESPECIALIDADES: DefEspecialidad[] = [
  { id: 'general', emoji: '🩺', icono: 'estetoscopio', clave: 'agenda.esp.general', es: 'Medicina general', color: '#14b8a6' },
  { id: 'dentista', emoji: '🦷', icono: 'diente', clave: 'agenda.esp.dentista', es: 'Dentista', color: '#38bdf8' },
  { id: 'oftalmologia', emoji: '👁️', icono: 'ver', clave: 'agenda.esp.oftalmologia', es: 'Oftalmología', color: '#60a5fa' },
  { id: 'dermatologia', emoji: '🧴', icono: 'curar', clave: 'agenda.esp.dermatologia', es: 'Dermatología', color: '#fb923c' },
  { id: 'ginecologia', emoji: '🌸', icono: 'flor', clave: 'agenda.esp.ginecologia', es: 'Ginecología', color: '#f472b6' },
  { id: 'cardiologia', emoji: '❤️', icono: 'corazon', clave: 'agenda.esp.cardiologia', es: 'Cardiología', color: '#f87171' },
  { id: 'traumatologia', emoji: '🦴', icono: 'hueso', clave: 'agenda.esp.traumatologia', es: 'Traumatología', color: '#a3e635' },
  { id: 'psicologia', emoji: '🧠', icono: 'memoria', clave: 'agenda.esp.psicologia', es: 'Psicología', color: '#a78bfa' },
  { id: 'laboratorio', emoji: '🧪', icono: 'ciencia', clave: 'agenda.esp.laboratorio', es: 'Laboratorio', color: '#22d3ee' },
  { id: 'otra', emoji: '📌', icono: 'chincheta', clave: 'agenda.esp.otra', es: 'Otra', color: '#94a3b8' },
]

export const getEspecialidad = (id: EspecialidadMedica | undefined): DefEspecialidad =>
  ESPECIALIDADES.find((e) => e.id === id) ?? ESPECIALIDADES[ESPECIALIDADES.length - 1]

/**
 * Adivina la especialidad por lo que dice la cita. La usan la migración a la v114
 * (las citas anteriores no tenían el campo y caerían TODAS en «Otra», que se lee
 * peor que la lista plana de antes) y el ejemplo de fábrica.
 *
 * Solo se aplica al crear/migrar: en cuanto el usuario elige una, manda la suya.
 */
const PISTAS: [EspecialidadMedica, RegExp][] = [
  ['dentista', /dent|muela|caries|ortodon|endodon|limpieza dental|tooth|dental/i],
  ['oftalmologia', /oftalmo|vista|ojos|graduaci|lentes|optometr|eye|vision/i],
  ['ginecologia', /ginec|papanicolau|citolog|matron|obstetr|mamograf|gynec/i],
  ['cardiologia', /cardio|coraz|electrocardio|tensi[oó]n arterial|heart/i],
  ['traumatologia', /traumat|fisioterap|rodilla|hombro|espalda|lesi[oó]n|rehabilit|esguince|fractur|physio|knee/i],
  ['dermatologia', /dermat|piel|lunar|acn[eé]|skin|mole/i],
  ['psicologia', /psic|terapia|salud mental|ansiedad|therapy|counsel/i],
  ['laboratorio', /an[aá]lisis|laborator|sangre|orina|anal[ií]tica|radiograf|ecograf|lab work|blood/i],
  ['general', /nutrici|nutriti|diet|general|revisi[oó]n anual|chequeo|checkup|m[eé]dico de cabecera|vacuna|shot|physical/i],
]

export function inferirEspecialidad(...textos: (string | undefined)[]): EspecialidadMedica | undefined {
  const texto = textos.filter(Boolean).join(' ')
  return PISTAS.find(([, re]) => re.test(texto))?.[0]
}

export interface DefCuidadoPersona {
  id: TipoCuidadoPersona
  emoji: string
  icono: NombreIcono
  clave: string
  es: string
  /** Cada cuánto suele tocar; es solo la sugerencia inicial del formulario. */
  mesesSugeridos: number
}

export const TIPOS_CUIDADO_PERSONA: DefCuidadoPersona[] = [
  { id: 'chequeo', emoji: '🩺', icono: 'estetoscopio', clave: 'agenda.cuidadop.chequeo', es: 'Chequeo general', mesesSugeridos: 12 },
  { id: 'vacuna', emoji: '💉', icono: 'vacuna', clave: 'agenda.cuidadop.vacuna', es: 'Vacuna', mesesSugeridos: 12 },
  { id: 'analisis', emoji: '🧪', icono: 'ciencia', clave: 'agenda.cuidadop.analisis', es: 'Análisis', mesesSugeridos: 6 },
  { id: 'terapia', emoji: '🧠', icono: 'memoria', clave: 'agenda.cuidadop.terapia', es: 'Terapia', mesesSugeridos: 1 },
  { id: 'dental', emoji: '🦷', icono: 'diente', clave: 'agenda.cuidadop.dental', es: 'Revisión dental', mesesSugeridos: 6 },
  { id: 'visual', emoji: '👁️', icono: 'ver', clave: 'agenda.cuidadop.visual', es: 'Revisión visual', mesesSugeridos: 12 },
  { id: 'otro', emoji: '📌', icono: 'chincheta', clave: 'agenda.cuidadop.otro', es: 'Otro', mesesSugeridos: 0 },
]

export const getCuidadoPersona = (id: TipoCuidadoPersona): DefCuidadoPersona =>
  TIPOS_CUIDADO_PERSONA.find((c) => c.id === id) ?? TIPOS_CUIDADO_PERSONA[TIPOS_CUIDADO_PERSONA.length - 1]
