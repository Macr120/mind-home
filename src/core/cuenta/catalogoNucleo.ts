import type { OperacionIA } from './catalogoIA'

/**
 * Operaciones de IA que NO viven en un cuarto: el chat de la casa, el editor y
 * el planificador de metas. Las de los cuartos se declaran en
 * `src/rooms/<id>/costosIA.ts` y llegan por el registry.
 */

/** Conversación del Chat AR (cámara + asistente): exportada aparte para su badge. */
export const OP_CHAT_AR: OperacionIA = {
  id: 'chat.ar',
  clave: 'ia.op.chat.ar',
  es: 'Conversación en Chat AR',
  dondeClave: 'ia.donde.chatAr',
  dondeEs: 'Chat AR',
  notaClave: 'ia.op.chat.ar.nota',
  notaEs: 'Si el asistente tiene voz de IA, su lectura se cobra aparte como voz del asistente.',
  partes: [{ op: 'texto' }],
}

/** Chat de la casa. Las tools que generan contenido añaden SU propia llamada. */
export const OPS_CHAT: OperacionIA[] = [
  {
    id: 'chat.mensaje',
    clave: 'ia.op.chat.mensaje',
    es: 'Mensaje al asistente',
    dondeClave: 'ia.donde.chat',
    dondeEs: 'Chat de la casa',
    partes: [{ op: 'chat' }],
  },
  {
    id: 'chat.modelo3d',
    clave: 'ia.op.chat.modelo3d',
    es: '«Genera en 3D…» por chat',
    dondeClave: 'ia.donde.chat',
    dondeEs: 'Chat de la casa',
    notaClave: 'ia.op.chat.modelo3d.nota',
    notaEs: 'Son dos llamadas: el turno que interpreta la orden y la generación.',
    partes: [{ op: 'chat' }, { op: 'modelo3d' }],
  },
  {
    id: 'chat.imagen',
    clave: 'ia.op.chat.imagen',
    es: '«Crea una imagen de…» por chat',
    dondeClave: 'ia.donde.chat',
    dondeEs: 'Chat de la casa',
    partes: [{ op: 'chat' }, { op: 'imagen' }],
  },
  {
    id: 'chat.mapaIdeas',
    clave: 'ia.op.chat.mapaIdeas',
    es: '«Hazme un mapa de ideas» por chat',
    dondeClave: 'ia.donde.chat',
    dondeEs: 'Chat de la casa',
    aprox: true,
    notaClave: 'ia.op.chat.mapaIdeas.nota',
    notaEs: 'Si el mapa no sale bien a la primera, se reintenta una vez.',
    partes: [{ op: 'chat' }, { op: 'texto_largo' }],
  },
  {
    id: 'chat.latido',
    clave: 'ia.op.chat.latido',
    es: 'Frase espontánea del personaje',
    dondeClave: 'ia.donde.casa',
    dondeEs: 'La casa (automático)',
    notaClave: 'ia.op.chat.latido.nota',
    notaEs: 'Solo con suscripción y solo en 1 de cada 10 latidos.',
    partes: [{ op: 'texto' }],
  },
  OP_CHAT_AR,
]

/** Editor de la casa: geometría 3D y texturas. */
export const OP_OBJETO_3D: OperacionIA = {
  id: 'editor.objeto3d',
  clave: 'ia.op.editor.objeto3d',
  es: 'Modelo 3D de objeto o arquitectura',
  dondeClave: 'ia.donde.editorObjetos',
  dondeEs: 'Editor › Objetos',
  partes: [{ op: 'modelo3d' }],
}

export const OP_PERSONAJE_3D: OperacionIA = {
  id: 'editor.personaje3d',
  clave: 'ia.op.editor.personaje3d',
  es: 'Modelo 3D de personaje',
  dondeClave: 'ia.donde.editorPersonajes',
  dondeEs: 'Editor › Personajes',
  partes: [{ op: 'modelo3d' }],
}

export const OP_ROPA_3D: OperacionIA = {
  id: 'editor.ropa3d',
  clave: 'ia.op.editor.ropa3d',
  es: 'Prenda del guardarropa',
  dondeClave: 'ia.donde.editorPersonajes',
  dondeEs: 'Editor › Personajes',
  partes: [{ op: 'modelo3d' }],
}

export const OP_ASISTENTE_3D: OperacionIA = {
  id: 'editor.asistente3d',
  clave: 'ia.op.editor.asistente3d',
  es: 'Forma de un asistente',
  dondeClave: 'ia.donde.asistentes',
  dondeEs: 'Asistentes',
  partes: [{ op: 'modelo3d' }],
}

export const OP_ASISTENTE_VOZ: OperacionIA = {
  id: 'editor.asistenteVoz',
  clave: 'ia.op.editor.asistenteVoz',
  es: 'Voz con IA de un asistente',
  dondeClave: 'ia.donde.asistentes',
  dondeEs: 'Asistentes',
  partes: [{ op: 'tts' }],
}

export const OP_TEXTURA: OperacionIA = {
  id: 'editor.textura',
  clave: 'ia.op.editor.textura',
  es: 'Textura de piso, muro, techo, puerta o mapa',
  dondeClave: 'ia.donde.editorCuarto',
  dondeEs: 'Editor › Piso, Paredes, Techo, Puertas y Grid',
  partes: [{ op: 'imagen' }],
}

export const OP_FONDO: OperacionIA = {
  id: 'editor.fondo',
  clave: 'ia.op.editor.fondo',
  es: 'Textura de fondo de cielo',
  dondeClave: 'ia.donde.editorFondo',
  dondeEs: 'Fondo de cielo',
  partes: [{ op: 'imagen' }],
}

export const OPS_EDITOR: OperacionIA[] = [
  OP_OBJETO_3D,
  OP_PERSONAJE_3D,
  OP_ROPA_3D,
  OP_ASISTENTE_3D,
  OP_ASISTENTE_VOZ,
  OP_TEXTURA,
  OP_FONDO,
]

/**
 * El Plan ✨ se declara UNA vez aunque su botón salga en ocho cuartos: vive en
 * `core/ui/metas/GeneradorPlan.tsx`, que es núcleo.
 */
export const OP_PLAN_IA: OperacionIA = {
  id: 'metas.plan',
  clave: 'ia.op.metas.plan',
  es: 'Plan ✨ con IA de una meta',
  dondeClave: 'ia.donde.metas',
  dondeEs: 'Cocina, Ejercicio, Biblioteca, Idiomas, Sala, Hobbies, Despacho y Entretenimiento',
  notaClave: 'ia.op.metas.plan.nota',
  notaEs: 'Cronogramas, itinerarios de viaje, planes de estudio y planes financieros.',
  partes: [{ op: 'texto_largo' }],
}

export const OPS_METAS: OperacionIA[] = [OP_PLAN_IA]
