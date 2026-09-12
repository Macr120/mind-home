import { loadFont } from '@remotion/fonts'
import { staticFile } from 'remotion'

/**
 * Tipografía por idioma: Noto Sans para el latín y el cirílico, y la Noto propia
 * para árabe, japonés, chino, coreano e hindi. Son las mismas TTF (variables,
 * OFL) que usa el doblaje de `scripts/video/`; `preparar.mjs` las copia a
 * `public/fuentes/`.
 */
const PROPIA: Record<string, { familia: string; archivo: string }> = {
  ar: { familia: 'Noto Naskh Arabic', archivo: 'NotoNaskhArabic.ttf' },
  ja: { familia: 'Noto Sans JP', archivo: 'NotoSansJP.ttf' },
  zh: { familia: 'Noto Sans SC', archivo: 'NotoSansSC.ttf' },
  ko: { familia: 'Noto Sans KR', archivo: 'NotoSansKR.ttf' },
  hi: { familia: 'Noto Sans Devanagari', archivo: 'NotoSansDevanagari.ttf' },
}

export function familiaDe(idioma: string): string {
  const p = PROPIA[idioma]
  return p ? `'${p.familia}', 'Noto Sans', sans-serif` : `'Noto Sans', sans-serif`
}

export const esRTL = (idioma: string) => idioma === 'ar'

const cargadas = new Set<string>()
function cargar(familia: string, archivo: string) {
  if (cargadas.has(familia)) return
  cargadas.add(familia)
  // `loadFont` ya retrasa el render hasta que la fuente está lista.
  loadFont({ family: familia, url: staticFile('fuentes/' + archivo), weight: '100 900' }).catch(() => cargadas.delete(familia))
}

/** Carga Noto Sans y, si el idioma la necesita, su fuente propia. */
export function cargarFuentes(idioma: string) {
  cargar('Noto Sans', 'NotoSans.ttf')
  const p = PROPIA[idioma]
  if (p) cargar(p.familia, p.archivo)
}
