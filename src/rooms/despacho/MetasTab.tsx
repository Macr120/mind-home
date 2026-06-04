import { useState } from 'react'
import { metasRepo } from '../../core/data/repository'
import { money2 } from './mes'

export function MetasTab() {
  const metas = metasRepo.useAll() ?? []
  const [nombre, setNombre] = useState('')
  const [objetivo, setObjetivo] = useState('')

  const crear = async (e: React.FormEvent) => {
    e.preventDefault()
    const obj = parseFloat(objetivo)
    if (!nombre.trim() || !obj || obj <= 0) return
    await metasRepo.add({ nombre: nombre.trim(), objetivo: obj, ahorrado: 0 })
    setNombre('')
    setObjetivo('')
  }

  return (
    <div className="space-y-5">
      <form
        onSubmit={crear}
        className="rounded-xl bg-white/5 p-4 space-y-3 border border-white/10"
      >
        <p className="text-sm font-semibold">Nueva meta de ahorro</p>
        <div className="grid grid-cols-3 gap-2">
          <input
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Ej. Viaje a Japón"
            className="col-span-2 rounded-lg bg-black/30 px-3 py-2 text-sm outline-none border border-white/10 focus:border-white/30"
          />
          <input
            value={objetivo}
            onChange={(e) => setObjetivo(e.target.value)}
            type="number"
            placeholder="Meta $"
            className="rounded-lg bg-black/30 px-3 py-2 text-sm outline-none border border-white/10 focus:border-white/30"
          />
        </div>
        <button
          type="submit"
          className="w-full rounded-lg bg-amber-400 py-2 font-bold text-black hover:bg-amber-300 transition"
        >
          Crear meta
        </button>
      </form>

      <div className="space-y-3">
        {metas.length === 0 && (
          <p className="text-center text-white/40 text-sm py-6">
            Aún no tienes metas. ¡Crea tu primer objetivo de ahorro!
          </p>
        )}
        {metas.map((m) => (
          <MetaCard key={m.id} meta={m} />
        ))}
      </div>
    </div>
  )
}

function MetaCard({
  meta,
}: {
  meta: { id?: number; nombre: string; objetivo: number; ahorrado: number }
}) {
  const [abono, setAbono] = useState('')
  const pct = Math.min(100, (meta.ahorrado / meta.objetivo) * 100)
  const completa = meta.ahorrado >= meta.objetivo

  const abonar = async () => {
    const v = parseFloat(abono)
    if (!v || !meta.id) return
    await metasRepo.update(meta.id, {
      ahorrado: Math.max(0, meta.ahorrado + v),
    })
    setAbono('')
  }

  return (
    <div className="rounded-xl bg-white/5 p-4 border border-white/10">
      <div className="flex items-center">
        <h3 className="font-bold">
          {completa ? '🏆 ' : '🎯 '}
          {meta.nombre}
        </h3>
        <button
          onClick={() => meta.id && metasRepo.remove(meta.id)}
          className="ml-auto text-white/30 hover:text-white/70"
        >
          ✕
        </button>
      </div>
      <div className="mt-2 h-3 w-full rounded-full bg-black/40 overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, background: completa ? '#fbbf24' : '#34d399' }}
        />
      </div>
      <p className="mt-1.5 text-xs text-white/60">
        {money2(meta.ahorrado)} de {money2(meta.objetivo)} ({Math.round(pct)}%)
      </p>
      <div className="mt-3 flex gap-2">
        <input
          value={abono}
          onChange={(e) => setAbono(e.target.value)}
          type="number"
          placeholder="Abonar $"
          className="flex-1 rounded-lg bg-black/30 px-3 py-1.5 text-sm outline-none border border-white/10 focus:border-white/30"
        />
        <button
          onClick={abonar}
          className="rounded-lg bg-emerald-400 px-4 py-1.5 text-sm font-bold text-black hover:bg-emerald-300 transition"
        >
          + Abonar
        </button>
      </div>
    </div>
  )
}
