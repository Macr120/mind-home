import type { GratitudDiaria, SesionMindfulness } from '../../core/data/db'
import { hoyISO, sumarDias } from './fecha'

/**
 * Filosofía del jardín: nada de XP, niveles ni rachas que castiguen faltar.
 * La única medida es la CALMA ACUMULADA (minutos de por vida, solo suman)
 * y los días con calma del mes se celebran sin marcar los ausentes.
 */

export interface EtapaCalma {
  id: string
  icono: string
  nombre: string
  /** Minutos acumulados a partir de los cuales se alcanza la etapa. */
  min: number
}

const ETAPAS: EtapaCalma[] = [
  { id: 'semilla', icono: '🌰', nombre: 'Semilla', min: 0 },
  { id: 'brote', icono: '🌱', nombre: 'Brote', min: 30 },
  { id: 'retono', icono: '🪴', nombre: 'Retoño', min: 120 },
  { id: 'planta', icono: '🌿', nombre: 'Planta', min: 300 },
  { id: 'arbol', icono: '🌳', nombre: 'Árbol joven', min: 600 },
  { id: 'flor', icono: '🌸', nombre: 'Jardín en flor', min: 1200 },
  { id: 'bosque', icono: '🏞️', nombre: 'Bosque sereno', min: 2400 },
]

export function minutosTotales(sesiones: SesionMindfulness[]): number {
  return sesiones.reduce((acc, s) => acc + s.duracionMin, 0)
}

export function etapaActual(minTotales: number): EtapaCalma {
  let etapa = ETAPAS[0]
  for (const e of ETAPAS) if (minTotales >= e.min) etapa = e
  return etapa
}

export function siguienteEtapa(minTotales: number): EtapaCalma | undefined {
  return ETAPAS.find((e) => e.min > minTotales)
}

/** Días distintos con alguna práctica o agradecimiento en los últimos 30 días. */
export function diasConCalmaMes(
  sesiones: SesionMindfulness[],
  gratitudes: GratitudDiaria[],
): number {
  const desde = sumarDias(hoyISO(), -29)
  const dias = new Set<string>()
  for (const s of sesiones) if (s.fecha >= desde) dias.add(s.fecha)
  for (const g of gratitudes) if (g.fecha >= desde) dias.add(g.fecha)
  return dias.size
}
