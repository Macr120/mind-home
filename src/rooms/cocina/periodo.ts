import { fechaLocalISO, deIso, inicioSemana } from '../../core/fechaLocal'

/**
 * Periodos del paso Progreso. Módulo propio de cocina y no el de ejercicio:
 * aquel no tiene 'dia' y añadírselo contaminaría sus cuatro pestañas.
 */
export type Periodo = 'dia' | 'semana' | 'mes' | 'anio' | 'todo'

export const PERIODOS: { id: Periodo; labelEs: string }[] = [
  { id: 'dia', labelEs: 'Día' },
  { id: 'semana', labelEs: 'Semana' },
  { id: 'mes', labelEs: 'Mes' },
  { id: 'anio', labelEs: 'Año' },
  { id: 'todo', labelEs: 'Todo' },
]

/** Primer día del periodo que termina en `ref`; null = sin límite ('todo'). */
export function inicioPeriodo(p: Periodo, ref: string): string | null {
  switch (p) {
    case 'dia':
      return ref
    case 'semana':
      return fechaLocalISO(inicioSemana(deIso(ref)))
    case 'mes':
      return `${ref.slice(0, 7)}-01`
    case 'anio':
      return `${ref.slice(0, 4)}-01-01`
    case 'todo':
      return null
  }
}
