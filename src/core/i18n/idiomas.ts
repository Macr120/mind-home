/**
 * Catálogo de idiomas de la app.
 *
 * Módulo HOJA a propósito (no importa nada): lo leen el store de ajustes, `useT`,
 * la voz y los prompts de IA, así que añadir un idioma es añadir una fila aquí y
 * su `dict.<id>.ts`. Nada más queda cableado a un par de idiomas.
 *
 * El ESPAÑOL es el respaldo de todo y por eso nunca se quita: la interfaz lleva
 * su español en línea como último fallback (ver `useT.ts`) y el contenido de
 * ejemplos y demo cae al español cuando ese idioma no lo tiene traducido. Un
 * idioma a medias se ve a medias, nunca roto.
 */

export interface DatosIdioma {
  id: string
  /** Clave de `dict.ts` para el nombre del idioma en el selector. */
  clave: string
  /** Nombre por defecto (en español, que es el fallback de `t()`). */
  label: string
  /** Bandera: excepción deliberada a `<Icono>`, se muestra igual en ambos estilos. */
  flag: string
  /** BCP-47 para `toLocaleDateString`, `Intl`, `speechSynthesis` y el dictado. */
  locale: string
  /** Cómo se le nombra a la IA dentro de los prompts («escribe en {nombreIA}»). */
  nombreIA: string
}

export const IDIOMAS = [
  {
    id: 'es',
    clave: 'ajustes.idioma.es',
    label: 'Español',
    flag: '🇪🇸',
    locale: 'es-MX',
    nombreIA: 'español',
  },
  {
    id: 'en',
    clave: 'ajustes.idioma.en',
    label: 'Inglés',
    flag: '🇬🇧',
    locale: 'en-US',
    nombreIA: 'inglés',
  },
  {
    id: 'pt',
    clave: 'ajustes.idioma.pt',
    label: 'Portugués',
    flag: '🇧🇷',
    locale: 'pt-BR',
    nombreIA: 'portugués de Brasil',
  },
  {
    id: 'fr',
    clave: 'ajustes.idioma.fr',
    label: 'Francés',
    flag: '🇫🇷',
    locale: 'fr-FR',
    nombreIA: 'francés',
  },
  {
    id: 'de',
    clave: 'ajustes.idioma.de',
    label: 'Alemán',
    flag: '🇩🇪',
    locale: 'de-DE',
    nombreIA: 'alemán',
  },
  {
    id: 'it',
    clave: 'ajustes.idioma.it',
    label: 'Italiano',
    flag: '🇮🇹',
    locale: 'it-IT',
    nombreIA: 'italiano',
  },
] as const satisfies readonly DatosIdioma[]

export type Idioma = (typeof IDIOMAS)[number]['id']

/** El idioma del que todo lo demás es traducción. */
export const IDIOMA_BASE: Idioma = 'es'

/** Lo guardado en localStorage o lo que mande la IA, saneado al catálogo. */
export function idiomaValido(v: unknown): Idioma {
  return IDIOMAS.some((i) => i.id === v) ? (v as Idioma) : IDIOMA_BASE
}

export function datosIdioma(id: Idioma): DatosIdioma {
  return IDIOMAS.find((i) => i.id === id) ?? IDIOMAS[0]
}
