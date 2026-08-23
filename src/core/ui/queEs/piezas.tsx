/**
 * Las «piezas» de la marca: el cuadrado ámbar, el triángulo rojo y el cuarto de
 * círculo morado que la web pinta bajo cada `<h2>` (`.piezas` en
 * `web/estilos.css`) y usa de viñeta en la caja de precios. Aquí sirven para lo
 * mismo: el separador del recorrido y las viñetas de la tarjeta de compra.
 */

interface Forma {
  d: string
  color: string
  /** Solo el cuadrado: se dibuja con <rect> para conservar sus esquinas. */
  rx?: number
}

/** Cada forma, en el orden de la web y con su color de marca. */
export const FORMAS: Forma[] = [
  { d: 'M0 3H94V97H0Z', rx: 20, color: '#DA9425' },
  { d: 'M137 0V100H237Z', color: '#C23A40' },
  { d: 'M257 0H357V100A100 100 0 0 1 257 0Z', color: '#895AC6' },
]

/** El trío completo, cayendo una forma detrás de otra. */
export function Piezas({ className = 'mx-auto h-3.5 w-16' }: { className?: string }) {
  // El centrado va en `className` (el default lo trae) y no aquí: en la
  // cabecera de la puerta las piezas van pegadas al nombre, no en medio.
  return (
    <svg viewBox="0 0 357 100" className={`shrink-0 overflow-visible ${className}`} aria-hidden>
      <rect
        y="3"
        width="94"
        height="94"
        rx="20"
        fill={FORMAS[0].color}
        className="queEs-pieza"
        style={{ animationDelay: '150ms', transformOrigin: '47px 50px' }}
      />
      <path
        d={FORMAS[1].d}
        fill={FORMAS[1].color}
        className="queEs-pieza"
        style={{ animationDelay: '240ms', transformOrigin: '187px 50px' }}
      />
      <path
        d={FORMAS[2].d}
        fill={FORMAS[2].color}
        className="queEs-pieza"
        style={{ animationDelay: '330ms', transformOrigin: '307px 50px' }}
      />
    </svg>
  )
}

/** Una sola pieza, del tamaño de una viñeta; `i` la elige por turnos. */
export function Pieza({ i, className = 'h-2.5 w-2.5' }: { i: number; className?: string }) {
  const forma = FORMAS[i % FORMAS.length]
  // Cada forma vive en su tercio del lienzo original: se recorta el suyo.
  const x = (i % FORMAS.length) * 130
  return (
    <svg viewBox={`${x} 0 100 100`} className={`${className} shrink-0`} aria-hidden>
      {forma.rx ? (
        <rect y="3" width="94" height="94" rx={forma.rx} fill={forma.color} />
      ) : (
        <path d={forma.d} fill={forma.color} />
      )}
    </svg>
  )
}
