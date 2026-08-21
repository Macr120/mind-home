import type { TFunc } from '../../core/i18n/useT'
import { slugTexto } from './slug'

/**
 * Pintado traducido del catálogo de ejercicio.
 *
 * El nombre español es la IDENTIDAD del ejercicio en toda la app (historial,
 * récords, imágenes por `normalizarEjercicio`, sync), así que nunca se traduce
 * el dato: se guarda canónico y aquí se resuelve solo el TEXTO visible, con la
 * clave `ejercicio.ej.<slug>` (mismo modelo que `ejercicio.grupo.<grupoId>` y
 * que `tituloNodo` del cuarto de Idiomas). Un ejercicio propio del usuario no
 * tiene clave y sale tal cual por el fallback.
 *
 * Las claves las emite `scripts/generar-i18n-ejercicio.mjs` a partir del
 * catálogo; el slug es `slugTexto`, compartido a propósito.
 */

export function slugEjercicio(nombre: string): string {
  return slugTexto(nombre)
}

/** Nombre visible: lo de fábrica se traduce; lo propio del usuario sale tal cual. */
export function nombreEjercicio(t: TFunc, nombre: string): string {
  return t(`ejercicio.ej.${slugEjercicio(nombre)}`, nombre)
}

export function descEjercicio(t: TFunc, nombre: string, descripcion?: string): string | undefined {
  if (!descripcion) return descripcion
  return t(`ejercicio.ejDesc.${slugEjercicio(nombre)}`, descripcion)
}

/** El «tiempo» de las posturas de flexibilidad (prosa por ejercicio). */
export function tiempoEjercicio(t: TFunc, nombre: string, tiempo?: string): string | undefined {
  if (!tiempo) return tiempo
  return t(`ejercicio.ejTiempo.${slugEjercicio(nombre)}`, tiempo)
}

/** Los 4 valores que usa el catálogo de flexibilidad. */
const DIFICULTADES: Record<string, string> = {
  Baja: 'ejercicio.dificultad.baja',
  Media: 'ejercicio.dificultad.media',
  Alta: 'ejercicio.dificultad.alta',
  'Media / Alta': 'ejercicio.dificultad.mediaAlta',
}

export function dificultadEjercicio(t: TFunc, dificultad?: string): string | undefined {
  if (!dificultad) return dificultad
  const clave = DIFICULTADES[dificultad]
  return clave ? t(clave, dificultad) : dificultad
}

/** Rutinas de fábrica. `ejercicio.rutina.*` está ocupado por la UI: aquí es `rut`. */
export function nombreRutina(t: TFunc, nombre: string): string {
  return t(`ejercicio.rut.${slugEjercicio(nombre)}`, nombre)
}

export function descRutina(t: TFunc, nombre: string, descripcion?: string): string | undefined {
  if (!descripcion) return descripcion
  return t(`ejercicio.rutDesc.${slugEjercicio(nombre)}`, descripcion)
}

/**
 * Enfoque de flexibilidad: la sesión guarda el LABEL español del grupo
 * (canónico); para pintarlo se busca el grupo vivo con ese label y se traduce
 * con su clave. Un enfoque escrito a mano por el usuario sale tal cual.
 */
export function nombreEnfoque(
  t: TFunc,
  grupos: { grupoId: string; label: string }[],
  label: string,
): string {
  const g = grupos.find((x) => x.label === label)
  return g ? t(`ejercicio.grupo.${g.grupoId}`, label) : label
}
