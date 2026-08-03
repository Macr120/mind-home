import { useState } from 'react'
import { claveLS } from '../../core/edicion'
import { useT } from '../../core/i18n/useT'
import { tabInicial } from '../../core/state/intencionApp'
import { Icono } from '../../core/ui/iconos/Icono'
import type { NombreIcono } from '../../core/ui/iconos/catalogo'
import { idiomasRepo } from '../../core/data/repository'
import { BarraEjemplo } from '../_shared/ejemplos/BarraEjemplo'
import { COLOR } from './constantes'
import { ejemploIdiomas } from './ejemplos'
import { AltaIdioma, SelectorIdiomas } from './SelectorIdiomas'
import { CharlasTab } from './CharlasTab'
import { RepasoTab } from './RepasoTab'
import { VocabularioTab } from './VocabularioTab'
import { TemarioTab } from './TemarioTab'
import { ProgresoTab } from './ProgresoTab'
import type { AnclaTema } from './arbol'

type Tab = 'charlas' | 'repaso' | 'vocabulario' | 'temario' | 'progreso'

const TABS: { id: Tab; icono: NombreIcono; labelEs: string }[] = [
  { id: 'charlas', icono: 'chat', labelEs: 'Charlas' },
  { id: 'repaso', icono: 'repetir', labelEs: 'Repaso' },
  { id: 'vocabulario', icono: 'registros', labelEs: 'Vocabulario' },
  { id: 'temario', icono: 'idiomas', labelEs: 'Temario' },
  { id: 'progreso', icono: 'progreso', labelEs: 'Progreso' },
]

const LS_IDIOMA = claveLS('mh.idiomaActivo')

export function IdiomasApp() {
  const t = useT()
  const idiomas = idiomasRepo.useAll() ?? []
  const [idiomaActivoId, setIdiomaActivoId] = useState<number | null>(() => {
    const v = localStorage.getItem(LS_IDIOMA)
    return v ? Number(v) : null
  })
  const [tab, setTab] = useState<Tab>(() => tabInicial('idiomas', TABS.map((x) => x.id), 'charlas'))
  const [charlaAbierta, setCharlaAbierta] = useState<number | 'nueva' | null>(null)
  const [borradorInicial, setBorradorInicial] = useState('')
  const [temaAncla, setTemaAncla] = useState<AnclaTema | null>(null)
  // Cambia con cada charla NUEVA: es la key de ChatTutor, para remontarla limpia.
  const [sesionCharla, setSesionCharla] = useState(0)
  // Filtro de tema al saltar del temario al vocabulario (🃏 de un tema).
  const [temaVocab, setTemaVocab] = useState<string | null>(null)

  const perfil = idiomas.find((i) => i.id === idiomaActivoId) ?? idiomas[0]

  const elegirIdioma = (id: number) => {
    setIdiomaActivoId(id)
    localStorage.setItem(LS_IDIOMA, String(id))
    setCharlaAbierta(null)
    setTemaVocab(null)
  }

  /** Abre una charla (o una nueva, prellenada y/o anclada a un tema del temario). */
  const abrirCharla = (id: number | 'nueva', borrador = '', ancla: AnclaTema | null = null) => {
    setBorradorInicial(borrador)
    setTemaAncla(ancla)
    if (id === 'nueva') setSesionCharla((s) => s + 1)
    setCharlaAbierta(id)
    setTab('charlas')
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <p className="text-xs leading-relaxed text-white/45">
        {t('idiomas.desc', 'Tu escuela de idiomas: charla con tu tutor, junta vocabulario y domínalo con repaso espaciado, ejercicios y un temario por niveles.')}
      </p>

      {idiomas.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="mb-3 text-sm font-semibold">
            {t('idiomas.onboarding', '¿Qué idioma quieres aprender?')}
          </p>
          <AltaIdioma existentes={idiomas} onCreado={elegirIdioma} />
        </div>
      ) : (
        <>
          <SelectorIdiomas idiomas={idiomas} activoId={perfil?.id ?? null} onElegir={elegirIdioma} />

          <div className="flex gap-1.5">
            {TABS.map((tabItem) => (
              <button
                key={tabItem.id}
                data-tut={`idiomas.tab.${tabItem.id}`}
                onClick={() => setTab(tabItem.id)}
                className={`flex-1 rounded-xl px-1 py-2.5 text-xs font-semibold transition ${
                  tab === tabItem.id ? 'text-black' : 'bg-white/5 hover:bg-white/10'
                }`}
                style={tab === tabItem.id ? { background: COLOR } : undefined}
              >
                <Icono nombre={tabItem.icono} /> {t(`idiomas.tab.${tabItem.id}`, tabItem.labelEs)}
              </button>
            ))}
          </div>

          {perfil && (
            <>
              {tab === 'charlas' && (
                <CharlasTab
                  perfil={perfil}
                  abierta={charlaAbierta}
                  onAbrir={(id) => abrirCharla(id)}
                  onCerrar={() => setCharlaAbierta(null)}
                  borradorInicial={borradorInicial}
                  anclaInicial={temaAncla}
                  sesion={sesionCharla}
                />
              )}
              {tab === 'repaso' && <RepasoTab perfil={perfil} />}
              {tab === 'vocabulario' && (
                <VocabularioTab
                  perfil={perfil}
                  temaInicial={temaVocab}
                  onTemaAplicado={() => setTemaVocab(null)}
                />
              )}
              {tab === 'temario' && (
                <TemarioTab
                  perfil={perfil}
                  onConversar={(ancla, borrador) => abrirCharla('nueva', borrador, ancla)}
                  onVerTarjetas={(temaId) => {
                    setTemaVocab(temaId)
                    setTab('vocabulario')
                  }}
                />
              )}
              {tab === 'progreso' && <ProgresoTab perfil={perfil} />}
            </>
          )}
        </>
      )}

      {/* Fuera del condicional: sin ningún idioma dado de alta es cuando más
          falta hace ver la app llena. */}
      <BarraEjemplo paquete={ejemploIdiomas} />
    </div>
  )
}
