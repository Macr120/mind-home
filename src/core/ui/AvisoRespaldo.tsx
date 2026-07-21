import { useState } from 'react'
import { useT } from '../i18n/useT'
import {
  avisoRespaldoPendiente,
  diasSinRespaldo,
  exportarRespaldo,
  posponerAvisoRespaldo,
} from '../data/respaldo'

/** Aviso discreto cuando el último export tiene más de un mes; el ✕ pospone una semana. */
export function AvisoRespaldo() {
  const t = useT()
  const [visible, setVisible] = useState(avisoRespaldoPendiente)
  if (!visible) return null
  const n = String(diasSinRespaldo() ?? 0)
  return (
    <div className="ui-panel-glass absolute left-1/2 top-16 z-40 flex -translate-x-1/2 items-center gap-3 rounded-xl border border-amber-500/30 px-4 py-2 text-sm shadow-lg backdrop-blur-md">
      <span className="text-white/80">
        {t('respaldo.aviso', `Tu último respaldo fue hace ${n} días.`, { n })}
      </span>
      <button
        onClick={() => { void exportarRespaldo().then(() => setVisible(false)) }}
        className="rounded-lg bg-amber-600 px-3 py-1 font-semibold texto-cta hover:bg-amber-500 transition"
      >
        {t('respaldo.ahora', 'Respaldar')}
      </button>
      <button
        onClick={() => { posponerAvisoRespaldo(); setVisible(false) }}
        className="text-white/40 hover:text-white/80 transition"
        title={t('respaldo.luego', 'Recordar en una semana')}
      >
        ✕
      </button>
    </div>
  )
}
