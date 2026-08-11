import type { CicloPomodoro } from './estudioStore'
import { campoDe } from './semilla'

export const COLOR = '#818cf8'

/** Campo comodín para charlas y entradas aún sin clasificar. */
export const PILAR_GENERAL = {
  id: 'general',
  titulo: 'General',
  icon: '🗂️',
  descripcion: 'Charlas y entradas sin campo asignado todavía.',
}

/** Duraciones del temporizador de estudio (minutos). */
export const DURACIONES_ESTUDIO = [15, 25, 45]

/** Recetas de pomodoro listas para usar; todo es ajustable después. */
export const CICLOS_POMODORO: { id: string; labelEs: string; ciclo: CicloPomodoro }[] = [
  { id: 'clasico', labelEs: 'Clásico', ciclo: { trabajoMin: 25, cortoMin: 5, largoMin: 15, cadaN: 4, tandas: 4 } },
  { id: 'profundo', labelEs: 'Profundo', ciclo: { trabajoMin: 50, cortoMin: 10, largoMin: 25, cadaN: 3, tandas: 3 } },
  { id: 'corto', labelEs: 'Corto', ciclo: { trabajoMin: 15, cortoMin: 3, largoMin: 12, cadaN: 4, tandas: 6 } },
]

/**
 * Pilar (campo del conocimiento) por id, con fallback al campo General.
 *
 * Resuelve contra el ÍNDICE VIVO (`campoDe`), así que respeta los campos que
 * el usuario renombró y los que creó él. Sigue siendo síncrona a propósito: la
 * llaman seis módulos en pleno render y muchas veces por render.
 */
export function getPilar(id: string): { id: string; titulo: string; icon: string } {
  return campoDe(id) ?? PILAR_GENERAL
}
