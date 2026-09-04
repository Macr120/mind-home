import { useRef, useState } from 'react'
import { COLOR } from './constantes'

/**
 * Encoder giratorio: arco de −135° a +135° que se arrastra en vertical
 * (recorrido completo ≈ 150 px). Doble toque = volver al valor por defecto.
 * Mientras se arrastra solo avisa por `onCambio` (preview imperativo aguas
 * arriba); el valor se confirma con `onCommit` al soltar.
 */
export function Knob({
  valor,
  min = 0,
  max = 1,
  def,
  etiqueta,
  formato,
  onCambio,
  onCommit,
}: {
  valor: number
  min?: number
  max?: number
  def: number
  etiqueta: string
  formato?: (v: number) => string
  onCambio: (v: number) => void
  onCommit: (v: number) => void
}) {
  const [arrastre, setArrastre] = useState<number | null>(null)
  const inicio = useRef({ y: 0, v: 0 })
  const v = arrastre ?? valor
  const frac = (Math.max(min, Math.min(max, v)) - min) / (max - min)

  const bajar = (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    inicio.current = { y: e.clientY, v }
    setArrastre(v)
  }
  const mover = (e: React.PointerEvent) => {
    if (arrastre == null) return
    const nuevo = Math.max(min, Math.min(max, inicio.current.v + ((inicio.current.y - e.clientY) / 150) * (max - min)))
    setArrastre(nuevo)
    onCambio(nuevo)
  }
  const soltar = () => {
    if (arrastre == null) return
    setArrastre(null)
    onCommit(arrastre)
  }

  // Arco −135°..135° (0° arriba, horario); el progreso usa pathLength=100.
  const punto = (ang: number) => {
    const rad = ((ang - 90) * Math.PI) / 180
    return `${24 + 16 * Math.cos(rad)} ${24 + 16 * Math.sin(rad)}`
  }
  const arco = `M ${punto(-135)} A 16 16 0 1 1 ${punto(135)}`
  const texto = formato ? formato(v) : `${Math.round(frac * 100)}%`

  return (
    <div className="flex w-14 shrink-0 flex-col items-center">
      <svg
        role="slider"
        aria-label={etiqueta}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={Math.round(v * 1000) / 1000}
        aria-valuetext={texto}
        tabIndex={0}
        viewBox="0 0 48 48"
        className="h-12 w-12 cursor-ns-resize touch-none outline-none focus-visible:rounded-full focus-visible:ring-2 focus-visible:ring-white/40"
        onPointerDown={bajar}
        onPointerMove={mover}
        onPointerUp={soltar}
        onPointerCancel={soltar}
        onDoubleClick={() => onCommit(def)}
        onKeyDown={(e) => {
          const paso = (max - min) / 20
          if (e.key === 'ArrowUp' || e.key === 'ArrowRight') onCommit(Math.min(max, valor + paso))
          else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') onCommit(Math.max(min, valor - paso))
        }}
      >
        <path d={arco} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth={5} strokeLinecap="round" />
        <path
          d={arco}
          pathLength={100}
          fill="none"
          stroke={COLOR}
          strokeWidth={5}
          strokeLinecap="round"
          strokeDasharray={`${Math.max(0.5, frac * 100)} 100`}
        />
      </svg>
      <span className="max-w-full truncate text-[10px] text-white/50">{etiqueta}</span>
      <span className="text-[10px] tabular-nums text-white/40">{texto}</span>
    </div>
  )
}
