import type { ReactNode } from 'react'
import { useT } from '../../i18n/useT'
import type { PropsArrastre } from '../comun/arrastre'

interface EditorSeccionProps<T extends string = string> {
  id: T
  titulo: string
  abierto: boolean
  onToggle: (id: T) => void
  /** El gesto compartido de arrastre: se agarra la cabecera entera, sin asa. */
  gesto: PropsArrastre
  esObjetivo?: boolean
  esArrastrado?: boolean
  children: ReactNode
}

/**
 * Bloque del editor de mapa: plegable (▶/▼) y reordenable arrastrando su
 * cabecera (pulsación larga con el dedo o mover con el ratón).
 */
export function EditorSeccion<T extends string = string>({
  id,
  titulo,
  abierto,
  onToggle,
  gesto,
  esObjetivo,
  esArrastrado,
  children,
}: EditorSeccionProps<T>) {
  const t = useT()
  return (
    <div
      data-seccion={id}
      className={[
        'rounded-xl border border-white/10 bg-white/5 overflow-hidden transition',
        esObjetivo ? 'border-t-2 border-t-accent' : '',
        esArrastrado ? 'opacity-40' : 'opacity-100',
      ].join(' ')}
    >
      <div
        {...gesto}
        className="flex cursor-grab items-center gap-0.5 px-1.5 py-1.5 min-h-[34px] bg-black/15"
      >
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
          className="min-w-0 flex-1 truncate text-start text-sm font-semibold text-white/85"
        >
          {titulo}
        </button>
      </div>
      {abierto && <div className="border-t border-white/10 p-3">{children}</div>}
    </div>
  )
}
