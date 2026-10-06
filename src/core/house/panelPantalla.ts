import type { Pieza3D } from '../chat/mascotas'

/**
 * La pantalla de un objeto de piezas (el monitor suelto de la laptop o de la
 * estación de cómputo, una receta del taller, uno hecho a mano o por la IA):
 * una caja 'luz' plana, de frente (+z), de al menos 15 cm por lado y rectangular
 * —un panel cuadrado es un foco, como el de la cámara de video—. -1 si no tiene.
 */
export function panelPantalla(piezas: Pieza3D[] | undefined): number {
  if (!piezas) return -1
  let mejor = -1
  let area = 0
  piezas.forEach((p, i) => {
    if (p.tipo !== 'caja' || p.mat !== 'luz') return
    const [w, h, d] = p.tam
    if (w < 0.15 || h < 0.15 || d > Math.min(w, h) / 4 || w * h <= area) return
    if (Math.max(w, h) / Math.min(w, h) < 1.25) return
    mejor = i
    area = w * h
  })
  return mejor
}
