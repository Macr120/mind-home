// Ver LEEME.md. Un solo nivel, sin cuarto abierto.
const ESTADO = { playerLevel: 0, activeRoom: null }
export function useHouse<T>(selector: (s: typeof ESTADO) => T): T {
  return selector(ESTADO)
}
useHouse.getState = () => ESTADO
