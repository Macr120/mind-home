import { useEffect, useState } from 'react'
import { COLOR } from './constantes'

/** Temporizador de sesión con barra de progreso. */
export function Temporizador({
  duracionMin,
  activo,
  titulo,
  onCompletar,
}: {
  duracionMin: number
  activo: boolean
  titulo: string
  onCompletar: () => void
}) {
  const totalSeg = duracionMin * 60
  const [segRestante, setSegRestante] = useState(totalSeg)

  useEffect(() => {
    setSegRestante(totalSeg)
  }, [totalSeg, titulo])

  useEffect(() => {
    if (!activo) return
    const tick = setInterval(() => {
      setSegRestante((s) => {
        if (s <= 1) {
          clearInterval(tick)
          onCompletar()
          return 0
        }
        return s - 1
      })
    }, 1000)
    return () => clearInterval(tick)
  }, [activo, onCompletar])

  const pct = totalSeg > 0 ? ((totalSeg - segRestante) / totalSeg) * 100 : 0
  const min = Math.floor(segRestante / 60)
  const seg = segRestante % 60

  return (
    <div className="rounded-xl bg-white/5 border border-white/10 p-6 text-center">
      <p className="text-sm font-semibold text-white/80">{titulo}</p>
      <p className="text-4xl font-black mt-2 tabular-nums" style={{ color: COLOR }}>
        {min}:{String(seg).padStart(2, '0')}
      </p>
      <div className="mt-4 h-2 rounded-full bg-black/40 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-1000"
          style={{ width: `${pct}%`, background: COLOR }}
        />
      </div>
    </div>
  )
}
