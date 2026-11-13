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

const OP_FONDO: OperacionIA = {
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

export const OP_TRADUCIR: OperacionIA = {
  id: 'video.traducir',
  clave: 'ia.op.video.traducir',
  es: 'Traducir una narración o un texto a otro idioma',
  dondeClave: 'ia.donde.video.escena',
  dondeEs: 'Editor de video · Panel del clip',
  partes: [{ op: 'texto' }],
}

/*
 * Las tres del video ya grabado se cobran con un PAQUETE (`ia-paquete`): un
 * precio por duración, todo incluido; lo no usado se devuelve. Ver
 * `rooms/video/paqueteVideo.ts` (el badge de cada botón calcula el total).
 */

export const OP_EDITAR_VIDEO: OperacionIA = {
  id: 'video.editar',
  clave: 'ia.op.video.editar',
  es: 'Editar el video con IA: subtítulos, cortes, títulos y efectos',
  dondeClave: 'ia.donde.video.editor',
  dondeEs: 'Editor de video · botón ✨',
  partes: [{ op: 'voz', veces: 'n' }],
  lote: true,
  notaClave: 'ia.op.video.escuchar.nota',
  notaEs: '1 crédito por cada 25 s de video, todo incluido; lo que no se use se devuelve.',
}

export const OP_CLIPEAR: OperacionIA = {
  id: 'video.clipear',
  clave: 'ia.op.video.clipear',
  es: 'Clipear los momentos más importantes de un video',
  dondeClave: 'ia.donde.video.editor',
  dondeEs: 'Editor de video · botón ✨',
  partes: [{ op: 'voz', veces: 'n' }],
  lote: true,
  notaClave: 'ia.op.video.escuchar.nota',
  notaEs: '1 crédito por cada 25 s de video, todo incluido; lo que no se use se devuelve.',
}

export const OP_TRADUCIR_VIDEO: OperacionIA = {
  id: 'video.traducirVideo',
  clave: 'ia.op.video.traducirVideo',
  es: 'Traducir el video: voz nueva y subtítulos en otro idioma',
  dondeClave: 'ia.donde.video.editor',
  dondeEs: 'Editor de video · botón ✨',
  partes: [{ op: 'voz', veces: 'n' }],
  lote: true,
  notaClave: 'ia.op.video.traducirVideo.nota',
  notaEs: '1 crédito por cada 25 s de video, todo incluido; 3 si la voz nueva es IA.',
}

export const OP_TRADUCIR_TEXTOS: OperacionIA = {
  id: 'video.traducirTextos',
  clave: 'ia.op.video.traducirTextos',
  es: 'Traducir los textos del video: títulos, guiones y avatares',
  dondeClave: 'ia.donde.video.editor',
  dondeEs: 'Editor de video · botón ✨',
  partes: [{ op: 'texto', veces: 'n' }],
  lote: true,
  notaClave: 'ia.op.video.traducirTextos.nota',
  notaEs: '1 crédito por cada 20 textos; rehacer una voz IA, 3.',
}

export const OPERACIONES_IA: OperacionIA[] = [
  OP_GUION,
  OP_NARRACION,
  OP_FONDO,
  OP_TITULOS,
  OP_TRADUCIR,
  OP_EDITAR_VIDEO,
  OP_CLIPEAR,
  OP_TRADUCIR_VIDEO,
  OP_TRADUCIR_TEXTOS,
]
