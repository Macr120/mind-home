import { useState } from 'react'
import type { PerfilEjercicio } from '../../core/data/db'
import { perfilEjercicioRepo } from '../../core/data/repository'
import { PERFIL_DEFECTO } from './constantes'
import { useT } from '../../core/i18n/useT'

export function MetasTab({
  perfil,
}: {
  perfil: (PerfilEjercicio & { id: number }) | undefined
}) {
  const p = perfil ?? { id: 0, ...PERFIL_DEFECTO }
  const [fuerza, setFuerza] = useState(String(p.sesionesFuerzaSemana))
  const [resistencia, setResistencia] = useState(String(p.minutosResistenciaSemana))
  const [flex, setFlex] = useState(String(p.minutosFlexibilidadSemana))
  const [dias, setDias] = useState(String(p.diasActivosSemana))

  const guardar = async () => {
    const datos = {
      sesionesFuerzaSemana: parseInt(fuerza, 10) || 3,
      minutosResistenciaSemana: parseInt(resistencia, 10) || 90,
      minutosFlexibilidadSemana: parseInt(flex, 10) || 60,
      diasActivosSemana: parseInt(dias, 10) || 5,
    }
    if (p.id) await perfilEjercicioRepo.update(p.id, datos)
    else await perfilEjercicioRepo.add(datos)
  }

  const preset = (tipo: 'balance' | 'fuerza' | 'cardio' | 'movilidad') => {
    const map = {
      balance: { f: '3', r: '90', fl: '60', d: '5' },
      fuerza: { f: '4', r: '60', fl: '45', d: '5' },
      cardio: { f: '2', r: '150', fl: '45', d: '6' },
      movilidad: { f: '2', r: '60', fl: '120', d: '5' },
    }
    const v = map[tipo]
    setFuerza(v.f)
    setResistencia(v.r)
    setFlex(v.fl)
    setDias(v.d)
  }

  const t = useT()

  return (
    <div className="space-y-5">
      <div className="rounded-xl bg-white/5 p-4 border border-white/10">
        <p className="text-sm font-semibold mb-2">{t('ejercicio.metas.titulo', '🎯 Objetivos semanales')}</p>
        <p className="text-xs text-white/45 mb-3">
          {t('ejercicio.metas.desc', 'Inspirado en programas progresivos (Apple Fitness+, Fitbod, Peloton): define cuánto quieres entrenar cada modalidad.')}
        </p>
        <div className="flex flex-wrap gap-2 mb-4">
          {(['balance', 'fuerza', 'cardio', 'movilidad'] as const).map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => preset(id)}
              className="rounded-lg bg-rose-500/15 border border-rose-500/30 px-3 py-1.5 text-xs font-semibold text-rose-200"
            >
              {t(`ejercicio.preset.${id}`, id === 'balance' ? 'Equilibrado' : id === 'fuerza' ? 'Hipertrofia' : id === 'cardio' ? 'Resistencia' : 'Movilidad')}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Campo label={t('ejercicio.metas.fuerza', '🏋️ Sesiones fuerza / sem')} value={fuerza} onChange={setFuerza} />
          <Campo label={t('ejercicio.metas.resistencia', '🏃 Min resistencia / sem')} value={resistencia} onChange={setResistencia} />
          <Campo label={t('ejercicio.metas.flex', '🧘 Min flexibilidad / sem')} value={flex} onChange={setFlex} />
          <Campo label={t('ejercicio.metas.dias', '📅 Días activos / sem')} value={dias} onChange={setDias} />
        </div>
        <button
          type="button"
          onClick={guardar}
          className="mt-4 w-full rounded-xl py-2.5 font-bold bg-rose-400 text-black"
        >
          {t('ejercicio.metas.guardar', 'Guardar metas')}
        </button>
      </div>

      <div className="rounded-xl bg-white/5 p-4 border border-white/10 text-sm text-white/55 space-y-2">
        <p className="font-semibold text-white/80">{t('ejercicio.metas.pilares', 'Qué incluye cada pilar')}</p>
        <p>
          <strong className="text-orange-300">{t('ejercicio.tab.fuerza', '🏋️ Fuerza')}</strong>{' '}
          — {t('ejercicio.pilar.fuerza', 'series, repeticiones, peso, volumen total y records (estilo Fitbod).')}
        </p>
        <p>
          <strong className="text-sky-300">{t('ejercicio.tab.resistencia', '🏃 Resistencia')}</strong>{' '}
          — {t('ejercicio.pilar.resistencia', 'cardio, HIIT, distancia y RPE por zonas (estilo Peloton / NTC).')}
        </p>
        <p>
          <strong className="text-violet-300">{t('ejercicio.tab.flexibilidad', '🧘 Flexibilidad')}</strong>{' '}
          — {t('ejercicio.pilar.flex', 'yoga, movilidad y estiramientos por enfoque corporal.')}
        </p>
      </div>
    </div>
  )
}

function Campo({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <label className="block">
      <span className="text-[10px] text-white/45">{label}</span>
      <input
        type="number"
        min={0}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-0.5 w-full rounded-lg bg-black/30 px-2 py-1.5 text-sm border border-white/10"
      />
    </label>
  )
}
