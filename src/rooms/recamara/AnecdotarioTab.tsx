import { useState } from 'react'
import { anecdotasRepo } from '../../core/data/repository'

const hoy = () => new Date().toISOString().slice(0, 10)
const ANIMOS = ['😀', '🙂', '😐', '😔', '😣', '🤩', '😴']

export function AnecdotarioTab() {
  const entradas = anecdotasRepo.useAll()
  const [titulo, setTitulo] = useState('')
  const [contenido, setContenido] = useState('')
  const [animo, setAnimo] = useState('🙂')

  const lista = entradas ?? []

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!contenido.trim()) return
    await anecdotasRepo.add({
      fecha: hoy(),
      titulo: titulo.trim() || 'Sin título',
      contenido: contenido.trim(),
      animo,
    })
    setTitulo('')
    setContenido('')
  }

  return (
    <div className="space-y-5">
      <form
        onSubmit={guardar}
        className="rounded-xl bg-white/5 p-4 space-y-3 border border-white/10"
      >
        <div className="flex gap-2">
          {ANIMOS.map((a) => (
            <button
              key={a}
              type="button"
              onClick={() => setAnimo(a)}
              className={`text-2xl transition ${
                animo === a ? 'scale-125' : 'opacity-50 hover:opacity-100'
              }`}
            >
              {a}
            </button>
          ))}
        </div>
        <input
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          placeholder="Título del día"
          className="w-full rounded-lg bg-black/30 px-3 py-2 outline-none border border-white/10 focus:border-white/30"
        />
        <textarea
          value={contenido}
          onChange={(e) => setContenido(e.target.value)}
          placeholder="¿Qué pasó hoy? ¿Qué aprendiste?"
          rows={4}
          className="w-full rounded-lg bg-black/30 px-3 py-2 text-sm outline-none border border-white/10 focus:border-white/30 resize-none"
        />
        <button
          type="submit"
          className="w-full rounded-lg bg-violet-400 py-2 font-bold text-black hover:bg-violet-300 transition"
        >
          Guardar anécdota
        </button>
      </form>

      <div className="space-y-3">
        {lista.length === 0 && (
          <p className="text-center text-white/40 text-sm py-8">
            Tu anecdotario está vacío. Escribe tu primer recuerdo.
          </p>
        )}
        {lista.map((a) => (
          <article
            key={a.id}
            className="rounded-xl bg-white/5 p-4 border border-white/10"
          >
            <header className="flex items-center gap-2">
              <span className="text-xl">{a.animo}</span>
              <h3 className="font-bold">{a.titulo}</h3>
              <span className="ml-auto text-xs text-white/40">{a.fecha}</span>
              <button
                onClick={() => a.id && anecdotasRepo.remove(a.id)}
                className="text-white/30 hover:text-white/70"
              >
                ✕
              </button>
            </header>
            <p className="mt-2 text-sm text-white/80 whitespace-pre-wrap">
              {a.contenido}
            </p>
          </article>
        ))}
      </div>
    </div>
  )
}
