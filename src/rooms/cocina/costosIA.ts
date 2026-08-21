import { costoOperacion, type OperacionIA } from '../../core/cuenta/catalogoIA'

/**
 * Lo que cuesta pedirle cocina a la IA.
 *
 * Las recetas de una dieta las escribe el modelo aparte (una llamada cada una) y
 * cada plato lleva su foto, así que una dieta es la operación más cara de la
 * app: conviene que el número se vea antes de tocar el botón.
 */

/** Platillos que `SYSTEM_DIETA` pide como máximo (crearDietaIA los recorta a 4). */
export const RECETAS_POR_DIETA = 4

export const OP_RECETA: OperacionIA = {
  id: 'cocina.receta',
  clave: 'ia.op.cocina.receta',
  es: 'Crear receta con IA',
  dondeClave: 'ia.donde.cocina.recetario',
  dondeEs: 'Recetario',
  partes: [{ op: 'texto' }, { op: 'imagen', soloConImagen: true }],
}

export const OP_DIETA: OperacionIA = {
  id: 'cocina.dieta',
  clave: 'ia.op.cocina.dieta',
  es: 'Dieta completa o plan alimenticio',
  dondeClave: 'ia.donde.cocina.dietas',
  dondeEs: 'Dietas · Plan alimenticio',
  notaClave: 'ia.op.cocina.dieta.nota',
  notaEs: 'El plan y cada una de sus recetas se escriben aparte, y cada plato lleva su foto.',
  partes: [
    { op: 'texto' },
    { op: 'texto', veces: RECETAS_POR_DIETA },
    { op: 'imagen', veces: RECETAS_POR_DIETA + 1, soloConImagen: true },
  ],
}

export const OP_MACROS: OperacionIA = {
  id: 'cocina.macros',
  clave: 'ia.op.cocina.macros',
  es: 'Calcular calorías y macros',
  dondeClave: 'ia.donde.cocina.registro',
  dondeEs: 'Registro de comidas',
  partes: [{ op: 'texto' }],
}

export const OP_PORTADA: OperacionIA = {
  id: 'cocina.portada',
  clave: 'ia.op.cocina.portada',
  es: 'Foto de una receta o dieta',
  dondeClave: 'ia.donde.cocina.detalle',
  dondeEs: 'Detalle de receta o dieta',
  partes: [{ op: 'imagen' }],
}

export const OPERACIONES_IA: OperacionIA[] = [OP_RECETA, OP_DIETA, OP_MACROS, OP_PORTADA]

/** Una receta: la respuesta del modelo y, si se puede, su foto. */
export function costoReceta(conImagen: boolean): number {
  return costoOperacion(OP_RECETA, { conImagen })
}

/** Una dieta: su plan, cada receta que la compone y las fotos de todo. */
export function costoDieta(conImagen: boolean): number {
  return costoOperacion(OP_DIETA, { conImagen })
}
