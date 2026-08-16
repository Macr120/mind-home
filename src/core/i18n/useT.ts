import { useCallback, useSyncExternalStore } from 'react'
import { useAjustes } from '../state/ajustesStore'
import { asegurarIdioma, DICTS, dictStore } from './dict'
import { datosIdioma, type Idioma } from './idiomas'

// Los diccionarios se cargan perezosos: al arrancar y en cada cambio de idioma
// baja el del idioma activo, y con cualquier idioma que no sea español baja
// también el inglés, que es el respaldo de lo que falte (ver `traducir`).
// Suscripción a nivel de módulo: sin efectos por componente y sin side effects
// en render.
asegurarIdioma(useAjustes.getState().idioma)
useAjustes.subscribe((s) => asegurarIdioma(s.idioma))

/** Firma de `t()`: la misma tanto si viene de `useT()` como si se pasa como parámetro. */
export type TFunc = (clave: string, fallback?: string, vars?: Record<string, string | number>) => string

/**
 * Resuelve una clave de traducción.
 * Orden: idioma activo → inglés → español → fallback del componente → la clave.
 * El español es la fuente de verdad (vive en los fallbacks del código), pero el
 * RESPALDO visible de un idioma incompleto es el inglés: a un usuario en francés
 * una clave sin traducir le sale en inglés, nunca en español.
 * `vars` interpola `{nombre}` en el texto.
 */
function traducir(
  idioma: Idioma,
  clave: string,
  fallback?: string,
  vars?: Record<string, string | number>,
): string {
  // `?.`: el diccionario del idioma puede no haber llegado todavía (o no existir).
  let texto =
    DICTS[idioma]?.[clave] ??
    (idioma === 'es' ? undefined : DICTS.en?.[clave]) ??
    DICTS.es[clave] ??
    fallback ??
    clave
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      // split/join en vez de RegExp: sin compilar una regex por interpolación.
      texto = texto.split(`{${k}}`).join(String(v))
    }
  }
  return texto
}

/**
 * Hook de traducción. Devuelve `t(clave, fallbackEnEspañol?, vars?)`.
 * El fallback en español permite migrar la app por zonas sin romper nada.
 * `t` está memoizada (misma identidad mientras no cambien idioma/diccionario):
 * puede pasarse como prop o dependencia sin romper memoizaciones.
 */
export function useT() {
  const idioma = useAjustes((s) => s.idioma)
  // Re-render cuando termina de cargar el diccionario perezoso del idioma.
  const version = useSyncExternalStore(dictStore.subscribe, dictStore.getSnapshot)
  return useCallback(
    (clave: string, fallback?: string, vars?: Record<string, string | number>) =>
      traducir(idioma, clave, fallback, vars),
    // `version` no se lee dentro: solo invalida la memo al llegar el diccionario.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [idioma, version],
  )
}

/**
 * Locale BCP-47 del idioma activo, para `toLocaleDateString`/`toLocaleTimeString`.
 * Se lee en cada render, así las fechas siguen al conmutador de idioma.
 */
export function localeActual(): string {
  return datosIdioma(useAjustes.getState().idioma).locale
}

/**
 * Idioma activo, para el CONTENIDO que no cabe en `dict.ts` (catálogos de datos
 * de ejemplo, textos de siembra): esos se eligen enteros, no clave a clave.
 */
export function idiomaActual(): Idioma {
  return useAjustes.getState().idioma
}

/**
 * Traductor sin hook: para código fuera de React (schedulers, prompts de IA,
 * mensajes generados por un timer). Lee el idioma activo al vuelo, igual que
 * `localeActual()`.
 */
export function tGlobal(clave: string, fallback?: string, vars?: Record<string, string | number>): string {
  return traducir(useAjustes.getState().idioma, clave, fallback, vars)
}
