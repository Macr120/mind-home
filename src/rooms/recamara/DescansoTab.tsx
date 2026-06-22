import { useState } from 'react'
import { suenoRepo } from '../../core/data/repository'
import { useT } from '../../core/i18n/useT'

const hoy = () => new Date().toISOString().slice(0, 10)

export function DescansoTab() {
  const registros = suenoRepo.useAll()
  const [horas, setHoras] = useState('8')
  const [calidad, setCalidad] = useState(3)
  const [nota, setNota] = useState('')

  const lista = registros ?? []
  const promedio =
    lista.length > 0
      ? (lista.reduce((a, r) => a + r.horas, 0) / lista.length).toFixed(1)
      : '—'

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault()
    const h = parseFloat(horas)
    if (!h) return
    await suenoRepo.add({
      fecha: hoy(),
      horas: h,
      calidad,
      nota: nota.trim() || undefined,
    })
    setNota('')
  }

  const t = useT()

  return (
    <div className="space-y-5">
      <div className="rounded-xl bg-white/5 p-4 border border-white/10 text-center">
        <p className="text-xs text-white/50">{t('recamara.sueno.promedio', 'Promedio de sueño')}</p>
        <p className="text-3xl font-black text-cyan-300">{promedio} h</p>
      </div>

      <form
        onSubmit={guardar}
        className="rounded-xl bg-white/5 p-4 space-y-3 border border-white/10"
      >
        <label className="block text-sm">
          {t('recamara.sueno.horas', 'Horas dormidas')}
          <input
            type="number"
            step="0.5"
            value={horas}
            onChange={(e) => setHoras(e.target.value)}
            className="mt-1 w-full rounded-lg bg-black/30 px-3 py-2 outline-none border border-white/10 focus:border-white/30"
          />
        </label>
        <div>
          <span className="text-sm">{t('recamara.sueno.calidad', 'Calidad')}</span>
          <div className="mt-1 flex gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setCalidad(n)}
                className="text-2xl"
                title={t('recamara.sueno.nDe5', `${n} de 5`, { n: String(n) })}
              >
                {n <= calidad ? '★' : '☆'}
              </button>
            ))}
          </div>
        </div>
        <input
          value={nota}
          onChange={(e) => setNota(e.target.value)}
          placeholder={t('recamara.sueno.ph.nota', 'Nota (ej. desperté cansado)')}
          className="w-full rounded-lg bg-black/30 px-3 py-2 text-sm outline-none border border-white/10 focus:border-white/30"
        />
        <button
          type="submit"
          className="w-full rounded-lg bg-cyan-400 py-2 font-bold text-black hover:bg-cyan-300 transition"
        >
          {t('recamara.sueno.guardar', 'Registrar descanso')}
        </button>
      </form>

      <div className="space-y-2">
        {lista.map((r) => (
          <div
            key={r.id}
            className="flex items-center gap-3 rounded-lg bg-white/5 px-3 py-2 border border-white/10"
          >
            <span className="font-bold text-cyan-300">{r.horas}h</span>
            <span className="text-amber-300 text-sm">
              {'★'.repeat(r.calidad)}
            </span>
            <span className="text-xs text-white/40">
              {r.fecha}
              {r.nota ? ` · ${r.nota}` : ''}
            </span>
            <button
              onClick={() => r.id && suenoRepo.remove(r.id)}
              className="ml-auto text-white/30 hover:text-white/70"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
