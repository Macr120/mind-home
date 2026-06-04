/**
 * Input de movimiento libre del avatar (teclado WASD/flechas + pad en pantalla).
 * `moveInput` lo lee Character cada frame (sin re-render de React).
 * - f: adelante(+1)/atrás(-1) relativo a la cámara
 * - s: derecha(+1)/izquierda(-1) relativo a la cámara
 */
export const moveInput = { f: 0, s: 0 }

const keyState = { f: 0, s: 0 }
const padState = { f: 0, s: 0 }

function sync() {
  moveInput.f = Math.max(-1, Math.min(1, keyState.f + padState.f))
  moveInput.s = Math.max(-1, Math.min(1, keyState.s + padState.s))
}

const MOVE_KEYS = [
  'w', 'a', 's', 'd',
  'arrowup', 'arrowdown', 'arrowleft', 'arrowright',
]
const pressed = new Set<string>()

function recomputeKeys() {
  let f = 0
  let s = 0
  if (pressed.has('w') || pressed.has('arrowup')) f += 1
  if (pressed.has('s') || pressed.has('arrowdown')) f -= 1
  if (pressed.has('d') || pressed.has('arrowright')) s += 1
  if (pressed.has('a') || pressed.has('arrowleft')) s -= 1
  keyState.f = f
  keyState.s = s
  sync()
}

export function onKey(e: KeyboardEvent, down: boolean) {
  const k = e.key.toLowerCase()
  if (!MOVE_KEYS.includes(k)) return
  // No capturar cuando se está escribiendo en un campo.
  const el = document.activeElement as HTMLElement | null
  if (
    el &&
    (el.tagName === 'INPUT' ||
      el.tagName === 'TEXTAREA' ||
      el.tagName === 'SELECT' ||
      el.isContentEditable)
  ) {
    return
  }
  if (down) pressed.add(k)
  else pressed.delete(k)
  recomputeKeys()
}

/** Lo usa el pad en pantalla (presionar/soltar). */
export function setPad(f: number, s: number) {
  padState.f = f
  padState.s = s
  sync()
}

export function clearInput() {
  pressed.clear()
  keyState.f = 0
  keyState.s = 0
  padState.f = 0
  padState.s = 0
  sync()
}
