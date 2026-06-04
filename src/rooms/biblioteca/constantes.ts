import type { EstadoTemaEnciclopedia } from '../../core/data/db'

export const COLOR = '#818cf8'

export const ESTADOS_TEMA: {
  id: EstadoTemaEnciclopedia
  label: string
  icon: string
}[] = [
  { id: 'explorado', label: 'Explorado', icon: '👀' },
  { id: 'en_estudio', label: 'En estudio', icon: '📚' },
  { id: 'revisado', label: 'Revisado', icon: '✅' },
]

export function getEstadoTema(id: EstadoTemaEnciclopedia) {
  return ESTADOS_TEMA.find((e) => e.id === id) ?? ESTADOS_TEMA[0]
}

export const SIGUIENTE_ESTADO: Record<
  EstadoTemaEnciclopedia,
  EstadoTemaEnciclopedia | null
> = {
  explorado: 'en_estudio',
  en_estudio: 'revisado',
  revisado: null,
}
