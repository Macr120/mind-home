/**
 * Cargadores por idioma del año demo de ejercicio: el español y el inglés
 * viajan en `demo.data.ts`; cada rama extra vive en `demo.data.i18n.<idioma>.ts`
 * y solo se descarga la del idioma activo (ver `builders.ts::textos`).
 *
 * Lo montan `partir-demo-i18n.mjs` / `traducir-a-mano.mjs meter` — no lo
 * edites a mano.
 */
export default {
  pt: () => import('./demo.data.i18n.pt'),
  fr: () => import('./demo.data.i18n.fr'),
  de: () => import('./demo.data.i18n.de'),
  it: () => import('./demo.data.i18n.it'),
  ja: () => import('./demo.data.i18n.ja'),
  zh: () => import('./demo.data.i18n.zh'),
  ko: () => import('./demo.data.i18n.ko'),
  ru: () => import('./demo.data.i18n.ru'),
  hi: () => import('./demo.data.i18n.hi'),
  tr: () => import('./demo.data.i18n.tr'),
  id: () => import('./demo.data.i18n.id'),
  pl: () => import('./demo.data.i18n.pl'),
  nl: () => import('./demo.data.i18n.nl'),
  ar: () => import('./demo.data.i18n.ar'),
}
