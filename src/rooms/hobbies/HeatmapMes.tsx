import { useMemo, useState } from 'react'
import { fechaLocalISO } from '../../core/fechaLocal'
import { localeActual, useT } from '../../core/i18n/useT'
import { hoyISO, rgba } from './stats'

const DIAS = ['L', 'M', 'X', 'J', 'V', 'S', 'D']

/**
 * Mapa de calor mensual: cuadrícula tipo calendario donde cada día se colorea
 * según los minutos practicados del hobby.
 */
export function HeatmapMes({
  minPorDia,
  color,
  sel,
  onDia,
}: {
  minPorDia: Map<string, number>
  color: string
  /** Día elegido: se marca aquí y se abre abajo en el historial. */
  sel?: string
  onDia: (iso: string) => void
}) {
  const t = useT()
  const ahora = new Date()
  const [ref, setRef] = useState({ anio: ahora.getFullYear(), mes: ahora.getMonth() })
  const hoy = hoyISO()

  const { semanas, totalMes, diasActivos, maxDia } = useMemo(() => {
    const primero = new Date(ref.anio, ref.mes, 1)
    const ultimo = new Date(ref.anio, ref.mes + 1, 0)
    const offInicio = (primero.getDay() + 6) % 7 // días desde el lunes anterior
    const offFin = 6 - ((ultimo.getDay() + 6) % 7) // días hasta el domingo siguiente
    const totalCeldas = offInicio + ultimo.getDate() + offFin

    const celdas = Array.from({ length: totalCeldas }, (_, i) => {
      const d = new Date(ref.anio, ref.mes, 1 - offInicio + i)
      const iso = fechaLocalISO(d)
      return { iso, min: minPorDia.get(iso) ?? 0, enMes: d.getMonth() === ref.mes, dia: d.getDate() }
    })

    let total = 0
    let activos = 0
    let max = 0
    for (const c of celdas) {
      if (!c.enMes) continue
      total += c.min
      if (c.min > 0) activos++
      max = Math.max(max, c.min)
    }

    const semanas: (typeof celdas)[] = []
    for (let i = 0; i < celdas.length; i += 7) semanas.push(celdas.slice(i, i + 7))
    return { semanas, totalMes: total, diasActivos: activos, maxDia: max }
  }, [ref, minPorDia])

  const cambiarMes = (delta: number) =>
    setRef(({ anio, mes }) => {
      const d = new Date(anio, mes + delta, 1)
      return { anio: d.getFullYear(), mes: d.getMonth() }
    })

  const nombreMes = new Date(ref.anio, ref.mes, 1).toLocaleDateString(localeActual(), {
    month: 'long',
    year: 'numeric',
  })

  return (
    <div className="rounded-xl bg-white/5 p-3 border border-white/10">
      <div className="mb-2 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => cambiarMes(-1)}
          className="rounded-lg px-2 py-0.5 hover:bg-white/10"
        >
          ‹
        </button>
        <div className="text-center">
          <p className="text-xs font-semibold capitalize">{nombreMes}</p>
          <p className="text-[9px] text-white/45">
            {totalMes} min · {diasActivos} {t('hobbies.heatmap.dias', 'días activos')}
          </p>
        </div>
        <button
          type="button"
          onClick={() => cambiarMes(1)}
          className="rounded-lg px-2 py-0.5 hover:bg-white/10"
        >
          ›
        </button>
      </div>

      <div className="grid w-full grid-cols-7 gap-0.5">
        {DIAS.map((d, i) => (
          <div key={i} className="text-center text-[8px] text-white/35">
            {d}
          </div>
        ))}
        {semanas.map((semana, wi) =>
          semana.map((c) => {
            const alpha = c.min > 0 ? 0.25 + 0.75 * Math.min(1, c.min / (maxDia || 1)) : 0
            return (
              <button
                key={`${wi}-${c.iso}`}
                type="button"
                disabled={c.min === 0}
                onClick={() => onDia(c.iso)}
                title={`${c.iso} · ${c.min} min${
                  c.min > 0 ? ` · ${t('hobbies.heatmap.verDia', 'ver en el historial')}` : ''
                }`}
                className={`aspect-square rounded-sm flex items-center justify-center text-[7px] transition ${
                  c.enMes ? 'text-white/50' : 'text-white/15'
                } ${c.min > 0 ? 'hover:brightness-125' : ''} ${
                  c.iso === sel ? 'ring-2 ring-white/80' : c.iso === hoy ? 'ring-1 ring-white/60' : ''
                }`}
                style={{
                  background: c.min > 0 ? rgba(color, alpha) : 'rgba(255,255,255,0.04)',
                  opacity: c.enMes ? 1 : 0.35,
                }}
              >
                {c.dia}
              </button>
            )
          }),
        )}
      </div>

      <div className="mt-2 flex items-center justify-end gap-1 text-[8px] text-white/35">
        <span>{t('hobbies.heatmap.menos', 'menos')}</span>
        {[0.04, 0.35, 0.6, 0.85, 1].map((a, i) => (
          <span
            key={i}
            className="h-2 w-2 rounded-sm"
            style={{ background: i === 0 ? 'rgba(255,255,255,0.04)' : rgba(color, a) }}
          />
        ))}
        <span>{t('hobbies.heatmap.mas', 'más')}</span>
      </div>
    </div>
  )
}
