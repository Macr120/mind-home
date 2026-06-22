/**
 * Input del joystick de VISTA (segundo stick en 1ª/3ª persona): gira la cámara.
 * Valores normalizados (-1..1); FollowCamera los aplica cada frame con `orbit`.
 */
export const lookPad = { x: 0, y: 0 }

const clamp1 = (v: number) => Math.max(-1, Math.min(1, v))

export function setLookPad(x: number, y: number) {
  lookPad.x = clamp1(x)
  lookPad.y = clamp1(y)
}

export function clearLook() {
  lookPad.x = 0
  lookPad.y = 0
}
