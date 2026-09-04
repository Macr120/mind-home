import { useEffect, useRef, useState, type RefObject } from 'react'
import { capturarPointer } from '../../core/ui/comun/arrastre'
import { ALTO_PREVIEW_FRACCION, ALTO_PREVIEW_PLIEGUE, LS_ALTO_PREVIEW, RESERVA_TIMELINE } from './constantes'

function leer(clave: string): number | null {
  try {
    const raw = localStorage.getItem(clave)
    const v = Number(raw)
    return raw != null && Number.isInteger(v) && v >= 0 ? v : null
  } catch {
    return null
  }
}

/**
 * El alto del visor, ajustable con el divisor (estilo CapCut: tirar hacia
 * arriba minimiza el preview y deja sitio a la timeline). Se mide el CUERPO con
 * ResizeObserver (nunca `vh`: el cuarto ya descuenta su cabecera), se acota
 * contra él en cada montaje (un valor guardado en escritorio no desborda un
 * teléfono) y se persiste en px. El alto en vivo va por ref durante el
 * arrastre; el estado solo cambia al soltar. Doble toque = restaurar.
 * `opciones` (modo película): otra clave y otra fracción, para que el alto
 * guardado del visor normal no encoja la zona del mapa.
 */
export function useAltoPreview(
  cuerpoRef: RefObject<HTMLDivElement | null>,
  previewRef: RefObject<HTMLDivElement | null>,
  /** El cuerpo existe (el editor pinta un spinner hasta cargar el proyecto): re-suscribe el observador. */
  montado: boolean,
  opciones?: { clave?: string; fraccion?: number },
) {
  const clave = opciones?.clave ?? LS_ALTO_PREVIEW
  const fraccion = opciones?.fraccion ?? ALTO_PREVIEW_FRACCION
  const [altoCuerpo, setAltoCuerpo] = useState(0)
  const [pref, setPref] = useState<number | null>(() => leer(clave))
  useEffect(() => {
    const el = cuerpoRef.current
    if (!el || !montado) return
    const ro = new ResizeObserver(([e]) => setAltoCuerpo(Math.round(e.contentRect.height)))
    ro.observe(el)
    return () => ro.disconnect()
  }, [cuerpoRef, montado])
  const altoMax = Math.max(0, altoCuerpo - RESERVA_TIMELINE)
  const acotar = (v: number) => {
    const a = Math.min(altoMax, Math.max(0, Math.round(v)))
    return a < ALTO_PREVIEW_PLIEGUE ? 0 : a
  }
  const alto = acotar(pref ?? Math.round(altoCuerpo * fraccion))

  const base = useRef<{ y0: number; alto0: number } | null>(null)
  const ultimoTap = useRef(0)
  // El setItem va FUERA del actualizador: en StrictMode se ejecuta dos veces.
  const cometer = (v: number | null) => {
    try {
      if (v == null) localStorage.removeItem(clave)
      else localStorage.setItem(clave, String(v))
    } catch {
      /* almacenamiento bloqueado */
    }
    setPref(v)
  }
  const props = {
    onPointerDown: (e: React.PointerEvent) => {
      e.preventDefault()
      e.stopPropagation()
      capturarPointer(e.currentTarget, e.pointerId)
      base.current = { y0: e.clientY, alto0: alto }
    },
    onPointerMove: (e: React.PointerEvent) => {
      const b = base.current
      if (!b || !previewRef.current) return
      previewRef.current.style.height = `${acotar(b.alto0 + (e.clientY - b.y0))}px`
    },
    onPointerUp: (e: React.PointerEvent) => {
      const b = base.current
      base.current = null
      if (!b) return
      const v = acotar(b.alto0 + (e.clientY - b.y0))
      const ahora = performance.now()
      if (Math.abs(e.clientY - b.y0) < 6 && ahora - ultimoTap.current < 300) {
        ultimoTap.current = 0
        cometer(null)
        return
      }
      ultimoTap.current = ahora
      if (v !== alto) cometer(v)
      else if (previewRef.current) previewRef.current.style.height = `${alto}px`
    },
    onPointerCancel: () => {
      base.current = null
      if (previewRef.current) previewRef.current.style.height = `${alto}px`
    },
    onKeyDown: (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowUp') cometer(acotar(alto - 16))
      else if (e.key === 'ArrowDown') cometer(acotar(alto + 16))
      else if (e.key === 'Home') cometer(0)
      else if (e.key === 'End') cometer(altoMax)
      else return
      e.preventDefault()
    },
  }
  return { alto, altoMax, colapsado: alto === 0, props, restaurar: () => cometer(null) }
}
