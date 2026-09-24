import type { Cuarto } from '../data/db'
import { usePreviewBlob } from './comun/usePreviewBlob'
import { IconoMarca } from './iconos/glifosApps'

/**
 * El icono de un cuarto en los menús 2D: su imagen propia (subida o generada con
 * IA) si la tiene; si no, en estilo profesional el glifo de marca de su app
 * (`glifosApps.tsx`), y si tampoco hay, el emoji de siempre. El marcador flotante de la escena
 * 3D se queda con el emoji, que nunca se borra.
 */
export function IconoCuarto({ cuarto }: { cuarto: Cuarto }) {
  const url = usePreviewBlob(cuarto.iconoImagen)
  if (cuarto.iconoImagen && url) {
    return <img src={url} alt="" className="h-full w-full object-cover" draggable={false} />
  }
  return <IconoMarca emoji={cuarto.icon} size="1.5em" />
}
