import type { OperacionIA } from '../../core/cuenta/catalogoIA'

/** Lo que cuesta la IA en el Studio de arte. */

export const OP_GENERAR: OperacionIA = {
  id: 'arte.generar',
  clave: 'ia.op.arte.generar',
  es: 'Generar un dibujo desde una descripción',
  dondeClave: 'ia.donde.arte.editor',
  dondeEs: 'Galería · Editor · botón ✨',
  partes: [{ op: 'imagen' }],
}

export const OP_REINTERPRETAR: OperacionIA = {
  id: 'arte.reinterpretar',
  clave: 'ia.op.arte.reinterpretar',
  es: 'Reinterpretar el lienzo (tu dibujo como referencia)',
  dondeClave: 'ia.donde.arte.editor',
  dondeEs: 'Galería · Editor · botón ✨',
  notaClave: 'ia.op.arte.reinterpretar.nota',
  notaEs: 'Tu lienzo viaja como imagen de referencia (img2img).',
  partes: [{ op: 'imagen' }],
}

export const OPERACIONES_IA: OperacionIA[] = [OP_GENERAR, OP_REINTERPRETAR]
