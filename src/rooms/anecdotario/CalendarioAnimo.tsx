import { useMemo, useState } from 'react'
import { fechaLocalISO } from '../../core/fechaLocal'
import { localeActual, useT } from '../../core/i18n/useT'
import { Icono } from '../../core/ui/iconos/Icono'
import { ANIMOS, colorDeAnimo } from './animos'

const DIAS = ['L', 'M', 'X', 'J', 'V', 'S', 'D']

/** Convierte "#rrggbb" + alfa en rgba(). */
function rgba(hex: string, alpha: number) {
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`
}

/**
 * Calendario de ánimo: cada día del mes se pinta con el color de la emoción
 * de la anécdota de ese día (la más reciente si hay varias). Tocar un día
 * con recuerdo filtra la lista a esa fecha.
 */
export function CalendarioAnimo({
  anecdotas,
  seleccionado,
  onSeleccionar,
}: {
  anecdotas: { fecha: string; animo: string; titulo: string }[]
  seleccionado: string | null
  onSeleccionar: (iso: string | null) => void
}) {
  const t = useT()
  const ahora = new Date()
  const [ref, setRef] = useState({ anio: ahora.getFullYear(), mes: ahora.getMonth() })
  const hoy = fechaLocalISO()

  // Ánimo del día: la lista viene en orden descendente, gana la más reciente.
  const animoPorDia = useMemo(() => {
    const m = new Map<string, { animo: string; titulo: string }>()
    for (const a of anecdotas) {
      if (!m.has(a.fecha)) m.set(a.fecha, { animo: a.animo, titulo: a.titulo })
    }
    return m
  }, [anecdotas])

  const { semanas, diasConRecuerdo } = useMemo(() => {
    const primero = new Date(ref.anio, ref.mes, 1)
    const ultimo = new Date(ref.anio, ref.mes + 1, 0)
    const offInicio = (primero.getDay() + 6) % 7 // días desde el lunes anterior
    const offFin = 6 - ((ultimo.getDay() + 6) % 7) // días hasta el domingo siguiente
    const totalCeldas = offInicio + ultimo.getDate() + offFin

    const celdas = Array.from({ length: totalCeldas }, (_, i) => {
      const d = new Date(ref.anio, ref.mes, 1 - offInicio + i)
      const iso = fechaLocalISO(d)
      return { iso, entrada: animoPorDia.get(iso), enMes: d.getMonth() === ref.mes, dia: d.getDate() }
    })

    const activos = celdas.filter((c) => c.enMes && c.entrada).length
    const semanas: (typeof celdas)[] = []
    for (let i = 0; i < celdas.length; i += 7) semanas.push(celdas.slice(i, i + 7))
    return { semanas, diasConRecuerdo: activos }
  }, [ref, animoPorDia])

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
            {t('anec.cal.recuerdos', '{n} días con recuerdo', { n: diasConRecuerdo })}
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
            const color = c.entrada ? colorDeAnimo(c.entrada.animo) : null
            const sel = c.iso === seleccionado
            return (
              <button
                key={`${wi}-${c.iso}`}
                type="button"
                disabled={!c.entrada}
                onClick={() => onSeleccionar(sel ? null : c.iso)}
                title={c.entrada ? `${c.iso} · ${c.entrada.animo} ${c.entrada.titulo}` : c.iso}
                className={`aspect-square rounded-sm flex items-center justify-center text-[7px] transition ${
                  c.enMes ? 'text-white/60' : 'text-white/15'
                } ${c.iso === hoy ? 'ring-1 ring-white/60' : ''} ${
                  sel ? 'ring-2 ring-violet-300' : ''
                } ${c.entrada ? 'cursor-pointer hover:brightness-125 font-bold' : ''}`}
                style={{
                  background: color ? rgba(color, 0.8) : 'rgba(255,255,255,0.04)',
                  opacity: c.enMes ? 1 : 0.35,
                }}
              >
                {c.dia}
              </button>
            )
          }),
        )}
      </div>

      {/* leyenda: emoción → color */}
      <div className="mt-2 flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
        {ANIMOS.map((a) => (
          <span key={a} className="flex items-center gap-1 text-xs">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: colorDeAnimo(a) }} />
            <Icono emoji={a} />
          </span>
        ))}
      </div>
    </div>
  )
}
