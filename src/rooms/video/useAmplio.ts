import { useSyncExternalStore } from 'react'
import { MEDIA_AMPLIO } from './constantes'

/**
 * Una media query leída desde JS con `useSyncExternalStore` (sin setState en
 * efecto). Una lista y un suscriptor por query, cacheados: `useSyncExternalStore`
 * se resuscribe si cambia la identidad de `subscribe`.
 */
const listas = new Map<string, MediaQueryList | null>()
const suscriptores = new Map<string, (cb: () => void) => () => void>()

function suscriptorDe(query: string) {
  let s = suscriptores.get(query)
  if (!s) {
    const mq = typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(query) : null
    listas.set(query, mq)
    s = (cb) => {
      mq?.addEventListener('change', cb)
      return () => mq?.removeEventListener('change', cb)
    }
    suscriptores.set(query, s)
  }
  return s
}

export function useMediaQuery(query: string, porDefecto = true): boolean {
  const suscribir = suscriptorDe(query)
  return useSyncExternalStore(
    suscribir,
    () => listas.get(query)?.matches ?? porDefecto,
    () => porDefecto,
  )
}

/**
 * ¿Modo columnas (la variante `amplio:` de index.css) o modo cajones? La misma
 * media query que el CSS, leída desde JS: los cajones móviles llevan telón,
 * `role="dialog"` y Escape propio, y la preferencia de plegado persistida solo
 * aplica a las columnas.
 */
export function useAmplio(): boolean {
  return useMediaQuery(MEDIA_AMPLIO)
}
