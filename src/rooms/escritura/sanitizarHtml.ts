/**
 * Frontera de seguridad del Studio de escritura: TODO HTML que entra o sale del
 * documento pasa por aquí (al guardar y al cargar). Reconstruye un fragmento
 * limpio con lista blanca de tags y atributos — sin listas negras: `on*`,
 * `href` o `src` no existen por construcción. Lo que produzca cada WebView en
 * el contentEditable da igual: lo que se persiste es canónico.
 */

/** Tags que se conservan (los que produce `execCommand` con nuestro subconjunto). */
const PERMITIDOS = new Set([
  'P', 'DIV', 'BR', 'H1', 'H2', 'H3',
  'B', 'STRONG', 'I', 'EM', 'U', 'S', 'STRIKE',
  'UL', 'OL', 'LI', 'SPAN', 'FONT', 'BLOCKQUOTE',
])

/** Subárboles que se descartan enteros (todo lo demás se «unwrapea»). */
const DESCARTAR = new Set(['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'EMBED', 'LINK', 'META', 'TEMPLATE'])

const COLOR_OK = /^(#[0-9a-f]{3,8}|rgba?\([\d\s.,%]+\))$/i
const ALINEACIONES = new Set(['left', 'center', 'right', 'start', 'end'])

/** HTML arbitrario → HTML canónico de la lista blanca. */
export function sanitizarHtml(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const salida = document.createElement('div')
  copiar(doc.body, salida)
  return salida.innerHTML
}

function copiar(origen: Node, destino: Node): void {
  for (const nodo of Array.from(origen.childNodes)) {
    if (nodo.nodeType === Node.TEXT_NODE) {
      destino.appendChild(document.createTextNode(nodo.textContent ?? ''))
      continue
    }
    if (nodo.nodeType !== Node.ELEMENT_NODE) continue
    const el = nodo as HTMLElement
    if (DESCARTAR.has(el.tagName)) continue
    if (!PERMITIDOS.has(el.tagName)) {
      // Unwrap: pegar de una web conserva el texto y pierde el veneno.
      copiar(el, destino)
      continue
    }
    const limpio = document.createElement(el.tagName)
    // Atributos reconstruidos a mano (nunca copiar `style` crudo).
    const color = el.tagName === 'FONT' ? el.getAttribute('color') : null
    if (color && COLOR_OK.test(color)) limpio.setAttribute('color', color)
    if (el.style.color && COLOR_OK.test(el.style.color)) limpio.style.color = el.style.color
    if (ALINEACIONES.has(el.style.textAlign)) limpio.style.textAlign = el.style.textAlign
    destino.appendChild(limpio)
    copiar(el, limpio)
  }
}

const ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }

export function escaparHtml(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ESCAPES[c])
}

/**
 * Texto plano de la IA → párrafos HTML: línea en blanco separa `<p>`, salto
 * suelto es `<br>`. La IA nunca inyecta HTML: siempre entra escapada por aquí.
 */
export function parrafosHtml(texto: string): string {
  return texto
    .trim()
    .split(/\n{2,}/)
    .map((p) => `<p>${escaparHtml(p.trim()).replace(/\n/g, '<br>')}</p>`)
    .join('')
}

/** Palabras visibles de un texto plano (el contador de la barra y la lista). */
export function contarPalabras(texto: string): number {
  return texto.trim().split(/\s+/).filter(Boolean).length
}

/** El texto plano de un HTML ya saneado (extractos de las notas). */
export function textoPlano(html: string): string {
  const cont = document.createElement('div')
  cont.innerHTML = html
  return (cont.textContent ?? '').trim()
}
