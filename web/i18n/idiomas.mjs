/**
 * Los idiomas de la WEB pública. Lista propia y no la de la app
 * (`src/core/i18n/idiomas.ts`) a propósito: aquí la consume un script de build
 * de Node, que no compila TypeScript, y la web no debe arrastrar nada del árbol
 * de la app. Mismos ids, para que un enlace de una a otra siga valiendo.
 *
 * El PRIMERO es el idioma en el que están escritas las páginas (el original) y
 * el que se sirve en la raíz del dominio; los demás cuelgan de `/<id>/`.
 */
export const IDIOMAS = [
  { id: 'es', endonimo: 'Español', flag: '🇪🇸' },
  { id: 'en', endonimo: 'English', flag: '🇬🇧' },
  { id: 'pt', endonimo: 'Português', flag: '🇧🇷' },
  { id: 'fr', endonimo: 'Français', flag: '🇫🇷' },
  { id: 'de', endonimo: 'Deutsch', flag: '🇩🇪' },
  { id: 'it', endonimo: 'Italiano', flag: '🇮🇹' },
  { id: 'ja', endonimo: '日本語', flag: '🇯🇵' },
  { id: 'zh', endonimo: '中文', flag: '🇨🇳' },
  { id: 'ko', endonimo: '한국어', flag: '🇰🇷' },
  { id: 'ru', endonimo: 'Русский', flag: '🇷🇺' },
  { id: 'hi', endonimo: 'हिन्दी', flag: '🇮🇳' },
  { id: 'tr', endonimo: 'Türkçe', flag: '🇹🇷' },
  { id: 'id', endonimo: 'Indonesia', flag: '🇮🇩' },
  { id: 'pl', endonimo: 'Polski', flag: '🇵🇱' },
  { id: 'nl', endonimo: 'Nederlands', flag: '🇳🇱' },
  { id: 'ar', endonimo: 'العربية', flag: '🇸🇦' },
]

/** El de la raíz: el idioma en el que se escriben las páginas. */
export const IDIOMA_ORIGEN = IDIOMAS[0].id

/** Prefijo de URL de un idioma: '' para el origen, '/en' para el resto. */
export const prefijo = (id) => (id === IDIOMA_ORIGEN ? '' : `/${id}`)
