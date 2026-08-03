import { useCallback, useEffect, useRef, useState } from 'react'
import { edicionesDiarioRepo } from '../../core/data/repository'
import { fechaLocalISO } from '../../core/fechaLocal'
import { localeActual, useT } from '../../core/i18n/useT'
import { tabInicial } from '../../core/state/intencionApp'
import { Icono } from '../../core/ui/iconos/Icono'
import type { NombreIcono } from '../../core/ui/iconos/catalogo'
import { COLOR } from './constantes'
import { marcarVisto, obtenerEdicion } from './edicion'
import { TitularesTab } from './TitularesTab'
import { EfemeridesTab } from './EfemeridesTab'
import { RepartoConfig } from './RepartoConfig'

type Tab = 'titulares' | 'efemerides'

const TABS: { id: Tab; icono: NombreIcono; labelEs: string }[] = [
  { id: 'titulares', icono: 'cuarto-diario', labelEs: 'Titulares del día' },
  { id: 'efemerides', icono: 'calendario', labelEs: 'Efemérides' },
]

function fechaLegible(): string {
  const txt = new Date().toLocaleDateString(localeActual(), {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
  return txt.charAt(0).toUpperCase() + txt.slice(1)
}

export function DiarioApp() {
  const t = useT()
  const [tab, setTab] = useState<Tab>(() => tabInicial('diario', TABS.map((x) => x.id), 'titulares'))
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [configAbierta, setConfigAbierta] = useState(false)

  // La edición se lee en vivo: el rollover de medianoche la reemplaza sola.
  const ediciones = edicionesDiarioRepo.useAll()
  const edicion = ediciones?.find((e) => e.fecha === fechaLocalISO())

  const cargar = useCallback(
    async (forzar: boolean) => {
      setCargando(true)
      setError(null)
      try {
        await obtenerEdicion(forzar)
      } catch {
        setError(
          t('diario.error', 'No se pudo conectar con las fuentes. Revisa tu internet e inténtalo de nuevo.'),
        )
      }
      setCargando(false)
    },
    [t],
  )

  const inicioHecho = useRef(false)
  useEffect(() => {
    if (inicioHecho.current) return
    inicioHecho.current = true
    void marcarVisto()
    void cargar(false)
  }, [cargar])

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold"><Icono nombre="periodico" /> {t('diario.titulo', 'El diario de hoy')}</p>
          <p className="text-[11px] text-white/45">{fechaLegible()}</p>
        </div>
        <button
          type="button"
          data-tut="diario.actualizar"
          disabled={cargando}
          onClick={() => void cargar(true)}
          className="shrink-0 rounded-lg bg-white/5 px-3 py-2 text-xs font-semibold hover:bg-white/10 disabled:opacity-50"
        >
          <Icono nombre="sincronizar" /> {cargando ? '…' : t('diario.actualizar', 'Actualizar')}
        </button>
        <button
          type="button"
          data-tut="diario.reparto"
          onClick={() => setConfigAbierta(true)}
          className="shrink-0 rounded-lg bg-white/5 px-3 py-2 text-xs font-semibold hover:bg-white/10"
          title={t('diario.reparto.titulo', 'Reparto por asistentes')}
        >
          <Icono nombre="ajustes" />
        </button>
      </div>

      <div className="flex gap-2">
        {TABS.map((tabItem) => (
          <button
            key={tabItem.id}
            data-tut={`diario.tab.${tabItem.id}`}
            onClick={() => setTab(tabItem.id)}
            className={`flex-1 rounded-xl py-2.5 text-sm font-semibold transition ${
              tab === tabItem.id ? 'text-black' : 'bg-white/5 hover:bg-white/10'
            }`}
            style={tab === tabItem.id ? { background: COLOR } : undefined}
          >
            <Icono nombre={tabItem.icono} /> {t(`diario.tab.${tabItem.id}`, tabItem.labelEs)}
          </button>
        ))}
      </div>

      {error && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2.5">
          <p className="min-w-0 flex-1 text-xs text-white/70">{error}</p>
          <button
            type="button"
            onClick={() => void cargar(true)}
            className="shrink-0 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-semibold hover:bg-white/15"
          >
            {t('diario.reintentar', 'Reintentar')}
          </button>
        </div>
      )}

      {!edicion && cargando && (
        <div className="space-y-4">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="animate-pulse overflow-hidden rounded-2xl border border-white/10 bg-white/5"
            >
              <div className="aspect-video bg-white/10" />
              <div className="space-y-2 p-3.5">
                <div className="h-3 w-1/4 rounded bg-white/10" />
                <div className="h-4 w-3/4 rounded bg-white/10" />
                <div className="h-3 w-full rounded bg-white/10" />
              </div>
            </div>
          ))}
        </div>
      )}

      {edicion && tab === 'titulares' && <TitularesTab titulares={edicion.titulares} />}
      {edicion && tab === 'efemerides' && <EfemeridesTab efemerides={edicion.efemerides} />}

      {configAbierta && <RepartoConfig onCerrar={() => setConfigAbierta(false)} />}
    </div>
  )
}
