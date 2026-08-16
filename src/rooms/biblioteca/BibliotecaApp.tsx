import { useState } from 'react'
import { useT } from '../../core/i18n/useT'
import { intencionApp, tabInicial } from '../../core/state/intencionApp'
import { BarraEjemplo } from '../_shared/ejemplos/BarraEjemplo'
import { PestanasCarpeta, type ItemPestana } from '../_shared/PestanasCarpeta'
import { COLOR } from './constantes'
import { CharlasTab } from './CharlasTab'
import { ejemploBiblioteca } from './ejemplos'
import { EnciclopediaTab } from './EnciclopediaTab'
import { EstudioTab } from './EstudioTab'
import { ResumenTab } from './ResumenTab'
import { useEstudio, useAutoCierreEstudio } from './estudioStore'
import type { AnclaTema } from './arbol'

type Tab = 'charlas' | 'enciclopedia' | 'estudio' | 'resumen'

const TABS: ItemPestana<Tab>[] = [
  { id: 'charlas', icono: 'chat', labelEs: 'Charlas' },
  { id: 'enciclopedia', icono: 'cuarto-biblioteca', labelEs: 'Enciclopedia' },
  { id: 'estudio', icono: 'alarma', labelEs: 'Estudio' },
  { id: 'resumen', icono: 'progreso', labelEs: 'Resumen' },
]

export function BibliotecaApp() {
  const t = useT()
  useAutoCierreEstudio()
  const [tab, setTab] = useState<Tab>(() => tabInicial('biblioteca', TABS.map((x) => x.id), 'charlas'))
  const [plegado, setPlegado] = useState(false)
  const [charlaAbierta, setCharlaAbierta] = useState<number | 'nueva' | null>(null)
  const [borradorInicial, setBorradorInicial] = useState('')
  const [temaAncla, setTemaAncla] = useState<AnclaTema | null>(null)
  // Cambia con cada charla NUEVA: es la key de ChatCharla, para remontarla
  // limpia al encadenar charlas desde el panel 🌿 (la transición nueva→creada
  // no la toca, así el "pensando…" de la 1ª respuesta sobrevive).
  const [sesionCharla, setSesionCharla] = useState(0)
  // Qué debe enseñar la enciclopedia al entrar desde una charla: un nodo del
  // índice (enlaces a la semilla) o una entrada concreta. También llega de
  // fuera del cuarto («nodo:<id>» / «entrada:<id>» en la intención de la app).
  const [foco, setFoco] = useState<{ nodoId?: string; entradaId?: number } | null>(() => {
    const dato = intencionApp('biblioteca')?.dato ?? ''
    if (dato.startsWith('nodo:')) return { nodoId: dato.slice(5) }
    if (dato.startsWith('entrada:')) return { entradaId: Number(dato.slice(8)) }
    return null
  })
  const estudioActivo = useEstudio((s) => s.activa)

  /** Abre una charla (o una nueva, prellenada y/o anclada a un tema del árbol). */
  const abrirCharla = (id: number | 'nueva', borrador = '', ancla: AnclaTema | null = null) => {
    setBorradorInicial(borrador)
    setTemaAncla(ancla)
    if (id === 'nueva') setSesionCharla((s) => s + 1)
    setCharlaAbierta(id)
    setPlegado(false)
    setTab('charlas')
  }

  /** Salta a la enciclopedia enseñando ese nodo del árbol o esa entrada. */
  const irAEnciclopedia = (f: { nodoId?: string; entradaId?: number }) => {
    setFoco(f)
    setPlegado(false)
    setTab('enciclopedia')
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <p className="text-xs leading-relaxed text-white/45">
        {t('biblioteca.desc', 'Tu enciclopedia personal: charla con el Sabio sobre cualquier tema, guarda lo aprendido por campo del conocimiento y estudia con temporizador.')}
      </p>

      <PestanasCarpeta
        items={TABS.map((x) =>
          x.id === 'estudio' && estudioActivo
            ? {
                ...x,
                extra: (
                  <span className="ms-1 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-current align-middle" />
                ),
              }
            : x,
        )}
        activo={tab}
        onCambio={setTab}
        prefijoClave="biblioteca.tab"
        color={COLOR}
        variante="raiz"
        plegado={plegado}
        onAlternarPliegue={() => setPlegado((v) => !v)}
      />

      {!plegado && (
        <>
          {tab === 'charlas' && (
            <CharlasTab
              abierta={charlaAbierta}
              onAbrir={(id) => abrirCharla(id)}
              onCerrar={() => setCharlaAbierta(null)}
              borradorInicial={borradorInicial}
              anclaInicial={temaAncla}
              sesion={sesionCharla}
              onIrANodo={(nodoId) => irAEnciclopedia({ nodoId })}
              onVerEntrada={(entradaId) => irAEnciclopedia({ entradaId })}
            />
          )}
          {tab === 'enciclopedia' && (
            <EnciclopediaTab
              onConversar={(texto, ancla) => abrirCharla('nueva', texto, ancla ?? null)}
              onAbrirCharla={(id) => abrirCharla(id)}
              foco={foco}
              onFocoUsado={() => setFoco(null)}
            />
          )}
          {tab === 'estudio' && <EstudioTab />}
          {tab === 'resumen' && <ResumenTab />}

          <BarraEjemplo paquete={ejemploBiblioteca} />
        </>
      )}
    </div>
  )
}
