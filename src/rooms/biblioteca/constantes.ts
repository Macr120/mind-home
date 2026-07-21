import { PILARES } from './pilares'

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

/** Pilar (campo del conocimiento) por id, con fallback al campo General. */
export function getPilar(id: string) {
  return PILARES.find((p) => p.id === id) ?? PILAR_GENERAL
}
