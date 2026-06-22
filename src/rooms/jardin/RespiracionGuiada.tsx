import { useEffect, useState } from 'react'
import { COLOR } from './constantes'
import { useT } from '../../core/i18n/useT'

const FASES_478 = [
  { key: 'inhala', seg: 4, escala: 1.15 },
  { key: 'sosten', seg: 7, escala: 1.15 },
  { key: 'exhala', seg: 8, escala: 0.85 },
  { key: 'pausa', seg: 2, escala: 0.9 },
]

const FASES_CAJA = [
  { key: 'inhala', seg: 4, escala: 1.12 },
  { key: 'sosten', seg: 4, escala: 1.12 },
  { key: 'exhala', seg: 4, escala: 0.88 },
  { key: 'sosten', seg: 4, escala: 0.9 },
]

/** Círculo animado para respiración guiada. */
export function RespiracionGuiada({
  modo,
  activo,
}: {
  modo: '478' | 'caja'
  activo: boolean
}) {
  const t = useT()
  const fases = modo === '478' ? FASES_478 : FASES_CAJA
  const [idx, setIdx] = useState(0)
  const [segRestante, setSegRestante] = useState(fases[0].seg)

  const nombreFase = (key: string) => {
    const mapa: Record<string, string> = {
      inhala: t('jardin.resp.inhala', 'Inhala'),
      sosten: t('jardin.resp.sosten', 'Sostén'),
      exhala: t('jardin.resp.exhala', 'Exhala'),
      pausa: t('jardin.resp.pausa', 'Pausa'),
    }
    return mapa[key] ?? key
  }

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
          <p className="text-lg font-bold text-white/90">{nombreFase(fase.key)}</p>
          <p className="text-3xl font-black" style={{ color: COLOR }}>
            {segRestante}
          </p>
        </div>
      </div>
      <p className="mt-4 text-xs text-white/45">
        {modo === '478' ? t('jardin.resp.478', 'Técnica 4-7-8') : t('jardin.resp.caja', 'Respiración en caja 4-4-4-4')}
      </p>
    </div>
  )
}
