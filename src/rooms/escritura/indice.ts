import { escaparHtml } from './sanitizarHtml'

/** Una entrada del índice: el n-ésimo encabezado del documento (no se persisten ids ni anclas). */
export interface EntradaIndice {
  nivel: 1 | 2 | 3
  texto: string
  /** Posición dentro de la lista completa de h1/h2/h3, para relocalizarlo al navegar. */
  pos: number
}

const SELECTOR = 'h1, h2, h3'

/** Lee los encabezados del DOM vivo del editor. */
export function extraerIndice(raiz: HTMLElement): EntradaIndice[] {
  return [...raiz.querySelectorAll(SELECTOR)].map((el, pos) => ({
    nivel: Number(el.tagName[1]) as 1 | 2 | 3,
    texto: (el.textContent ?? '').trim().slice(0, 80),
    pos,
  }))
}

/**
 * Navega al encabezado `pos`. Re-consulta el DOM al momento del clic (el panel
 * puede ir hasta 1.5 s atrás por el debounce del autosave) y acota la posición.
 */
export function irAEncabezado(raiz: HTMLElement, pos: number) {
  const encabezados = raiz.querySelectorAll(SELECTOR)
  if (encabezados.length === 0) return
  encabezados[Math.min(pos, encabezados.length - 1)].scrollIntoView({ behavior: 'smooth', block: 'start' })
}

/**
 * HTML del índice: rótulo + listas anidadas por nivel. Solo tags de la lista
 * blanca de `sanitizarHtml` (h2/ol/li), así sirve igual para el PDF (donde no
 * se sanea) y para insertarlo como texto en el documento (donde sí).
 */
export function htmlIndice(entradas: EntradaIndice[], rotulo: string, sinTitulo: string): string {
  let html = `<h2>${escaparHtml(rotulo)}</h2>`
  if (entradas.length === 0) return html
  // Niveles relativos con saltos de a uno: el primero abre en 1 y un h3 tras un
  // h1 solo baja un escalón — así el anidado <li><ol> siempre es HTML válido.
  let nivel = 0
  for (const e of entradas) {
    const n = Math.min(e.nivel, nivel + 1)
    if (n > nivel) {
      html += '<ol>'
    } else {
      html += '</li>'
      for (let i = nivel; i > n; i--) html += '</ol></li>'
    }
    nivel = n
    html += `<li>${escaparHtml(e.texto) || escaparHtml(sinTitulo)}`
  }
  html += '</li>'
  for (let i = nivel; i > 1; i--) html += '</ol></li>'
  return html + '</ol>'
}
