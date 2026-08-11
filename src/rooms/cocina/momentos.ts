import type { MomentoComida, Receta } from '../../core/data/db'
import { MOMENTOS } from './constantes'

const IDS_VALIDOS = new Set<string>(MOMENTOS.map((m) => m.id))

export function getMomento(id: MomentoComida) {
  return MOMENTOS.find((m) => m.id === id) ?? MOMENTOS[0]
}

/** Coerción segura de una lista de momentos que llega de la IA (unknown). */
export function vMomentos(v: unknown): MomentoComida[] {
  const items = Array.isArray(v) ? v : typeof v === 'string' ? v.split(',') : []
  return [
    ...new Set(
      items
        .map((x) => (typeof x === 'string' ? x.trim().toLowerCase() : ''))
        .filter((x): x is MomentoComida => IDS_VALIDOS.has(x)),
    ),
  ]
}

/**
 * Si una receta encaja en ese momento del día. Sin catalogar vale para todos:
 * el recetario es anterior a los momentos y sus recetas no pueden desaparecer
 * del selector solo por no tenerlos puestos.
 */
export function recetaEnMomento(receta: Receta, momento: MomentoComida): boolean {
  return !receta.momentos?.length || receta.momentos.includes(momento)
}
