import type { OperacionIA } from '../../core/cuenta/catalogoIA'

/** Lo que cuesta la IA en el Studio de audio. */

export const OP_GENERAR: OperacionIA = {
  id: 'audio.generar',
  clave: 'ia.op.audio.generar',
  es: 'Componer una pista desde una descripción',
  dondeClave: 'ia.donde.audio.editor',
  dondeEs: 'Estudio de audio · Editor · botón ✨',
  notaClave: 'ia.op.audio.generar.nota',
  notaEs: 'Si las notas no salen usables a la primera, se reintenta una vez y cuesta el doble.',
  partes: [{ op: 'texto' }],
}

export const OP_CONTINUAR: OperacionIA = {
  id: 'audio.continuar',
  clave: 'ia.op.audio.continuar',
  es: 'Continuar la pista actual',
  dondeClave: 'ia.donde.audio.editor',
  dondeEs: 'Estudio de audio · Editor · botón ✨',
  partes: [{ op: 'texto' }],
}

export const OPERACIONES_IA: OperacionIA[] = [OP_GENERAR, OP_CONTINUAR]
