/**
 * Tonos sonando para que el teclado en pantalla ilumine las teclas que
 * realmente suenan, no solo la pulsada. Dos orígenes con color distinto en el
 * teclado: `vivo` (lo que tocas: acorde expandido, arpegiador, MIDI/QWERTY) y
 * `cancion` (las notas de la pieza en la práctica «Escuchar»). Store mínimo
 * estilo `transporteStore` (useSyncExternalStore): las notas nacen fuera de
 * React (scheduler del arp, rAF de la práctica) y esto evita pasar estado por
 * el editor entero.
 */

export type OrigenSonido = 'vivo' | 'cancion'

const cuentas: Record<OrigenSonido, Map<number, number>> = { vivo: new Map(), cancion: new Map() }
const timeouts = new Set<number>()
const oyentes = new Set<() => void>()
let actual = new Set<number>()
let actualCancion = new Set<number>()

function emitir() {
  actual = new Set(cuentas.vivo.keys())
  actualCancion = new Set(cuentas.cancion.keys())
  for (const fn of oyentes) fn()
}

const suscribir = (fn: () => void): (() => void) => {
  oyentes.add(fn)
  return () => oyentes.delete(fn)
}

/** Lo que tocas tú (ámbar en el teclado). */
export const sonandoStore = { subscribe: suscribir, getSnapshot: (): Set<number> => actual }
/** Lo que toca la canción en la práctica (otro color). */
export const cancionStore = { subscribe: suscribir, getSnapshot: (): Set<number> => actualCancion }

export function encender(tono: number, origen: OrigenSonido = 'vivo'): void {
  const m = cuentas[origen]
  m.set(tono, (m.get(tono) ?? 0) + 1)
  emitir()
}

export function apagar(tono: number, origen: OrigenSonido = 'vivo'): void {
  const m = cuentas[origen]
  const n = (m.get(tono) ?? 0) - 1
  if (n <= 0) m.delete(tono)
  else m.set(tono, n)
  emitir()
}

/** Nota agendada (arpegiador, canción): se enciende cuando le toca sonar y se apaga sola. */
export function destello(tono: number, retrasoMs: number, durMs: number, origen: OrigenSonido = 'vivo'): void {
  const t1 = window.setTimeout(() => {
    timeouts.delete(t1)
    encender(tono, origen)
    const t2 = window.setTimeout(() => {
      timeouts.delete(t2)
      apagar(tono, origen)
    }, durMs)
    timeouts.add(t2)
  }, Math.max(0, retrasoMs))
  timeouts.add(t1)
}

export function apagarTodo(): void {
  for (const t of timeouts) window.clearTimeout(t)
  timeouts.clear()
  cuentas.vivo.clear()
  cuentas.cancion.clear()
  emitir()
}
