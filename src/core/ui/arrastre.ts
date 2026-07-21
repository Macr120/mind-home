/**
 * Imagen de arrastre nativa: por defecto el navegador clona el elemento tal cual,
 * y con fondos casi transparentes (`bg-white/[0.03]`) queda invisible. Clona la
 * carpeta/tarjeta con un fondo sólido y sombra para que se vea flotando con el
 * cursor, la ancla en el punto donde se agarró y la retira en el siguiente tick.
 */
export function iniciarArrastre(
  origen: HTMLElement,
  dataTransfer: DataTransfer,
  offsetX: number,
  offsetY: number,
) {
  const clon = origen.cloneNode(true) as HTMLElement
  const rect = origen.getBoundingClientRect()
  clon.style.position = 'fixed'
  clon.style.top = '-1000px'
  clon.style.left = '-1000px'
  clon.style.width = `${rect.width}px`
  // Tarjeta "levantada" estilo listas de Apple: fondo sólido, borde acento y sombra marcada.
  clon.style.background = '#252b36'
  clon.style.borderRadius = '10px'
  clon.style.border = '1px solid rgba(52,211,153,0.55)'
  clon.style.boxShadow = '0 16px 36px rgba(0,0,0,0.7)'
  clon.style.opacity = '1'
  clon.style.pointerEvents = 'none'
  document.body.appendChild(clon)
  dataTransfer.setDragImage(clon, offsetX, offsetY)
  dataTransfer.setData('text/plain', '')
  dataTransfer.effectAllowed = 'move'
  setTimeout(() => clon.remove(), 0)
}
