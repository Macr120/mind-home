import { useMemo } from 'react'
import type { PerfilEjercicio, SesionEjercicio } from '../../core/data/db'
import { BarraProgreso } from './BarraProgreso'
import { TIPOS } from './constantes'
import { hoyISO, sumarDias } from './fecha'
import { pctObjetivo, rachaDias, resumenSemanal } from './stats'

export function ResumenTab({
  sesiones,
  perfil,
}: {
  sesiones: SesionEjercicio[]
  perfil: PerfilEjercicio
}) {
  const res = resumenSemanal(sesiones, perfil)
  const racha = rachaDias(sesiones)

  const tendencia = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const f = sumarDias(hoyISO(), -(6 - i))
      const min = sesiones
        .filter((s) => s.fecha === f)
        .reduce((acc, s) => acc + s.duracionMin, 0)
      return { fecha: f, min }
    })
  }, [sesiones])

  const maxMin = Math.max(1, ...tendencia.map((t) => t.min))

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-white/5 p-3 border border-white/10 col-span-2">
          <p className="text-xs text-white/50">Racha activa</p>
          <p className="text-3xl font-black text-rose-400">
            {racha} <span className="text-lg font-semibold text-white/60">días</span>
          </p>
        </div>
        <MiniStat label="Días activos" valor={`${res.dias}/${res.metaDias}`} />
        <MiniStat
          label="Adherencia"
          valor={`${pctObjetivo(res.dias, res.metaDias)}%`}
        />
      </div>

      <div className="rounded-xl bg-white/5 p-4 border border-white/10 space-y-4">
        <p className="text-sm font-semibold">Progreso semanal</p>
        <BarraProgreso
          label="🏋️ Sesiones de fuerza"
          actual={res.fuerza}
          objetivo={res.metaFuerza}
          unidad="ses."
          color="#f97316"
        />
        <BarraProgreso
          label="🏃 Minutos resistencia"
          actual={res.minResistencia}
          objetivo={res.metaResistencia}
          unidad="min"
          color="#38bdf8"
        />
        <BarraProgreso
          label="🧘 Minutos flexibilidad"
          actual={res.minFlex}
          objetivo={res.metaFlex}
          unidad="min"
          color="#a78bfa"
        />
      </div>

      <div className="rounded-xl bg-white/5 p-4 border border-white/10">
        <p className="text-sm font-semibold mb-3">Minutos totales · 7 días</p>
        <div className="flex items-stretch justify-between gap-1.5 h-24">
          {tendencia.map((t) => {
            const esHoy = t.fecha === hoyISO()
            return (
              <div key={t.fecha} className="flex-1 flex flex-col items-center gap-1">
                <div className="flex-1 w-full flex items-end justify-center">
                  <div
                    className="w-full max-w-8 rounded-t"
                    style={{
                      height: `${Math.max(6, (t.min / maxMin) * 100)}%`,
                      background: esHoy ? '#fb7185' : 'rgba(251,113,133,0.45)',
                    }}
                    title={`${t.min} min`}
                  />
                </div>
                <span className="text-[9px] text-white/40">{t.fecha.slice(8)}</span>
              </div>
            )
          })}
        </div>
      </div>

      <div className="rounded-xl bg-white/5 p-4 border border-white/10">
        <p className="text-sm font-semibold mb-2">Últimas sesiones</p>
        {sesiones.slice(0, 5).length === 0 ? (
          <p className="text-sm text-white/40">Aún no hay entrenos registrados.</p>
        ) : (
          <ul className="space-y-2">
            {sesiones.slice(0, 5).map((s) => {
              const t = TIPOS.find((x) => x.id === s.tipo) ?? TIPOS[0]
              return (
                <li
                  key={s.id}
                  className="flex items-center gap-2 text-sm rounded-lg bg-black/20 px-2 py-1.5"
                >
                  <span>{t.icon}</span>
                  <span className="flex-1 truncate text-white/85">{s.titulo}</span>
                  <span className="text-white/40">{s.duracionMin} min</span>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}

function MiniStat({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="rounded-xl bg-white/5 p-3 border border-white/10">
      <p className="text-xs text-white/50">{label}</p>
      <p className="text-xl font-bold text-white/90">{valor}</p>
    </div>
  )
}
