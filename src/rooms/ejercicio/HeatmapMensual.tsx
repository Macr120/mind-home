import { useMemo, useState } from 'react'
import type { SesionEjercicio, TipoEntrenamiento } from '../../core/data/db'
import { fechaLocalISO } from '../../core/fechaLocal'
import { hoyISO } from './fecha'
import { localeActual, useT } from '../../core/i18n/useT'

const DIAS = ['L', 'M', 'X', 'J', 'V', 'S', 'D']

/** Convierte "#rrggbb" + alfa en rgba(). */
function rgba(hex: string, alpha: number) {
  const n = parseInt(hex.slice(1), 16)
  const r = (n >> 16) & 255
  const g = (n >> 8) & 255
  const b = n & 255
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

/**
 * Mapa de calor mensual de actividad: una cuadrícula tipo calendario donde
 * cada día se colorea según los minutos entrenados de esa modalidad.
 */
export function HeatmapMensual({
  sesiones,
  tipo,
  color,
}: {
  sesiones: SesionEjercicio[]
  tipo: TipoEntrenamiento
  color: string
}) {
  const t = useT()
  const ahora = new Date()
  const [ref, setRef] = useState({ anio: ahora.getFullYear(), mes: ahora.getMonth() })
  const hoy = hoyISO()

  const minPorDia = useMemo(() => {
    const m = new Map<string, number>()
    for (const s of sesiones) {
      if (s.tipo !== tipo) continue
      m.set(s.fecha, (m.get(s.fecha) ?? 0) + s.duracionMin)
    }
    return m
  }, [sesiones, tipo])

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
            {totalMes} min · {diasActivos} {t('ejercicio.heatmap.dias', 'días activos')}
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
              <div
                key={`${wi}-${c.iso}`}
                title={`${c.iso} · ${c.min} min`}
                className={`aspect-square rounded-sm flex items-center justify-center text-[7px] ${
                  c.enMes ? 'text-white/50' : 'text-white/15'
                } ${c.iso === hoy ? 'ring-1 ring-white/60' : ''}`}
                style={{
                  background: c.min > 0 ? rgba(color, alpha) : 'rgba(255,255,255,0.04)',
                  opacity: c.enMes ? 1 : 0.35,
                }}
              >
                {c.dia}
              </div>
            )
          }),
        )}
      </div>

      <div className="mt-2 flex items-center justify-end gap-1 text-[8px] text-white/35">
        <span>{t('ejercicio.heatmap.menos', 'menos')}</span>
        {[0.04, 0.35, 0.6, 0.85, 1].map((a, i) => (
          <span
            key={i}
            className="h-2 w-2 rounded-sm"
            style={{ background: i === 0 ? 'rgba(255,255,255,0.04)' : rgba(color, a) }}
          />
        ))}
        <span>{t('ejercicio.heatmap.mas', 'más')}</span>
      </div>
    </div>
  )
}
