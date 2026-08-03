import { plantillas } from '../registry'
import type { OperacionIA } from './catalogoIA'
import { OPS_CHAT, OPS_EDITOR, OPS_METAS } from './catalogoNucleo'

/**
 * El catálogo completo, agrupado para la pantalla de precios.
 *
 * Es el ÚNICO módulo del núcleo que mira el registry: así `catalogoIA.ts` sigue
 * siendo una hoja que los cuartos pueden importar sin ciclos. Los cuartos entran
 * solos por su `operacionesIA`, incluidas las plantillas que se añadan después.
 */

export interface GrupoIA {
  id: string
  clave: string
  es: string
  /** Emoji de la plantilla; los grupos del núcleo traen el suyo. */
  emoji: string
  color?: string
  ops: OperacionIA[]
}

const GRUPOS_NUCLEO: GrupoIA[] = [
  { id: 'chat', clave: 'ia.grupo.chat', es: 'Chat de la casa', emoji: '💬', ops: OPS_CHAT },
  { id: 'editor', clave: 'ia.grupo.editor', es: 'Editor de la casa', emoji: '✏️', ops: OPS_EDITOR },
  { id: 'metas', clave: 'ia.grupo.metas', es: 'Metas y cronograma', emoji: '🎯', ops: OPS_METAS },
]

/** Núcleo primero y luego los cuartos, en el orden del registry. */
export function gruposIA(): GrupoIA[] {
  const cuartos = plantillas
    .filter((p) => p.operacionesIA?.length)
    .map((p) => ({
      id: p.id,
      // Misma clave que usa el catálogo de plantillas para el nombre del cuarto.
      clave: `room.${p.id}.nombre`,
      es: p.nombre.split(' · ')[0],
      emoji: p.icon,
      color: p.color,
      ops: p.operacionesIA ?? [],
    }))
  return [...GRUPOS_NUCLEO, ...cuartos]
}
