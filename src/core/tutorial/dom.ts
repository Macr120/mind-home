/** Utilidades DOM del tutorial: localizar, esperar y pulsar anclajes `data-tut`. */

/** Primer elemento con ese `data-tut` (en listas con duplicados gana el primero). */
export function elTut(sel: string): Element | null {
  return document.querySelector(`[data-tut="${CSS.escape(sel)}"]`)
}

/**
 * Click programático sobre un anclaje: dispara el onClick de React (delegación
 * en el root). Los elementos SVG no tienen `.click()`: se despacha el evento.
 */
export function clickTut(sel: string): boolean {
  const el = elTut(sel)
  if (!el) return false
  if (el instanceof HTMLElement) el.click()
  else el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
  return true
}

/** Espera a que aparezca el anclaje (polling); resuelve null si no llega a tiempo. */
export function esperarTut(sel: string, timeoutMs = 3000): Promise<Element | null> {
  return new Promise((resolve) => {
    const inicio = Date.now()
    const intento = () => {
      const el = elTut(sel)
      if (el) return resolve(el)
      if (Date.now() - inicio >= timeoutMs) return resolve(null)
      setTimeout(intento, 100)
    }
    intento()
  })
}
