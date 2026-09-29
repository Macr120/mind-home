import type { OperacionIA } from '../../core/cuenta/catalogoIA'

/** Lo que cuesta en créditos la Sala: la búsqueda de transporte público (HERE). */

export const OP_TRANSPORTE: OperacionIA = {
  id: 'sala.transporte',
  clave: 'ia.op.sala.transporte',
  es: 'Ruta en transporte público',
  dondeClave: 'ia.donde.sala.navegar',
  dondeEs: 'Cómo llegar · Lugares del chat',
  notaClave: 'ia.op.sala.transporte.nota',
  notaEs: 'Con bici o auto hasta la estación son dos búsquedas. Caminar, bici y auto directos no gastan créditos.',
  partes: [{ op: 'transporte' }],
}

export const OPERACIONES_IA: OperacionIA[] = [OP_TRANSPORTE]
