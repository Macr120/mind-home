/**
 * i18n del portal /cuenta — la única superficie de la web hecha con React. Las
 * páginas estáticas se traducen en el BUILD (scripts/web-i18n.mjs); aquí hay
 * que hacerlo en el navegador, así que los catálogos viajan en el bundle.
 *
 * Mismo trato que en la app (`src/core/i18n/useT.ts`): el español vive INLINE
 * como segundo argumento de `t()`, y solo los otros quince idiomas tienen
 * catálogo. Una clave sin traducir cae al español y se ve, que es la señal.
 *
 * El idioma sale, en este orden: de la URL (`/en/cuenta`, que es lo que sirve
 * el selector de la barra), de lo que el visitante eligió antes (`mph.idioma`)
 * y del idioma del navegador.
 */
import { IDIOMAS, IDIOMA_ORIGEN } from '../i18n/idiomas.mjs'
import { TEXTOS as EN } from '../i18n/cuenta/en'
import { TEXTOS as PT } from '../i18n/cuenta/pt'
import { TEXTOS as FR } from '../i18n/cuenta/fr'
import { TEXTOS as DE } from '../i18n/cuenta/de'
import { TEXTOS as IT } from '../i18n/cuenta/it'
import { TEXTOS as JA } from '../i18n/cuenta/ja'
import { TEXTOS as ZH } from '../i18n/cuenta/zh'
import { TEXTOS as KO } from '../i18n/cuenta/ko'
import { TEXTOS as RU } from '../i18n/cuenta/ru'
import { TEXTOS as HI } from '../i18n/cuenta/hi'
import { TEXTOS as TR } from '../i18n/cuenta/tr'
import { TEXTOS as ID } from '../i18n/cuenta/id'
import { TEXTOS as PL } from '../i18n/cuenta/pl'
import { TEXTOS as NL } from '../i18n/cuenta/nl'
import { TEXTOS as AR } from '../i18n/cuenta/ar'

export type Textos = Record<string, string>

const CATALOGOS: Record<string, Textos> = {
  en: EN, pt: PT, fr: FR, de: DE, it: IT, ja: JA, zh: ZH, ko: KO,
  ru: RU, hi: HI, tr: TR, id: ID, pl: PL, nl: NL, ar: AR,
}

const IDS = IDIOMAS.map((i) => i.id)

function detectar(): string {
  const enRuta = location.pathname.match(/^\/([a-z]{2})(\/|$)/)?.[1]
  if (enRuta && IDS.includes(enRuta)) return enRuta
  try {
    const guardado = localStorage.getItem('mph.idioma')
    if (guardado && IDS.includes(guardado)) return guardado
  } catch {
    /* localStorage bloqueado: se sigue con el navegador */
  }
  const nav = (navigator.language || '').slice(0, 2).toLowerCase()
  return IDS.includes(nav) ? nav : IDIOMA_ORIGEN
}

/** El idioma de ESTA carga. Congelado: cambiarlo es navegar a su URL. */
export const IDIOMA = detectar()

const TEXTOS: Textos = CATALOGOS[IDIOMA] ?? {}

/**
 * `t('clave', 'Español')` — con `vars`, sustituye `{n}` y compañía. El español
 * del segundo argumento es el original y el último respaldo.
 */
export function t(clave: string, es: string, vars?: Record<string, string | number>): string {
  let texto = TEXTOS[clave] ?? es
  if (vars) for (const [k, v] of Object.entries(vars)) texto = texto.split(`{${k}}`).join(String(v))
  return texto
}

/**
 * Una ruta de la web DENTRO del idioma actual: desde `/en/cuenta`, un enlace a
 * `/privacidad` tiene que ir a `/en/privacidad` o devolvería al español. Misma
 * regla que aplica `scripts/web-i18n.mjs` a las páginas estáticas.
 */
export function ruta(destino: string): string {
  return IDIOMA === IDIOMA_ORIGEN ? destino : `/${IDIOMA}${destino}`
}

/** Aplica el idioma al documento; el CSS hace el resto (árabe sin espejo). */
export function aplicarIdioma(): void {
  document.documentElement.lang = IDIOMA
}
