import { useState, useEffect } from 'react'
import { perfilUsuarioRepo } from '../../data/repository'
import type { PerfilUsuario } from '../../data/db'
import { useT } from '../../i18n/useT'

const EMOJIS = ['😊', '😎', '🧠', '🦊', '🐼', '🦁', '🐲', '🚀', '🌙', '⭐', '🔥', '💎']

/** Perfil de usuario (modo editar mapa). */
export function EditorPerfilSection({ embed }: { embed?: boolean } = {}) {
  const t = useT()
  const perfiles = perfilUsuarioRepo.useAll() ?? []
  const perfil: PerfilUsuario = perfiles[0] ?? { nombre: '', emoji: '😊', bio: '' }

  const [nombre, setNombre] = useState(perfil.nombre)
  const [emoji, setEmoji] = useState(perfil.emoji)
  const [nacimiento, setNacimiento] = useState(perfil.nacimiento ?? '')
  const [bio, setBio] = useState(perfil.bio)
  const [guardado, setGuardado] = useState(false)

  useEffect(() => {
    setNombre(perfil.nombre)
    setEmoji(perfil.emoji)
    setNacimiento(perfil.nacimiento ?? '')
    setBio(perfil.bio)
  }, [perfiles.length])

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault()
    const datos = {
      nombre: nombre.trim(),
      emoji,
      nacimiento: nacimiento || undefined,
      bio: bio.trim(),
    }
    if (perfil.id) await perfilUsuarioRepo.update(perfil.id, datos)
    else await perfilUsuarioRepo.add(datos)
    setGuardado(true)
    setTimeout(() => setGuardado(false), 2000)
  }

  const edad = nacimiento
    ? Math.floor(
        (Date.now() - new Date(nacimiento).getTime()) / (1000 * 60 * 60 * 24 * 365.25)
      )
    : null

  return (
    <div className={embed ? 'space-y-3' : 'rounded-xl border border-white/10 bg-white/5 p-3 space-y-3'}>
      {!embed && <p className="text-sm font-semibold">{t('editor.perfil.titulo', '👤 Tu perfil')}</p>}
      <div className="flex items-center gap-3 rounded-lg bg-black/20 p-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 text-3xl">
          {emoji}
        </div>
        <div className="min-w-0">
          <p className="font-bold truncate">{nombre || t('editor.perfil.tuNombre', 'Tu nombre')}</p>
          {edad !== null && (
            <p className="text-xs text-white/50">
              {t('editor.perfil.edad', `${edad} años`, { n: String(edad) })}
            </p>
          )}
        </div>
      </div>
      <form onSubmit={guardar} className="space-y-3">
        <div>
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-white/50">
            {t('editor.perfil.emoji', 'Emoji')}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {EMOJIS.map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => setEmoji(e)}
                className={`h-8 w-8 rounded-lg text-lg transition ${
                  emoji === e ? 'bg-white/20 ring-2 ring-white/40' : 'bg-white/5 hover:bg-white/10'
                }`}
              >
                {e}
              </button>
            ))}
          </div>
        </div>
        <label className="block text-xs">
          <span className="font-semibold">{t('editor.perfil.nombre', 'Nombre')}</span>
          <input
            value={nombre}
            onChange={(ev) => setNombre(ev.target.value)}
            placeholder={t('editor.perfil.ph.nombre', '¿Cómo te llamas?')}
            maxLength={40}
            className="mt-1 w-full rounded-lg bg-black/30 px-2 py-1.5 outline-none border border-white/10 focus:border-white/30"
          />
        </label>
        <label className="block text-xs">
          <span className="font-semibold">{t('editor.perfil.nacimiento', 'Nacimiento')}</span>
          <input
            type="date"
            value={nacimiento}
            onChange={(ev) => setNacimiento(ev.target.value)}
            className="mt-1 w-full rounded-lg bg-black/30 px-2 py-1.5 outline-none border border-white/10 focus:border-white/30"
          />
        </label>
        <label className="block text-xs">
          <span className="font-semibold">{t('editor.perfil.bio', 'Bio')}</span>
          <textarea
            value={bio}
            onChange={(ev) => setBio(ev.target.value)}
            placeholder={t('editor.perfil.ph.bio', 'Una frase sobre ti...')}
            rows={2}
            maxLength={120}
            className="mt-1 w-full rounded-lg bg-black/30 px-2 py-1.5 text-xs outline-none border border-white/10 focus:border-white/30 resize-none"
          />
        </label>
        <button
          type="submit"
          className="w-full rounded-lg py-2 text-xs font-bold transition"
          style={{
            background: guardado ? '#34d399' : '#60a5fa',
            color: '#0f1115',
          }}
        >
          {guardado ? t('editor.perfil.guardado', '✓ Guardado') : t('editor.perfil.guardar', 'Guardar perfil')}
        </button>
      </form>
    </div>
  )
}
