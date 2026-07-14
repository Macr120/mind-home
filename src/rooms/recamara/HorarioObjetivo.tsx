import { useEffect, useState } from 'react'
import type { PerfilDescanso } from '../../core/data/db'
import { perfilDescansoRepo } from '../../core/data/repository'
import { FranjaNoche } from './FranjaNoche'
import { duracionHoras, formatHoras } from './descanso'

/**
 * Editor del horario objetivo (acostarse / despertar). La ventana de horas se
 * deriva sola. Se guarda al vuelo sobre el perfil de descanso.
 */
export function HorarioObjetivo({ perfil }: { perfil: PerfilDescanso }) {
  const [dormir, setDormir] = useState(perfil.horaObjetivoDormir)
  const [despertar, setDespertar] = useState(perfil.horaObjetivoDespertar)

  // Reflejar cambios externos del perfil.
  useEffect(() => {
    setDormir(perfil.horaObjetivoDormir)
    setDespertar(perfil.horaObjetivoDespertar)
  }, [perfil.horaObjetivoDormir, perfil.horaObjetivoDespertar])

  const guardar = async (nuevoDormir: string, nuevoDespertar: string) => {
    if (!perfil.id) return
    await perfilDescansoRepo.update(perfil.id, {
      horaObjetivoDormir: nuevoDormir,
      horaObjetivoDespertar: nuevoDespertar,
    })
  }

  const ventana = duracionHoras(dormir, despertar)

  return (
    <section className="rounded-2xl bg-white/5 p-4 border border-white/10 space-y-3">
      <div className="flex items-baseline justify-between">
        <p className="text-sm font-semibold">🎯 Horario objetivo</p>
        <p className="text-[11px] text-white/45">
          Ventana{' '}
          <span className="font-bold text-cyan-300">
            {ventana != null ? formatHoras(ventana) : '—'}
          </span>
        </p>
      </div>

      <FranjaNoche dormir={dormir} despertar={despertar} />

      <div className="grid grid-cols-2 gap-3">
        <label className="block text-xs text-white/60">
          🌙 Acostarse
          <input
            type="time"
            value={dormir}
            onChange={(e) => {
              setDormir(e.target.value)
              void guardar(e.target.value, despertar)
            }}
            className="mt-1 w-full rounded-lg bg-black/30 px-3 py-2 text-sm text-white outline-none border border-white/10 focus:border-cyan-400/40 [color-scheme:dark]"
          />
        </label>
        <label className="block text-xs text-white/60">
          ☀️ Despertar
          <input
            type="time"
            value={despertar}
            onChange={(e) => {
              setDespertar(e.target.value)
              void guardar(dormir, e.target.value)
            }}
            className="mt-1 w-full rounded-lg bg-black/30 px-3 py-2 text-sm text-white outline-none border border-white/10 focus:border-cyan-400/40 [color-scheme:dark]"
          />
        </label>
      </div>
    </section>
  )
}
