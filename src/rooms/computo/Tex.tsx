import { useLayoutEffect, useRef } from 'react'
import type { Motor } from './motor'

/**
 * Fórmula en LaTeX. Mientras el motor no está, pinta la expresión cruda en
 * monoespaciado: nunca queda un hueco vacío esperando a KaTeX.
 */
export function Tex({
  tex,
  motor,
  bloque = false,
  crudo,
  className = '',
}: {
  /** LaTeX a pintar. */
  tex: string
  /** Motor cargado, o null mientras descarga. */
  motor: Motor | null
  /** Centrado y a tamaño grande (la ficha de una fórmula). */
  bloque?: boolean
  /** Lo que se enseña mientras no hay motor; por defecto, el propio LaTeX. */
  crudo?: string
  className?: string
}) {
  const caja = useRef<HTMLSpanElement>(null)

  useLayoutEffect(() => {
    if (!motor || !caja.current) return
    motor.pintarTex(caja.current, tex, bloque)
  }, [motor, tex, bloque])

  if (!motor) {
    return (
      <span className={`font-mono text-[0.95em] opacity-70 ${className}`} translate="no">
        {crudo ?? tex}
      </span>
    )
  }
  return <span ref={caja} className={className} translate="no" />
}
