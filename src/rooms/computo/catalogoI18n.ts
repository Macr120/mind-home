import type { Idioma } from '../../core/i18n/idiomas'
import type { AreaFabrica } from './constantes'
import { AREAS_EN, FORMULAS_EN, GRUPOS_EN, UNIDADES_EN, VARIABLES_EN } from './catalogoEn'

/**
 * Registro de traducciones del formulario de fábrica.
 *
 * Las 54 estructuras no se duplican por idioma: la notación (`tex`, la
 * expresión, los símbolos) es universal y solo cambian los NOMBRES, así que
 * cada idioma aporta cinco tablas de consulta y `catalogo.ts` arma el catálogo
 * traducido con ellas. Dar de alta un idioma es crear su `catalogo<Xx>.ts` y
 * añadir su fila aquí; lo que falte se queda en español.
 */
export interface TraduccionCatalogo {
  areas: Record<AreaFabrica, string>
  /** Por `slug` de fórmula. */
  formulas: Record<string, string>
  grupos: Record<string, string>
  /** Global: «masa» sale en once fórmulas. */
  variables: Record<string, string>
  unidades: Record<string, string>
}

export const TRADUCCIONES: Partial<Record<Idioma, TraduccionCatalogo>> = {
  en: {
    areas: AREAS_EN,
    formulas: FORMULAS_EN,
    grupos: GRUPOS_EN,
    variables: VARIABLES_EN,
    unidades: UNIDADES_EN,
  },
}
