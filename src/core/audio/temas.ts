import type { MoodMusica } from '../state/ajustesStore'
import { getPlantilla } from '../registry'

/**
 * Tema musical por cuarto: cada cuarto puede tener su propio ambiente de la
 * música generada. El tema efectivo sale de (en orden): el override que el
 * usuario guardó en el cuarto ('silencio' = cuarto callado) → el ambiente
 * sugerido por su primera app asignada → null (sigue el ambiente global).
 */

/** Los 21 ambientes en orden de UI (etiqueta por i18n: `ajustes.musica.mood.<id>`). */
export const MOODS_LISTA: { id: MoodMusica; emoji: string; defecto: string }[] = [
  { id: 'calma', emoji: '🕊️', defecto: 'Calma' },
  { id: 'festivo', emoji: '🎉', defecto: 'Festivo' },
  { id: 'nocturno', emoji: '🌙', defecto: 'Nocturno' },
  { id: 'chiptune', emoji: '👾', defecto: 'Chiptune' },
  { id: 'acogedor', emoji: '☕', defecto: 'Acogedor' },
  { id: 'energia', emoji: '⚡', defecto: 'Energía' },
  { id: 'estudio', emoji: '📚', defecto: 'Estudio' },
  { id: 'lectura', emoji: '📖', defecto: 'Lectura' },
  { id: 'oficina', emoji: '🗂️', defecto: 'Oficina' },
  { id: 'taller', emoji: '💡', defecto: 'Taller' },
  { id: 'digital', emoji: '🖥️', defecto: 'Digital' },
  { id: 'noticias', emoji: '📰', defecto: 'Noticias' },
  { id: 'arcade', emoji: '🕹️', defecto: 'Arcade' },
  { id: 'deporte', emoji: '🏟️', defecto: 'Deporte' },
  { id: 'tactico', emoji: '🎯', defecto: 'Táctico' },
  { id: 'bosque', emoji: '🌿', defecto: 'Bosque' },
  { id: 'campo', emoji: '🚜', defecto: 'Campo' },
  { id: 'viaje', emoji: '🧭', defecto: 'Viaje' },
  { id: 'ruta', emoji: '🛣️', defecto: 'Ruta' },
  { id: 'carrera', emoji: '🏁', defecto: 'Carrera' },
  { id: 'cajita', emoji: '🎠', defecto: 'Cajita' },
]

/**
 * Ambiente sugerido por app; las plantillas custom caen por su categoría.
 * Están las 21: antes cuatro (ideas, agenda, computo, paintball) no aparecían y
 * sonaban al genérico de su categoría, y nueve compartían ambiente de dos en dos.
 */
const MOOD_PLANTILLA: Record<string, MoodMusica> = {
  cocina: 'acogedor',
  ejercicio: 'energia',
  descanso: 'nocturno',
  anecdotario: 'cajita',
  despacho: 'estudio',
  biblioteca: 'lectura',
  idiomas: 'viaje',
  entretenimiento: 'arcade',
  sala: 'viaje',
  jardin: 'bosque',
  garage: 'carrera',
  diario: 'noticias',
  hobbies: 'acogedor',
  ideas: 'taller',
  agenda: 'oficina',
  computo: 'digital',
  caminos: 'ruta',
  canchas: 'deporte',
  huerto: 'campo',
  granja: 'campo',
  paintball: 'tactico',
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
