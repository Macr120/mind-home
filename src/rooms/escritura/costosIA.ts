import type { OperacionIA } from '../../core/cuenta/catalogoIA'

/** Lo que cuesta la IA en el Studio de escritura. */

export const OP_REDACTAR: OperacionIA = {
  id: 'escritura.redactar',
  clave: 'ia.op.escritura.redactar',
  es: 'Redactar un documento desde una instrucción',
  dondeClave: 'ia.donde.escritura.editor',
  dondeEs: 'Documentos · Editor · botón ✨',
  partes: [{ op: 'texto_largo' }],
}

export const OP_MEJORAR: OperacionIA = {
  id: 'escritura.mejorar',
  clave: 'ia.op.escritura.mejorar',
  es: 'Mejorar o corregir lo seleccionado',
  dondeClave: 'ia.donde.escritura.editor',
  dondeEs: 'Documentos · Editor · botón ✨',
  partes: [{ op: 'texto' }],
}

export const OP_RESUMIR: OperacionIA = {
  id: 'escritura.resumir',
  clave: 'ia.op.escritura.resumir',
  es: 'Resumir el documento',
  dondeClave: 'ia.donde.escritura.editor',
  dondeEs: 'Documentos · Editor · botón ✨',
  partes: [{ op: 'texto' }],
}

export const OP_CONTINUAR: OperacionIA = {
  id: 'escritura.continuar',
  clave: 'ia.op.escritura.continuar',
  es: 'Continuar escribiendo donde vas',
  dondeClave: 'ia.donde.escritura.editor',
  dondeEs: 'Documentos · Editor · botón ✨',
  partes: [{ op: 'texto' }],
}

export const OPERACIONES_IA: OperacionIA[] = [OP_REDACTAR, OP_MEJORAR, OP_RESUMIR, OP_CONTINUAR]
