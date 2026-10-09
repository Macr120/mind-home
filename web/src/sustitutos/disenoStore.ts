// Ver LEEME.md. Sin efectos visuales ni objetos: lo que leen primitivas y Prendas.
const ESTADO = { efectosVisuales: false, efectosConfig: {}, objetos: [] }
export function useDiseño<T>(selector: (s: typeof ESTADO) => T): T {
  return selector(ESTADO)
}
useDiseño.getState = () => ESTADO
export const esObjetoMapa = () => false
