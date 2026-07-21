import type { RegistroSueno } from '../../core/data/db'

/** Minutos desde medianoche de un 'HH:mm' (NaN si no es válido). */
export const aMin = (hhmm?: string): number => {
  if (!hhmm || !/^\d{1,2}:\d{2}$/.test(hhmm)) return NaN
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

/** Duración en horas entre acostarse y despertar (tolera cruzar medianoche). */
export function duracionHoras(acostarse: string, despertar: string): number {
  const a = aMin(acostarse)
  const d = aMin(despertar)
  if (Number.isNaN(a) || Number.isNaN(d)) return 0
  let min = d - a
  if (min <= 0) min += 1440
  return Math.round((min / 60) * 100) / 100
}

/** Distancia circular en minutos entre dos horas del día (23:50 vs 00:10 = 20). */
export const distanciaMin = (a: number, b: number): number => {
  const d = Math.abs(a - b) % 1440
  return Math.min(d, 1440 - d)
}

type EtiquetaSueno = 'excelente' | 'buena' | 'regular' | 'baja'

export interface Puntuacion {
  total: number          // 0–100
  duracion: number       // 0–50
  horario: number        // 0–30
  interrupciones: number // 0–20
  etiqueta: EtiquetaSueno
}

const etiquetaDe = (total: number): EtiquetaSueno =>
  total >= 90 ? 'excelente' : total >= 70 ? 'buena' : total >= 50 ? 'regular' : 'baja'

/**
 * Puntuación de la noche estilo Apple Sueño:
 * duración 50 pts + constancia de hora de acostarse 30 pts + interrupciones 20 pts.
 */
export function puntuarNoche(
  r: RegistroSueno,
  perfil: { objetivoHoras: number; horaDormir: string },
): Puntuacion {
  const duracion = Math.round(50 * Math.min(1, r.horas / Math.max(1, perfil.objetivoHoras)))

  // Constancia: puntos completos al acostarse a la hora programada (±15 min de gracia).
  const acostarse = aMin(r.horaAcostarse)
  const programada = aMin(perfil.horaDormir)
  let horario = 21 // sin hora registrada: valor neutral
  if (!Number.isNaN(acostarse) && !Number.isNaN(programada)) {
    const desvio = Math.max(0, distanciaMin(acostarse, programada) - 15)
    horario = Math.round(30 * Math.max(0, 1 - desvio / 120))
  }

  const interrupciones = Math.max(0, 20 - 5 * (r.interrupciones ?? 0))

  const total = duracion + horario + interrupciones
  return { total, duracion, horario, interrupciones, etiqueta: etiquetaDe(total) }
}
