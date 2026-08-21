import { useEffect, useState } from 'react'
import type { Idioma } from '../../../core/i18n/idiomas'
import { useAjustes } from '../../../core/state/ajustesStore'

/**
 * Traducciones de los bancos de preguntas de los mazos de cartas, por ÍNDICE:
 * cada `preguntas.i18n.<id>.ts` trae los dos arrays en el MISMO ORDEN que el
 * español de `preguntas.ts` (el precedente es el catálogo del diario). Se
 * cargan perezosos: un usuario en español no descarga nada.
 */

export interface BancoPreguntas {
  conocerse: string[]
  debates: string[]
}

const CARGADORES: Partial<Record<Idioma, () => Promise<BancoPreguntas>>> = {
  en: () => import('./preguntas.i18n.en').then((m) => m.PREGUNTAS_EN),
  pt: () => import('./preguntas.i18n.pt').then((m) => m.PREGUNTAS_PT),
  fr: () => import('./preguntas.i18n.fr').then((m) => m.PREGUNTAS_FR),
  de: () => import('./preguntas.i18n.de').then((m) => m.PREGUNTAS_DE),
  it: () => import('./preguntas.i18n.it').then((m) => m.PREGUNTAS_IT),
  ja: () => import('./preguntas.i18n.ja').then((m) => m.PREGUNTAS_JA),
  zh: () => import('./preguntas.i18n.zh').then((m) => m.PREGUNTAS_ZH),
  ko: () => import('./preguntas.i18n.ko').then((m) => m.PREGUNTAS_KO),
  ru: () => import('./preguntas.i18n.ru').then((m) => m.PREGUNTAS_RU),
  hi: () => import('./preguntas.i18n.hi').then((m) => m.PREGUNTAS_HI),
  tr: () => import('./preguntas.i18n.tr').then((m) => m.PREGUNTAS_TR),
  id: () => import('./preguntas.i18n.id').then((m) => m.PREGUNTAS_ID),
  pl: () => import('./preguntas.i18n.pl').then((m) => m.PREGUNTAS_PL),
  nl: () => import('./preguntas.i18n.nl').then((m) => m.PREGUNTAS_NL),
  ar: () => import('./preguntas.i18n.ar').then((m) => m.PREGUNTAS_AR),
}

/**
 * El banco traducido del idioma activo, o `null` mientras carga y en español.
 * La carta pinta `banco?.conocerse[p.i] ?? p.texto`.
 */
export function useBancoPreguntas(): BancoPreguntas | null {
  const idioma = useAjustes((s) => s.idioma)
  const [banco, setBanco] = useState<BancoPreguntas | null>(null)

  useEffect(() => {
    let vivo = true
    const cargador = idioma === 'es' ? null : (CARGADORES[idioma] ?? CARGADORES.en)
    // Siempre asíncrono (también el vaciado al volver a español): la regla de
    // hooks prohíbe el setState síncrono dentro del efecto.
    void Promise.resolve(cargador?.() ?? null).then((b) => {
      if (vivo) setBanco(b)
    })
    return () => {
      vivo = false
    }
  }, [idioma])

  return banco
}
