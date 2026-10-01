import { useDiseño } from '../state/disenoStore'
import { baseDe, getTema, mezclar, type Tema, type TemaClave } from './temas'
import type { TipoMuroId } from './murosPuertas'

/** Material de la fachada que impone un tema estático (castillo de piedra, cabaña de madera…). */
export interface FachadaTema {
  tipo: TipoMuroId
  color: string
}

/**
 * Fachada de cada tema de fábrica (y de los propios que parten de uno), o null si el
 * tema no la cambia.
 */
export function fachadaDeTema(id: TemaClave | null | undefined, t: Tema | null): FachadaTema | null {
  if (!t) return null
  const ext = t.shell.muroExt
  switch (baseDe(id)) {
    case 'medieval':
      // Piedra del castillo: la fachada del tema aclarada hacia arenisca.
      return { tipo: 'piedra', color: mezclar(ext, '#c9b48f', 0.35) }
    case 'espacio':
      return { tipo: 'paneles', color: mezclar(ext, '#e2e8f0', 0.35) }
    case 'terror':
      return { tipo: 'madera', color: mezclar(ext, '#4a3b32', 0.4) }
    case 'barbie':
      return { tipo: 'piedra', color: mezclar(ext, '#ffe4ef', 0.45) }
    case 'vaquero':
      return { tipo: 'madera', color: mezclar(ext, '#a8743f', 0.35) }
    case 'cyberpunk':
      return { tipo: 'paneles', color: mezclar(ext, '#2a2640', 0.4) }
    case 'navidad':
      return { tipo: 'madera', color: '#8a5a33' }
    // Dinámicos: la casa se viste del vehículo en que viaja.
    case 'nave':
      return { tipo: 'paneles', color: mezclar(ext, '#9aa5b3', 0.3) }
    case 'avion':
      return { tipo: 'paneles', color: mezclar(ext, '#eef2f6', 0.4) }
    case 'apocalipsis':
      return { tipo: 'paneles', color: mezclar(ext, '#7a4a2a', 0.5) }
    case 'tortuga':
      return { tipo: 'madera', color: mezclar(ext, '#8a6a45', 0.3) }
    case 'pirata':
      return { tipo: 'madera', color: mezclar(ext, '#6b4423', 0.3) }
    case 'tren':
      return { tipo: 'madera', color: ext }
    default:
      return null
  }
}

/** La fachada del tema activo (null = cada muro con su pincel). */
export function useFachadaTema(): FachadaTema | null {
  const id = useDiseño((s) => s.temaGlobal)
  useDiseño((s) => s.temaRev)
  return fachadaDeTema(id, getTema(id))
}
