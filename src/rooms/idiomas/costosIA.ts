import type { OperacionIA } from '../../core/cuenta/catalogoIA'

/**
 * Lo que cuesta la IA en Idiomas. Igual que en Biblioteca, el primer turno de
 * una charla nueva lleva una llamada extra para ubicarla en el temario.
 */

export const OP_CHARLA: OperacionIA = {
  id: 'idiomas.charla',
  clave: 'ia.op.idiomas.charla',
  es: 'Turno de charla con el tutor',
  dondeClave: 'ia.donde.idiomas.charlas',
  dondeEs: 'Charlas',
  partes: [{ op: 'texto' }],
}

export const OP_CHARLA_NUEVA: OperacionIA = {
  id: 'idiomas.charlaNueva',
  clave: 'ia.op.idiomas.charlaNueva',
  es: 'Primer turno de una charla nueva',
  dondeClave: 'ia.donde.idiomas.charlas',
  dondeEs: 'Charlas',
  notaClave: 'ia.op.idiomas.charlaNueva.nota',
  notaEs: 'La respuesta, más la llamada que la ubica en tu temario.',
  partes: [{ op: 'texto', veces: 2 }],
}

export const OP_CLASIFICAR: OperacionIA = {
  id: 'idiomas.clasificar',
  clave: 'ia.op.idiomas.clasificar',
  es: 'Clasificar una charla ✨',
  dondeClave: 'ia.donde.idiomas.charlas',
  dondeEs: 'Charlas',
  partes: [{ op: 'texto' }],
}

export const OP_EXTRAER_TARJETAS: OperacionIA = {
  id: 'idiomas.extraerTarjetas',
  clave: 'ia.op.idiomas.extraerTarjetas',
  es: 'Extraer tarjetas de la charla',
  dondeClave: 'ia.donde.idiomas.charlas',
  dondeEs: 'Charlas',
  partes: [{ op: 'texto' }],
}

export const OP_GENERAR_TARJETAS: OperacionIA = {
  id: 'idiomas.generarTarjetas',
  clave: 'ia.op.idiomas.generarTarjetas',
  es: 'Generar tarjetas de un tema',
  dondeClave: 'ia.donde.idiomas.vocabulario',
  dondeEs: 'Vocabulario · Temario',
  partes: [{ op: 'texto' }],
}

export const OP_IMAGEN_TARJETA: OperacionIA = {
  id: 'idiomas.imagenTarjeta',
  clave: 'ia.op.idiomas.imagenTarjeta',
  es: 'Imagen mnemotécnica de una tarjeta',
  dondeClave: 'ia.donde.idiomas.vocabularioRepaso',
  dondeEs: 'Vocabulario · Repaso',
  partes: [{ op: 'imagen' }],
}

export const OPERACIONES_IA: OperacionIA[] = [
  OP_CHARLA,
  OP_CHARLA_NUEVA,
  OP_CLASIFICAR,
  OP_EXTRAER_TARJETAS,
  OP_GENERAR_TARJETAS,
  OP_IMAGEN_TARJETA,
]
