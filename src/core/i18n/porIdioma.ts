import { idiomaActual } from './useT'
import type { Idioma } from './idiomas'

/**
 * Catálogo de CONTENIDO por idioma (lo que no cabe en `dict.ts`: ejemplos de
 * fábrica, el año demo, rangos de Sísifo, medios del diario…). El español es
 * OBLIGATORIO —es la fuente de verdad y el último respaldo— y los demás
 * opcionales, así que dar de alta un idioma en `idiomas.ts` no rompe la
 * compilación de ningún catálogo hasta que se traduzca. El respaldo visible es
 * el INGLÉS (misma cascada que `useT`): un idioma sin catálogo lo ve en inglés,
 * y en español solo si tampoco hay inglés.
 *
 * A diferencia de `dict.ts`, aquí se elige el catálogo ENTERO, no clave a
 * clave: son textos largos y narrativos, y mezclar idiomas dentro de un mismo
 * ejemplo se notaría.
 */
export type PorIdioma<T> = { es: T } & Partial<Record<Idioma, T>>

/** El catálogo en el idioma pedido; si no lo tiene, en inglés y luego español. */
export const enIdioma = <T>(catalogo: PorIdioma<T>, idioma: Idioma): T =>
  catalogo[idioma] ?? catalogo.en ?? catalogo.es

/** El catálogo en el idioma activo de la interfaz. */
export const porIdioma = <T>(catalogo: PorIdioma<T>): T => enIdioma(catalogo, idiomaActual())
