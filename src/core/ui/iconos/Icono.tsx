import type { CSSProperties } from 'react'
import { useAjustes } from '../../state/ajustesStore'
import { CATALOGO, iconoDe, type NombreIcono } from './catalogo'

/**
 * Icono de interfaz conmutable: emoji (vista clásica) o SVG de lucide
 * (vista profesional), según el ajuste `estiloIconos`.
 *
 * - `nombre`: entrada tipada del catálogo (iconos codificados del chrome).
 * - `emoji`: emoji proveniente de un catálogo de dominio o de la BD; se
 *   resuelve por mapa inverso. Si no tiene equivalente se muestra el emoji
 *   tal cual (los datos libres del usuario degradan con elegancia).
 *
 * El SVG usa `currentColor` y `1em`: hereda color y tamaño del texto que lo
 * rodea (`text-3xl`, `text-white/60`…), así que no altera los layouts.
 */

interface Props {
  nombre?: NombreIcono
  emoji?: string
  className?: string
  size?: number | string
  title?: string
}

// Alinea el SVG con la línea base del texto, como un glifo más.
const ESTILO_SVG: CSSProperties = { verticalAlign: '-0.125em' }

export function Icono({ nombre, emoji, className, size = '1em', title }: Props) {
  const estilo = useAjustes((s) => s.estiloIconos)

  const resuelto = nombre ?? (emoji ? iconoDe(emoji) : null)
  const def = resuelto ? CATALOGO[resuelto] : null

  if (estilo === 'emoji' || !def) {
    return (
      <span aria-hidden={!title} title={title} className={className}>
        {def?.emoji ?? emoji}
      </span>
    )
  }

  const Svg = def.Svg
  return (
    <Svg
      aria-hidden={!title}
      focusable={false}
      size={size}
      strokeWidth={2}
      className={`inline-block shrink-0 ${className ?? ''}`}
      style={ESTILO_SVG}
    >
      {title ? <title>{title}</title> : null}
    </Svg>
  )
}
