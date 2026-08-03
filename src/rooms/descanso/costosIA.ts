import type { OperacionIA } from '../../core/cuenta/catalogoIA'

/**
 * Lo que cuesta la IA en Descanso: la foto que apaga la alarma. Es la única
 * operación de toda la app que MANDA una imagen en vez de generarla — sale
 * barata porque la entrada cuesta 5× menos que la salida y la respuesta es un
 * sí/no.
 */

export const OP_EVIDENCIA: OperacionIA = {
  id: 'descanso.evidencia',
  clave: 'ia.op.descanso.evidencia',
  es: 'Evidencia con foto para apagar la alarma',
  dondeClave: 'ia.donde.descanso',
  dondeEs: 'Despertador',
  partes: [{ op: 'vision' }],
}

export const OPERACIONES_IA: OperacionIA[] = [OP_EVIDENCIA]
