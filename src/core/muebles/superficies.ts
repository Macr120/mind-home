import { armarMueble } from './modulos'
import type { Mm, Mueble } from './tipos'

/**
 * Dónde se puede APOYAR algo en un mueble: las caras de arriba de su cubierta,
 * techo, repisas y entrepaños, sacadas del `Cuerpo` (la única geometría). En
 * milímetros y centradas en X/Z igual que `piezas3DDeCuerpo`, que es como el
 * mueble se dibuja en la casa.
 */
export interface Superficie {
  /** Índice de la altura de abajo arriba; columnas a la misma altura comparten nivel. */
  nivel: number
  /** Cara de arriba, desde el suelo. */
  y: Mm
  cx: Mm
  cz: Mm
  ancho: Mm
  fondo: Mm
  disco?: boolean
}

const ROLES_APOYO = new Set(['techo', 'cubierta', 'repisa', 'entrepano', 'piso'])

const memo = new WeakMap<Mueble, Superficie[]>()

export function superficiesDeMueble(m: Mueble): Superficie[] {
  const previo = memo.get(m)
  if (previo) return previo
  const c = armarMueble(m)
  // Con cajones el piso queda tapado por ellos: no hay dónde dejar nada.
  const conCajones = Number(m.opciones.cajones ?? 0) > 0
  const crudas = c.partes.filter(
    (p) => ROLES_APOYO.has(p.rol) && !p.rot && !(p.rol === 'piso' && conCajones) && p.dx > 0 && p.dz > 0,
  )
  const alturas = [...new Set(crudas.map((p) => p.y + p.dy))].sort((a, b) => a - b)
  const sup = crudas.map((p) => ({
    nivel: alturas.indexOf(p.y + p.dy),
    y: p.y + p.dy,
    cx: p.x + p.dx / 2 - c.bbox.ancho / 2,
    cz: p.z + p.dz / 2 - c.bbox.fondo / 2,
    ancho: p.dx,
    fondo: p.dz,
    ...(p.disco ? { disco: true } : {}),
  }))
  memo.set(m, sup)
  return sup
}

/** Cuántos niveles distintos tiene el mueble. */
export const nivelesDe = (s: Superficie[]): number => (s.length ? Math.max(...s.map((x) => x.nivel)) + 1 : 0)
