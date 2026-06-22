import { useEffect, useRef, useState } from 'react'
import type { AjusteFondoImagen } from '../../house/fondosImagen'
import {
  AJUSTE_FONDO_DEFAULT,
  ajusteTrasArrastre,
  clampAjuste,
  layoutFondoImagen,
  medirImagen,
} from '../../house/fondosImagen'
import {
  altoCanvasVisible,
  anchoCanvasVisible,
} from '../../house/proyectarPreviewCielo'
import { useT } from '../../i18n/useT'
import { PreviewMapaSobreCielo } from './PreviewMapaSobreCielo'

interface Props {
  url: string
  blob: Blob
  nombre: string
  ajuste: AjusteFondoImagen
  onAjuste: (a: AjusteFondoImagen) => void
  onNombre: (n: string) => void
  onCancelar: () => void
  onGuardar: () => void
  guardando?: boolean
}

/**
 * Vista previa estilo recorte: se ve la imagen COMPLETA (atenuada) y el marco de
 * la PANTALLA (lo que se verá de fondo). Arrastra para mover la imagen; el zoom
 * acerca/aleja. Lo que la imagen no cubra dentro del marco queda en negro.
 */
export function EditorFondoImagenPreview({
  url,
  blob,
  nombre,
  ajuste,
  onAjuste,
  onNombre,
  onCancelar,
  onGuardar,
  guardando,
}: Props) {
  const t = useT()
  const boxRef = useRef<HTMLDivElement>(null)
  const arrastre = useRef<{ px: number; py: number; ajuste: AjusteFondoImagen } | null>(null)
  const calc = useRef({ scale: 1 })
  const [dims, setDims] = useState<{ ancho: number; alto: number } | null>(null)
  const [box, setBox] = useState({ w: 300, h: 169 })

  const vpW = anchoCanvasVisible()
  const vpH = altoCanvasVisible()

  useEffect(() => {
    let vivo = true
    medirImagen(blob)
      .then((d) => vivo && setDims(d))
      .catch(() => vivo && setDims({ ancho: 16, alto: 9 }))
    return () => {
      vivo = false
    }
  }, [blob])

  useEffect(() => {
    const el = boxRef.current
    if (!el) return
    const obs = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      if (width > 0 && height > 0) setBox({ w: width, h: height })
    })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  // Encuadre: imagen + marco de pantalla, ajustados (con holgura) dentro de la caja.
  const e = dims ? layoutFondoImagen(dims.ancho, dims.alto, vpW, vpH, ajuste) : null
  let scale = 1
  let offX = 0
  let offY = 0
  if (e) {
    const pad = 0.06 * Math.max(vpW, vpH)
    const minX = Math.min(0, e.left) - pad
    const minY = Math.min(0, e.top) - pad
    const maxX = Math.max(vpW, e.left + e.anchoD) + pad
    const maxY = Math.max(vpH, e.top + e.altoD) + pad
    const unionW = maxX - minX
    const unionH = maxY - minY
    scale = Math.min(box.w / unionW, box.h / unionH)
    offX = (box.w - unionW * scale) / 2 - minX * scale
    offY = (box.h - unionH * scale) / 2 - minY * scale
  }
  calc.current.scale = scale

  const onPointerDown = (ev: React.PointerEvent) => {
    ev.currentTarget.setPointerCapture(ev.pointerId)
    arrastre.current = { px: ev.clientX, py: ev.clientY, ajuste }
  }

  const onPointerMove = (ev: React.PointerEvent) => {
    if (!arrastre.current || !dims) return
    const s = calc.current.scale || 1
    const dxScreen = (ev.clientX - arrastre.current.px) / s
    const dyScreen = (ev.clientY - arrastre.current.py) / s
    onAjuste(
      ajusteTrasArrastre(
        arrastre.current.ajuste,
        dims.ancho,
        dims.alto,
        vpW,
        vpH,
        dxScreen / vpW,
        dyScreen / vpH,
      ),
    )
  }

  const onPointerUp = (ev: React.PointerEvent) => {
    arrastre.current = null
    ev.currentTarget.releasePointerCapture(ev.pointerId)
  }

  return (
    <div className="space-y-2.5 rounded-xl border border-emerald-400/25 bg-black/30 p-2.5">
      <p className="text-[11px] font-semibold text-emerald-200/90">
        {t('editor.fondo.previewTitulo', 'Ajusta el fondo — arrastra la imagen; el marco es tu pantalla')}
      </p>

      <div
        ref={boxRef}
        className="relative aspect-video w-full overflow-hidden rounded-lg border border-white/10 bg-[#05070b] select-none"
      >
        {e && dims ? (
          <>
            {/* Imagen completa atenuada (contexto fuera de pantalla) */}
            <img
              src={url}
              alt=""
              draggable={false}
              className="pointer-events-none absolute opacity-30"
              style={{
                left: offX + e.left * scale,
                top: offY + e.top * scale,
                width: e.anchoD * scale,
                height: e.altoD * scale,
                maxWidth: 'none',
              }}
            />

            {/* Marco de la pantalla: lo que se verá de fondo (negro donde no haya imagen) */}
            <div
              className="absolute overflow-hidden border-2 border-emerald-400/80 bg-black shadow-[0_0_0_2000px_rgba(0,0,0,0.55)]"
              style={{
                left: offX,
                top: offY,
                width: vpW * scale,
                height: vpH * scale,
              }}
            >
              <img
                src={url}
                alt=""
                draggable={false}
                className="pointer-events-none absolute"
                style={{
                  left: e.left * scale,
                  top: e.top * scale,
                  width: e.anchoD * scale,
                  height: e.altoD * scale,
                  maxWidth: 'none',
                }}
              />
              <PreviewMapaSobreCielo ancho={vpW * scale} alto={vpH * scale} />
            </div>
          </>
        ) : (
          <div className="absolute inset-0 animate-pulse bg-white/5" />
        )}

        {/* Capa de arrastre (solo mueve la imagen) */}
        <div
          className="absolute inset-0 z-20 cursor-grab active:cursor-grabbing"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
          role="presentation"
          aria-hidden
        />
      </div>

      <label className="block text-[10px] text-white/45">
        {t('editor.fondo.nombre', 'Nombre')}
        <input
          type="text"
          value={nombre}
          onChange={(ev) => onNombre(ev.target.value.slice(0, 40))}
          className="mt-1 w-full rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-xs text-white/85"
        />
      </label>

      <label className="block text-[10px] text-white/45">
        {t('editor.fondo.zoom', 'Zoom')} · {ajuste.escala.toFixed(1)}×
        <input
          type="range"
          min={0.2}
          max={4}
          step={0.05}
          value={ajuste.escala}
          onChange={(ev) =>
            onAjuste(clampAjuste({ ...ajuste, escala: parseFloat(ev.target.value) }))
          }
          className="mt-1 w-full accent-emerald-400"
        />
      </label>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onCancelar}
          className="flex-1 rounded-lg border border-white/15 py-1.5 text-[11px] text-white/60 hover:bg-white/5"
        >
          {t('editor.fondo.cancelar', 'Cancelar')}
        </button>
        <button
          type="button"
          disabled={guardando || !dims}
          onClick={onGuardar}
          className="flex-1 rounded-lg bg-emerald-500 py-1.5 text-[11px] font-bold text-black hover:bg-emerald-400 disabled:opacity-40"
        >
          {guardando
            ? t('editor.fondo.guardando', 'Guardando…')
            : t('editor.fondo.guardar', 'Guardar fondo')}
        </button>
      </div>
    </div>
  )
}

export { AJUSTE_FONDO_DEFAULT }
