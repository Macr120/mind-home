// Pantalla de arranque de los juegos con varios modos (contra la máquina, 2
// jugadores, solitario…). Antes cada juego repetía este mismo bloque.
import type { ReactNode } from 'react'
import { useT } from '../../../core/i18n/useT'

export interface OpcionModo {
  clave: string
  icono: ReactNode
  titulo: string
  desc: string
  alElegir: () => void
}

export function ElegirModo({ opciones }: { opciones: OpcionModo[] }) {
  const t = useT()
  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold">{t('entre.j.modo.titulo', '¿Cómo quieres jugar?')}</p>
      <div className="grid grid-cols-2 gap-2">
        {opciones.map((o) => (
          <button
            key={o.clave}
            type="button"
            onClick={o.alElegir}
            className="rounded-2xl border border-white/10 bg-white/5 p-4 text-left transition hover:-translate-y-0.5 hover:border-white/25 hover:bg-white/10"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 text-2xl">
              {o.icono}
            </span>
            <p className="mt-2 font-bold leading-tight">{o.titulo}</p>
            <p className="mt-0.5 text-xs leading-snug text-white/50">{o.desc}</p>
          </button>
        ))}
      </div>
    </div>
  )
}
