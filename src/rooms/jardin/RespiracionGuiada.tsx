import { useEffect, useState } from 'react'
import { COLOR } from './constantes'

const FASES_478 = [
  { nombre: 'Inhala', seg: 4, escala: 1.15 },
  { nombre: 'Sostén', seg: 7, escala: 1.15 },
  { nombre: 'Exhala', seg: 8, escala: 0.85 },
  { nombre: 'Pausa', seg: 2, escala: 0.9 },
]

const FASES_CAJA = [
  { nombre: 'Inhala', seg: 4, escala: 1.12 },
  { nombre: 'Sostén', seg: 4, escala: 1.12 },
  { nombre: 'Exhala', seg: 4, escala: 0.88 },
  { nombre: 'Sostén', seg: 4, escala: 0.9 },
]

/** Círculo animado para respiración guiada. */
export function RespiracionGuiada({
  modo,
  activo,
}: {
  modo: '478' | 'caja'
  activo: boolean
}) {
  const fases = modo === '478' ? FASES_478 : FASES_CAJA
  const [idx, setIdx] = useState(0)
  const [segRestante, setSegRestante] = useState(fases[0].seg)

  useEffect(() => {
    setIdx(0)
    setSegRestante(fases[0].seg)
  }, [modo, fases])

  useEffect(() => {
    if (!activo) return
    let faseIdx = 0
    let seg = fases[0].seg
    setIdx(0)
    setSegRestante(seg)

    const tick = setInterval(() => {
      seg -= 1
      if (seg <= 0) {
        faseIdx = (faseIdx + 1) % fases.length
        seg = fases[faseIdx].seg
        setIdx(faseIdx)
      }
      setSegRestante(seg)
    }, 1000)

    return () => clearInterval(tick)
  }, [activo, fases])

  const fase = fases[idx]

  return (
    <div className="flex flex-col items-center py-6">
      <div
        className="rounded-full transition-all duration-1000 ease-in-out flex items-center justify-center"
        style={{
          width: 160 * fase.escala,
          height: 160 * fase.escala,
          background: `${COLOR}33`,
          boxShadow: `0 0 40px ${COLOR}44`,
        }}
      >
        <div className="text-center">
          <p className="text-lg font-bold text-white/90">{fase.nombre}</p>
          <p className="text-3xl font-black" style={{ color: COLOR }}>
            {segRestante}
          </p>
        </div>
      </div>
      <p className="mt-4 text-xs text-white/45">
        {modo === '478' ? 'Técnica 4-7-8' : 'Respiración en caja 4-4-4-4'}
      </p>
    </div>
  )
}
