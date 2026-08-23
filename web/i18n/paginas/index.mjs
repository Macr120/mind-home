/**
 * Cargador de los catálogos de esta carpeta, uno por idioma. Existe para que la
 * APP (`src/core/ui/queEs/`) pueda pintar el contenido de la web —portada,
 * cómo funciona, precios, preguntas frecuentes— sin duplicar esos textos en
 * `dict.<id>.ts`: se escriben una vez aquí y valen en los dos sitios.
 *
 * Las páginas estáticas NO pasan por aquí: `scripts/web-i18n.mjs` importa cada
 * `<id>.mjs` directo, en tiempo de build y desde Node.
 *
 * Un import() por idioma para que el bundler los parta en chunks: quien abre el
 * recorrido baja SOLO el suyo, y quien no lo abre no baja ninguno.
 */

const CARGADORES = {
  es: () => import('./es.mjs'),
  en: () => import('./en.mjs'),
  pt: () => import('./pt.mjs'),
  fr: () => import('./fr.mjs'),
  de: () => import('./de.mjs'),
  it: () => import('./it.mjs'),
  ja: () => import('./ja.mjs'),
  zh: () => import('./zh.mjs'),
  ko: () => import('./ko.mjs'),
  ru: () => import('./ru.mjs'),
  hi: () => import('./hi.mjs'),
  tr: () => import('./tr.mjs'),
  id: () => import('./id.mjs'),
  pl: () => import('./pl.mjs'),
  nl: () => import('./nl.mjs'),
  ar: () => import('./ar.mjs'),
}

/**
 * Los textos del idioma pedido. Misma cascada que `core/i18n/porIdioma.ts`: el
 * respaldo visible es el INGLÉS y el español solo en último término.
 */
export async function cargarTextos(idioma) {
  const cargar = CARGADORES[idioma] ?? CARGADORES.en
  return (await cargar()).TEXTOS
}
