import { useState } from 'react'
import { INPUT } from '../../../rooms/_shared/ui'
import { useSesion } from '../../cuenta/sesionStore'
import { hayBackend } from '../../cuenta/supabase'
import { useT } from '../../i18n/useT'
import { fijarAlias, mensajeErrorBuzon } from '../api'
import { ALIAS_REGEX } from '../tipos'
import { Retrato } from './Retrato'

/** Formulario del alias público (alias, nombre visible y emoji). */
export function FormAlias({ onListo, onCancelar }: { onListo?: () => void; onCancelar?: () => void }) {
  const t = useT()
  const actual = useSesion((s) => s.alias)
  const nombreActual = useSesion((s) => s.nombre)
  const emojiActual = useSesion((s) => s.emoji)
  const [alias, setAlias] = useState(actual ?? '')
  const [nombre, setNombre] = useState(nombreActual)
  const [emoji, setEmoji] = useState(emojiActual)
  const [error, setError] = useState('')
  const [ocupado, setOcupado] = useState(false)

  const guardar = async () => {
    const a = alias.trim().toLowerCase().replace(/^@/, '')
    if (!ALIAS_REGEX.test(a)) {
      setError(t('buzon.err.alias-invalido', 'Alias no válido: 3-20 letras minúsculas, números o _'))
      return
    }
    setOcupado(true)
    setError('')
    try {
      await fijarAlias(a, nombre.trim(), emoji.trim() || '🙂')
      onListo?.()
    } catch (e) {
      setError(mensajeErrorBuzon(e, t))
    } finally {
      setOcupado(false)
    }
  }

  return (
    <div className="space-y-1.5">
      <div className="flex gap-1.5">
        <input
          value={emoji}
          onChange={(e) => setEmoji(e.target.value.slice(0, 8))}
          maxLength={8}
          className={`${INPUT} w-12 shrink-0 text-center`}
          title={t('buzon.alias.emoji', 'Emoji')}
          aria-label={t('buzon.alias.emoji', 'Emoji')}
        />
        <div className={`${INPUT} flex min-w-0 flex-1 items-center gap-1 py-0`}>
          <span className="text-white/40">@</span>
          <input
            value={alias}
            onChange={(e) => setAlias(e.target.value.toLowerCase())}
            onKeyDown={(e) => e.key === 'Enter' && void guardar()}
            maxLength={20}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            placeholder={t('buzon.alias.campo', 'alias (3-20 letras, números o _)')}
            className="min-w-0 flex-1 bg-transparent py-1.5 focus:outline-none"
            aria-label={t('buzon.miAlias', 'Mi alias')}
          />
        </div>
      </div>
      <input
        value={nombre}
        onChange={(e) => setNombre(e.target.value.slice(0, 40))}
        onKeyDown={(e) => e.key === 'Enter' && void guardar()}
        maxLength={40}
        placeholder={t('buzon.alias.nombre', 'Nombre visible')}
        className={`${INPUT} w-full`}
        aria-label={t('buzon.alias.nombre', 'Nombre visible')}
      />
      {error && <p className="text-[11px] leading-snug text-red-400/90">{error}</p>}
      <div className="flex justify-end gap-1.5">
        {onCancelar && (
          <button
            type="button"
            onClick={onCancelar}
            className="rounded-lg px-2.5 py-1 text-[11px] font-semibold text-white/50 transition hover:bg-white/10 hover:text-white/80"
          >
            {t('chat.mapa.descartar', 'Ahora no')}
          </button>
        )}
        <button
          type="button"
          onClick={() => void guardar()}
          disabled={ocupado}
          className="rounded-lg bg-accent px-2.5 py-1 text-[11px] font-semibold text-accent-ink transition hover:brightness-110 disabled:opacity-50"
        >
          {t('buzon.alias.guardar', 'Guardar alias')}
        </button>
      </div>
    </div>
  )
}

/** La fila de la sección Cuenta: `@alias · nombre` con su emoji, y Editar. */
export function FilaAlias() {
  const t = useT()
  const alias = useSesion((s) => s.alias)
  const nombre = useSesion((s) => s.nombre)
  const emoji = useSesion((s) => s.emoji)
  const retrato = useSesion((s) => s.retrato)
  const [editando, setEditando] = useState(false)
  if (!hayBackend()) return null
  if (editando) {
    return (
      <div className="rounded-md border border-white/10 bg-white/5 px-2 py-1.5">
        <FormAlias onListo={() => setEditando(false)} onCancelar={() => setEditando(false)} />
      </div>
    )
  }
  return (
    <div className="flex items-center gap-2 rounded-md border border-white/10 bg-white/5 px-2 py-1.5">
      <Retrato retrato={retrato} emoji={emoji} className="h-7 w-7" textoClase="text-base" />
      <span className="min-w-0 flex-1 truncate text-xs text-white/75">
        {alias ? `@${alias}${nombre ? ` · ${nombre}` : ''}` : t('buzon.alias.sin', 'Elige un alias para que te encuentren')}
      </span>
      <button
        type="button"
        onClick={() => setEditando(true)}
        className="shrink-0 rounded-lg bg-white/10 px-2 py-1 text-[11px] font-semibold text-white/70 transition hover:bg-white/15"
      >
        {alias ? t('buzon.alias.editar', 'Editar alias') : t('cuenta.alias', 'Alias')}
      </button>
    </div>
  )
}
