import { useState } from 'react'
import type { PerfilMindfulness } from '../../core/data/db'
import { perfilMindfulnessRepo } from '../../core/data/repository'
import { PERFIL_DEFECTO } from './constantes'
import { useT } from '../../core/i18n/useT'

export function MetasTab({ perfil }: { perfil: PerfilMindfulness }) {
  const t = useT()
  const [minutos, setMinutos] = useState(String(perfil.minutosDiariosObjetivo))

  const guardar = async () => {
    const val = parseInt(minutos, 10) || PERFIL_DEFECTO.minutosDiariosObjetivo
    if (perfil.id) await perfilMindfulnessRepo.update(perfil.id, { minutosDiariosObjetivo: val })
    else await perfilMindfulnessRepo.add({ minutosDiariosObjetivo: val })
  }

  return (
    <div className="rounded-xl bg-white/5 p-4 border border-white/10 space-y-4">
      <p className="text-sm font-semibold">{t('jardin.metas.titulo', '⚙️ Meta diaria de mindfulness')}</p>
      <p className="text-xs text-white/45">
        {t('jardin.metas.desc', 'Inspirado en Headspace y Calm: una meta pequeña y constante construye el hábito.')}
      </p>
      <label className="block text-xs text-white/50">
        {t('jardin.metas.label', 'Minutos por día')}
        <input
          type="number"
          min={1}
          max={120}
          value={minutos}
          onChange={(e) => setMinutos(e.target.value)}
          className="mt-1 w-full rounded-lg bg-black/30 px-3 py-2 text-sm border border-white/10"
        />
      </label>
      <div className="flex gap-2">
        {[5, 10, 15, 20].map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMinutos(String(m))}
            className="flex-1 rounded-lg py-1.5 text-xs bg-white/5 hover:bg-white/10"
          >
            {m} min
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={guardar}
        className="w-full rounded-xl py-2.5 font-bold bg-emerald-400 text-black"
      >
        {t('jardin.metas.guardar', 'Guardar meta')}
      </button>
    </div>
  )
}
