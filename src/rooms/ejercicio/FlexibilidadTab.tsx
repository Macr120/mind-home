import { useState } from 'react'
import type { SesionEjercicio } from '../../core/data/db'
import { sesionesEjercicioRepo } from '../../core/data/repository'
import { ENFOQUES_FLEX } from './constantes'
import { RUTINAS } from './rutinas'
import { minutosTipo, sesionesSemana } from './stats'
import { HistorialDia } from './ResistenciaTab'

export function FlexibilidadTab({
  fecha,
  sesiones,
  metaMinutos,
}: {
  fecha: string
  sesiones: SesionEjercicio[]
  metaMinutos: number
}) {
  const [titulo, setTitulo] = useState('Sesión de movilidad')
  const [duracion, setDuracion] = useState('20')
  const [enfoque, setEnfoque] = useState(ENFOQUES_FLEX[0])
  const [rpe, setRpe] = useState('4')
  const [nota, setNota] = useState('')

  const delDia = sesiones.filter(
    (s) => s.fecha === fecha && s.tipo === 'flexibilidad',
  )
  const semana = sesionesSemana(sesiones)
  const minSemana = minutosTipo(semana, 'flexibilidad')
  const pct = metaMinutos > 0 ? Math.min(100, (minSemana / metaMinutos) * 100) : 0

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault()
    const mins = parseInt(duracion, 10)
    if (!mins || mins <= 0) return
    await sesionesEjercicioRepo.add({
      fecha,
      tipo: 'flexibilidad',
      titulo: titulo.trim() || 'Flexibilidad',
      duracionMin: mins,
      enfoque,
      rpe: parseInt(rpe, 10) || undefined,
      nota: nota.trim() || undefined,
    })
    setNota('')
  }

  return (
    <div className="space-y-5">
      <div className="rounded-xl bg-violet-500/10 border border-violet-500/25 p-4">
        <p className="text-xs text-white/50">Movilidad y estiramiento · semana</p>
        <p className="text-2xl font-black text-violet-300">
          {minSemana}{' '}
          <span className="text-base font-semibold text-white/50">/ {metaMinutos} min</span>
        </p>
        <div className="mt-2 h-2 rounded-full bg-black/40 overflow-hidden">
          <div
            className="h-full rounded-full bg-violet-400 transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {RUTINAS.flexibilidad.map((r) => (
          <button
            key={r.nombre}
            type="button"
            onClick={() => {
              setTitulo(r.nombre)
              setDuracion(String(r.duracionMin))
              if (r.enfoque) setEnfoque(r.enfoque)
            }}
            className="shrink-0 rounded-lg bg-violet-500/15 border border-violet-500/30 px-3 py-2 text-xs font-semibold text-violet-200"
          >
            {r.nombre}
          </button>
        ))}
      </div>

      <form
        onSubmit={guardar}
        className="rounded-xl bg-white/5 p-4 space-y-3 border border-white/10"
      >
        <p className="text-sm font-semibold">🧘 Registrar flexibilidad</p>
        <input
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          className="w-full rounded-lg bg-black/30 px-3 py-2 text-sm border border-white/10 outline-none"
          placeholder="Nombre de la sesión"
        />
        <div className="flex flex-wrap gap-1.5">
          {ENFOQUES_FLEX.map((e) => (
            <button
              key={e}
              type="button"
              onClick={() => setEnfoque(e)}
              className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${
                enfoque === e ? 'bg-violet-400 text-black' : 'bg-white/5'
              }`}
            >
              {e}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <label className="text-xs text-white/50">
            Minutos
            <input
              type="number"
              value={duracion}
              onChange={(e) => setDuracion(e.target.value)}
              className="mt-0.5 w-full rounded-lg bg-black/30 px-2 py-1.5 text-sm border border-white/10"
            />
          </label>
          <label className="text-xs text-white/50">
            Intensidad RPE
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
        <input
          value={nota}
          onChange={(e) => setNota(e.target.value)}
          placeholder="Posturas, limitaciones, progreso..."
          className="w-full rounded-lg bg-black/30 px-3 py-2 text-sm border border-white/10"
        />
        <button
          type="submit"
          className="w-full rounded-xl py-2.5 font-bold bg-violet-400 text-black"
        >
          Guardar sesión
        </button>
      </form>

      <HistorialDia
        sesiones={delDia}
        color="text-violet-300"
        onEliminar={(id) => sesionesEjercicioRepo.remove(id)}
      />
    </div>
  )
}
