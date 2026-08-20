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
  /** Nombre del idioma EN su propio idioma (para el selector de bienvenida). */
  endonimo: string
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
    endonimo: 'Español',
    flag: '🇪🇸',
    locale: 'es-MX',
    nombreIA: 'español',
  },
  {
    id: 'en',
    clave: 'ajustes.idioma.en',
    label: 'Inglés',
    endonimo: 'English',
    flag: '🇬🇧',
    locale: 'en-US',
    nombreIA: 'inglés',
  },
  {
    id: 'pt',
    clave: 'ajustes.idioma.pt',
    label: 'Portugués',
    endonimo: 'Português',
    flag: '🇧🇷',
    locale: 'pt-BR',
    nombreIA: 'portugués de Brasil',
  },
  {
    id: 'fr',
    clave: 'ajustes.idioma.fr',
    label: 'Francés',
    endonimo: 'Français',
    flag: '🇫🇷',
    locale: 'fr-FR',
    nombreIA: 'francés',
  },
  {
    id: 'de',
    clave: 'ajustes.idioma.de',
    label: 'Alemán',
    endonimo: 'Deutsch',
    flag: '🇩🇪',
    locale: 'de-DE',
    nombreIA: 'alemán',
  },
  {
    id: 'it',
    clave: 'ajustes.idioma.it',
    label: 'Italiano',
    endonimo: 'Italiano',
    flag: '🇮🇹',
    locale: 'it-IT',
    nombreIA: 'italiano',
  },
  {
    id: 'ja',
    clave: 'ajustes.idioma.ja',
    label: 'Japonés',
    endonimo: '日本語',
    flag: '🇯🇵',
    locale: 'ja-JP',
    nombreIA: 'japonés',
  },
  {
    id: 'zh',
    clave: 'ajustes.idioma.zh',
    label: 'Chino',
    endonimo: '中文',
    flag: '🇨🇳',
    locale: 'zh-CN',
    nombreIA: 'chino simplificado',
  },
  {
    id: 'ko',
    clave: 'ajustes.idioma.ko',
    label: 'Coreano',
    endonimo: '한국어',
    flag: '🇰🇷',
    locale: 'ko-KR',
    nombreIA: 'coreano',
  },
  {
    id: 'ru',
    clave: 'ajustes.idioma.ru',
    label: 'Ruso',
    endonimo: 'Русский',
    flag: '🇷🇺',
    locale: 'ru-RU',
    nombreIA: 'ruso',
  },
  {
    id: 'hi',
    clave: 'ajustes.idioma.hi',
    label: 'Hindi',
    endonimo: 'हिन्दी',
    flag: '🇮🇳',
    locale: 'hi-IN',
    nombreIA: 'hindi',
  },
  {
    id: 'tr',
    clave: 'ajustes.idioma.tr',
    label: 'Turco',
    endonimo: 'Türkçe',
    flag: '🇹🇷',
    locale: 'tr-TR',
    nombreIA: 'turco',
  },
  {
    id: 'id',
    clave: 'ajustes.idioma.id',
    label: 'Indonesio',
    endonimo: 'Bahasa Indonesia',
    flag: '🇮🇩',
    locale: 'id-ID',
    nombreIA: 'indonesio',
  },
  {
    id: 'pl',
    clave: 'ajustes.idioma.pl',
    label: 'Polaco',
    endonimo: 'Polski',
    flag: '🇵🇱',
    locale: 'pl-PL',
    nombreIA: 'polaco',
  },
  {
    id: 'nl',
    clave: 'ajustes.idioma.nl',
    label: 'Neerlandés',
    endonimo: 'Nederlands',
    flag: '🇳🇱',
    locale: 'nl-NL',
    nombreIA: 'neerlandés',
  },
  {
    // Único RTL del catálogo: solo se invierte el TEXTO (index.css), no el layout.
    id: 'ar',
    clave: 'ajustes.idioma.ar',
    label: 'Árabe',
    endonimo: 'العربية',
    flag: '🇸🇦',
    locale: 'ar-SA',
    nombreIA: 'árabe estándar moderno',
  },
] as const satisfies readonly DatosIdioma[]

export type Idioma = (typeof IDIOMAS)[number]['id']

/** El idioma del que todo lo demás es traducción. */
export const IDIOMA_BASE: Idioma = 'es'

/**
 * Con qué idioma arranca una instalación nueva, ANTES de que el usuario elija:
 * inglés, que es lo que entiende más gente y en lo que se pinta el selector de
 * la puerta de entrada. No es `IDIOMA_BASE`, que significa otra cosa (el idioma
 * original del código y último respaldo de `t()`).
 */
export const IDIOMA_DEFAULT: Idioma = 'en'

/** Lo guardado en localStorage o lo que mande la IA, saneado al catálogo. */
export function idiomaValido(v: unknown): Idioma {
  return IDIOMAS.some((i) => i.id === v) ? (v as Idioma) : IDIOMA_BASE
}

export function datosIdioma(id: Idioma): DatosIdioma {
  return IDIOMAS.find((i) => i.id === id) ?? IDIOMAS[0]
}

/**
 * Idiomas que se leen de derecha a izquierda. OJO: ya NO gobiernan el `dir` de
 * `<html>` — por pedido del usuario (ago 2026) la interfaz no se espeja y solo
 * el texto se ordena RTL (`unicode-bidi: plaintext` en index.css). Queda para
 * quien necesite saber la dirección de LECTURA (p. ej. gestos o narración).
 */
export function esRTL(id: string): boolean {
  return id === 'ar'
}
