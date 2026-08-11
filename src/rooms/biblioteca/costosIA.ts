import type { OperacionIA } from '../../core/cuenta/catalogoIA'

/**
 * Lo que cuesta la IA en Biblioteca. El caso más caro es el primer turno de una
 * charla nueva: además de responder, la IA la clasifica, la cuelga del nodo que
 * le toca en tu árbol y la deja destilada como entrada
 * (`arbol.ts::clasificarYDestilar`).
 */

export const OP_CHARLA: OperacionIA = {
  id: 'biblioteca.charla',
  clave: 'ia.op.biblioteca.charla',
  es: 'Turno de charla con el Sabio',
  dondeClave: 'ia.donde.biblioteca.charlas',
  dondeEs: 'Charlas',
  partes: [{ op: 'texto' }],
}

export const OP_CHARLA_NUEVA: OperacionIA = {
  id: 'biblioteca.charlaNueva',
  clave: 'ia.op.biblioteca.charlaNueva',
  es: 'Primer turno de una charla nueva',
  dondeClave: 'ia.donde.biblioteca.charlas',
  dondeEs: 'Charlas',
  notaClave: 'ia.op.biblioteca.charlaNueva.nota',
  notaEs: 'La respuesta, más la llamada que la titula y la coloca en tu árbol, más la que destila su entrada.',
  partes: [{ op: 'texto', veces: 3 }],
}

export const OP_CLASIFICAR: OperacionIA = {
  id: 'biblioteca.clasificar',
  clave: 'ia.op.biblioteca.clasificar',
  es: 'Clasificar y destilar una charla ✨',
  dondeClave: 'ia.donde.biblioteca.charlas',
  dondeEs: 'Charlas',
  partes: [{ op: 'texto', veces: 2 }],
}

export const OP_RAMIFICAR: OperacionIA = {
  id: 'biblioteca.ramificar',
  clave: 'ia.op.biblioteca.ramificar',
  es: 'Ramificar el árbol 🌿',
  dondeClave: 'ia.donde.biblioteca.enciclopedia',
  dondeEs: 'Enciclopedia',
  partes: [{ op: 'texto' }],
}

export const OP_DESTILAR: OperacionIA = {
  id: 'biblioteca.destilar',
  clave: 'ia.op.biblioteca.destilar',
  es: 'Actualizar la entrada al salir de la charla',
  dondeClave: 'ia.donde.biblioteca.charlas',
  dondeEs: 'Charlas',
  notaClave: 'ia.op.biblioteca.destilar.nota',
  notaEs: 'Solo si la charla creció después de destilarse.',
  partes: [{ op: 'texto' }],
}

export const OP_MATERIAL: OperacionIA = {
  id: 'biblioteca.material',
  clave: 'ia.op.biblioteca.material',
  es: 'Generar material de estudio de una entrada',
  dondeClave: 'ia.donde.biblioteca.enciclopedia',
  dondeEs: 'Enciclopedia',
  partes: [{ op: 'texto' }],
}

export const OP_ILUSTRAR: OperacionIA = {
  id: 'biblioteca.ilustrar',
  clave: 'ia.op.biblioteca.ilustrar',
  es: 'Ilustrar una entrada',
  dondeClave: 'ia.donde.biblioteca.enciclopedia',
  dondeEs: 'Enciclopedia',
  partes: [{ op: 'imagen' }],
}

export const OPERACIONES_IA: OperacionIA[] = [
  OP_CHARLA,
  OP_CHARLA_NUEVA,
  OP_CLASIFICAR,
  OP_RAMIFICAR,
  OP_DESTILAR,
  OP_MATERIAL,
  OP_ILUSTRAR,
]
