import { Icono } from '../../core/ui/iconos/Icono'
import { useMemo } from 'react'
import type { PerfilEjercicio, SesionEjercicio } from '../../core/data/db'
import { BarraProgreso } from './BarraProgreso'
import { TIPOS } from './constantes'
import { hoyISO, sumarDias } from './fecha'
import { FiltroPeriodo } from './FiltroPeriodo'
import { PERIODOS, sesionesPeriodo, type Periodo } from './periodo'
import { pctObjetivo, rachaDias, resumenPeriodo } from './stats'
import { Archivador } from '../_shared/Archivador'
import { localeActual, useT } from '../../core/i18n/useT'

/** Barras de la gráfica: por día en semana/mes, por mes en año/todo. */
function tendenciaPeriodo(sesiones: SesionEjercicio[], periodo: Periodo) {
  const hoy = hoyISO()
  const minutosEn = (prefijo: string) =>
    sesiones.filter((s) => s.fecha.startsWith(prefijo)).reduce((acc, s) => acc + s.duracionMin, 0)

  if (periodo === 'semana' || periodo === 'mes') {
    const dias = periodo === 'semana' ? 7 : parseInt(hoy.slice(8), 10)
    return Array.from({ length: dias }, (_, i) => {
      const fecha = sumarDias(hoy, -(dias - 1 - i))
      return { clave: fecha, etiqueta: fecha.slice(8), min: minutosEn(fecha), actual: fecha === hoy }
    })
  }
  // Año y «todo»: los últimos 12 meses, contando el actual.
  const base = new Date(`${hoy.slice(0, 7)}-01T12:00:00`)
  return Array.from({ length: 12 }, (_, i) => {
    const d = new Date(base)
    d.setMonth(d.getMonth() - (11 - i))
    const mes = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    return {
      clave: mes,
      etiqueta: d.toLocaleDateString(localeActual(), { month: 'narrow' }),
      min: minutosEn(mes),
      actual: mes === hoy.slice(0, 7),
    }
  })
}

export function ResumenTab({
  sesiones,
  perfil,
  periodo,
  setPeriodo,
}: {
  sesiones: SesionEjercicio[]
  perfil: PerfilEjercicio
  periodo: Periodo
  setPeriodo: (p: Periodo) => void
}) {
  const res = resumenPeriodo(sesiones, perfil, periodo)
  const racha = rachaDias(sesiones)
  const delPeriodo = useMemo(() => sesionesPeriodo(sesiones, periodo), [sesiones, periodo])

  const tendencia = useMemo(() => tendenciaPeriodo(sesiones, periodo), [sesiones, periodo])

  const maxMin = Math.max(1, ...tendencia.map((punto) => punto.min))
  const t = useT()
  const etiquetaPeriodo = t(
    `ejercicio.periodo.${periodo}`,
    PERIODOS.find((p) => p.id === periodo)?.labelEs ?? '',
  ).toLowerCase()

  return (
    <div className="space-y-5">
      <FiltroPeriodo
        valor={periodo}
        onChange={setPeriodo}
        acento="bg-rose-500/25 text-rose-400 border border-rose-500/40"
      />

      <div data-tut="ejercicio.metas.resumen" className="grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-white/5 p-3 border border-white/10 col-span-2">
          <p className="text-xs text-white/50">{t('ejercicio.racha', 'Racha activa')}</p>
          <p className="text-3xl font-black text-rose-400">
            {racha} <span className="text-lg font-semibold text-white/60">{t('ejercicio.dias', 'días')}</span>
          </p>
        </div>
        <MiniStat label={t('ejercicio.diasActivos', 'Días activos')} valor={`${res.dias}/${res.metaDias}`} />
        <MiniStat
          label={t('ejercicio.adherencia', 'Adherencia')}
          valor={`${pctObjetivo(res.dias, res.metaDias)}%`}
        />
      </div>

      <div className="rounded-xl bg-white/5 p-4 border border-white/10 space-y-4">
        <div>
          <p className="text-base font-bold">{t('ejercicio.progreso.rango', 'Progreso')}</p>
          <p className="text-[10px] text-white/40">
            {t('ejercicio.periodo.objetivo', 'Objetivo ajustado a: {p}', { p: etiquetaPeriodo })}
          </p>
        </div>
        <BarraProgreso
          label={t('ejercicio.ses.fuerza', 'Sesiones de fuerza')}
          actual={res.fuerza}
          objetivo={res.metaFuerza}
          unidad={t('ejercicio.unidad.ses', 'ses.')}
          color="#f97316"
        />
        <BarraProgreso
          label={t('ejercicio.min.resistencia', 'Minutos resistencia')}
          actual={res.minResistencia}
          objetivo={res.metaResistencia}
          unidad="min"
          color="#38bdf8"
        />
        <BarraProgreso
          label={t('ejercicio.min.flex', 'Minutos flexibilidad')}
          actual={res.minFlex}
          objetivo={res.metaFlex}
          unidad="min"
          color="#a78bfa"
        />
      </div>

      <div className="rounded-xl bg-white/5 p-4 border border-white/10">
        <p className="text-base font-bold mb-3">
          {t('ejercicio.minTotales.rango', 'Minutos entrenados')}
        </p>
        <div className="flex items-stretch justify-between gap-1.5 h-24">
          {tendencia.map((punto) => (
            <div key={punto.clave} className="flex-1 flex flex-col items-center gap-1">
              <div className="flex-1 w-full flex items-end justify-center">
                <div
                  className="w-full max-w-8 rounded-t"
                  style={{
                    height: `${Math.max(6, (punto.min / maxMin) * 100)}%`,
                    background: punto.actual ? '#fb7185' : 'rgba(251,113,133,0.45)',
                  }}
                  title={`${punto.min} min`}
                />
              </div>
              <span className="text-[9px] text-white/40">{punto.etiqueta}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl bg-white/5 p-4 border border-white/10">
        <p className="text-base font-bold mb-2">{t('ejercicio.historial', 'Tus sesiones')}</p>
        <Archivador
          items={delPeriodo}
          fecha={(s) => s.fecha}
          clave={(s) => s.id ?? s.fecha}
          vacio={t('ejercicio.sinEntrenos', 'Aún no hay entrenos registrados.')}
          resumen={(ses) => `${ses.reduce((acc, s) => acc + s.duracionMin, 0)} min`}
        >
          {(s) => {
            const tipo = TIPOS.find((x) => x.id === s.tipo) ?? TIPOS[0]
            return (
              <div className="flex items-center gap-2 text-sm rounded-lg bg-black/20 px-2 py-1.5">
                <span><Icono emoji={tipo.icon} /></span>
                <span className="flex-1 truncate text-white/85">{s.titulo}</span>
                <span className="shrink-0 text-xs text-white/40">{s.fecha.slice(5)}</span>
                <span className="shrink-0 text-white/40">{s.duracionMin} min</span>
              </div>
            )
          }}
        </Archivador>
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
