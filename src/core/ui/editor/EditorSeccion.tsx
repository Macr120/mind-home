import type { ReactNode } from 'react'
import { useT } from '../../i18n/useT'

interface EditorSeccionProps<T extends string = string> {
  id: T
  titulo: string
  abierto: boolean
  onToggle: (id: T) => void
  onDragStart: (id: T) => void
  onDragEnter: (id: T) => void
  onDragEnd: () => void
  onDrop: (id: T) => void
  esObjetivo?: boolean
  esArrastrado?: boolean
  children: ReactNode
}

/**
 * Bloque del editor de mapa: plegable (▶/▼) y reordenable (⠿).
 */
export function EditorSeccion<T extends string = string>({
  id,
  titulo,
  abierto,
  onToggle,
  onDragStart,
  onDragEnter,
  onDragEnd,
  onDrop,
  esObjetivo,
  esArrastrado,
  children,
}: EditorSeccionProps<T>) {
  const t = useT()
  return (
    <div
      className={[
        'rounded-xl border bg-white/5 overflow-hidden transition',
        esObjetivo ? 'border-emerald-400/50 ring-1 ring-emerald-400/30' : 'border-white/10',
        esArrastrado ? 'opacity-40' : 'opacity-100',
      ].join(' ')}
      onDragEnter={(e) => {
        e.preventDefault()
        onDragEnter(id)
      }}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault()
        onDrop(id)
      }}
    >
      <div className="flex items-center gap-0.5 px-1.5 py-1.5 min-h-[34px] bg-black/15">
        <button
          type="button"
          className="flex h-7 w-7 shrink-0 cursor-grab items-center justify-center rounded text-base leading-none text-white/40 transition hover:bg-white/10 hover:text-white/70 active:cursor-grabbing"
          draggable
          onDragStart={(e) => {
            e.dataTransfer.effectAllowed = 'move'
            e.dataTransfer.setData('text/plain', id)
            onDragStart(id)
          }}
          onDragEnd={onDragEnd}
          title={t('editor.sec.reordenar', 'Arrastrar para reordenar')}
          aria-label={t('editor.sec.reordenarSec', `Reordenar ${titulo}`, { titulo })}
        >
          ⠿
        </button>
        <button
          type="button"
          onClick={() => onToggle(id)}
          className="flex h-7 w-6 shrink-0 items-center justify-center text-[10px] text-white/50 transition hover:text-white/85"
          aria-expanded={abierto}
          aria-label={
            abierto
              ? t('editor.sec.contraer', `Contraer ${titulo}`, { titulo })
              : t('editor.sec.expandir', `Expandir ${titulo}`, { titulo })
          }
        >
          {abierto ? '▼' : '▶'}
        </button>
        <button
          type="button"
          onClick={() => onToggle(id)}
          className="min-w-0 flex-1 truncate text-left text-sm font-semibold text-white/85"
        >
          {titulo}
        </button>
      </div>
      {abierto && <div className="border-t border-white/10 p-3">{children}</div>}
    </div>
  )
}
