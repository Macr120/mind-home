import { useEffect, useState } from 'react'
import {
  gratitudDiariaRepo,
  registroAnimoRepo,
  sesionesMindfulnessRepo,
} from '../../core/data/repository'
import { DiarioTab } from './DiarioTab'
import { HoyTab } from './HoyTab'
import { MetasTab } from './MetasTab'
import { PracticarTab } from './PracticarTab'
import { ResumenTab } from './ResumenTab'
import { hoyISO } from './fecha'
import { usePerfilMindfulness } from './usePerfil'
import { sembrarJardin } from './seed'

type Tab = 'hoy' | 'practicar' | 'diario' | 'resumen' | 'metas'

const TABS: { id: Tab; label: string }[] = [
  { id: 'hoy', label: '🌿 Hoy' },
  { id: 'practicar', label: '🧘 Practicar' },
  { id: 'diario', label: '📔 Diario' },
  { id: 'resumen', label: '📊 Resumen' },
  { id: 'metas', label: '⚙️' },
]

export function JardinApp() {
  const [tab, setTab] = useState<Tab>('hoy')
  const perfil = usePerfilMindfulness()
  const sesiones = sesionesMindfulnessRepo.useAll() ?? []
  const animos = registroAnimoRepo.useAll() ?? []
  const gratitudes = gratitudDiariaRepo.useAll() ?? []

  const hoy = hoyISO()
  const animoHoy = animos.find((a) => a.fecha === hoy)
  const gratitudHoy = gratitudes.find((g) => g.fecha === hoy)
  const objetivoMin = perfil?.minutosDiariosObjetivo ?? 10

  useEffect(() => {
    void sembrarJardin()
  }, [])

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <p className="text-xs text-white/45 leading-relaxed">
        Tu espacio de calma: meditación, respiración guiada, sueño, gratitud y seguimiento
        del ánimo — como Headspace y Calm, en tu casa Mind Home.
      </p>

      <div className="flex gap-1.5 overflow-x-auto pb-0.5">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`shrink-0 rounded-xl px-3 py-2 text-sm font-semibold transition ${
              tab === t.id ? 'bg-emerald-400 text-black' : 'bg-white/5 hover:bg-white/10'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'hoy' && (
        <HoyTab
          sesiones={sesiones}
          animoHoy={animoHoy}
          gratitudHoy={gratitudHoy}
          objetivoMin={objetivoMin}
        />
      )}
      {tab === 'practicar' && <PracticarTab />}
      {tab === 'diario' && <DiarioTab sesiones={sesiones} animos={animos} />}
      {tab === 'resumen' && (
        <ResumenTab sesiones={sesiones} objetivoMin={objetivoMin} />
      )}
      {tab === 'metas' && perfil && <MetasTab perfil={perfil} />}
    </div>
  )
}
