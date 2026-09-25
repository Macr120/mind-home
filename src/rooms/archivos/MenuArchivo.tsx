import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Icono } from '../../core/ui/iconos/Icono'
import type { NombreIcono } from '../../core/ui/iconos/catalogo'

export interface OpcionMenu {
  icono: NombreIcono
  texto: string
  onClick: () => void
  peligro?: boolean
}

/**
 * Menú contextual de Archivo: se abre en el punto del clic derecho (o bajo el
 * botón «⋯», que es la vía en táctil) y se recoloca para no salirse de la
 * pantalla. Cualquier clic fuera, Escape o el scroll lo cierran. La casa no tenía
 * uno reutilizable; este es pequeño y propio.
 */
export function MenuArchivo({ x, y, opciones, onCerrar }: { x: number; y: number; opciones: OpcionMenu[]; onCerrar: () => void }) {
  const caja = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState({ x, y })

  useLayoutEffect(() => {
    const r = caja.current?.getBoundingClientRect()
    if (!r) return
    // Medir antes de pintar: así el menú nunca asoma fuera de la pantalla.
    setPos({ x: Math.max(8, Math.min(x, innerWidth - r.width - 8)), y: Math.max(8, Math.min(y, innerHeight - r.height - 8)) })
  }, [x, y])

  useEffect(() => {
    const fuera = (e: Event) => {
      if (!caja.current?.contains(e.target as Node)) onCerrar()
    }
    const tecla = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCerrar()
    }
    document.addEventListener('pointerdown', fuera, true)
    document.addEventListener('keydown', tecla)
    window.addEventListener('scroll', onCerrar, true)
    window.addEventListener('resize', onCerrar)
    return () => {
      document.removeEventListener('pointerdown', fuera, true)
      document.removeEventListener('keydown', tecla)
      window.removeEventListener('scroll', onCerrar, true)
      window.removeEventListener('resize', onCerrar)
    }
  }, [onCerrar])

  return createPortal(
    <div
      ref={caja}
      role="menu"
      className="ui-panel ui-pop fixed z-[70] min-w-48 overflow-hidden rounded-xl border border-white/10 py-1 shadow-2xl"
      style={{ left: pos.x, top: pos.y }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {opciones.map((o) => (
        <button
          key={o.texto}
          type="button"
          role="menuitem"
          onClick={() => {
            onCerrar()
            o.onClick()
          }}
          className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm hover:bg-white/10 ${o.peligro ? 'text-red-300' : ''}`}
        >
          <Icono nombre={o.icono} className="w-4 text-center text-white/60" /> {o.texto}
        </button>
      ))}
    </div>,
    document.body,
  )
}
