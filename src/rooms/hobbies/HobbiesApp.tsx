import { useState } from 'react'
import { useT } from '../../core/i18n/useT'

type Hobby = { id: number; nombre: string; emoji: string }

function MisHobbiesTab() {
  const t = useT()
  const [hobbies, setHobbies] = useState<Hobby[]>([])
  const [nombre, setNombre] = useState('')
  const [emoji, setEmoji] = useState('🎯')

  const EMOJIS = ['🎯', '🎸', '🎨', '📷', '🧶', '🎮', '🏃', '📚', '🌱', '♟️']

  const agregar = (e: React.FormEvent) => {
    e.preventDefault()
    const n = nombre.trim()
    if (!n) return
    setHobbies((h) => [...h, { id: Date.now(), nombre: n, emoji }])
    setNombre('')
  }

  return (
    <div className="space-y-5">
      <form onSubmit={agregar} className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
        <p className="text-sm font-semibold">{t('hobbies.agregar', 'Agregar pasatiempo')}</p>
        <div className="flex flex-wrap gap-1.5">
          {EMOJIS.map((e) => (
            <button
              key={e}
              type="button"
              onClick={() => setEmoji(e)}
              className={`h-9 w-9 rounded-lg text-xl transition ${
                emoji === e ? 'bg-violet-400/30 ring-2 ring-violet-400' : 'bg-white/5 hover:bg-white/10'
              }`}
            >
              {e}
            </button>
          ))}
        </div>
        <input
          value={nombre}
          onChange={(ev) => setNombre(ev.target.value)}
          placeholder={t('hobbies.ph.nombre', 'Ej. Pintura, ajedrez, fotografía...')}
          maxLength={40}
          className="w-full rounded-lg bg-black/30 px-3 py-2 outline-none border border-white/10 focus:border-white/30"
        />
        <button
          type="submit"
          className="w-full rounded-lg bg-violet-500 py-2 font-bold text-white hover:bg-violet-400 transition"
        >
          {t('hobbies.btn.agregar', '+ Agregar')}
        </button>
      </form>

      {hobbies.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/15 p-8 text-center">
          <p className="text-4xl mb-2">🧩</p>
          <p className="text-sm text-white/50">
            {t('hobbies.vacio.titulo', 'Aún no tienes hobbies registrados. Empieza agregando los que disfrutas.')}
          </p>
          <p className="mt-2 text-xs text-white/35">
            {t('hobbies.vacio.proximo', 'Próximamente: seguimiento de proyectos, tiempo dedicado y metas por hobby.')}
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {hobbies.map((h) => (
            <li
              key={h.id}
              className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3"
            >
              <span className="text-2xl">{h.emoji}</span>
              <span className="font-semibold">{h.nombre}</span>
              <button
                type="button"
                onClick={() => setHobbies((list) => list.filter((x) => x.id !== h.id))}
                className="ml-auto text-white/30 hover:text-red-400"
                title="Quitar"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export function HobbiesApp() {
  const t = useT()
  return (
    <div className="mx-auto max-w-xl space-y-4">
      <p className="text-sm text-white/50 text-center">
        {t('hobbies.desc', 'Tus pasatiempos y proyectos creativos, separados del diseño de la casa.')}
      </p>
      <MisHobbiesTab />
    </div>
  )
}
