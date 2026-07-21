/**
 * Posición viva (x,z) de cada asistente en el mapa. La escribe `Asistente3D`
 * cada frame, mutando en sitio (patrón `playerPos`: sin re-render). La leen el
 * modo diálogo (para plantar al NPC frente al jugador) y quien necesite saber
 * dónde anda un asistente sin tocar la escena.
 */
export const posAsistentes: Record<string, { x: number; z: number }> = {}
