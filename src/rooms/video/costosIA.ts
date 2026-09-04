import type { OperacionIA } from '../../core/cuenta/catalogoIA'

/** Lo que cuesta la IA en el Studio de video. */

export const OP_GUION: OperacionIA = {
  id: 'video.guion',
  clave: 'ia.op.video.guion',
  es: 'Generar o rehacer el guion desde una descripción',
  dondeClave: 'ia.donde.video.editor',
  dondeEs: 'Editor de video · botón ✨',
  partes: [{ op: 'texto_largo' }],
}

export const OP_NARRACION: OperacionIA = {
  id: 'video.narracion',
  clave: 'ia.op.video.narracion',
  es: 'Narración con voz IA (por clip de narración o de avatar)',
  dondeClave: 'ia.donde.video.escena',
  dondeEs: 'Editor de video · Panel del clip',
  partes: [{ op: 'tts' }],
}

export const OP_FONDO: OperacionIA = {
  id: 'video.fondo',
  clave: 'ia.op.video.fondo',
  es: 'Fondo de clip con imagen IA',
  dondeClave: 'ia.donde.video.escena',
  dondeEs: 'Editor de video · Panel del clip',
  partes: [{ op: 'imagen' }],
}

export const OP_TITULOS: OperacionIA = {
  id: 'video.titulos',
  clave: 'ia.op.video.titulos',
  es: 'Mejorar los títulos de todas las escenas',
  dondeClave: 'ia.donde.video.editor',
  dondeEs: 'Editor de video · botón ✨',
  partes: [{ op: 'texto' }],
}

export const OPERACIONES_IA: OperacionIA[] = [OP_GUION, OP_NARRACION, OP_FONDO, OP_TITULOS]
