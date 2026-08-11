import type { OperacionIA } from '../../core/cuenta/catalogoIA'

/** Lo que cuesta la IA en la sala de cómputo. */

export const OP_FORMULA: OperacionIA = {
  id: 'computo.formula',
  clave: 'ia.op.computo.formula',
  es: 'Escribir una fórmula desde su descripción',
  dondeClave: 'ia.donde.computo.formulario',
  dondeEs: 'Formulario · Fórmula nueva',
  partes: [{ op: 'texto' }],
}

export const OP_EXPLICAR: OperacionIA = {
  id: 'computo.explicar',
  clave: 'ia.op.computo.explicar',
  es: 'Explicar o despejar paso a paso',
  dondeClave: 'ia.donde.computo.calculadora',
  dondeEs: 'Calculadora',
  partes: [{ op: 'texto' }],
}

export const OP_HOJA: OperacionIA = {
  id: 'computo.hoja',
  clave: 'ia.op.computo.hoja',
  es: 'Armar una hoja de cálculo con sus fórmulas',
  dondeClave: 'ia.donde.computo.hojas',
  dondeEs: 'Hojas de cálculo · Hoja nueva',
  // Una hoja entera con encabezados, datos y fórmulas no cabe en una respuesta corta.
  partes: [{ op: 'texto_largo' }],
}

export const OP_ANALIZAR: OperacionIA = {
  id: 'computo.analizar',
  clave: 'ia.op.computo.analizar',
  es: 'Interpretar los datos seleccionados',
  dondeClave: 'ia.donde.computo.hojas',
  dondeEs: 'Hojas de cálculo · Hoja nueva',
  partes: [{ op: 'texto' }],
}

export const OPERACIONES_IA: OperacionIA[] = [OP_FORMULA, OP_EXPLICAR, OP_HOJA, OP_ANALIZAR]
