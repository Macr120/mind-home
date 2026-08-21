import type { Idioma } from '../../core/i18n/idiomas'

/**
 * Textos por idioma de la SIEMBRA de cocina (recetas y dietas de fábrica, el
 * día de ejemplo y la lista del súper). El español es la base y vive en
 * `ejemplos.ts`/`seed.ts`; aquí solo cuelgan las traducciones, POR CLAVE de
 * ejemplo, con carga perezosa por idioma (patrón `demo.recetas.data.i18n.ts`).
 *
 * A diferencia del catálogo de ejercicio (que traduce al PINTAR), la cocina se
 * siembra YA traducida: las recetas son contenido editable con arrays
 * (ingredientes, pasos) que no caben en claves de `dict.ts`. Las filas
 * sembradas y sin tocar (`esSeedIntacta`) se RETRADUCEN al cambiar de idioma
 * (ver `retraducirCocina` en `seed.ts`).
 */

export interface TextosReceta {
  nombre: string
  carpeta: string
  etiquetas: string[]
  ingredientes: string[]
  pasos: string[]
}

export interface TextosDieta {
  nombre: string
  descripcion: string
}

export interface TextosEjemplosCocina {
  /** Por `clave` de `RECETAS_EJEMPLO` / `DIETAS_EJEMPLO`. */
  recetas: Record<string, TextosReceta>
  dietas: Record<string, TextosDieta>
  /** Las 4 comidas del día de ejemplo, en el MISMO ORDEN que las siembra `seed.ts`. */
  dia: { nombre: string; nota?: string }[]
  /** La lista del súper: su nombre y los 12 ítems en el MISMO ORDEN. */
  lista: { nombre: string; items: string[] }
}

const CARGADORES: Partial<Record<Idioma, () => Promise<TextosEjemplosCocina>>> = {
  en: () => import('./ejemplos.i18n.en').then((m) => m.EJEMPLOS_COCINA_EN),
  pt: () => import('./ejemplos.i18n.pt').then((m) => m.EJEMPLOS_COCINA_PT),
  fr: () => import('./ejemplos.i18n.fr').then((m) => m.EJEMPLOS_COCINA_FR),
  de: () => import('./ejemplos.i18n.de').then((m) => m.EJEMPLOS_COCINA_DE),
  it: () => import('./ejemplos.i18n.it').then((m) => m.EJEMPLOS_COCINA_IT),
  ja: () => import('./ejemplos.i18n.ja').then((m) => m.EJEMPLOS_COCINA_JA),
  zh: () => import('./ejemplos.i18n.zh').then((m) => m.EJEMPLOS_COCINA_ZH),
  ko: () => import('./ejemplos.i18n.ko').then((m) => m.EJEMPLOS_COCINA_KO),
  ru: () => import('./ejemplos.i18n.ru').then((m) => m.EJEMPLOS_COCINA_RU),
  hi: () => import('./ejemplos.i18n.hi').then((m) => m.EJEMPLOS_COCINA_HI),
  tr: () => import('./ejemplos.i18n.tr').then((m) => m.EJEMPLOS_COCINA_TR),
  id: () => import('./ejemplos.i18n.id').then((m) => m.EJEMPLOS_COCINA_ID),
  pl: () => import('./ejemplos.i18n.pl').then((m) => m.EJEMPLOS_COCINA_PL),
  nl: () => import('./ejemplos.i18n.nl').then((m) => m.EJEMPLOS_COCINA_NL),
  ar: () => import('./ejemplos.i18n.ar').then((m) => m.EJEMPLOS_COCINA_AR),
}

/**
 * Los textos de la siembra en el idioma pedido; `null` = usa el español base.
 * Cascada idioma → inglés → null (la misma de `porIdioma`).
 */
export async function textosEjemplosCocina(idioma: Idioma): Promise<TextosEjemplosCocina | null> {
  if (idioma === 'es') return null
  const cargador = CARGADORES[idioma] ?? CARGADORES.en
  return cargador ? cargador() : null
}
