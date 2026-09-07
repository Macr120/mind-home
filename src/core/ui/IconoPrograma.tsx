import { useEffect, useState } from 'react'
import { iconoPrograma } from '../plataforma'
import { Icono } from './iconos/Icono'

/** Iconos ya pedidos al shell, por ruta: la burbuja y el diálogo los reusan. */
const cache = new Map<string, string | null>()

/**
 * El icono del programa asignado a un objeto (lo saca el shell del propio
 * ejecutable); mientras llega, o si no hay, el icono genérico de tecnología.
 */
export function IconoPrograma({ ruta, className = 'h-5 w-5 rounded' }: { ruta: string; className?: string }) {
  // Lo que respondió el shell para ESTA ruta; la caché manda si ya la tenía.
  const [pedido, setPedido] = useState<{ ruta: string; src: string | null } | null>(null)
  const src = cache.has(ruta) ? (cache.get(ruta) ?? null) : pedido?.ruta === ruta ? pedido.src : null

  useEffect(() => {
    if (cache.has(ruta)) return
    let vivo = true
    void iconoPrograma(ruta).then((dataUrl) => {
      cache.set(ruta, dataUrl)
      if (vivo) setPedido({ ruta, src: dataUrl })
    })
    return () => {
      vivo = false
    }
  }, [ruta])

  if (!src) {
    return (
      <span className="text-lg leading-none">
        <Icono nombre="tecnologia" />
      </span>
    )
  }
  return <img src={src} alt="" aria-hidden draggable={false} className={className} />
}
