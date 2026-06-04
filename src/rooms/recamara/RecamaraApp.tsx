import { useState } from 'react'
import { DescansoTab } from './DescansoTab'
import { AnecdotarioTab } from './AnecdotarioTab'

type Herramienta = 'cama' | 'escritorio'

export function RecamaraApp() {
  const [tab, setTab] = useState<Herramienta>('cama')

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      {/* Selector de herramienta dentro del cuarto */}
      <div className="flex gap-2">
        <button
          onClick={() => setTab('cama')}
          className={`flex-1 rounded-xl py-3 font-semibold transition ${
            tab === 'cama' ? 'bg-cyan-400 text-black' : 'bg-white/5 hover:bg-white/10'
          }`}
        >
          🛏️ Cama · Descanso
        </button>
        <button
          onClick={() => setTab('escritorio')}
          className={`flex-1 rounded-xl py-3 font-semibold transition ${
            tab === 'escritorio'
              ? 'bg-violet-400 text-black'
              : 'bg-white/5 hover:bg-white/10'
          }`}
        >
          ✍️ Escritorio · Anecdotario
        </button>
      </div>

      {tab === 'cama' ? <DescansoTab /> : <AnecdotarioTab />}
    </div>
  )
}
