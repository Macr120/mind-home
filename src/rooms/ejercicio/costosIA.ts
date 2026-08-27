import type { OperacionIA } from '../../core/cuenta/catalogoIA'

/**
 * Lo que cuesta la IA en Ejercicio: escribir una rutina, ilustrar los
 * ejercicios (y el planificador ✨ de metas, que es del núcleo). El lote es la
 * operación más cara de toda la app — un grupo de 20 ejercicios son 20
 * imágenes de una sentada.
 */

export const OP_RUTINA: OperacionIA = {
  id: 'ejercicio.rutina',
  clave: 'ia.op.ejercicio.rutina',
  es: 'Crear una rutina con IA',
  dondeClave: 'ia.donde.ejercicio.catalogo',
  dondeEs: 'Catálogo de ejercicios',
  partes: [{ op: 'texto' }],
}

export const OP_IMAGEN_EJERCICIO: OperacionIA = {
  id: 'ejercicio.imagen',
  clave: 'ia.op.ejercicio.imagen',
  es: 'Ilustrar un ejercicio',
  dondeClave: 'ia.donde.ejercicio.catalogo',
  dondeEs: 'Catálogo de ejercicios',
  partes: [{ op: 'imagen' }],
}

export const OP_LOTE_IMAGENES: OperacionIA = {
  id: 'ejercicio.lote',
  clave: 'ia.op.ejercicio.lote',
  es: 'Ilustrar los ejercicios que faltan',
  dondeClave: 'ia.donde.ejercicio.catalogo',
  dondeEs: 'Catálogo de ejercicios',
  lote: true,
  notaClave: 'ia.op.ejercicio.lote.nota',
  notaEs: 'Una imagen por ejercicio sin ilustrar: el total depende de cuántos falten.',
  partes: [{ op: 'imagen', veces: 'n' }],
}

export const OPERACIONES_IA: OperacionIA[] = [OP_RUTINA, OP_IMAGEN_EJERCICIO, OP_LOTE_IMAGENES]
