import type { OperacionIA } from '../../core/cuenta/catalogoIA'

/**
 * Lo que cuesta la IA en Biblioteca. El único caso con dos llamadas es el
 * primer turno de una charla nueva: además de responder, la IA la clasifica y la
 * cuelga del nodo que le toca en tu árbol (`arbol.ts::ubicarCharla`).
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
  notaEs: 'La respuesta, más la llamada que la titula y la coloca en tu árbol.',
  partes: [{ op: 'texto', veces: 2 }],
}

export const OP_CLASIFICAR: OperacionIA = {
  id: 'biblioteca.clasificar',
  clave: 'ia.op.biblioteca.clasificar',
  es: 'Clasificar una charla ✨',
  dondeClave: 'ia.donde.biblioteca.charlas',
  dondeEs: 'Charlas',
  partes: [{ op: 'texto' }],
}

export const OP_RAMIFICAR: OperacionIA = {
  id: 'biblioteca.ramificar',
  clave: 'ia.op.biblioteca.ramificar',
  es: 'Ramificar el árbol 🌿',
  dondeClave: 'ia.donde.biblioteca.charlas',
  dondeEs: 'Charlas',
  partes: [{ op: 'texto' }],
}

export const OP_DESTILAR: OperacionIA = {
  id: 'biblioteca.destilar',
  clave: 'ia.op.biblioteca.destilar',
  es: 'Destilar a entrada de enciclopedia',
  dondeClave: 'ia.donde.biblioteca.charlas',
  dondeEs: 'Charlas',
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
  OP_ILUSTRAR,
]
