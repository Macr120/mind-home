import type { OperacionIA } from '../../core/cuenta/catalogoIA'

/**
 * Lo que cuesta la IA en Entretenimiento. Las portadas NO gastan créditos: se
 * buscan en Wikipedia y Open Library, no se generan.
 */

export const OP_FICHA: OperacionIA = {
  id: 'entretenimiento.ficha',
  clave: 'ia.op.entretenimiento.ficha',
  es: 'Rellenar la ficha con IA',
  dondeClave: 'ia.donde.entretenimiento.archivo',
  dondeEs: 'Archivo',
  partes: [{ op: 'texto' }],
}

export const OP_RESUMEN: OperacionIA = {
  id: 'entretenimiento.resumen',
  clave: 'ia.op.entretenimiento.resumen',
  es: 'Resumen de una obra',
  dondeClave: 'ia.donde.entretenimiento.archivo',
  dondeEs: 'Archivo',
  partes: [{ op: 'texto' }],
}

export const OPERACIONES_IA: OperacionIA[] = [OP_FICHA, OP_RESUMEN]
