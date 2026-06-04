import type { MomentoComida } from '../../core/data/db'
import { MOMENTOS } from './constantes'

export function getMomento(id: MomentoComida) {
  return MOMENTOS.find((m) => m.id === id) ?? MOMENTOS[0]
}
