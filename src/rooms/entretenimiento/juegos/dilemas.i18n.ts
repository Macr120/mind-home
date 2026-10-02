import { useEffect, useState } from 'react'
import type { Idioma } from '../../../core/i18n/idiomas'
import { useAjustes } from '../../../core/state/ajustesStore'
import type { Dilema } from './dilemas.data'

/**
 * Traducciones de los dilemas, por ÍNDICE: cada `dilemas.i18n.<id>.ts` trae los
 * dilemas en el MISMO ORDEN que el español de `dilemas.data.ts` (como
 * `preguntas.i18n.ts`). Se cargan perezosos: un usuario en español no descarga nada.
 */
const CARGADORES: Partial<Record<Idioma, () => Promise<Dilema[]>>> = {
  en: () => import('./dilemas.i18n.en').then((m) => m.DILEMAS_EN),
  pt: () => import('./dilemas.i18n.pt').then((m) => m.DILEMAS_PT),
  fr: () => import('./dilemas.i18n.fr').then((m) => m.DILEMAS_FR),
  de: () => import('./dilemas.i18n.de').then((m) => m.DILEMAS_DE),
  it: () => import('./dilemas.i18n.it').then((m) => m.DILEMAS_IT),
  ja: () => import('./dilemas.i18n.ja').then((m) => m.DILEMAS_JA),
  zh: () => import('./dilemas.i18n.zh').then((m) => m.DILEMAS_ZH),
  ko: () => import('./dilemas.i18n.ko').then((m) => m.DILEMAS_KO),
  ru: () => import('./dilemas.i18n.ru').then((m) => m.DILEMAS_RU),
  hi: () => import('./dilemas.i18n.hi').then((m) => m.DILEMAS_HI),
  tr: () => import('./dilemas.i18n.tr').then((m) => m.DILEMAS_TR),
  id: () => import('./dilemas.i18n.id').then((m) => m.DILEMAS_ID),
  pl: () => import('./dilemas.i18n.pl').then((m) => m.DILEMAS_PL),
  nl: () => import('./dilemas.i18n.nl').then((m) => m.DILEMAS_NL),
  ar: () => import('./dilemas.i18n.ar').then((m) => m.DILEMAS_AR),
}

/**
 * Los dilemas del idioma activo, o `null` mientras cargan y en español.
 * La partida pinta `traducidos?.[i] ?? DILEMAS[i]`.
 */
export function useDilemas(): Dilema[] | null {
  const idioma = useAjustes((s) => s.idioma)
  const [dilemas, setDilemas] = useState<Dilema[] | null>(null)

  useEffect(() => {
    let vivo = true
    const cargador = idioma === 'es' ? null : (CARGADORES[idioma] ?? CARGADORES.en)
    // Siempre asíncrono (también el vaciado al volver a español): la regla de
    // hooks prohíbe el setState síncrono dentro del efecto.
    void Promise.resolve(cargador?.() ?? null).then((d) => {
      if (vivo) setDilemas(d)
    })
    return () => {
      vivo = false
    }
  }, [idioma])

  return dilemas
}
