import { useState } from 'react'
import { db } from '../../core/data/db'
import type { SesionEjercicio, SerieFuerza } from '../../core/data/db'
import {
  sesionesEjercicioRepo,
  seriesFuerzaRepo,
} from '../../core/data/repository'
import { RUTINAS } from './rutinas'
import { recordsFuerza, volumenSerie, volumenSesion } from './stats'
import { useT } from '../../core/i18n/useT'

interface FilaEjercicio {
  ejercicio: string
  series: string
  repeticiones: string
  pesoKg: string
}

const filaVacia = (): FilaEjercicio => ({
  ejercicio: '',
  series: '3',
  repeticiones: '10',
  pesoKg: '',
})

export function FuerzaTab({
  fecha,
  sesiones,
  todasSeries,
}: {
  fecha: string
  sesiones: SesionEjercicio[]
  todasSeries: SerieFuerza[]
}) {
  const [titulo, setTitulo] = useState('Entrenamiento de fuerza')
  const [duracion, setDuracion] = useState('45')
  const [nota, setNota] = useState('')
  const [rpe, setRpe] = useState('7')
  const [filas, setFilas] = useState<FilaEjercicio[]>([filaVacia(), filaVacia()])

  const delDia = sesiones.filter(
    (s) => s.fecha === fecha && s.tipo === 'fuerza',
  )
  const records = recordsFuerza(todasSeries)

  const aplicarRutina = (nombre: string, mins: number, ejercicios?: string[]) => {
    setTitulo(nombre)
    setDuracion(String(mins))
    if (ejercicios?.length) {
      setFilas(
        ejercicios.map((e) => ({
          ejercicio: e,
          series: '3',
          repeticiones: '10',
          pesoKg: '',
        })),
      )
    }
  }

  const agregarFila = () => setFilas((f) => [...f, filaVacia()])

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault()
    const validas = filas.filter((f) => f.ejercicio.trim())
    if (validas.length === 0) return

    const seriesData = validas.map((f, i) => ({
      ejercicio: f.ejercicio.trim(),
      series: parseInt(f.series, 10) || 1,
      repeticiones: parseInt(f.repeticiones, 10) || 1,
      pesoKg: parseFloat(f.pesoKg) || 0,
      orden: i,
    }))
    const vol = seriesData.reduce((a, s) => a + volumenSerie(s), 0)

    const sesionId = await sesionesEjercicioRepo.add({
      fecha,
      tipo: 'fuerza',
      titulo: titulo.trim() || 'Fuerza',
      duracionMin: parseInt(duracion, 10) || 45,
      nota: nota.trim() || undefined,
      rpe: parseInt(rpe, 10) || undefined,
      volumenKg: Math.round(vol),
    })

    await db.seriesFuerza.bulkAdd(
      seriesData.map((s) => ({ ...s, sesionId })),
    )

    setFilas([filaVacia(), filaVacia()])
    setNota('')
  }

  const t = useT()

  return (
    <div className="space-y-5">
      <div className="flex gap-2 overflow-x-auto pb-1">
        {RUTINAS.fuerza.map((r) => (
          <button
            key={r.nombre}
            type="button"
            onClick={() => aplicarRutina(r.nombre, r.duracionMin, r.ejercicios)}
            className="shrink-0 rounded-lg bg-orange-500/15 border border-orange-500/30 px-3 py-2 text-xs font-semibold text-orange-200 hover:bg-orange-500/25"
          >
            {r.nombre}
          </button>
        ))}
      </div>

      <form
        onSubmit={guardar}
        className="rounded-xl bg-white/5 p-4 space-y-3 border border-white/10"
      >
        <p className="text-sm font-semibold">{t('ejercicio.fuerza.registrar', '🏋️ Registrar sesión de fuerza')}</p>
        <input
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          className="w-full rounded-lg bg-black/30 px-3 py-2 text-sm border border-white/10 outline-none"
          placeholder={t('ejercicio.fuerza.ph.nombre', 'Nombre del entreno')}
        />
        <div className="grid grid-cols-2 gap-2">
          <label className="text-xs text-white/50">
            {t('ejercicio.duracion', 'Duración (min)')}
            <input
              type="number"
              value={duracion}
              onChange={(e) => setDuracion(e.target.value)}
              className="mt-0.5 w-full rounded-lg bg-black/30 px-2 py-1.5 text-sm border border-white/10"
            />
          </label>
          <label className="text-xs text-white/50">
            {t('ejercicio.rpe', 'RPE (1–10)')}
            <input
              type="number"
              min={1}
              max={10}
              value={rpe}
              onChange={(e) => setRpe(e.target.value)}
              className="mt-0.5 w-full rounded-lg bg-black/30 px-2 py-1.5 text-sm border border-white/10"
            />
          </label>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold text-white/50">{t('ejercicio.ejercicios', 'Ejercicios')}</p>
          {filas.map((f, i) => (
            <div key={i} className="grid grid-cols-12 gap-1 text-xs">
              <input
                value={f.ejercicio}
                onChange={(e) => {
                  const n = [...filas]
                  n[i] = { ...n[i], ejercicio: e.target.value }
                  setFilas(n)
                }}
                placeholder={t('ejercicio.fuerza.ph.ej', 'Ejercicio')}
                className="col-span-5 rounded-lg bg-black/30 px-2 py-1.5 border border-white/10"
              />
              <input
                value={f.series}
                onChange={(e) => {
                  const n = [...filas]
                  n[i] = { ...n[i], series: e.target.value }
                  setFilas(n)
                }}
                placeholder="S"
                className="col-span-2 rounded-lg bg-black/30 px-1 py-1.5 border border-white/10 text-center"
              />
              <input
                value={f.repeticiones}
                onChange={(e) => {
                  const n = [...filas]
                  n[i] = { ...n[i], repeticiones: e.target.value }
                  setFilas(n)
                }}
                placeholder="R"
                className="col-span-2 rounded-lg bg-black/30 px-1 py-1.5 border border-white/10 text-center"
              />
              <input
                value={f.pesoKg}
                onChange={(e) => {
                  const n = [...filas]
                  n[i] = { ...n[i], pesoKg: e.target.value }
                  setFilas(n)
                }}
                placeholder="kg"
                className="col-span-3 rounded-lg bg-black/30 px-1 py-1.5 border border-white/10 text-center"
              />
            </div>
          ))}
          <button
            type="button"
            onClick={agregarFila}
            className="text-xs text-orange-300 hover:underline"
          >
            {t('ejercicio.fuerza.añadir', '+ Añadir ejercicio')}
          </button>
        </div>

        <input
          value={nota}
          onChange={(e) => setNota(e.target.value)}
          placeholder={t('ejercicio.ph.notas.fuerza', 'Notas (progresión, sensaciones...)')}
          className="w-full rounded-lg bg-black/30 px-3 py-2 text-sm border border-white/10"
        />
        <button
          type="submit"
          className="w-full rounded-xl py-2.5 font-bold bg-orange-400 text-black"
        >
          {t('ejercicio.fuerza.guardar', 'Guardar entreno')}
        </button>
      </form>

      {records.length > 0 && (
        <div className="rounded-xl bg-white/5 p-4 border border-white/10">
          <p className="text-sm font-semibold mb-2">{t('ejercicio.records', '🏆 Records personales')}</p>
          <ul className="space-y-1.5">
            {records.slice(0, 6).map((r) => (
              <li key={r.ejercicio} className="flex justify-between text-sm">
                <span className="text-white/85">{r.ejercicio}</span>
                <span className="font-semibold text-orange-300">
                  {r.pesoKg} kg × {r.repeticiones}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <ListaSesiones
        sesiones={delDia}
        todasSeries={todasSeries}
        onEliminar={async (id) => {
          const rows = await db.seriesFuerza.where('sesionId').equals(id).toArray()
          await Promise.all(rows.map((s) => s.id && seriesFuerzaRepo.remove(s.id)))
          await sesionesEjercicioRepo.remove(id)
        }}
      />
    </div>
  )
}

function ListaSesiones({
  sesiones,
  todasSeries,
  onEliminar,
}: {
  sesiones: SesionEjercicio[]
  todasSeries: SerieFuerza[]
  onEliminar: (id: number) => void
}) {
  const t = useT()
  if (sesiones.length === 0) return null
  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold">{t('ejercicio.hoy', 'Hoy')}</p>
      {sesiones.map((s) => {
        const series = todasSeries
          .filter((x) => x.sesionId === s.id)
          .sort((a, b) => a.orden - b.orden)
        const vol = s.volumenKg ?? volumenSesion(series)
        return (
          <div
            key={s.id}
            className="rounded-xl bg-white/5 border border-white/10 px-3 py-2.5 text-sm"
          >
            <div className="flex items-center gap-2">
              <span className="flex-1 font-medium">{s.titulo}</span>
              <span className="text-white/40">{s.duracionMin} min</span>
              <button
                type="button"
                onClick={() => s.id && onEliminar(s.id)}
                className="text-white/30 hover:text-red-400"
              >
                ×
              </button>
            </div>
            <p className="text-xs text-white/40 mt-1">
              Volumen {vol.toLocaleString()} kg · RPE {s.rpe ?? '—'}
            </p>
            <ul className="mt-1 text-xs text-white/55">
              {series.map((x) => (
                <li key={x.id}>
                  {x.ejercicio}: {x.series}×{x.repeticiones} @ {x.pesoKg} kg
                </li>
              ))}
            </ul>
          </div>
        )
      })}
    </div>
  )
}
