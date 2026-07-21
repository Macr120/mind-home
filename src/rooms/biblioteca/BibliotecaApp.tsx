import { useState } from 'react'
import { useT } from '../../core/i18n/useT'
import { tabInicial } from '../../core/state/intencionApp'
import { Icono } from '../../core/ui/iconos/Icono'
import type { NombreIcono } from '../../core/ui/iconos/catalogo'
import { COLOR } from './constantes'
import { CharlasTab } from './CharlasTab'
import { EnciclopediaTab } from './EnciclopediaTab'
import { EstudioTab } from './EstudioTab'
import { ResumenTab } from './ResumenTab'
import { useEstudio, useAutoCierreEstudio } from './estudioStore'
import type { AnclaTema } from './arbol'

type Tab = 'charlas' | 'enciclopedia' | 'estudio' | 'resumen'

const TABS: { id: Tab; icono: NombreIcono; labelEs: string }[] = [
  { id: 'charlas', icono: 'chat', labelEs: 'Charlas' },
  { id: 'enciclopedia', icono: 'cuarto-biblioteca', labelEs: 'Enciclopedia' },
  { id: 'estudio', icono: 'alarma', labelEs: 'Estudio' },
  { id: 'resumen', icono: 'progreso', labelEs: 'Resumen' },
]

export function BibliotecaApp() {
  const t = useT()
  useAutoCierreEstudio()
  const [tab, setTab] = useState<Tab>(() => tabInicial('biblioteca', TABS.map((x) => x.id), 'charlas'))
  const [charlaAbierta, setCharlaAbierta] = useState<number | 'nueva' | null>(null)
  const [borradorInicial, setBorradorInicial] = useState('')
  const [temaAncla, setTemaAncla] = useState<AnclaTema | null>(null)
  // Cambia con cada charla NUEVA: es la key de ChatCharla, para remontarla
  // limpia al encadenar charlas desde el panel 🌿 (la transición nueva→creada
  // no la toca, así el "pensando…" de la 1ª respuesta sobrevive).
  const [sesionCharla, setSesionCharla] = useState(0)
  const estudioActivo = useEstudio((s) => s.activa)

  /** Abre una charla (o una nueva, prellenada y/o anclada a un tema del árbol). */
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
        {t('biblioteca.desc', 'Tu enciclopedia personal: charla con el Sabio sobre cualquier tema, guarda lo aprendido por campo del conocimiento y estudia con temporizador.')}
      </p>

      <div className="flex gap-2">
        {TABS.map((tabItem) => (
          <button
            key={tabItem.id}
            data-tut={`biblioteca.tab.${tabItem.id}`}
            onClick={() => setTab(tabItem.id)}
            className={`flex-1 rounded-xl py-2.5 text-sm font-semibold transition ${
              tab === tabItem.id ? 'text-black' : 'bg-white/5 hover:bg-white/10'
            }`}
            style={tab === tabItem.id ? { background: COLOR } : undefined}
          >
            <Icono nombre={tabItem.icono} /> {t(`biblioteca.tab.${tabItem.id}`, tabItem.labelEs)}
            {tabItem.id === 'estudio' && estudioActivo && (
              <span className="ml-1 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-current align-middle" />
            )}
          </button>
        ))}
      </div>

      {tab === 'charlas' && (
        <CharlasTab
          abierta={charlaAbierta}
          onAbrir={(id) => abrirCharla(id)}
          onCerrar={() => setCharlaAbierta(null)}
          borradorInicial={borradorInicial}
          anclaInicial={temaAncla}
          sesion={sesionCharla}
          onCharlaNueva={(ancla, borrador) => abrirCharla('nueva', borrador, ancla)}
        />
      )}
      {tab === 'enciclopedia' && (
        <EnciclopediaTab
          onConversar={(texto, ancla) => abrirCharla('nueva', texto, ancla ?? null)}
          onAbrirCharla={(id) => abrirCharla(id)}
        />
      )}
      {tab === 'estudio' && <EstudioTab />}
      {tab === 'resumen' && <ResumenTab />}
    </div>
  )
}
