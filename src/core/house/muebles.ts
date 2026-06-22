import type { ObjetoCuarto } from '../data/db'

/**
 * El objeto "principal" de un cuarto es su punto de entrada (la burbuja de
 * interacción se ancla en él). Se marca con `permanente` y hay uno por cuarto.
 */
export function esMueblePrincipal(o: ObjetoCuarto): boolean {
  return o.permanente === true
}
