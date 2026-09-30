import { useDiseño } from '../state/disenoStore'
import { baseDe, getTema, mezclar, type Tema } from './temas'

/** Piedra del castillo: la fachada del tema aclarada hacia arenisca. */
export const colorPiedraCastillo = (t: Tema) => mezclar(t.shell.muroExt, '#c9b48f', 0.35)

/**
 * Con el tema medieval, la fachada es de piedra (sillares) en vez del color de cada
 * cuarto. Devuelve el color de la piedra, o null si el tema no es medieval.
 */
export function usePiedraCastillo(): string | null {
  const id = useDiseño((s) => s.temaGlobal)
  useDiseño((s) => s.temaRev)
  const tema = getTema(id)
  return baseDe(id) === 'medieval' && tema ? colorPiedraCastillo(tema) : null
}
