import { useCallback, useEffect, useRef, useState } from 'react'
import { noticiasRepo } from '../../core/data/repository'
import {
  actualizarBriefingDelDia,
  fechaUltimaSync,
  necesitaSyncHoy,
} from './actualizarFeed'
import { CentralTab } from './CentralTab'
import { ResumenTab } from './ResumenTab'
import { COLOR } from './constantes'
import { hoyISO } from './fecha'
import { sembrarDiario } from './seed'

type Tab = 'central' | 'resumen'

const TABS: { id: Tab; label: string }[] = [
  { id: 'central', label: '📰 Central' },
  { id: 'resumen', label: '📊 Resumen' },
]

export function DiarioApp() {
  const [tab, setTab] = useState<Tab>('central')
  const [syncMsg, setSyncMsg] = useState<string | null>(null)
  const [syncCargando, setSyncCargando] = useState(false)
  const noticias = noticiasRepo.useAll() ?? []

  const sincronizar = useCallback(async (forzar = false) => {
    if (syncCargando) return
    if (!forzar && !necesitaSyncHoy()) return
    setSyncCargando(true)
    setSyncMsg(null)
    const r = await actualizarBriefingDelDia()
    setSyncCargando(false)
    if (r.error) setSyncMsg(r.error)
    else if (r.nuevas > 0)
      setSyncMsg(
        `${r.nuevas} titular${r.nuevas === 1 ? '' : 'es'} nuevo${r.nuevas === 1 ? '' : 's'} hoy`,
      )
    else setSyncMsg('Briefing al día')
  }, [syncCargando])

  const inicioHecho = useRef(false)
  useEffect(() => {
    if (inicioHecho.current) return
    inicioHecho.current = true
    void sembrarDiario().then(() => sincronizar(false))
  }, [sincronizar])

  const ultima = fechaUltimaSync()
  const etiquetaSync =
    ultima === hoyISO()
      ? 'Actualizado hoy'
      : ultima
        ? `Última sync: ${ultima}`
        : 'Sin sincronizar hoy'

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <p className="text-xs text-white/45 leading-relaxed">
        Briefing diario desde medios en español, más tus recortes manuales. Filtra por
        categoría y marca lo que ya leíste.
      </p>

      <div
        className="flex flex-wrap items-center gap-2 rounded-xl border px-3 py-2.5"
        style={{ background: `${COLOR}12`, borderColor: `${COLOR}35` }}
      >
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold" style={{ color: COLOR }}>
            🔄 Briefing del día
          </p>
          <p className="text-[11px] text-white/45">{etiquetaSync}</p>
          {syncMsg && (
            <p className="text-[11px] text-white/55 mt-0.5">{syncMsg}</p>
          )}
        </div>
        <button
          type="button"
          disabled={syncCargando}
          onClick={() => void sincronizar(true)}
          className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-bold text-black disabled:opacity-50"
          style={{ background: COLOR }}
        >
          {syncCargando ? '…' : 'Actualizar'}
        </button>
      </div>

      <div className="flex gap-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 rounded-xl py-2.5 text-sm font-semibold transition ${
              tab === t.id ? 'text-black' : 'bg-white/5 hover:bg-white/10'
            }`}
            style={tab === t.id ? { background: COLOR } : undefined}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'central' && <CentralTab noticias={noticias} />}
      {tab === 'resumen' && <ResumenTab noticias={noticias} />}
    </div>
  )
}
