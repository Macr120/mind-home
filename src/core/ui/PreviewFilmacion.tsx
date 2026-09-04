import { useEffect, useRef } from 'react'
import { useT } from '../i18n/useT'
import { peliculaFrame } from '../state/peliculaStore'

/** Cuadros por segundo del monitor: un vistazo, no una segunda escena. */
const FPS_MONITOR = 15

/**
 * El monitor del modo película: en el hueco del cubo de vistas, la filmación
 * tal como saldrá en el archivo (el lienzo 3D de la casa por `captureStream`,
 * como el export, con la capa de composición del motor encima). Un canvas
 * pequeño repintado por rAF; la captura y el `<video>` mueren con él.
 */
export function PreviewFilmacion({ ancho }: { ancho: number }) {
  const t = useT()
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const lienzo = document.querySelector<HTMLCanvasElement>('[data-lienzo-casa] canvas')
    const c = ref.current
    const ctx = c?.getContext('2d')
    if (!lienzo || !c || !ctx || typeof lienzo.captureStream !== 'function') return
    const stream = lienzo.captureStream(FPS_MONITOR)
    const video = document.createElement('video')
    video.muted = true
    video.playsInline = true
    video.autoplay = true
    video.srcObject = stream
    video.play().catch(() => {
      /* sin gesto aún: arranca solo al primer toque */
    })
    let raf = 0
    const pintar = () => {
      raf = requestAnimationFrame(pintar)
      const cw = lienzo.clientWidth
      const ch = lienzo.clientHeight
      if (!cw || !ch) return
      const w = ancho
      const h = Math.max(1, Math.round((ancho * ch) / cw))
      if (c.width !== w || c.height !== h) {
        c.width = w
        c.height = h
      }
      ctx.fillStyle = '#000'
      ctx.fillRect(0, 0, w, h)
      if (video.readyState >= 2) ctx.drawImage(video, 0, 0, w, h)
      const comp = peliculaFrame.lienzoComposicion
      if (comp && comp.width > 0) ctx.drawImage(comp, 0, 0, w, h)
    }
    raf = requestAnimationFrame(pintar)
    return () => {
      cancelAnimationFrame(raf)
      for (const p of stream.getTracks()) p.stop()
      video.srcObject = null
    }
  }, [ancho])
  return (
    <canvas
      ref={ref}
      role="img"
      aria-label={t('video.pelicula.previewFilmacion', 'Vista previa de la película')}
      title={t('video.pelicula.previewFilmacion', 'Vista previa de la película')}
      className="block rounded-lg border border-white/10 bg-black"
      style={{ width: ancho }}
    />
  )
}
