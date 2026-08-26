import { useEffect, useRef, useState } from 'react'
import { setPad } from '../house/movement'
import { setLookPad, clearLook } from '../house/lookInput'
import { useT } from '../i18n/useT'
import { useHud } from '../state/hudStore'
import { BotonPlegarHud } from './HudPlegable'
import { useTopeHud } from './hudMedida'

const R = 38 // radio máximo del knob

/**
 * Joystick analógico en pantalla: arrastra el knob en cualquier dirección (360°)
 * y reporta su posición normalizada (-1..1) por `onChange`; `onEnd` al soltar.
 */
function Joystick({
  label,
  onChange,
  onEnd,
}: {
  label: string
  onChange: (x: number, y: number) => void
  onEnd: () => void
}) {
  const baseRef = useRef<HTMLDivElement>(null)
  const [knob, setKnob] = useState({ x: 0, y: 0 })
  const activo = useRef(false)

  const aplicar = (clientX: number, clientY: number) => {
    const base = baseRef.current
    if (!base) return
    const r = base.getBoundingClientRect()
    const cx = r.left + r.width / 2
    const cy = r.top + r.height / 2
    let dx = clientX - cx
    let dy = clientY - cy
    const dist = Math.hypot(dx, dy)
    if (dist > R) {
      dx = (dx / dist) * R
      dy = (dy / dist) * R
    }
    setKnob({ x: dx, y: dy })
    onChange(dx / R, dy / R)
  }

  const onDown = (e: React.PointerEvent) => {
    activo.current = true
    e.currentTarget.setPointerCapture(e.pointerId)
    aplicar(e.clientX, e.clientY)
  }
  const onMove = (e: React.PointerEvent) => {
    if (activo.current) aplicar(e.clientX, e.clientY)
  }
  const onUp = (e: React.PointerEvent) => {
    activo.current = false
    try {
      e.currentTarget.releasePointerCapture(e.pointerId)
    } catch {
      /* sin captura activa */
    }
    setKnob({ x: 0, y: 0 })
    onEnd()
  }

  return (
    <div
      ref={baseRef}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
      onPointerLeave={onUp}
      className="ui-hud relative flex h-24 w-24 touch-none items-center justify-center rounded-full border border-white/10"
      title={`Arrastra para ${label}`}
    >
      <span className="pointer-events-none absolute text-[10px] text-white/25">{label}</span>
      <div
        className="pointer-events-none h-10 w-10 rounded-full border border-white/20 bg-white/80 shadow-lg"
        style={{ transform: `translate(${knob.x}px, ${knob.y}px)` }}
      />
    </div>
  )
}

/** Joystick de MOVIMIENTO (abajo a la izquierda). */
export function MoveControls() {
  const t = useT()
  // Plegado: el joystick se va y la esquina queda con el abanico de herramientas.
  const plegado = useHud((s) => s.plegado.infIzq)
  const ref = useTopeHud('joystick')
  if (plegado) return null
  return (
    <div ref={ref} data-tut="nav.joystick" className="safe-inf safe-ini absolute bottom-4 start-4 z-10 flex items-start gap-1 select-none">
      <Joystick label={t('ui.mover', 'mover')} onChange={(x, y) => setPad(-y, x)} onEnd={() => setPad(0, 0)} />
      <BotonPlegarHud zona="infIzq" />
    </div>
  )
}

/** Joystick de VISTA (1ª/3ª persona): gira la cámara. Lo posiciona quien lo monta. */
export function LookPad() {
  const t = useT()
  useEffect(() => clearLook, [])
  return (
    <div className="select-none">
      <Joystick label={t('ui.mirar', 'mirar')} onChange={(x, y) => setLookPad(x, y)} onEnd={() => clearLook()} />
    </div>
  )
}
