import type { OperacionIA } from '../../core/cuenta/catalogoIA'

/** Lo que cuesta la IA en Ideas. */

export const OP_MAPA: OperacionIA = {
  id: 'ideas.mapa',
  clave: 'ia.op.ideas.mapa',
  es: 'Mapa conceptual con IA',
  dondeClave: 'ia.donde.ideas.mapas',
  dondeEs: 'Mapas y diagramas · Lluvia de ideas',
  aprox: true,
  notaClave: 'ia.op.ideas.mapa.nota',
  notaEs: 'Si el mapa no sale usable a la primera, se reintenta una vez y cuesta el doble.',
  partes: [{ op: 'texto_largo' }],
}

export const OP_EXPANDIR: OperacionIA = {
  id: 'ideas.expandir',
  clave: 'ia.op.ideas.expandir',
  es: 'Más ideas (expandir, desarrollar o complementarias)',
  dondeClave: 'ia.donde.ideas.diario',
  dondeEs: 'Diario de ideas · Detalle de una idea · Lienzo del mapa',
  partes: [{ op: 'texto' }],
}

export const OPERACIONES_IA: OperacionIA[] = [OP_MAPA, OP_EXPANDIR]
