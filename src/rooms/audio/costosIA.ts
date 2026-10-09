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

export const OP_CANCION: OperacionIA = {
  id: 'audio.cancion',
  clave: 'ia.op.audio.cancion',
  es: 'Componer una canción completa (estructura, letra y 5 pistas)',
  dondeClave: 'ia.donde.audio.canciones',
  dondeEs: 'Estudio de audio · Canciones · «Canción con IA»',
  notaClave: 'ia.op.audio.generar.nota',
  notaEs: 'Si las notas no salen usables a la primera, se reintenta una vez y cuesta el doble.',
  partes: [{ op: 'texto_largo' }],
}

export const OP_VOZ_REAL: OperacionIA = {
  id: 'audio.vozReal',
  clave: 'ia.op.audio.vozReal',
  es: 'Producir la versión cantada (voz real con Lyria)',
  dondeClave: 'ia.donde.audio.editor',
  dondeEs: 'Estudio de audio · Editor · botón ✨',
  partes: [{ op: 'musica' }],
}

export const OPERACIONES_IA: OperacionIA[] = [OP_GENERAR, OP_CONTINUAR, OP_CANCION, OP_VOZ_REAL]
