// Ver LEEME.md. Realismo apagado: materiales planos, como en gama baja.
const ESTADO = { realismo: {} as Record<string, boolean>, idioma: 'es' }
export function useAjustes<T>(selector: (s: typeof ESTADO) => T): T {
  return selector(ESTADO)
}
useAjustes.getState = () => ESTADO
