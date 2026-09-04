/**
 * Tonos sonando en vivo (acorde expandido y notas del arpegiador) para que el
 * teclado en pantalla ilumine las teclas que realmente suenan, no solo la
 * pulsada. Store mínimo estilo `transporteStore` (useSyncExternalStore): las
 * notas nacen fuera de React (scheduler del arp) y esto evita pasar estado por
 * el editor entero.
 */

const cuentas = new Map<number, number>()
const timeouts = new Set<number>()
const oyentes = new Set<() => void>()
let actual = new Set<number>()

function emitir() {
  actual = new Set(cuentas.keys())
  for (const fn of oyentes) fn()
}

export const sonandoStore = {
  subscribe(fn: () => void): () => void {
    oyentes.add(fn)
    return () => oyentes.delete(fn)
  },
  getSnapshot: (): Set<number> => actual,
}

export function encender(tono: number): void {
  cuentas.set(tono, (cuentas.get(tono) ?? 0) + 1)
  emitir()
}

export function apagar(tono: number): void {
  const n = (cuentas.get(tono) ?? 0) - 1
  if (n <= 0) cuentas.delete(tono)
  else cuentas.set(tono, n)
  emitir()
}

/** Nota del arpegiador: se enciende cuando le toca sonar y se apaga sola. */
export function destello(tono: number, retrasoMs: number, durMs: number): void {
  const t1 = window.setTimeout(() => {
    timeouts.delete(t1)
    encender(tono)
    const t2 = window.setTimeout(() => {
      timeouts.delete(t2)
      apagar(tono)
    }, durMs)
    timeouts.add(t2)
  }, Math.max(0, retrasoMs))
  timeouts.add(t1)
}

export function apagarTodo(): void {
  for (const t of timeouts) window.clearTimeout(t)
  timeouts.clear()
  cuentas.clear()
  emitir()
}
