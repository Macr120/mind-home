import type { OperacionIA } from '../../core/cuenta/catalogoIA'

/**
 * Lo que cuesta la IA en el Diario. Es el único cuarto donde la IA corre SOLA
 * (efemérides del día y reparto por asistente): por eso ambas exigen suscripción
 * — `iaOperativa()` en `chat/ia.ts` impide que gasten créditos comprados.
 * Los titulares y las fotos vienen de El País y Wikipedia, sin coste.
 */

export const OP_EFEMERIDES: OperacionIA = {
  id: 'diario.efemerides',
  clave: 'ia.op.diario.efemerides',
  es: 'Efemérides culturales del día',
  dondeClave: 'ia.donde.diario',
  dondeEs: 'Diario (automático)',
  notaClave: 'ia.op.diario.efemerides.nota',
  notaEs: 'Una vez al día y solo con suscripción.',
  partes: [{ op: 'texto_largo' }],
}

export const OP_REPARTO: OperacionIA = {
  id: 'diario.reparto',
  clave: 'ia.op.diario.reparto',
  es: 'Reparto del diario por un asistente',
  dondeClave: 'ia.donde.diario',
  dondeEs: 'Diario (automático)',
  notaClave: 'ia.op.diario.reparto.nota',
  notaEs: 'Una por entrega programada y solo con suscripción.',
  partes: [{ op: 'texto' }],
}

export const OPERACIONES_IA: OperacionIA[] = [OP_EFEMERIDES, OP_REPARTO]
