import { useState } from 'react'
import { DescansoTab } from './DescansoTab'
import { AnecdotarioTab } from './AnecdotarioTab'
import { useT } from '../../core/i18n/useT'

type Herramienta = 'cama' | 'escritorio'

export function RecamaraApp() {
  const t = useT()
  const [tab, setTab] = useState<Herramienta>('cama')

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div className="flex gap-2">
        <button
          onClick={() => setTab('cama')}
          className={`flex-1 rounded-xl py-3 font-semibold transition ${
            tab === 'cama' ? 'bg-cyan-400 text-black' : 'bg-white/5 hover:bg-white/10'
          }`}
        >
          {t('recamara.cama', '🛏️ Cama · Descanso')}
        </button>
        <button
          onClick={() => setTab('escritorio')}
          className={`flex-1 rounded-xl py-3 font-semibold transition ${
            tab === 'escritorio'
              ? 'bg-violet-400 text-black'
              : 'bg-white/5 hover:bg-white/10'
          }`}
        >
          {t('recamara.escritorio', '✍️ Escritorio · Anecdotario')}
        </button>
      </div>

      {tab === 'cama' ? <DescansoTab /> : <AnecdotarioTab />}
    </div>
  )
}
