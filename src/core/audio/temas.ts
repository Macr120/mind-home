import type { MoodMusica } from '../state/ajustesStore'
import { getPlantilla } from '../registry'
import { getCuarto } from '../state/cuartosStore'

/**
 * Tema musical por cuarto: cada cuarto puede tener su propio ambiente de la
 * música generada. El tema efectivo sale de (en orden): el override que el
 * usuario guardó en el cuarto ('silencio' = cuarto callado) → el ambiente
 * sugerido por su primera app asignada → null (sigue el ambiente global).
 */

export type TemaCuarto = MoodMusica | 'silencio'

/** Los 12 ambientes en orden de UI (etiqueta por i18n: `ajustes.musica.mood.<id>`). */
export const MOODS_LISTA: { id: MoodMusica; emoji: string; defecto: string }[] = [
  { id: 'calma', emoji: '🕊️', defecto: 'Calma' },
  { id: 'festivo', emoji: '🎉', defecto: 'Festivo' },
  { id: 'nocturno', emoji: '🌙', defecto: 'Nocturno' },
  { id: 'chiptune', emoji: '👾', defecto: 'Chiptune' },
  { id: 'acogedor', emoji: '☕', defecto: 'Acogedor' },
  { id: 'energia', emoji: '⚡', defecto: 'Energía' },
  { id: 'estudio', emoji: '📚', defecto: 'Estudio' },
  { id: 'arcade', emoji: '🕹️', defecto: 'Arcade' },
  { id: 'bosque', emoji: '🌿', defecto: 'Bosque' },
  { id: 'viaje', emoji: '🧭', defecto: 'Viaje' },
  { id: 'carrera', emoji: '🏁', defecto: 'Carrera' },
  { id: 'cajita', emoji: '🎠', defecto: 'Cajita' },
]

/** Ambiente sugerido por app; las plantillas custom caen por su categoría. */
const MOOD_PLANTILLA: Record<string, MoodMusica> = {
  cocina: 'acogedor',
  ejercicio: 'energia',
  descanso: 'nocturno',
  anecdotario: 'cajita',
  despacho: 'estudio',
  biblioteca: 'estudio',
  idiomas: 'viaje',
  entretenimiento: 'arcade',
  sala: 'viaje',
  jardin: 'bosque',
  garage: 'carrera',
  diario: 'estudio',
  hobbies: 'acogedor',
  calendario: 'calma',
  caminos: 'viaje',
  canchas: 'arcade',
  huerto: 'bosque',
  granja: 'bosque',
}

const MOOD_CATEGORIA: Record<string, MoodMusica> = {
  cuerpo: 'energia',
  mente: 'estudio',
  complemento: 'calma',
  config: 'calma',
}

export function moodDePlantilla(plantillaId: string): MoodMusica | null {
  const fijo = MOOD_PLANTILLA[plantillaId]
  if (fijo) return fijo
  const p = getPlantilla(plantillaId)
  return p ? (MOOD_CATEGORIA[p.categoria] ?? 'calma') : null
}

/**
 * Tema automático de un cuarto: el ambiente de su primera app asignada.
 * `objetos` son los del diseño (para no importar disenoStore desde aquí).
 */
export function temaAutoDeCuarto(
  cuartoId: string,
  objetos: { roomId: string; plantillaId?: string }[],
): MoodMusica | null {
  for (const o of objetos) {
    if (o.roomId !== cuartoId || !o.plantillaId) continue
    const m = moodDePlantilla(o.plantillaId)
    if (m) return m
  }
  return null
}

/** Tema efectivo de un cuarto: override guardado → automático por su app. */
export function temaDeCuarto(
  cuartoId: string,
  objetos: { roomId: string; plantillaId?: string }[],
): TemaCuarto | null {
  return getCuarto(cuartoId)?.temaMusical ?? temaAutoDeCuarto(cuartoId, objetos)
}
