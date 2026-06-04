import { useEffect, useRef, useState } from 'react'
import { onKey, setPad, clearInput } from '../house/movement'

/** Conecta el teclado (WASD/flechas) al movimiento del avatar. */
export function KeyboardMove() {
  useEffect(() => {
    const down = (e: KeyboardEvent) => onKey(e, true)
    const up = (e: KeyboardEvent) => onKey(e, false)
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
      clearInput()
    }
  }, [])
  return null
}

const R = 38 // radio máximo del knob

/**
 * Joystick analógico en pantalla: arrastra el knob hacia cualquier dirección
 * (360°) y el avatar se mueve hacia allá, con velocidad según qué tan lejos lo lleves.
 */
export function MoveControls() {
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
    // arriba = adelante, derecha = strafe a la derecha
    setPad(-dy / R, dx / R)
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
    setPad(0, 0)
  }

  return (
    <div className="absolute bottom-4 left-4 z-10 select-none">
      <div
        ref={baseRef}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        onPointerLeave={onUp}
        className="relative flex h-24 w-24 touch-none items-center justify-center rounded-full border border-white/10 bg-black/40 backdrop-blur-sm"
        title="Arrastra para moverte"
      >
        <span className="pointer-events-none absolute text-[10px] text-white/25">
          mover
        </span>
        <div
          className="pointer-events-none h-10 w-10 rounded-full border border-white/20 bg-white/80 shadow-lg"
          style={{ transform: `translate(${knob.x}px, ${knob.y}px)` }}
        />
      </div>
    </div>
  )
}
