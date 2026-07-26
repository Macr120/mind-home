import { useEffect, useState } from 'react'
import { Icono } from '../../core/ui/iconos/Icono'

/** Imagen desde un Blob. La URL nace y muere en el mismo efecto: así sobrevive
 * al doble montaje de StrictMode (el useMemo la reutilizaría ya revocada). */
export function MiniaturaFoto({ foto, className = '' }: { foto: Blob; className?: string }) {
  const [url, setUrl] = useState<string>()
  useEffect(() => {
    const u = URL.createObjectURL(foto)
    // eslint-disable-next-line react-hooks/set-state-in-effect -- la URL debe nacer en el efecto para sobrevivir el remount de StrictMode
    setUrl(u)
    return () => URL.revokeObjectURL(u)
  }, [foto])
  if (!url) return null
  return <img src={url} alt="" className={`object-cover ${className}`} />
}

/**
 * La imagen de una receta o dieta, en este orden: la foto que puso el usuario,
 * la que la app trae de fábrica (`public/cocina/`) y, si no hay ninguna, una
 * portada dibujada al vuelo con su emoji. Así la lista enseña exactamente lo
 * mismo que el detalle en los tres casos.
 */
export function Portada({
  foto,
  url,
  emoji,
  nombre,
  className = '',
  tamEmoji = 'text-2xl',
}: {
  foto?: Blob
  /** Foto preguardada del repo (manifiesto `imagenesPreset.ts`). */
  url?: string | null
  emoji: string
  nombre: string
  className?: string
  tamEmoji?: string
}) {
  if (foto) return <MiniaturaFoto foto={foto} className={className} />
  if (url) return <img src={url} alt="" loading="lazy" className={`object-cover ${className}`} />
  return (
    <div
      aria-hidden
      className={`flex items-center justify-center ${className}`}
      style={{ background: degradado(nombre) }}
    >
      <span className={tamEmoji}>
        <Icono emoji={emoji} />
      </span>
    </div>
  )
}

/** Degradado estable para un nombre: el mismo platillo siempre sale igual. */
function degradado(nombre: string): string {
  let h = 0
  for (let i = 0; i < nombre.length; i++) h = (h * 31 + nombre.charCodeAt(i)) % 360
  return `linear-gradient(135deg, hsl(${h} 45% 32%), hsl(${(h + 40) % 360} 50% 22%))`
}
