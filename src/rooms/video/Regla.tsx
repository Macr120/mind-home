import { useRef, type RefObject } from 'react'
import { useT } from '../../core/i18n/useT'
import { capturarPointer } from '../../core/ui/comun/arrastre'
import { ALTO_REGLA, COLA_SEG, MAX_ETIQUETAS_REGLA, NIVELES_ZOOM_VIDEO } from './constantes'

/** `m:ss` para las etiquetas de la regla. */
export const fmtRegla = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`

/**
 * La regla de tiempo: etiquetas cada N segundos según el zoom (con tope de
 * nodos), ticks por gradiente CSS (cero nodos) y la cabeza del playhead. El
 * scrub es SU gesto: captura el puntero y avisa al soltar con el seek final.
 */
export function Regla({
  nivel,
  total,
  ancho,
  cabezaRef,
  onScrub,
}: {
  nivel: number
  total: number
  ancho: number
  cabezaRef: RefObject<HTMLDivElement | null>
  /** `final` = pointerup: garantiza el seek definitivo. */
  onScrub: (seg: number, final: boolean) => void
}) {
  const t = useT()
  const { pxPorSeg, etiqueta, tick } = NIVELES_ZOOM_VIDEO[nivel]
  const ref = useRef<HTMLDivElement>(null)
  const scrub = useRef(false)
  let paso = etiqueta
  while ((total + COLA_SEG) / paso > MAX_ETIQUETAS_REGLA) paso *= 2
  const etiquetas: number[] = []
  for (let s = 0; s <= total + COLA_SEG; s += paso) etiquetas.push(s)

  const segDe = (clientX: number) => {
    const rect = ref.current?.getBoundingClientRect()
    if (!rect) return 0
    return Math.max(0, Math.min(total, (clientX - rect.left) / pxPorSeg))
  }

  return (
    <div
      ref={ref}
      role="slider"
      aria-label={t('video.timeline.regla', 'Línea de tiempo: arrastra para mover el cursor')}
      aria-valuemin={0}
      aria-valuemax={Math.round(total)}
      aria-valuenow={0}
      tabIndex={-1}
      className="ui-panel-2 relative shrink-0 cursor-ew-resize touch-none select-none border-b border-white/10"
      style={{
        width: ancho,
        height: ALTO_REGLA,
        backgroundImage: `repeating-linear-gradient(to right, rgba(255,255,255,0.3) 0 1px, transparent 1px ${tick * pxPorSeg}px), repeating-linear-gradient(to right, rgba(255,255,255,0.6) 0 1px, transparent 1px ${paso * pxPorSeg}px)`,
        backgroundSize: '100% 5px, 100% 10px',
        backgroundPosition: 'left bottom, left bottom',
        backgroundRepeat: 'repeat-x, repeat-x',
      }}
      onPointerDown={(e) => {
        if (e.button !== 0) return
        capturarPointer(e.currentTarget, e.pointerId)
        scrub.current = true
        onScrub(segDe(e.clientX), false)
      }}
      onPointerMove={(e) => {
        if (scrub.current) onScrub(segDe(e.clientX), false)
      }}
      onPointerUp={(e) => {
        if (!scrub.current) return
        scrub.current = false
        onScrub(segDe(e.clientX), true)
      }}
      onPointerCancel={() => {
        scrub.current = false
      }}
    >
      {etiquetas.map((s) => (
        <span key={s} className="absolute top-0.5 font-mono text-[9px] text-white/60" style={{ left: s * pxPorSeg + 3 }}>
          {fmtRegla(s)}
        </span>
      ))}
      <div ref={cabezaRef} className="pointer-events-none absolute inset-y-0 left-0 z-10 w-0.5 bg-white">
        <span className="absolute -left-[5px] top-0 border-x-[6px] border-t-[7px] border-x-transparent border-t-white" />
      </div>
    </div>
  )
}
