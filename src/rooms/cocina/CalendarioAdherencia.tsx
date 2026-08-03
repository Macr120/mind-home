import { useMemo, useState } from 'react'
import { fechaLocalISO } from '../../core/fechaLocal'
import { localeActual, useT } from '../../core/i18n/useT'
import type { TotalesMacros } from './macros'

/**
 * Calendario del progreso: cada día se pinta según qué tan pegado quedó al
 * objetivo calórico. Tocar un día con registro lo abre en detalle.
 */
export function CalendarioAdherencia({
  porDia,
  objetivoKcal,
  seleccionado,
  onSeleccionar,
}: {
  porDia: Map<string, TotalesMacros>
  objetivoKcal: number
  seleccionado: string | null
  onSeleccionar: (iso: string) => void
}) {
  const t = useT()
  const ahora = new Date()
  const [ref, setRef] = useState({ anio: ahora.getFullYear(), mes: ahora.getMonth() })
  const hoy = fechaLocalISO()
  const locale = localeActual()

  const leyenda = [
    { color: '#34d399', label: t('cocina.cal.leyOk', 'En objetivo (±10%)') },
    { color: '#f59e0b', label: t('cocina.cal.leyCerca', 'Cerca (±25%)') },
    { color: '#ef4444', label: t('cocina.cal.leyPasado', 'Muy por encima') },
    { color: '#60a5fa', label: t('cocina.cal.leyCorto', 'Muy por debajo') },
  ]

  const semanas = useMemo(() => {
    const primero = new Date(ref.anio, ref.mes, 1)
    const ultimo = new Date(ref.anio, ref.mes + 1, 0)
    const offInicio = (primero.getDay() + 6) % 7
    const offFin = 6 - ((ultimo.getDay() + 6) % 7)
    const total = offInicio + ultimo.getDate() + offFin

    const celdas = Array.from({ length: total }, (_, i) => {
      const d = new Date(ref.anio, ref.mes, 1 - offInicio + i)
      const iso = fechaLocalISO(d)
      return { iso, kcal: porDia.get(iso)?.calorias, enMes: d.getMonth() === ref.mes, dia: d.getDate() }
    })
    const filas: (typeof celdas)[] = []
    for (let i = 0; i < celdas.length; i += 7) filas.push(celdas.slice(i, i + 7))
    return filas
  }, [ref, porDia])

  // Lunes → domingo, en el idioma de la app (no hardcodear letras).
  const letrasDias = useMemo(() => {
    const lunes = new Date(2026, 5, 1) // un lunes cualquiera
    return Array.from({ length: 7 }, (_, i) =>
      new Date(lunes.getFullYear(), lunes.getMonth(), lunes.getDate() + i).toLocaleDateString(locale, {
        weekday: 'narrow',
      }),
    )
  }, [locale])

  const colorDia = (kcal: number): string => {
    if (objetivoKcal <= 0) return '#34d399'
    const desvio = (kcal - objetivoKcal) / objetivoKcal
    if (Math.abs(desvio) <= 0.1) return '#34d399'
    if (Math.abs(desvio) <= 0.25) return '#f59e0b'
    return desvio > 0 ? '#ef4444' : '#60a5fa'
  }

  const cambiarMes = (delta: number) =>
    setRef(({ anio, mes }) => {
      const d = new Date(anio, mes + delta, 1)
      return { anio: d.getFullYear(), mes: d.getMonth() }
    })

  const nombreMes = new Date(ref.anio, ref.mes, 1).toLocaleDateString(locale, {
    month: 'long',
    year: 'numeric',
  })

  return (
    <div className="rounded-xl bg-white/5 p-3 border border-white/10">
      <div className="mb-2 flex items-center justify-between gap-2">
        <button type="button" onClick={() => cambiarMes(-1)} className="rounded-lg px-2 py-0.5 hover:bg-white/10">
          ‹
        </button>
        <p className="text-xs font-semibold capitalize">{nombreMes}</p>
        <button type="button" onClick={() => cambiarMes(1)} className="rounded-lg px-2 py-0.5 hover:bg-white/10">
          ›
        </button>
      </div>

      <div className="grid w-full grid-cols-7 gap-0.5">
        {letrasDias.map((d, i) => (
          <div key={i} className="text-center text-[8px] uppercase text-white/35">
            {d}
          </div>
        ))}
        {semanas.map((semana, wi) =>
          semana.map((c) => {
            const sel = c.iso === seleccionado
            return (
              <button
                key={`${wi}-${c.iso}`}
                type="button"
                disabled={c.kcal === undefined}
                onClick={() => onSeleccionar(c.iso)}
                title={c.kcal !== undefined ? `${c.iso} · ${c.kcal} kcal` : c.iso}
                className={`aspect-square rounded-sm flex items-center justify-center text-[7px] transition ${
                  c.enMes ? 'text-white/70' : 'text-white/15'
                } ${c.iso === hoy ? 'ring-1 ring-white/60' : ''} ${sel ? 'ring-2 ring-amber-300' : ''} ${
                  c.kcal !== undefined ? 'cursor-pointer font-bold hover:brightness-125' : ''
                }`}
                style={{
                  background: c.kcal !== undefined ? `${colorDia(c.kcal)}cc` : 'rgba(255,255,255,0.04)',
                  opacity: c.enMes ? 1 : 0.35,
                }}
              >
                {c.dia}
              </button>
            )
          }),
        )}
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
        {leyenda.map((l) => (
          <span key={l.color} className="flex items-center gap-1 text-[9px] text-white/50">
            <span className="h-2 w-2 rounded-sm" style={{ background: l.color }} />
            {l.label}
          </span>
        ))}
      </div>
    </div>
  )
}
