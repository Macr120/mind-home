import { idiomaActual } from './useT'
import type { Idioma } from './idiomas'

/**
 * Catálogo de CONTENIDO por idioma (lo que no cabe en `dict.ts`: ejemplos de
 * fábrica, el año demo, rangos de Sísifo, medios del diario…). El español es
 * OBLIGATORIO —es el respaldo— y los demás opcionales, así que dar de alta un
 * idioma en `idiomas.ts` no rompe la compilación de ningún catálogo hasta que
 * se traduzca: un idioma a medias se ve a medias, nunca roto.
 *
 * A diferencia de `dict.ts`, aquí se elige el catálogo ENTERO, no clave a
 * clave: son textos largos y narrativos, y mezclar idiomas dentro de un mismo
 * ejemplo se notaría.
 */
export type PorIdioma<T> = { es: T } & Partial<Record<Idioma, T>>

/** El catálogo en el idioma pedido, o en español si ese idioma no lo tiene. */
export const enIdioma = <T>(catalogo: PorIdioma<T>, idioma: Idioma): T => catalogo[idioma] ?? catalogo.es

/** El catálogo en el idioma activo de la interfaz. */
export const porIdioma = <T>(catalogo: PorIdioma<T>): T => enIdioma(catalogo, idiomaActual())
