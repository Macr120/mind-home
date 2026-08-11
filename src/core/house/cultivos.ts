import type { CultivoCelda, EspecieCultivo } from '../data/db'

/**
 * Catálogo puro del huerto (sin dependencias de render): especies con sus
 * tiempos de crecimiento y riego, y la derivación del estado de un cultivo.
 * Lo importan el store, la escena 3D y el resumen 2D.
 */

export interface EspecieDef {
  nombre: string
  icon: string
  /** Minutos reales de siembra a "listo para cosechar". */
  duracionMin: number
  /** Ventana de riego: si pasa este tiempo sin regar (antes de estar listo), se marchita. */
  riegoCadaMin: number
  /** Color del fruto/flor (esferas de la etapa "listo"). */
  color: string
}

export const ESPECIES: Record<EspecieCultivo, EspecieDef> = {
  zanahoria: { nombre: 'Zanahoria', icon: '🥕', duracionMin: 3, riegoCadaMin: 2, color: '#f97316' },
  lechuga: { nombre: 'Lechuga', icon: '🥬', duracionMin: 5, riegoCadaMin: 3, color: '#84cc16' },
  girasol: { nombre: 'Girasol', icon: '🌻', duracionMin: 10, riegoCadaMin: 4, color: '#eab308' },
  tomate: { nombre: 'Tomate', icon: '🍅', duracionMin: 20, riegoCadaMin: 8, color: '#ef4444' },
  maiz: { nombre: 'Maíz', icon: '🌽', duracionMin: 60, riegoCadaMin: 20, color: '#facc15' },
  calabaza: { nombre: 'Calabaza', icon: '🎃', duracionMin: 120, riegoCadaMin: 40, color: '#ea580c' },
}

export type EtapaCultivo = 'semilla' | 'brote' | 'planta' | 'listo' | 'marchito'

/**
 * Minutos que una parcela se ve marchita antes de limpiarse sola y volver a
 * tierra virgen (el barrido lo hace `limpiarMarchitos` del huertoStore).
 */
export const MARCHITO_VISIBLE_MIN = 10

export interface EstadoCultivo {
  etapa: EtapaCultivo
  /** Avance 0–1 de siembra a listo (1 al estar listo o marchito). */
  progreso: number
  /** Va a marchitarse pronto: conviene regar (solo etapas en crecimiento). */
  sediento: boolean
  /** Ms en que se marchitó (solo en la etapa 'marchito'). */
  marchitoEn?: number
}

/**
 * Estado derivado de un cultivo a partir de sus timestamps (sin timers persistentes).
 * Reglas: si venció la ventana de riego antes de estar listo → marchito (ya no se
 * salva); lo listo ya no se marchita (cosecha segura); regar reinicia la ventana.
 * `regadaDesde` (de celdasRegadas): la celda tiene aspersor cerca desde ese ms —
 * si llegó antes de vencer la ventana, el cultivo nunca se marchita ni tiene sed
 * (un aspersor tardío no resucita lo ya marchito).
 */
export function estadoCultivo(c: CultivoCelda, ahora: number, regadaDesde?: number): EstadoCultivo | null {
  if (!c.especie || c.plantadoEn == null) return null
  const def = ESPECIES[c.especie]
  const ultimaAgua = c.regadoEn ?? c.plantadoEn
  const marchitaEn = ultimaAgua + def.riegoCadaMin * 60_000
  const listoEn = c.plantadoEn + def.duracionMin * 60_000
  const cubierto = regadaDesde != null && regadaDesde <= marchitaEn
  if (!cubierto && marchitaEn < listoEn && ahora >= marchitaEn)
    return { etapa: 'marchito', progreso: 1, sediento: false, marchitoEn: marchitaEn }
  if (ahora >= listoEn) return { etapa: 'listo', progreso: 1, sediento: false }
  const progreso = Math.max(0, (ahora - c.plantadoEn) / (listoEn - c.plantadoEn))
  const etapa: EtapaCultivo = progreso < 0.25 ? 'semilla' : progreso < 0.6 ? 'brote' : 'planta'
  const sediento = !cubierto && ahora >= ultimaAgua + def.riegoCadaMin * 60_000 * 0.6
  return { etapa, progreso, sediento }
}

/**
 * Celdas cubiertas por aspersores: clave "col,row" → ms de instalación del
 * aspersor más antiguo que la cubre (la propia celda + las 8 vecinas).
 */
export function celdasRegadas(filas: CultivoCelda[]): Map<string, number> {
  const m = new Map<string, number>()
  for (const f of filas) {
    if (f.aspersorEn == null) continue
    for (let dc = -1; dc <= 1; dc++) {
      for (let dr = -1; dr <= 1; dr++) {
        const k = `${f.col + dc},${f.row + dr}`
        m.set(k, Math.min(m.get(k) ?? Infinity, f.aspersorEn))
      }
    }
  }
  return m
}
