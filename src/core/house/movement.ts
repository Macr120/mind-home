/**
 * Input de movimiento libre del avatar (teclado WASD/flechas + joystick).
 *
 * - f, s: joystick (adelante/strafe, normalizado -1..1).
 * - kf, ks: teclado — adelante/atrás (+1/-1) y strafe derecha/izquierda (+1/-1),
 *   relativo a la cámara activa (Character aplica el azimut o la dirección de vista).
 */
export const moveInput = {
  f: 0,
  s: 0,
  kf: 0,
  ks: 0,
  /** Vertical por teclado (OVNI en vuelo): Space=+1 / Shift=-1. */
  kv: 0,
  /** Vertical por botones táctiles del overlay de montura. */
  pv: 0,
}

const keyState = { kf: 0, ks: 0, kv: 0 }
const padState = { f: 0, s: 0, v: 0 }

function sync() {
  moveInput.f = Math.max(-1, Math.min(1, padState.f))
  moveInput.s = Math.max(-1, Math.min(1, padState.s))
  moveInput.kf = keyState.kf
  moveInput.ks = keyState.ks
  moveInput.kv = keyState.kv
  moveInput.pv = Math.max(-1, Math.min(1, padState.v))
}

/**
 * Con el vuelo activo (montado en el OVNI) se capturan Space/Shift para subir y
 * bajar. Fuera de vuelo esas teclas NO se mapean (ni preventDefault): cero
 * cambios para botones enfocados, chat, etc.
 */
let vueloActivo = false

export function setVueloActivo(v: boolean) {
  vueloActivo = v
  if (!v) {
    pressed.delete('space')
    pressed.delete('shift')
    padState.v = 0
    recomputeKeys()
  }
}

/** Montado en vehículo terrestre: se captura Space (kv=1) como freno de derrape. */
let driftActivo = false

export function setDriftActivo(v: boolean) {
  driftActivo = v
  if (!v) {
    pressed.delete('space')
    recomputeKeys()
  }
}

/**
 * Con un cuarto abierto (overlay 2D) el teclado es de la mini-app (minijuegos,
 * formularios), no del avatar: no se mueve ni se hace preventDefault.
 */
let cuartoAbierto = false

export function setCuartoAbierto(v: boolean) {
  cuartoAbierto = v
  if (v && pressed.size) clearInput()
}

/** ¿Hay un overlay que captura el teclado (cuarto abierto o editor a pantalla completa)? */
export const hayCuartoAbierto = () => cuartoAbierto

/** Botones ↑/↓ del overlay de montura (móvil). */
export function setPadVertical(v: number) {
  padState.v = v
  sync()
}

const MOVE_KEYS = new Set([
  'w', 'a', 's', 'd',
  'arrowup', 'arrowdown', 'arrowleft', 'arrowright',
])

/** Identificador estable por tecla (key + code + keyCode). */
function idTecla(e: KeyboardEvent): string | null {
  const k = e.key.toLowerCase()
  if (vueloActivo || driftActivo) {
    if (e.code === 'Space' || k === ' ' || k === 'spacebar') return 'space'
  }
  if (vueloActivo) {
    if (e.code === 'ShiftLeft' || e.code === 'ShiftRight' || k === 'shift') return 'shift'
  }
  if (MOVE_KEYS.has(k)) return k
  if (k === 'up' || k === 'down' || k === 'left' || k === 'right') return `arrow${k}`

  switch (e.code) {
    case 'ArrowUp':
    case 'Numpad8':
      return 'arrowup'
    case 'ArrowDown':
    case 'Numpad2':
      return 'arrowdown'
    case 'ArrowLeft':
    case 'Numpad4':
      return 'arrowleft'
    case 'ArrowRight':
    case 'Numpad6':
      return 'arrowright'
    case 'KeyW':
      return 'w'
    case 'KeyA':
      return 'a'
    case 'KeyS':
      return 's'
    case 'KeyD':
      return 'd'
  }

  switch (e.keyCode) {
    case 38:
      return 'arrowup'
    case 40:
      return 'arrowdown'
    case 37:
      return 'arrowleft'
    case 39:
      return 'arrowright'
    case 87:
      return 'w'
    case 65:
      return 'a'
    case 83:
      return 's'
    case 68:
      return 'd'
  }

  return null
}

