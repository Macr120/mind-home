import { useLayout } from '../state/layoutStore'
import { usePlanos } from '../state/planosStore'
import { construyendoAhora } from '../state/construyendo'

/**
 * Pulsación larga sobre la escena 3D: mantener el dedo (o el ratón) quieto
 * medio segundo sobre algo. Sirve para gestos que no deben robarle el toque
 * corto a nadie — si se suelta antes o se desliza, no pasa nada y el clic sigue
 * su camino de siempre.
 *
 * Vive fuera de React porque el gesto es UNO en toda la escena (un solo puntero)
 * y lo que se toca se pinta en `map()`s, sin hooks propios. El seguimiento va por
 * `window`: el dedo puede salirse de lo tocado a mitad del gesto y ahí R3F ya no avisa.
 */

/** Tiempo que hay que mantener pulsado para que cuente como pulsación larga. */
const MS_LARGA = 450
/** Deslizar más que esto (px) es arrastrar, no mantener pulsado. */
const TOLERANCIA = 12
/** Ventana en la que el clic de soltar todavía es "de la pulsación larga". */
const MS_ESTELA = 600

let temporizador = 0
let limpiar: (() => void) | null = null
let cumplidaEn = 0

/** Corta el gesto en curso (soltar, deslizar o empezar otro). */
export function cancelarPulsacionLarga(): void {
  if (temporizador) window.clearTimeout(temporizador)
  temporizador = 0
  limpiar?.()
  limpiar = null
}

/**
 * ¿Acaba de cumplirse una pulsación larga? Al soltar el dedo llega también un
 * `click`, y quien lo escuche (caminar hacia el suelo tocado) debe ignorarlo:
 * el usuario mantuvo pulsado para otra cosa, no dio un toque.
 */
export function pulsacionLargaReciente(): boolean {
  return performance.now() - cumplidaEn < MS_ESTELA
}

/** Arranca el conteo desde un `pointerdown`; `alCumplirse` corre si no se movió ni se soltó. */
export function iniciarPulsacionLarga(e: PointerEvent, alCumplirse: () => void): void {
  cancelarPulsacionLarga()
  const x0 = e.clientX
  const y0 = e.clientY
  const mover = (m: PointerEvent) => {
    if (Math.hypot(m.clientX - x0, m.clientY - y0) > TOLERANCIA) cancelarPulsacionLarga()
  }
  window.addEventListener('pointermove', mover)
  window.addEventListener('pointerup', cancelarPulsacionLarga)
  window.addEventListener('pointercancel', cancelarPulsacionLarga)
  limpiar = () => {
    window.removeEventListener('pointermove', mover)
    window.removeEventListener('pointerup', cancelarPulsacionLarga)
    window.removeEventListener('pointercancel', cancelarPulsacionLarga)
  }
  temporizador = window.setTimeout(() => {
    cancelarPulsacionLarga()
    cumplidaEn = performance.now()
    alCumplirse()
  }, MS_LARGA)
}

/**
 * Pulsación larga que DESPIERTA algo del mapa (objeto o cuarto). Con una
 * construcción abierta (caminos, granja, huerto, canchas) no corre: ahí cada
 * toque es de su editor, que está colocando cosas sobre el mismo suelo.
 */
export function pulsacionLargaDespertar(e: PointerEvent, alDespertar: () => void): void {
  if (construyendoAhora()) return
  iniciarPulsacionLarga(e, alDespertar)
}

/**
 * Pulsación larga sobre una construcción del mapa (caminos, granja, huerto):
 * abre SU editor. No hace nada con un editor ya abierto —el del mapa, el de
 * planos u otra construcción—: ahí el toque tiene otro dueño.
 */
export function pulsacionLargaAbrirEditor(e: PointerEvent, abrir: () => void): void {
  if (useLayout.getState().editMode || usePlanos.getState().activo || construyendoAhora()) return
  iniciarPulsacionLarga(e, abrir)
}
