import { useEffect, useMemo, useRef, useState } from 'react'
import { deIso, fechaLocalISO, inicioSemana, isoMasDias } from '../../core/fechaLocal'
import { localeActual } from '../../core/i18n/useT'

/** Convierte "#rrggbb" + alfa en rgba(). Única copia: antes vivía duplicada por cuarto. */
export function rgba(hex: string, alpha: number) {
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`
}

const DIAS = ['L', 'M', 'X', 'J', 'V', 'S', 'D']
const FILAS = ['L', '', 'X', '', 'V', '', '']
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

/** Fondo de un día sin actividad. */
const VACIO = 'rgba(255,255,255,0.04)'

/** Intensidad 0.25–1 según el valor relativo al máximo visible. */
const alfaDia = (valor: number, max: number) => 0.25 + 0.75 * Math.min(1, valor / (max || 1))

/** Textos que el caller ya pasó por `t()`: las claves i18n se quedan en cada cuarto. */
export interface TextosHeatmap {
  dias: string
  menos: string
  mas: string
}

/**
 * Mapa de calor de actividad compartido (antes duplicado en ejercicio y
 * biblioteca): `mes` es un calendario navegable mes a mes y `anual` las 53
 * semanas L→D terminando en la actual, con scroll horizontal. Ambos marcan el
 * día de hoy con un anillo y cierran con la leyenda «menos → más».
 */
export function Heatmap({
  datos,
  color,
  modo,
  titulo,
  textos,
}: {
  /** Valor crudo (minutos) por día yyyy-mm-dd; la intensidad se normaliza al máximo visible. */
  datos: Map<string, number>
  /** '#rrggbb' de la app. */
  color: string
  modo: 'mes' | 'anual'
  /** Encabezado del modo anual (el mensual pone el nombre del mes). */
  titulo?: string
  textos: TextosHeatmap
}) {
  return (
    <div className="rounded-xl bg-white/5 p-3 border border-white/10">
      {modo === 'mes' ? (
        <GridMes datos={datos} color={color} textos={textos} />
      ) : (
        <GridAnual datos={datos} color={color} titulo={titulo} textos={textos} />
      )}
      <div className="mt-2 flex items-center justify-end gap-1 text-[8px] text-white/35">
        <span>{textos.menos}</span>
        {[0.04, 0.35, 0.6, 0.85, 1].map((a, i) => (
          <span key={i} className="h-2 w-2 rounded-sm" style={{ background: i === 0 ? VACIO : rgba(color, a) }} />
        ))}
        <span>{textos.mas}</span>
      </div>
    </div>
  )
}

/** Calendario de un mes con navegación ‹ › y el número del día en cada celda. */
function GridMes({ datos, color, textos }: { datos: Map<string, number>; color: string; textos: TextosHeatmap }) {
  const ahora = new Date()
  const [ref, setRef] = useState({ anio: ahora.getFullYear(), mes: ahora.getMonth() })
  const hoy = fechaLocalISO()

  const { semanas, totalMes, diasActivos, maxDia } = useMemo(() => {
    const primero = new Date(ref.anio, ref.mes, 1)
    const ultimo = new Date(ref.anio, ref.mes + 1, 0)
    const offInicio = (primero.getDay() + 6) % 7 // días desde el lunes anterior
    const offFin = 6 - ((ultimo.getDay() + 6) % 7) // días hasta el domingo siguiente
    const totalCeldas = offInicio + ultimo.getDate() + offFin

    const celdas = Array.from({ length: totalCeldas }, (_, i) => {
      const d = new Date(ref.anio, ref.mes, 1 - offInicio + i)
      const iso = fechaLocalISO(d)
      return { iso, min: datos.get(iso) ?? 0, enMes: d.getMonth() === ref.mes, dia: d.getDate() }
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
  }, [ref, datos])

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
    <>
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
            {totalMes} min · {diasActivos} {textos.dias}
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
          semana.map((c) => (
            <div
              key={`${wi}-${c.iso}`}
              title={`${c.iso} · ${c.min} min`}
              className={`aspect-square rounded-sm flex items-center justify-center text-[7px] ${
                c.enMes ? 'text-white/50' : 'text-white/15'
              } ${c.iso === hoy ? 'ring-1 ring-white/60' : ''}`}
              style={{
                background: c.min > 0 ? rgba(color, alfaDia(c.min, maxDia)) : VACIO,
                opacity: c.enMes ? 1 : 0.35,
              }}
            >
              {c.dia}
            </div>
          )),
        )}
      </div>
    </>
  )
}

/** Las 53 semanas del último año en columnas L→D, con etiqueta al estrenar mes. */
function GridAnual({
  datos,
  color,
  titulo,
  textos,
}: {
  datos: Map<string, number>
  color: string
  titulo?: string
  textos: TextosHeatmap
}) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const hoy = fechaLocalISO()

  const { columnas, total, diasActivos, max } = useMemo(() => {
    const lunesFinal = fechaLocalISO(inicioSemana(deIso(hoy)))
    const columnas = Array.from({ length: 53 }, (_, i) => {
      const lunes = isoMasDias(lunesFinal, -7 * (52 - i))
      // Etiqueta de mes solo en la semana que lo estrena (lunes en los primeros 7 días).
      const mes = Number(lunes.slice(8, 10)) <= 7 ? MESES[Number(lunes.slice(5, 7)) - 1] : ''
      return { lunes, mes, dias: Array.from({ length: 7 }, (_, j) => isoMasDias(lunes, j)) }
    })
    let total = 0
    let diasActivos = 0
    let max = 0
    for (const c of columnas)
      for (const f of c.dias) {
        if (f > hoy) continue
        const min = datos.get(f) ?? 0
        total += min
        if (min > 0) diasActivos++
        max = Math.max(max, min)
      }
    return { columnas, total, diasActivos, max }
  }, [datos, hoy])

  // Abre con el scroll al final: la semana en curso queda visible.
  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollLeft = el.scrollWidth
  }, [])

  return (
    <>
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-xs font-semibold">{titulo}</p>
        <p className="text-[9px] text-white/45">
          {total} min · {diasActivos} {textos.dias}
        </p>
      </div>

      <div className="flex gap-1">
        <div className="flex flex-col gap-0.5 pt-3.5 text-[8px] text-white/35">
          {FILAS.map((d, i) => (
            <span key={i} className="flex h-2.5 items-center">
              {d}
            </span>
          ))}
        </div>
        <div ref={scrollRef} className="flex gap-0.5 overflow-x-auto pb-1">
          {columnas.map((c) => (
            <div key={c.lunes} className="flex shrink-0 flex-col gap-0.5">
              <span className="h-3 text-[8px] leading-none text-white/35">{c.mes}</span>
              {c.dias.map((f) => {
                const min = datos.get(f) ?? 0
                return (
                  <div
                    key={f}
                    title={`${f} · ${min} min`}
                    className={`h-2.5 w-2.5 rounded-[2px] ${f === hoy ? 'ring-1 ring-white/60' : ''} ${
                      f > hoy ? 'opacity-0' : ''
                    }`}
                    style={{ background: min > 0 ? rgba(color, alfaDia(min, max)) : VACIO }}
                  />
                )
              })}
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