const pressed = new Set<string>()

function recomputeKeys() {
  let kf = 0
  let ks = 0
  if (pressed.has('arrowup') || pressed.has('w')) kf += 1
  if (pressed.has('arrowdown') || pressed.has('s')) kf -= 1
  if (pressed.has('arrowright') || pressed.has('d')) ks += 1
  if (pressed.has('arrowleft') || pressed.has('a')) ks -= 1
  keyState.kf = kf
  keyState.ks = ks
  keyState.kv = (pressed.has('space') ? 1 : 0) - (pressed.has('shift') ? 1 : 0)
  sync()
}

/**
 * Vector de movimiento en el plano XZ relativo al azimut de la cámara.
 * - kf/ks: teclado (adelante/strafe); f/s: joystick.
 * - az: azimut actual de la cámara (camAnim.az en iso, yaw en perspectiva).
 * Resultado normalizado a longitud máxima 1.
 */
export function vectorCam(
  kf: number, ks: number,
  f: number, s: number,
  az: number,
): { x: number; z: number } {
  // "Adelante" = dirección hacia la que apunta la cámara sobre el plano XZ.
  const fwdX = -Math.cos(az)
  const fwdZ = -Math.sin(az)
  // "Derecha" = 90° en sentido horario respecto a adelante.
  const rgtX = Math.sin(az)
  const rgtZ = -Math.cos(az)
  const mx = fwdX * (kf + f) + rgtX * (ks + s)
  const mz = fwdZ * (kf + f) + rgtZ * (ks + s)
  const len = Math.hypot(mx, mz)
  if (len < 0.001) return { x: 0, z: 0 }
  const k = Math.min(1, len) / len
  return { x: mx * k, z: mz * k }
}

function escribiendoEnCampo() {
  const el = document.activeElement as HTMLElement | null
  return (
    !!el &&
    (el.tagName === 'INPUT' ||
      el.tagName === 'TEXTAREA' ||
      el.tagName === 'SELECT' ||
      el.isContentEditable)
  )
}

function onKey(e: KeyboardEvent, down: boolean) {
  const k = idTecla(e)
  if (!k) return

  const ignorar = escribiendoEnCampo() || cuartoAbierto
  // Escribiendo en un campo (chat box, etc.) o con un cuarto abierto: las teclas
  // son de la UI, NO mueven al avatar. Las sueltas sí se procesan para no
  // dejarlo caminando solo.
  if (ignorar && down) {
    if (pressed.size) clearInput()
    return
  }

  if (!ignorar) e.preventDefault()

  if (!down) {
    pressed.delete(k)
    recomputeKeys()
    return
  }

  pressed.add(k)
  recomputeKeys()
}

/** Lo usa el joystick en pantalla. */
export function setPad(f: number, s: number) {
  padState.f = f
  padState.s = s
  sync()
}

function clearInput() {
  pressed.clear()
  keyState.kf = 0
  keyState.ks = 0
  keyState.kv = 0
  padState.f = 0
  padState.s = 0
  padState.v = 0
  sync()
}

/** Registra listeners globales de teclado (una sola vez). */
let atado = false
let onDown: ((e: KeyboardEvent) => void) | null = null
let onUp: ((e: KeyboardEvent) => void) | null = null
let onVis: (() => void) | null = null

export function bindKeyboard() {
  if (atado) return
  atado = true
  onDown = (e) => onKey(e, true)
  onUp = (e) => onKey(e, false)
  onVis = () => {
    if (document.visibilityState === 'hidden') clearInput()
  }

  window.addEventListener('keydown', onDown, true)
  window.addEventListener('keyup', onUp, true)
  document.addEventListener('visibilitychange', onVis)
}
