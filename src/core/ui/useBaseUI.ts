import { useSyncExternalStore } from 'react'

/**
 * ¿Está aplicada AHORA la base clara? (`data-base-ui` del `<html>`).
 *
 * No vale con mirar `modoUI` del store: en modo transparente la base la decide la
 * luz de la casa (`useVidrioSegunLuz`) y cambia sola al anochecer. Lo único
 * siempre veraz es el atributo que escribe `aplicarTemaUI`.
 *
 * Solo hace falta en lo que pinta colores desde JS (un canvas, un material 3D);
 * el CSS y las clases `*-white/X` de Tailwind se invierten solas.
 */
function suscribir(alCambiar: () => void) {
  const obs = new MutationObserver(alCambiar)
  obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-base-ui'] })
  return () => obs.disconnect()
}

const leer = () => document.documentElement.dataset.baseUi === 'claro'

export function useBaseClara(): boolean {
  return useSyncExternalStore(suscribir, leer, () => false)
}
