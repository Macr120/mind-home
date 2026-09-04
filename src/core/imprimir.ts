/**
 * Imprimir (o guardar en PDF) un HTML EN UN IFRAME APARTE, no con un
 * `@media print` sobre la app.
 *
 * Motivo: `RoomOverlay` es `absolute inset-0` dentro de un contenedor de altura
 * fija con `overflow:hidden`, hermano del canvas de la casa. Imprimir eso sale
 * en blanco, y esconder `#root` con `display:none` colapsa el contenedor del
 * `<Canvas>`, cuyo ResizeObserver dispara un `setSize(0,0)` sobre el renderer —
 * con riesgo real de perder el contexto WebGL y volver a una casa negra.
 *
 * El marco clona los `<style>`/`<link>` del documento para que Tailwind (y el
 * CSS de KaTeX, si está) valgan dentro; cada llamador añade su propia hoja de
 * impresión con `cssExtra` (cómputo su formato de fórmulas/tablas, escritura su
 * hoja de documento). Nació en `rooms/computo/exportar.ts` y se movió aquí tal
 * cual cuando el Studio de escritura también necesitó imprimir.
 */

/** En Android/WebView `window.print()` no existe: hay que decirlo, no fallar. */
export const puedeImprimir = () => typeof window !== 'undefined' && typeof window.print === 'function'

/** Abre el diálogo de impresión con ese HTML, sin tocar el documento de la app. */
export async function imprimir(html: string, titulo: string, cssExtra = ''): Promise<void> {
  if (!puedeImprimir()) {
    throw new Error('sin-impresion')
  }
  const marco = document.createElement('iframe')
  marco.setAttribute('aria-hidden', 'true')
  marco.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;'
  document.body.appendChild(marco)

  const doc = marco.contentDocument
  if (!doc) {
    marco.remove()
    throw new Error('sin-impresion')
  }
  doc.open()
  doc.write('<!doctype html><html><head><meta charset="utf-8"></head><body></body></html>')
  doc.close()
  // El título es el nombre que propone el diálogo al guardar como PDF.
  doc.title = titulo

  for (const nodo of document.head.querySelectorAll('style, link[rel="stylesheet"]')) {
    doc.head.appendChild(nodo.cloneNode(true))
  }
  const propio = doc.createElement('style')
  propio.textContent = cssExtra
  doc.head.appendChild(propio)
  doc.body.innerHTML = html

  // Las fuentes bajo demanda (KaTeX): sin esperarlas, el texto se mide con la
  // fuente equivocada y sale descuadrado.
  try {
    await (doc as Document & { fonts?: FontFaceSet }).fonts?.ready
  } catch {
    /* el navegador no expone document.fonts */
  }

  marco.contentWindow?.focus()
  marco.contentWindow?.print()
  // Safari necesita que el marco siga vivo un momento después de imprimir.
  window.setTimeout(() => marco.remove(), 1000)
}
