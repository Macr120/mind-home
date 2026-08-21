/**
 * Slug puro de un texto. Módulo HOJA a propósito: lo importan `catalogo.ts`
 * (32 KB, perezoso) y `nombres.ts` (que llega al arranque vía `index.tsx` del
 * registry) — si viviera en el catálogo, las claves i18n arrastrarían el
 * catálogo entero al bundle inicial.
 *
 * Es EL algoritmo compartido de las claves del catálogo: lo usan `slugGrupo`,
 * las claves i18n (`nombres.ts`) y `scripts/generar-i18n-ejercicio.mjs` — si
 * divergieran, el diccionario y el runtime dejarían de encontrarse.
 */

// Marcas diacríticas combinantes (acentos) que deja `normalize('NFD')`.
const DIACRITICOS_RE = /[̀-ͯ]/g

export function slugTexto(label: string): string {
  return label
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(DIACRITICOS_RE, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-+|-+$)/g, '')
}
