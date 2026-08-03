import type { EspecieMascota, TipoCuidadoMascota } from '../../core/data/db'
import { deIso, DIA_MS, fechaLocalISO } from '../../core/fechaLocal'
import type { TFunc } from '../../core/i18n/useT'
import type { NombreIcono } from '../../core/ui/iconos/catalogo'

/**
 * Catálogo de mascotas: especies y tipos de cuidado.
 *
 * El `emoji` es un DATO (viaja al bloque del calendario, igual que `EMOJI_AREA`);
 * el `icono` es lo que pinta la interfaz, para que respete el ajuste
 * `estiloIconos`. Se declaran los dos porque no siempre coinciden: el catálogo
 * de iconos resuelve 🐶 como «mascota-perro» y aquí importa el nombre semántico.
 */

export interface DefEspecie {
  id: EspecieMascota
  emoji: string
  icono: NombreIcono
  clave: string
  es: string
}

export const ESPECIES: DefEspecie[] = [
  { id: 'perro', emoji: '🐶', icono: 'mascota-perro', clave: 'agenda.especie.perro', es: 'Perro' },
  { id: 'gato', emoji: '🐱', icono: 'mascota-gato', clave: 'agenda.especie.gato', es: 'Gato' },
  { id: 'ave', emoji: '🐦', icono: 'ave', clave: 'agenda.especie.ave', es: 'Ave' },
  { id: 'pez', emoji: '🐟', icono: 'pescado', clave: 'agenda.especie.pez', es: 'Pez' },
  { id: 'roedor', emoji: '🐹', icono: 'roedor', clave: 'agenda.especie.roedor', es: 'Roedor' },
  { id: 'reptil', emoji: '🦎', icono: 'reptil', clave: 'agenda.especie.reptil', es: 'Reptil' },
  { id: 'caballo', emoji: '🐴', icono: 'caballo', clave: 'agenda.especie.caballo', es: 'Caballo' },
  { id: 'otro', emoji: '🐾', icono: 'animal', clave: 'agenda.especie.otro', es: 'Otro' },
]

export const getEspecie = (id: EspecieMascota): DefEspecie =>
  ESPECIES.find((e) => e.id === id) ?? ESPECIES[ESPECIES.length - 1]

export interface DefCuidado {
  id: TipoCuidadoMascota
  emoji: string
  icono: NombreIcono
  clave: string
  es: string
  /** Cada cuánto suele tocar; es solo la sugerencia inicial del formulario. */
  mesesSugeridos: number
}

export const TIPOS_CUIDADO: DefCuidado[] = [
  { id: 'vacuna', emoji: '💉', icono: 'vacuna', clave: 'agenda.cuidado.vacuna', es: 'Vacuna', mesesSugeridos: 12 },
  {
    id: 'desparasitacion',
    emoji: '🪱',
    icono: 'desparasitar',
    clave: 'agenda.cuidado.desparasitacion',
    es: 'Desparasitación',
    mesesSugeridos: 3,
  },
  {
    id: 'veterinario',
    emoji: '🩺',
    icono: 'estetoscopio',
    clave: 'agenda.cuidado.veterinario',
    es: 'Revisión con el veterinario',
    mesesSugeridos: 6,
  },
  { id: 'bano', emoji: '🛁', icono: 'tina', clave: 'agenda.cuidado.bano', es: 'Baño', mesesSugeridos: 1 },
  {
    id: 'peluqueria',
    emoji: '✂️',
    icono: 'tijeras',
    clave: 'agenda.cuidado.peluqueria',
    es: 'Corte de pelo o uñas',
    mesesSugeridos: 2,
  },
  {
    id: 'alimento',
    emoji: '🌾',
    icono: 'alimentar',
    clave: 'agenda.cuidado.alimento',
    es: 'Comprar alimento',
    mesesSugeridos: 1,
  },
  { id: 'otro', emoji: '🐾', icono: 'animal', clave: 'agenda.cuidado.otro', es: 'Otro', mesesSugeridos: 0 },
]

export const getCuidado = (id: TipoCuidadoMascota): DefCuidado =>
  TIPOS_CUIDADO.find((c) => c.id === id) ?? TIPOS_CUIDADO[TIPOS_CUIDADO.length - 1]

/** Periodos que ofrece el formulario (0 = una sola vez). */
export const PERIODOS = [0, 1, 2, 3, 6, 12, 24]

/** Cada cuánto vuelve a tocar, en palabras (el select y la ficha dicen lo mismo). */
export function textoPeriodo(meses: number | undefined, t: TFunc): string {
  if (!meses) return t('agenda.cuidado.unaVez', 'Una sola vez')
  if (meses === 1) return t('agenda.cuidado.mensual', 'Cada mes')
  if (meses === 12) return t('agenda.cuidado.anual', 'Cada año')
  return t('agenda.cuidado.meses', 'Cada {n} meses', { n: meses })
}

/** Hora del recordatorio de un cuidado cuando no se elige otra. */
export const HORA_CUIDADO = '09:00'

/** Lo que dura el bloque de un cuidado en el calendario. */
export const DURACION_CUIDADO_MIN = 30

/**
 * Suma meses cuidando el desborde de día: 31 de enero + 1 mes es el 28 (o 29) de
 * febrero, no el 3 de marzo — que es a donde lo llevaría `setMonth` a secas.
 */
export function sumarMeses(fecha: string, meses: number): string {
  const [y, m, d] = fecha.split('-').map(Number)
  const destino = new Date(y, m - 1 + meses, 1)
  const ultimoDia = new Date(destino.getFullYear(), destino.getMonth() + 1, 0).getDate()
  destino.setDate(Math.min(d, ultimoDia))
  return fechaLocalISO(destino)
}

/** Días de hoy a esa fecha (negativo = ya pasó). */
export const diasHasta = (fecha: string, hoy = fechaLocalISO()) =>
  Math.round((deIso(fecha).getTime() - deIso(hoy).getTime()) / DIA_MS)

/**
 * Edad en años y meses. Devuelve los dos números para poder decir «3 meses» de
 * un cachorro sin redondearlo a 0 años.
 */
export function edadMascota(nacimiento: string, hoy = fechaLocalISO()): { anios: number; meses: number } {
  const [ay, am, ad] = nacimiento.split('-').map(Number)
  const [hy, hm, hd] = hoy.split('-').map(Number)
  let meses = (hy - ay) * 12 + (hm - am)
  if (hd < ad) meses--
  if (meses < 0) meses = 0
  return { anios: Math.floor(meses / 12), meses: meses % 12 }
}
