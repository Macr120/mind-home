import type { PerfilDescanso, RegistroSueno } from '../../core/data/db'
import { hoyISO, sumarDias } from './fecha'

/**
 * Lógica pura del cuarto de Descanso (sin React ni DB).
 *
 * Sello visual: paleta de "noche" fría (índigo → cyan) con acento cálido para
 * el amanecer. Nada de relojes circulares ni anillos — todo se representa en
 * franjas y barras horizontales.
 */

export const NOCHE = '#818cf8' // índigo-400 (acento principal)
export const CYAN = '#67e8f9' // cyan-300 (números / progreso)
export const AMANECER = '#fbbf24' // ámbar-400 (despertar / sol)

const MIN_DIA = 24 * 60
/** La franja de noche abarca de 20:00 a 10:00 del día siguiente (14 h). */
export const FRANJA_INICIO_MIN = 20 * 60
export const FRANJA_TOTAL_MIN = 14 * 60

export const clamp = (n: number, min: number, max: number) =>
  Math.min(max, Math.max(min, n))

/** "HH:mm" → minutos desde medianoche, o null si es inválido. */
export function parseHoraMin(hhmm?: string): number | null {
  if (!hhmm) return null
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm)
  if (!m) return null
  const h = Number(m[1])
  const min = Number(m[2])
  if (h > 23 || min > 59) return null
  return h * 60 + min
}

/** Duración en horas entre acostarse y despertar (cruza medianoche). */
export function duracionHoras(acostarse?: string, despertar?: string): number | null {
  const a = parseHoraMin(acostarse)
  const b = parseHoraMin(despertar)
  if (a == null || b == null) return null
  let diff = b - a
  if (diff <= 0) diff += MIN_DIA
  return Math.round((diff / 60) * 10) / 10
}

/** 7.5 → "7h 30m". */
export function formatHoras(horas: number): string {
  const total = Math.round(horas * 60)
  const h = Math.floor(total / 60)
  const m = total % 60
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}

/** Horas objetivo derivadas del horario (ventana dormir → despertar). */
export function horasObjetivo(perfil?: PerfilDescanso): number {
  const h = duracionHoras(perfil?.horaObjetivoDormir, perfil?.horaObjetivoDespertar)
  return h ?? 8
}

/**
 * Posición 0..1 de una hora dentro de la franja de noche (20:00 → 10:00).
 * Las horas de madrugada (< 12:00) se tratan como del día siguiente.
 */
export function posicionEnFranja(hhmm?: string): number {
  const m = parseHoraMin(hhmm)
  if (m == null) return 0
  const abs = m < 12 * 60 ? m + MIN_DIA : m
  return clamp((abs - FRANJA_INICIO_MIN) / FRANJA_TOTAL_MIN, 0, 1)
}

/**
 * Puntuación de descanso 0–100 de una noche.
 * Duración (60%) contra la meta, penalizando dormir de más; calidad (40%).
 */
export function puntuacionNoche(r: RegistroSueno, objetivo: number): number {
  const ratio = objetivo > 0 ? r.horas / objetivo : 0
  const dur =
    ratio >= 1 ? Math.max(0, 1 - (ratio - 1) * 0.5) : Math.max(0, ratio)
  const cal = clamp(r.calidad / 5, 0, 1)
  return Math.round(clamp(dur * 0.6 + cal * 0.4, 0, 1) * 100)
}

export function nivelPuntuacion(score: number): { label: string; color: string } {
  if (score >= 85) return { label: 'Excelente', color: '#4ade80' }
  if (score >= 70) return { label: 'Bien', color: CYAN }
  if (score >= 50) return { label: 'Regular', color: AMANECER }
  return { label: 'Bajo', color: '#f87171' }
}

/** Mapa fecha → registro, para búsquedas por día. */
function porFecha(registros: RegistroSueno[]): Map<string, RegistroSueno> {
  return new Map(registros.map((r) => [r.fecha, r]))
}

/** Déficit de sueño acumulado de las últimas 7 noches (positivo = falta dormir). */
export function deficitSemana(
  registros: RegistroSueno[],
  objetivo: number,
): { deficit: number; noches: number } {
  const mapa = porFecha(registros)
  let deficit = 0
  let noches = 0
  let f = hoyISO()
  for (let i = 0; i < 7; i++) {
    const r = mapa.get(f)
    if (r) {
      deficit += objetivo - r.horas
      noches++
    }
    f = sumarDias(f, -1)
  }
  return { deficit: Math.round(deficit * 10) / 10, noches }
}

/** Promedio de horas de las noches registradas en los últimos `dias` días. */
export function promedioHoras(registros: RegistroSueno[], dias: number): number | null {
  const mapa = porFecha(registros)
  const vals: number[] = []
  let f = hoyISO()
  for (let i = 0; i < dias; i++) {
    const r = mapa.get(f)
    if (r) vals.push(r.horas)
    f = sumarDias(f, -1)
  }
  if (vals.length === 0) return null
  return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10
}

/** Racha de noches consecutivas (hasta hoy) con registro. */
export function rachaNoches(registros: RegistroSueno[]): number {
  const fechas = new Set(registros.map((r) => r.fecha))
  let racha = 0
  let f = hoyISO()
  while (fechas.has(f)) {
    racha++
    f = sumarDias(f, -1)
  }
  return racha
}

export interface NocheTendencia {
  fecha: string
  horas: number
  score: number
  hay: boolean
}

/** Serie de las últimas `dias` noches para la gráfica de tendencia. */
export function tendencia(
  registros: RegistroSueno[],
  objetivo: number,
  dias = 14,
): NocheTendencia[] {
  const mapa = porFecha(registros)
  return Array.from({ length: dias }, (_, i) => {
    const fecha = sumarDias(hoyISO(), -(dias - 1 - i))
    const r = mapa.get(fecha)
    return {
      fecha,
      horas: r?.horas ?? 0,
      score: r ? puntuacionNoche(r, objetivo) : 0,
      hay: !!r,
    }
  })
}

/**
 * Consistencia del horario: desviación estándar (en minutos) de las horas de
 * acostarse de las últimas noches. Devuelve null si faltan datos.
 */
export function desviacionHorario(registros: RegistroSueno[]): number | null {
  const mins = registros
    .slice(0, 14)
    .map((r) => parseHoraMin(r.horaAcostarse))
    .filter((m): m is number => m != null)
    .map((m) => (m < 12 * 60 ? m + MIN_DIA : m))
  if (mins.length < 3) return null
  const avg = mins.reduce((a, b) => a + b, 0) / mins.length
  const varc = mins.reduce((a, b) => a + (b - avg) ** 2, 0) / mins.length
  return Math.round(Math.sqrt(varc))
}

export function etiquetaConsistencia(sd: number | null): {
  label: string
  detalle: string
} | null {
  if (sd == null) return null
  if (sd <= 30) return { label: 'Muy consistente', detalle: '±30 min' }
  if (sd <= 60) return { label: 'Consistente', detalle: '±1 h' }
  return { label: 'Irregular', detalle: `±${Math.round(sd / 60)} h aprox.` }
}
