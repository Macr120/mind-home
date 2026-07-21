import { useAjustes, type Idioma } from '../state/ajustesStore'
import { DICTS } from './dict'

/** Firma de `t()`: la misma tanto si viene de `useT()` como si se pasa como parámetro. */
export type TFunc = (clave: string, fallback?: string, vars?: Record<string, string | number>) => string

/**
 * Resuelve una clave de traducción.
 * Orden: idioma activo → español → fallback del componente → la propia clave.
 * `vars` interpola `{nombre}` en el texto.
 */
function traducir(
  idioma: Idioma,
  clave: string,
  fallback?: string,
  vars?: Record<string, string | number>,
): string {
  let texto = DICTS[idioma][clave] ?? DICTS.es[clave] ?? fallback ?? clave
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      texto = texto.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v))
    }
  }
  return texto
}

/**
 * Hook de traducción. Devuelve `t(clave, fallbackEnEspañol?, vars?)`.
 * El fallback en español permite migrar la app por zonas sin romper nada.
 */
export function useT() {
  const idioma = useAjustes((s) => s.idioma)
  return (clave: string, fallback?: string, vars?: Record<string, string | number>) =>
    traducir(idioma, clave, fallback, vars)
}

/**
 * Locale BCP-47 del idioma activo, para `toLocaleDateString`/`toLocaleTimeString`.
 * Se lee en cada render, así las fechas siguen al conmutador de idioma.
 */
export function localeActual(): string {
  return useAjustes.getState().idioma === 'en' ? 'en-US' : 'es-MX'
}

/**
 * Traductor sin hook: para código fuera de React (schedulers, prompts de IA,
 * mensajes generados por un timer). Lee el idioma activo al vuelo, igual que
 * `localeActual()`.
 */
export function tGlobal(clave: string, fallback?: string, vars?: Record<string, string | number>): string {
  return traducir(useAjustes.getState().idioma, clave, fallback, vars)
}
