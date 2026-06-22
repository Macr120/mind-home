import { useCallback, useEffect, useRef, useState } from 'react'

export type ViewBoxPlano = { x: number; y: number; w: number; h: number }

const ZOOM_FACTOR = 1.12
const MIN_ZOOM = 0.3
const MAX_ZOOM = 10

/** Margen alrededor del croquis al encajar en pantalla. */
function margenFit(ancho: number, alto: number) {
  return Math.max(ancho, alto) * 0.06
}

/** ViewBox base del contenido con margen visual. */
export function viewBoxContenido(ancho: number, alto: number): ViewBoxPlano {
  const m = margenFit(ancho, alto)
  return { x: -m, y: -m, w: ancho + m * 2, h: alto + m * 2 }
}

/**
 * Encaja el plano en el contenedor visible (ya descontado el panel lateral).
 * Reserva espacio abajo/derecha para los botones flotantes.
 */
export function viewBoxEncaje(
  contentW: number,
  contentH: number,
  containerW: number,
  containerH: number,
): ViewBoxPlano {
  const base = viewBoxContenido(contentW, contentH)
  const padL = 12
  const padT = 12
  const padR = 20
  const padB = 56
  const usableW = Math.max(1, containerW - padL - padR)
  const usableH = Math.max(1, containerH - padT - padB)
  const contentAspect = base.w / base.h
  const usableAspect = usableW / usableH
  let w = base.w
  let h = base.h
  if (contentAspect > usableAspect) {
    h = w / usableAspect
  } else {
    w = h * usableAspect
  }
  return {
    x: base.x - (w - base.w) / 2,
    y: base.y - (h - base.h) / 2,
    w,
    h,
  }
}

export function usePlanoViewport(contentW: number, contentH: number) {
  const containerRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement | null>(null)
  const [viewBox, setViewBox] = useState<ViewBoxPlano>(() =>
    viewBoxContenido(contentW, contentH),
  )
  const userModified = useRef(false)
  const panning = useRef(false)
  const panStart = useRef<{ x: number; y: number; vb: ViewBoxPlano } | null>(null)
  const [cursorPan, setCursorPan] = useState(false)
  const viewBoxRef = useRef(viewBox)
  viewBoxRef.current = viewBox

  const fitToContainer = useCallback(() => {
    const el = containerRef.current
    if (!el || contentW <= 0 || contentH <= 0) return
    const { width, height } = el.getBoundingClientRect()
    if (width < 8 || height < 8) return
    setViewBox(viewBoxEncaje(contentW, contentH, width, height))
    userModified.current = false
  }, [contentW, contentH])

  useEffect(() => {
    userModified.current = false
    fitToContainer()
    const id = requestAnimationFrame(() => fitToContainer())
    return () => cancelAnimationFrame(id)
  }, [contentW, contentH, fitToContainer])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(() => {
      if (!userModified.current) fitToContainer()
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [fitToContainer])

  const clientToSvg = useCallback((clientX: number, clientY: number) => {
    const svg = svgRef.current
    if (!svg) return null
    const pt = svg.createSVGPoint()
    pt.x = clientX
    pt.y = clientY
    const ctm = svg.getScreenCTM()
    if (!ctm) return null
    const loc = pt.matrixTransform(ctm.inverse())
    return { x: loc.x, y: loc.y }
  }, [])

  const esInicioPan = (e: PointerEvent) =>
    e.button === 1 || (e.button === 0 && (e.altKey || e.shiftKey))

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const pt = clientToSvg(e.clientX, e.clientY)
      if (!pt) return
      userModified.current = true
      const factor = e.deltaY > 0 ? ZOOM_FACTOR : 1 / ZOOM_FACTOR
      const m = margenFit(contentW, contentH)
      const minW = contentW / MAX_ZOOM
      const maxW = (contentW + m * 2) / MIN_ZOOM

      setViewBox((vb) => {
        const nw = Math.min(maxW, Math.max(minW, vb.w * factor))
        const nh = vb.h * (nw / vb.w)
        return {
          x: pt.x - (pt.x - vb.x) * (nw / vb.w),
          y: pt.y - (pt.y - vb.y) * (nh / vb.h),
          w: nw,
          h: nh,
        }
      })
    }

    const onPointerDown = (e: PointerEvent) => {
      if (!esInicioPan(e)) return
      e.preventDefault()
      e.stopPropagation()
      panning.current = true
      setCursorPan(true)
      panStart.current = { x: e.clientX, y: e.clientY, vb: viewBoxRef.current }
      el.setPointerCapture(e.pointerId)
      userModified.current = true
    }

    const onPointerMove = (e: PointerEvent) => {
      if (!panning.current || !panStart.current) return
      const rect = el.getBoundingClientRect()
      const scaleX = panStart.current.vb.w / rect.width
      const scaleY = panStart.current.vb.h / rect.height
      const dx = (e.clientX - panStart.current.x) * scaleX
      const dy = (e.clientY - panStart.current.y) * scaleY
      setViewBox({
        ...panStart.current.vb,
        x: panStart.current.vb.x - dx,
        y: panStart.current.vb.y - dy,
      })
    }

    const finPan = (e: PointerEvent) => {
      if (!panning.current) return
      panning.current = false
      panStart.current = null
      setCursorPan(false)
      if (el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId)
    }

    el.addEventListener('wheel', onWheel, { passive: false })
    el.addEventListener('pointerdown', onPointerDown, { capture: true })
    el.addEventListener('pointermove', onPointerMove)
    el.addEventListener('pointerup', finPan)
    el.addEventListener('pointercancel', finPan)

    return () => {
      el.removeEventListener('wheel', onWheel)
      el.removeEventListener('pointerdown', onPointerDown, { capture: true })
      el.removeEventListener('pointermove', onPointerMove)
      el.removeEventListener('pointerup', finPan)
      el.removeEventListener('pointercancel', finPan)
    }
  }, [clientToSvg, contentW, contentH])

  const mergeSvgRef = useCallback((node: SVGSVGElement | null) => {
    svgRef.current = node
  }, [])

  return {
    containerRef,
    mergeSvgRef,
    viewBox,
    fitToContainer,
    cursorPan,
    viewBoxStr: `${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`,
  }
}
