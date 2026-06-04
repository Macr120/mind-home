/**
 * Input de movimiento libre del avatar (teclado WASD/flechas + joystick).
 *
 * - f, s: componentes para el joystick (relativo a la cámara).
 * - dx, dz: desplazamiento FIJO del teclado en coordenadas del mundo isométrico.
 *   Las flechas usan las diagonales iso (NE/NO/SE/SO) para moverse de forma natural
 *   sin importar la rotación de la cámara.
 */
export const moveInput = {
  f: 0,   // joystick adelante/atrás (relativo a cámara)
  s: 0,   // joystick derecha/izquierda (relativo a cámara)
  dx: 0,  // teclado: desplazamiento fijo en X del mundo
  dz: 0,  // teclado: desplazamiento fijo en Z del mundo
}

const keyState = { dx: 0, dz: 0 }
const padState = { f: 0, s: 0 }

function sync() {
  moveInput.f = Math.max(-1, Math.min(1, padState.f))
  moveInput.s = Math.max(-1, Math.min(1, padState.s))
  moveInput.dx = keyState.dx
  moveInput.dz = keyState.dz
}

const MOVE_KEYS = [
  'w', 'a', 's', 'd',
  'arrowup', 'arrowdown', 'arrowleft', 'arrowright',
]
const pressed = new Set<string>()

/**
 * Diagonales isométricas del teclado (en coordenadas del MUNDO, no de cámara):
 *
 *   Arriba    → NO: (-1, -1)  el personaje sube-izq en pantalla iso
 *   Abajo     → SE: (+1, +1)  baja-der
 *   Derecha   → NE: (+1, -1)  sube-der
 *   Izquierda → SO: (-1, +1)  baja-izq
 *
 * (Se normalizan después para que la diagonal tenga la misma velocidad.)
 */
function recomputeKeys() {
  let dx = 0
  let dz = 0
  if (pressed.has('arrowup') || pressed.has('w')) { dx -= 1; dz -= 1 }
  if (pressed.has('arrowdown') || pressed.has('s')) { dx += 1; dz += 1 }
  if (pressed.has('arrowright') || pressed.has('d')) { dx += 1; dz -= 1 }
  if (pressed.has('arrowleft') || pressed.has('a')) { dx -= 1; dz += 1 }
  keyState.dx = dx
  keyState.dz = dz
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
  // Evitar que las flechas hagan scroll de la página (causa principal de que
  // parezcan no funcionar: el navegador las consume para desplazar el DOM).
  if (k.startsWith('arrow')) e.preventDefault()
  if (down) pressed.add(k)
  else pressed.delete(k)
  recomputeKeys()
}

/** Lo usa el joystick en pantalla. */
export function setPad(f: number, s: number) {
  padState.f = f
  padState.s = s
  sync()
}

export function clearInput() {
  pressed.clear()
  keyState.dx = 0
  keyState.dz = 0
  padState.f = 0
  padState.s = 0
  sync()
}
