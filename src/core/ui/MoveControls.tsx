import { useEffect } from 'react'
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

/** Pad direccional en pantalla (táctil/ratón) para mover al avatar. */
export function MoveControls() {
  const dir =
    (f: number, s: number) =>
    (e: React.PointerEvent) => {
      e.preventDefault()
      setPad(f, s)
    }
  const soltar = (e: React.PointerEvent) => {
    e.preventDefault()
    setPad(0, 0)
  }

  const props = (f: number, s: number) => ({
    onPointerDown: dir(f, s),
    onPointerUp: soltar,
    onPointerLeave: soltar,
    onPointerCancel: soltar,
  })

  return (
    <div className="absolute bottom-4 left-4 z-10 grid grid-cols-3 grid-rows-3 gap-1 select-none">
      <span />
      <PadBtn {...props(1, 0)}>▲</PadBtn>
      <span />
      <PadBtn {...props(0, -1)}>◀</PadBtn>
      <span className="flex items-center justify-center text-[10px] text-white/30">
        mover
      </span>
      <PadBtn {...props(0, 1)}>▶</PadBtn>
      <span />
      <PadBtn {...props(-1, 0)}>▼</PadBtn>
      <span />
    </div>
  )
}

function PadBtn({
  children,
  ...rest
}: React.ComponentProps<'button'>) {
  return (
    <button
      type="button"
      {...rest}
      className="flex h-11 w-11 touch-none items-center justify-center rounded-lg border border-white/10 bg-black/50 text-lg text-white/80 backdrop-blur-sm transition hover:bg-white/15 active:scale-95 active:bg-white/25"
    >
      {children}
    </button>
  )
}
