import { useAjustes } from '../../state/ajustesStore'
import type { SVGS } from './catalogo.svg'

/**
 * Carga perezosa de los SVG del catálogo de iconos (patrón dictStore): el
 * chunk de lucide (~40 KB gz) se descarga fuera de la ruta crítica y SOLO en
 * estilo "profesional" — en estilo "emoji" jamás baja. Mientras no llega,
 * `<Icono>` pinta el emoji equivalente (nunca un hueco) y `useSyncExternalStore`
 * re-renderiza al aterrizar.
 */

type Svgs = typeof SVGS

let svgs: Svgs | null = null
let version = 0
const oyentes = new Set<() => void>()
let cargando: Promise<void> | null = null

export const getSvgs = (): Svgs | null => svgs

export const svgStore = {
  subscribe(fn: () => void): () => void {
    oyentes.add(fn)
    return () => oyentes.delete(fn)
  },
  getSnapshot: () => version,
}

export function cargarSvgs(): Promise<void> {
  cargando ??= import('./catalogo.svg').then(
    (m) => {
      svgs = m.SVGS
      version++
      for (const fn of oyentes) fn()
    },
    (e) => {
      // El fallo de red NO se cachea (misma lección que dict.ts): se reintenta
      // en la próxima llamada; mientras, los iconos siguen en emoji.
      cargando = null
      console.warn('[MPH] No se pudo cargar el chunk de iconos SVG', e)
    },
  )
  return cargando
}

// Arranque: con estilo profesional (el default) se pide ya — en paralelo, sin
// bloquear nada. Y si el usuario cambia el ajuste en caliente, se pide entonces.
if (useAjustes.getState().estiloIconos === 'profesional') void cargarSvgs()
useAjustes.subscribe((s) => {
  if (s.estiloIconos === 'profesional') void cargarSvgs()
})
