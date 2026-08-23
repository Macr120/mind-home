// El catálogo por idioma vive en `core/i18n` (lo comparten el demo, Sísifo y el
// diario); se re-exporta aquí porque los ejemplos fueron su primer usuario.
import { porIdioma, type PorIdioma } from '../../../core/i18n/porIdioma'
export { porIdioma, enIdioma, type PorIdioma } from '../../../core/i18n/porIdioma'

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
  /**
   * Reescribe al idioma activo los campos de texto de las filas ya creadas que
   * sigan siendo los de fábrica (ver `retraducido`): `materializar` corre una
   * sola vez, así que sin esto un cambio de idioma dejaría el ejemplo en el
   * idioma viejo. Los ejemplos sin texto (huerto, granja, caminos) no lo llevan.
   */
  retraducir?(): Promise<void>
}

/**
 * El texto de fábrica en el idioma activo para un campo de una fila de ejemplo,
 * o `null` si no hay nada que cambiar.
 *
 * Es la guarda de `retraducir`: solo propone valor si el guardado sigue siendo
 * el de fábrica de alguna de las `claves` en ALGÚN idioma del catálogo. Lo que
 * el usuario editó no casa con ningún catálogo y se queda como está para
 * siempre, igual que las siembras (`esSeedIntacta` en cocina y garage).
 */
export function retraducido<T extends Record<string, string>>(
  catalogo: PorIdioma<T>,
  valor: string | undefined,
  ...claves: (keyof T & string)[]
): string | null {
  if (!valor) return null
  const versiones = Object.values(catalogo) as T[]
  for (const clave of claves) {
    if (versiones.some((v) => v[clave] === valor)) {
      const activo = porIdioma(catalogo)[clave]
      return activo === valor ? null : activo
    }
  }
  return null
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
