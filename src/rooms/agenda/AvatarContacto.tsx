import { usePreviewBlob } from '../../core/ui/comun/usePreviewBlob'
import { Icono } from '../../core/ui/iconos/Icono'
import type { NombreIcono } from '../../core/ui/iconos/catalogo'

/** Degradado estable a partir del nombre: el mismo contacto siempre sale igual. */
function degradado(nombre: string): string {
  let h = 0
  for (let i = 0; i < nombre.length; i++) h = (h * 31 + nombre.charCodeAt(i)) % 360
  return `linear-gradient(135deg, hsl(${h} 45% 32%), hsl(${(h + 40) % 360} 50% 22%))`
}

/**
 * Retrato de una ficha (contacto o mascota); sin foto, su inicial sobre un
 * degradado propio, o el icono de su especie cuando se pasa `icono`.
 */
export function AvatarContacto({
  nombre,
  foto,
  icono,
  size = 40,
}: {
  nombre: string
  foto?: Blob
  icono?: NombreIcono
  size?: number
}) {
  const url = usePreviewBlob(foto)
  return (
    <span
      className="grid shrink-0 place-items-center overflow-hidden rounded-full font-bold text-white/80"
      style={{ width: size, height: size, fontSize: size * 0.4, background: degradado(nombre) }}
    >
      {url ? (
        <img src={url} alt="" className="h-full w-full object-cover" />
      ) : icono ? (
        <Icono nombre={icono} />
      ) : (
        (nombre.trim()[0] ?? '?').toUpperCase()
      )}
    </span>
  )
}
