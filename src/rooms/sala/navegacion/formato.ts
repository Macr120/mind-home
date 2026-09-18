import type { PiernaNav } from '../../../core/data/db'
import type { TFunc } from '../../../core/i18n/useT'
import { familiaModo, nombreModo } from './modos'

/** «350 m» · «1.2 km» · «14 km». */
export function formatoDistancia(metros: number, locale: string): string {
  if (metros < 1000) return `${metros < 100 ? Math.round(metros) : Math.round(metros / 10) * 10} m`
  const km = metros / 1000
  return `${km.toLocaleString(locale, { maximumFractionDigits: km < 10 ? 1 : 0 })} km`
}

/** «35 min» · «1 h 05 min». */
export function formatoDuracion(t: TFunc, segundos: number): string {
  const min = Math.max(1, Math.round(segundos / 60))
  if (min < 60) return t('sala.nav.min', '{n} min', { n: min })
  return t('sala.nav.horas', '{h} h {m} min', {
    h: Math.floor(min / 60),
    m: String(min % 60).padStart(2, '0'),
  })
}

export function formatoHora(iso: string, locale: string): string {
  return new Date(iso).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })
}

/** Frase de un tramo: «Camina 400 m hasta …» · «Toma Autobús 100 hacia … · 6 paradas · Baja en …». */
export function resumenPierna(t: TFunc, p: PiernaNav, locale: string): string {
  const d = formatoDistancia(p.distancia ?? 0, locale)
  const lugar = p.a.nombre
  switch (familiaModo(p.modo)) {
    case 'WALK':
      return t('sala.nav.caminaHasta', 'Camina {d} hasta {lugar}', { d, lugar })
    case 'BIKE':
      return t('sala.nav.pedaleaHasta', 'Pedalea {d} hasta {lugar}', { d, lugar })
    case 'CAR':
      return t('sala.nav.conduceHasta', 'Conduce {d} hasta {lugar}', { d, lugar })
    default: {
      const linea = [nombreModo(t, p.modo), p.linea].filter(Boolean).join(' ')
      const toma = p.destinoLinea
        ? t('sala.nav.tomaLinea', 'Toma {linea} hacia {destino}', { linea, destino: p.destinoLinea })
        : t('sala.nav.tomaLineaSin', 'Toma {linea}', { linea })
      const n = (p.paradas?.length ?? 0) + 1
      const paradas = n === 1 ? t('sala.nav.parada', '1 parada') : t('sala.nav.paradas', '{n} paradas', { n })
      return `${toma} · ${paradas} · ${t('sala.nav.bajaEn', 'Baja en {lugar}', { lugar })}`
    }
  }
}
