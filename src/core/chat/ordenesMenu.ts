import { normalizarOrden } from '../navegador/ordenes'

/**
 * Órdenes del chat que abren uno de los menús de su barra («amigos»,
 * «asistentes», «lugares»…). Deterministas, sin IA. El navegador tiene las
 * suyas en `navegador/ordenes.ts` («historial», «sitios», «navegador»…).
 */

/** Las cuatro vistas del menú del chat, de izquierda a derecha. */
export type VistaMenu = 'amigos' | 'asistentes' | 'lugares' | 'navegador'

const RE: [RegExp, VistaMenu][] = [
  [/^(?:mis |los |tus )?amigos$|^(?:my )?friends$/, 'amigos'],
  [/^(?:mis |los |tus )?asistentes$|^(?:my )?assistants$/, 'asistentes'],
  [/^(?:mis |los |tus )?lugares$|^como llegar$|^(?:my )?places$|^directions$/, 'lugares'],
]

/** ¿El mensaje pide abrir un menú del chat? Devuelve la vista que toca. */
export function ordenMenu(texto: string): VistaMenu | null {
  const n = normalizarOrden(texto)
  for (const [re, vista] of RE) if (re.test(n)) return vista
  return null
}
