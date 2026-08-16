import type { Idioma } from '../../core/i18n/idiomas'
import type { AreaFabrica } from './constantes'

/**
 * Registro de traducciones del formulario de fábrica.
 *
 * Las 54 estructuras no se duplican por idioma: la notación (`tex`, la
 * expresión, los símbolos) es universal y solo cambian los NOMBRES, así que
 * cada idioma aporta cinco tablas de consulta y `catalogo.ts` arma el catálogo
 * traducido con ellas. Dar de alta un idioma es crear su `catalogo<Xx>.ts` y
 * añadir su cargador aquí; lo que falte se queda en español.
 *
 * Cada idioma se carga con import() PEREZOSO: el barril estático metía los 15
 * (~100 KB) en el chunk de ComputoApp para usar uno.
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

export const CARGADORES_CATALOGO: Partial<Record<Idioma, () => Promise<TraduccionCatalogo>>> = {
  en: () =>
    import('./catalogoEn').then((m) => ({
      areas: m.AREAS_EN,
      formulas: m.FORMULAS_EN,
      grupos: m.GRUPOS_EN,
      variables: m.VARIABLES_EN,
      unidades: m.UNIDADES_EN,
    })),
  pt: () =>
    import('./catalogoPt').then((m) => ({
      areas: m.AREAS_PT,
      formulas: m.FORMULAS_PT,
      grupos: m.GRUPOS_PT,
      variables: m.VARIABLES_PT,
      unidades: m.UNIDADES_PT,
    })),
  fr: () =>
    import('./catalogoFr').then((m) => ({
      areas: m.AREAS_FR,
      formulas: m.FORMULAS_FR,
      grupos: m.GRUPOS_FR,
      variables: m.VARIABLES_FR,
      unidades: m.UNIDADES_FR,
    })),
  de: () =>
    import('./catalogoDe').then((m) => ({
      areas: m.AREAS_DE,
      formulas: m.FORMULAS_DE,
      grupos: m.GRUPOS_DE,
      variables: m.VARIABLES_DE,
      unidades: m.UNIDADES_DE,
    })),
  it: () =>
    import('./catalogoIt').then((m) => ({
      areas: m.AREAS_IT,
      formulas: m.FORMULAS_IT,
      grupos: m.GRUPOS_IT,
      variables: m.VARIABLES_IT,
      unidades: m.UNIDADES_IT,
    })),
  ja: () =>
    import('./catalogoJa').then((m) => ({
      areas: m.AREAS_JA,
      formulas: m.FORMULAS_JA,
      grupos: m.GRUPOS_JA,
      variables: m.VARIABLES_JA,
      unidades: m.UNIDADES_JA,
    })),
  zh: () =>
    import('./catalogoZh').then((m) => ({
      areas: m.AREAS_ZH,
      formulas: m.FORMULAS_ZH,
      grupos: m.GRUPOS_ZH,
      variables: m.VARIABLES_ZH,
      unidades: m.UNIDADES_ZH,
    })),
  ko: () =>
    import('./catalogoKo').then((m) => ({
      areas: m.AREAS_KO,
      formulas: m.FORMULAS_KO,
      grupos: m.GRUPOS_KO,
      variables: m.VARIABLES_KO,
      unidades: m.UNIDADES_KO,
    })),
  ru: () =>
    import('./catalogoRu').then((m) => ({
      areas: m.AREAS_RU,
      formulas: m.FORMULAS_RU,
      grupos: m.GRUPOS_RU,
      variables: m.VARIABLES_RU,
      unidades: m.UNIDADES_RU,
    })),
  hi: () =>
    import('./catalogoHi').then((m) => ({
      areas: m.AREAS_HI,
      formulas: m.FORMULAS_HI,
      grupos: m.GRUPOS_HI,
      variables: m.VARIABLES_HI,
      unidades: m.UNIDADES_HI,
    })),
  tr: () =>
    import('./catalogoTr').then((m) => ({
      areas: m.AREAS_TR,
      formulas: m.FORMULAS_TR,
      grupos: m.GRUPOS_TR,
      variables: m.VARIABLES_TR,
      unidades: m.UNIDADES_TR,
    })),
  id: () =>
    import('./catalogoId').then((m) => ({
      areas: m.AREAS_ID,
      formulas: m.FORMULAS_ID,
      grupos: m.GRUPOS_ID,
      variables: m.VARIABLES_ID,
      unidades: m.UNIDADES_ID,
    })),
  pl: () =>
    import('./catalogoPl').then((m) => ({
      areas: m.AREAS_PL,
      formulas: m.FORMULAS_PL,
      grupos: m.GRUPOS_PL,
      variables: m.VARIABLES_PL,
      unidades: m.UNIDADES_PL,
    })),
  ar: () =>
    import('./catalogoAr').then((m) => ({
      areas: m.AREAS_AR,
      formulas: m.FORMULAS_AR,
      grupos: m.GRUPOS_AR,
      variables: m.VARIABLES_AR,
      unidades: m.UNIDADES_AR,
    })),
  nl: () =>
    import('./catalogoNl').then((m) => ({
      areas: m.AREAS_NL,
      formulas: m.FORMULAS_NL,
      grupos: m.GRUPOS_NL,
      variables: m.VARIABLES_NL,
      unidades: m.UNIDADES_NL,
    })),
}
