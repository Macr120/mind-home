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

/**
 * Abre la primera ficha VISIBLE de una lista (`<prefijo>.item.<id>` o
 * `<prefijo>.<id>`) y devuelve el id abierto, para que un `sel` funcional
 * pueda anclarse a ella. Generaliza el patrón que ya usaban `entretenimiento`
 * (por DOM) y `hobbies`/`garage`/`ideas` (por repo, cuando importa CUÁL ficha
 * — esos siguen buscando a mano lo interesante y solo usan `clickTut` directo).
 *
 * Regla de las altas en los tours: si el alta es un formulario SIEMPRE en
 * pantalla (p. ej. `despacho.mov.form`), se señala tal cual y se narran sus
 * campos; si es un modal/ficha, se abre una YA EXISTENTE del año de Pep@ para
 * que se vea con contenido real (nunca se crea un dato nuevo); si no hay
 * ninguna de las dos, se señala el botón de alta y el texto enumera qué pide.
 */
export async function abrirPrimeraFicha(prefijo: string, listaSel?: string): Promise<string | null> {
  if (listaSel) await esperarTut(listaSel, 3000)
  const el = document.querySelector(`[data-tut^="${CSS.escape(prefijo)}."]`)
  const valor = el?.getAttribute('data-tut') ?? null
  const id = valor ? valor.slice(prefijo.length + 1) : null
  if (id) clickTut(`${prefijo}.${id}`)
  return id
}
