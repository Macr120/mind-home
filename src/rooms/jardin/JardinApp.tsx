import { useCallback, useState } from 'react'
import { gratitudDiariaRepo, sesionesMindfulnessRepo } from '../../core/data/repository'
import { useT } from '../../core/i18n/useT'
import { tabInicial } from '../../core/state/intencionApp'
import { Icono } from '../../core/ui/iconos/Icono'
import type { NombreIcono } from '../../core/ui/iconos/catalogo'
import { AgradecimientosTab } from './AgradecimientosTab'
import { CalmaHeader } from './CalmaHeader'
import { MeditacionTab } from './MeditacionTab'
import { RespiracionTab } from './RespiracionTab'

type Tab = 'meditacion' | 'respiracion' | 'gratitud'

const TABS: { id: Tab; icono: NombreIcono; labelEs: string }[] = [
  { id: 'meditacion', icono: 'cuarto-jardin', labelEs: 'Meditación' },
  { id: 'respiracion', icono: 'respiracion', labelEs: 'Respiración' },
  { id: 'gratitud', icono: 'gratitud', labelEs: 'Agradecimientos' },
]

export function JardinApp() {
  const t = useT()
  const [tab, setTab] = useState<Tab>(() => tabInicial('jardin', TABS.map((x) => x.id), 'meditacion'))
  // Con una sesión en curso se ocultan cabecera y tabs (modo inmersivo).
  const [enSesion, setEnSesion] = useState(false)
  const onSesion = useCallback((activa: boolean) => setEnSesion(activa), [])
  const sesiones = sesionesMindfulnessRepo.useAll() ?? []
  const gratitudes = gratitudDiariaRepo.useAll() ?? []

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      {!enSesion && (
        <>
          <p className="text-xs text-white/45 leading-relaxed">
            {t(
              'jardin.desc',
              'Tu espacio de calma: meditaciones guiadas, respiración y agradecimientos. Sin puntos ni rachas — el jardín solo crece.',
            )}
          </p>

          <CalmaHeader sesiones={sesiones} gratitudes={gratitudes} />

          <div className="flex gap-1.5 overflow-x-auto pb-0.5">
            {TABS.map((tabItem) => (
              <button
                key={tabItem.id}
                data-tut={`jardin.tab.${tabItem.id}`}
                onClick={() => setTab(tabItem.id)}
                className={`shrink-0 rounded-xl px-3 py-2 text-sm font-semibold transition ${
                  tab === tabItem.id ? 'bg-emerald-600 texto-cta' : 'bg-white/5 hover:bg-white/10'
                }`}
              >
                <Icono nombre={tabItem.icono} /> {t(`jardin.tab.${tabItem.id}`, tabItem.labelEs)}
              </button>
            ))}
          </div>
        </>
      )}

      {tab === 'meditacion' && <MeditacionTab onSesion={onSesion} />}
      {tab === 'respiracion' && <RespiracionTab onSesion={onSesion} />}
      {tab === 'gratitud' && <AgradecimientosTab />}
    </div>
  )
}
