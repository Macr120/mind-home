import { idiomaActual } from '../../../core/i18n/useT'
import type { Idioma } from '../../../core/state/ajustesStore'

/**
 * Contrato de un ejemplo de fábrica.
 *
 * Un paquete solo sabe CREAR sus filas; encenderlo y apagarlo es cosa del
 * interruptor (`core/data/ejemplos.ts`), que las esconde sin borrarlas. Por eso
 * `materializar` tiene que ser idempotente: se llama la primera vez que se
 * enciende y nunca más, pero puede repetirse si el usuario borró sus datos.
 */
export interface PaqueteEjemplo {
  /** Id de la sección: `'<cuarto>.<sección>'`. También es el sufijo del `data-tut`. */
  id: string
  /** Crea las filas del ejemplo si no existen ya. */
  materializar(): Promise<void>
  /**
   * Por qué no se puede cargar ahora mismo (clave de `dict.ts`), p. ej. el mapa
   * sin sitio libre en la infraestructura 3D. Sin esto, siempre se puede.
   */
  impedimento?(): Promise<string | null>
}

/**
 * ¿Las filas de este ejemplo ya están creadas?
 *
 * No se lleva una bandera aparte a propósito: la verdad son las filas. Así, si
 * el usuario vacía sus datos desde Respaldo, volver a encender el ejemplo lo
 * crea otra vez en vez de dejar la sección vacía para siempre.
 */
export async function yaMaterializado(
  id: string,
  ...listas: Array<() => Promise<unknown[]>>
): Promise<boolean> {
  for (const lista of listas) {
    if ((await lista()).some((f) => (f as { ejemploDe?: string }).ejemploDe === id)) return true
  }
  return false
}

/**
 * El contenido del ejemplo en el idioma activo.
 *
 * El contenido NO pasa por `dict.ts`: en cuanto se crea es dato del usuario, no
 * interfaz, y no debe cambiar si luego cambia el idioma. Por eso el catálogo
 * está entero en los dos idiomas y se elige completo al materializar.
 */
export const porIdioma = <T>(catalogo: Record<Idioma, T>): T => catalogo[idiomaActual()]
