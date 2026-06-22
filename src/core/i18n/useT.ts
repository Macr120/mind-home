import { useAjustes, type Idioma } from '../state/ajustesStore'
import { DICTS } from './dict'

/**
 * Resuelve una clave de traducción.
 * Orden: idioma activo → español → fallback del componente → la propia clave.
 * `vars` interpola `{nombre}` en el texto.
 */
export function traducir(
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
