/**
 * El gesto nació aquí y se promovió a `core/ui/comun/arrastre.tsx` para que
 * toda la casa arrastre igual (fila entera sin asa, pulsación larga, fantasma
 * que viaja con el puntero). Este archivo queda como re-export para no tocar
 * los call-sites de la agenda.
 */
export {
  porOrden,
  guardarOrden,
  useArrastre,
  useArrastreFilas,
  Arrastrable,
} from '../../core/ui/comun/arrastre'
export type { PropsArrastre, FilaOrdenable, Arrastre } from '../../core/ui/comun/arrastre'
