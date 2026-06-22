import { useState } from 'react'
import type { SesionEjercicio } from '../../core/data/db'
import { sesionesEjercicioRepo } from '../../core/data/repository'
import { TIPOS_CARDIO } from './constantes'
import { RUTINAS } from './rutinas'
import { minutosTipo, sesionesSemana } from './stats'
import { useT } from '../../core/i18n/useT'

export function ResistenciaTab({
  fecha,
  sesiones,
  metaMinutos,
}: {
  fecha: string
  sesiones: SesionEjercicio[]
  metaMinutos: number
}) {
  const [tipo, setTipo] = useState(TIPOS_CARDIO[0])
  const [duracion, setDuracion] = useState('30')
  const [distancia, setDistancia] = useState('')
  const [rpe, setRpe] = useState('6')
  const [nota, setNota] = useState('')

  const delDia = sesiones.filter(
    (s) => s.fecha === fecha && s.tipo === 'resistencia',
  )
  const semana = sesionesSemana(sesiones)
  const minSemana = minutosTipo(semana, 'resistencia')
  const pct = metaMinutos > 0 ? Math.min(100, (minSemana / metaMinutos) * 100) : 0

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault()
    const mins = parseInt(duracion, 10)
    if (!mins || mins <= 0) return
    await sesionesEjercicioRepo.add({
      fecha,
      tipo: 'resistencia',
      titulo: tipo,
      duracionMin: mins,
      distanciaKm: parseFloat(distancia) || undefined,
      rpe: parseInt(rpe, 10) || undefined,
      nota: nota.trim() || undefined,
    })
    setDistancia('')
    setNota('')
  }

  const t = useT()

  return (
    <div className="space-y-5">
      <div className="rounded-xl bg-sky-500/10 border border-sky-500/25 p-4">
        <p className="text-xs text-white/50">{t('ejercicio.cardio.minSemana', 'Minutos cardio esta semana')}</p>
        <p className="text-2xl font-black text-sky-300">
          {minSemana}{' '}
          <span className="text-base font-semibold text-white/50">/ {metaMinutos} min</span>
        </p>
        <div className="mt-2 h-2 rounded-full bg-black/40 overflow-hidden">
          <div
            className="h-full rounded-full bg-sky-400 transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {RUTINAS.resistencia.map((r) => (
          <button
            key={r.nombre}
            type="button"
            onClick={() => {
              setTipo(r.nombre)
              setDuracion(String(r.duracionMin))
            }}
            className="shrink-0 rounded-lg bg-sky-500/15 border border-sky-500/30 px-3 py-2 text-xs font-semibold text-sky-200"
          >
            {r.nombre}
          </button>
        ))}
      </div>

      <form
        onSubmit={guardar}
        className="rounded-xl bg-white/5 p-4 space-y-3 border border-white/10"
      >
        <p className="text-sm font-semibold">{t('ejercicio.cardio.registrar', '🏃 Registrar cardio / resistencia')}</p>
        <div className="flex flex-wrap gap-1.5">
          {TIPOS_CARDIO.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTipo(t)}
              className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${
                tipo === t ? 'bg-sky-400 text-black' : 'bg-white/5'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-2">
          <label className="text-xs text-white/50">
            {t('ejercicio.minutos', 'Minutos')}
            <input
              type="number"
              value={duracion}
              onChange={(e) => setDuracion(e.target.value)}
              className="mt-0.5 w-full rounded-lg bg-black/30 px-2 py-1.5 text-sm border border-white/10"
            />
          </label>
          <label className="text-xs text-white/50">
            {t('ejercicio.km', 'Km (opc.)')}
            <input
              type="number"
              step="0.1"
              value={distancia}
              onChange={(e) => setDistancia(e.target.value)}
              className="mt-0.5 w-full rounded-lg bg-black/30 px-2 py-1.5 text-sm border border-white/10"
            />
          </label>
          <label className="text-xs text-white/50">
            {t('ejercicio.rpe', 'RPE')}
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
        <p className="text-[10px] text-white/35">
          {t('ejercicio.zonas', 'Zonas: RPE 1–4 recuperación · 5–6 aeróbico · 7–8 umbral · 9–10 máximo')}
        </p>
        <input
          value={nota}
          onChange={(e) => setNota(e.target.value)}
          placeholder={t('ejercicio.ph.notas.cardio', 'Notas (ritmo, pendiente, sensación...)')}
          className="w-full rounded-lg bg-black/30 px-3 py-2 text-sm border border-white/10"
        />
        <button
          type="submit"
          className="w-full rounded-xl py-2.5 font-bold bg-sky-400 text-black"
        >
          {t('ejercicio.guardar', 'Guardar sesión')}
        </button>
      </form>

      <HistorialDia
        sesiones={delDia}
        color="text-sky-300"
        onEliminar={(id) => sesionesEjercicioRepo.remove(id)}
      />
    </div>
  )
}

export function HistorialDia({
  sesiones,
  color,
  onEliminar,
}: {
  sesiones: SesionEjercicio[]
  color: string
  onEliminar: (id: number) => void
}) {
  const t = useT()
  if (sesiones.length === 0) return null
  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold">{t('ejercicio.hoy', 'Hoy')}</p>
      {sesiones.map((s) => (
        <div
          key={s.id}
          className="flex items-center gap-2 rounded-xl bg-white/5 border border-white/10 px-3 py-2.5 text-sm"
        >
          <div className="flex-1 min-w-0">
            <p className="font-medium">{s.titulo}</p>
            <p className="text-xs text-white/40">
              {s.duracionMin} min
              {s.distanciaKm ? ` · ${s.distanciaKm} km` : ''}
              {s.rpe ? ` · RPE ${s.rpe}` : ''}
            </p>
          </div>
          <span className={`font-semibold ${color}`}>{s.duracionMin}′</span>
          <button
            type="button"
            onClick={() => s.id && onEliminar(s.id)}
            className="text-white/30 hover:text-red-400"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  )
}
