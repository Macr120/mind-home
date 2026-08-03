/**
 * Diccionario de traducciones de la interfaz.
 *
 * Diseño incremental: cada texto se pide con `t('clave', 'Español por defecto')`.
 * Si falta la entrada en el idioma activo, se cae al español (o al fallback que
 * pasa el componente), por lo que la app NUNCA queda con claves crudas y se
 * puede traducir por zonas sin romper nada.
 *
 * El mapa INGLÉS vive en `dict.en.ts` (claves agrupadas por área con prefijo:
 * `nav.*`, `cat.*`, `room.<id>.*`, …) y se carga con import() perezoso: son
 * ~90 KB gzip que un usuario en español nunca descarga. Mientras llega, la UI
 * pinta los fallbacks en español y `useT` re-renderiza al terminar la carga.
 */

export type Dict = Record<string, string>

/**
 * Español explícito (opcional). Normalmente no hace falta porque el fallback
 * del componente ya está en español, pero se deja el mapa por si se quiere
 * forzar un texto distinto al literal del componente.
 */
const ES: Dict = {}

/** Diccionarios por idioma. `en` empieza vacío y lo llena `asegurarIdioma`. */
export const DICTS: Record<'es' | 'en', Dict> = { es: ES, en: {} }

// --- Carga perezosa del inglés + aviso a React (useSyncExternalStore) ---

let version = 0
const oyentes = new Set<() => void>()

/** Suscripción/versión para que `useT` re-renderice cuando llega un diccionario. */
export const dictStore = {
  subscribe(fn: () => void): () => void {
    oyentes.add(fn)
    return () => oyentes.delete(fn)
  },
  getSnapshot: () => version,
}

let cargandoEn: Promise<void> | null = null

/** Idempotente: dispara la carga del diccionario del idioma si hace falta. */
export function asegurarIdioma(idioma: string): void {
  if (idioma !== 'en' || cargandoEn) return
  cargandoEn = import('./dict.en').then((m) => {
    DICTS.en = m.EN
    version++
    oyentes.forEach((fn) => fn())
  })
}
