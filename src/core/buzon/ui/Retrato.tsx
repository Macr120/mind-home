import { Icono } from '../../ui/iconos/Icono'

/**
 * El avatar de una persona del buzón: el busto de su personaje 3D (data URL
 * que subió su propia app) y, mientras no lo tenga, su emoji en un círculo.
 */
export function Retrato({
  retrato,
  emoji,
  className = 'h-9 w-9',
  textoClase = 'text-xl',
}: {
  retrato?: string | null
  emoji: string
  /** Tamaño (clases h-/w-). */
  className?: string
  /** Tamaño del emoji de respaldo. */
  textoClase?: string
}) {
  if (retrato) {
    return <img src={retrato} alt="" className={`${className} shrink-0 rounded-full bg-white/10 object-cover`} draggable={false} />
  }
  return (
    <span className={`grid ${className} shrink-0 place-items-center rounded-full bg-white/10 leading-none ${textoClase}`}>
      <Icono emoji={emoji} />
    </span>
  )
}
