import { useEffect, useState } from 'react'
import { VACIO,
  aguaRepo,
  comidasRepo,
  dietasGuardadasRepo,
  itemsCompraRepo,
  listasCompraRepo,
  pesoRepo,
  planComidasRepo,
  recetasRepo,
} from '../../core/data/repository'
import { ComprasTab } from './ComprasTab'
import { DiarioTab } from './DiarioTab'
import { DietasTab } from './DietasTab'
import { MetasTab } from './MetasTab'
import { PlanSemanal } from './PlanSemanal'
import { ProgresoTab } from './ProgresoTab'
import { RecetasTab } from './RecetasTab'
import { hoyISO, nombreFecha, sumarDias } from './fecha'
import { perfilEfectivo, usePerfil } from './usePerfil'
import { sembrarCocina } from './seed'
import { claveLS } from '../../core/edicion'
import { useT } from '../../core/i18n/useT'
import { intencionApp } from '../../core/state/intencionApp'
import type { NombreIcono } from '../../core/ui/iconos/catalogo'
import { PestanasCarpeta, type ItemPestana } from '../_shared/PestanasCarpeta'
import { COLOR } from './constantes'

// 'plan' ya es la Dieta desde antes; 'diario' es el Registro (ese id lo
// guardan las rutinas de los horarios de comida y no puede cambiar).
type Tab = 'metas' | 'diario' | 'planComidas' | 'progreso' | 'plan' | 'recetas' | 'compras'
type Enfoque = 'peso' | 'recetario'

const TABS: Record<Tab, { icono: NombreIcono; labelEs: string }> = {
  metas: { icono: 'objetivo', labelEs: 'Metas' },
  diario: { icono: 'tab-diario', labelEs: 'Registro' },
  planComidas: { icono: 'calendario', labelEs: 'Plan de comidas' },
  progreso: { icono: 'progreso', labelEs: 'Progreso' },
  recetas: { icono: 'tab-recetas', labelEs: 'Recetas' },
  plan: { icono: 'calendario', labelEs: 'Dieta' },
  compras: { icono: 'tab-compras', labelEs: 'Compras' },
}

/**
 * Los dos motivos por los que se entra a la cocina. Los ids de pestaña NO
 * cambian aunque cambie la etiqueta: `rutinas.seccion` los guarda al agendar un
 * horario de comida y el calendario abre la app con ese string. El enfoque de
 * alimentación es un flujo de 4 pasos: metas → registro → plan de comidas →
 * progreso. Registro es lo que ya pasó (comidas, agua, peso); Plan de comidas
 * es lo que viene (la rejilla semanal).
 */
const ENFOQUES: (ItemPestana<Enfoque> & { tabs: Tab[] })[] = [
  // El recetario va primero: manda el plan y de ahí salen las recetas y la compra.
  { id: 'recetario', icono: 'tab-recetas', labelEs: 'Recetario', tabs: ['plan', 'recetas', 'compras'] },
  {
    id: 'peso',
    icono: 'balanza',
    labelEs: 'Control de alimentación',
    tabs: ['metas', 'diario', 'planComidas', 'progreso'],
  },
]

const TODAS = ENFOQUES.flatMap((e) => e.tabs)
const CLAVE_ENFOQUE = claveLS('mh.cocina.enfoque')

const enfoqueDe = (tab: Tab): Enfoque => ENFOQUES.find((e) => e.tabs.includes(tab))!.id

/**
 * Pestañas que navegan por fecha (muestran la barra ‹ hoy ›). El plan de comidas
 * NO está: tiene su propio navegador de calendario (día/3 días/semana/mes) y dos
 * cursores de fecha en la misma pantalla solo confundirían.
 */
const TABS_CON_FECHA: Tab[] = ['diario']

/** Manda la intención del chat; si no la hay, el último enfoque que usaste. */
function tabDeArranque(): Tab {
  const seccion = intencionApp('cocina')?.seccion
  // Compat: la pestaña 'cronograma' vive ahora dentro de Metas.
  if (seccion === 'cronograma') return 'metas'
  if (seccion && TODAS.includes(seccion as Tab)) return seccion as Tab
  const guardado = localStorage.getItem(CLAVE_ENFOQUE)
  // El fallback sigue al primer enfoque: si mañana cambia el orden, no hay que tocar esto.
  return ENFOQUES.find((e) => e.id === guardado)?.tabs[0] ?? ENFOQUES[0].tabs[0]
}

export function CocinaApp() {
  const t = useT()
  const [tab, setTab] = useState<Tab>(tabDeArranque)
  const [plegado, setPlegado] = useState(false)
  const [fecha, setFecha] = useState(hoyISO())
  const enfoque = enfoqueDe(tab)

  const perfilRaw = usePerfil()
  const perfil = perfilEfectivo(perfilRaw)
  const comidas = comidasRepo.useAll() ?? VACIO
  const agua = aguaRepo.useAll() ?? VACIO
  // `undefined` = Dexie aún resolviendo: el recetario distingue cargando de vacío.
  const recetasQ = recetasRepo.useAll()
  const recetas = recetasQ ?? VACIO
  const dietas = dietasGuardadasRepo.useAll() ?? VACIO
  const itemsCompra = itemsCompraRepo.useAll() ?? VACIO
  const listasCompra = listasCompraRepo.useAll() ?? VACIO
  const pesos = pesoRepo.useAll() ?? VACIO
  const plan = planComidasRepo.useAll() ?? VACIO

  const aguaDia = agua.filter((a) => a.fecha === fecha).reduce((s, a) => s + a.ml, 0)

  useEffect(() => {
    void sembrarCocina()
  }, [])

  const cambiarEnfoque = (id: Enfoque) => {
    localStorage.setItem(CLAVE_ENFOQUE, id)
    setTab(ENFOQUES.find((e) => e.id === id)!.tabs[0])
  }

  // En el control de alimentación las pestañas son pasos: se numeran (label ya resuelto, misma clave i18n).
  const subItems: ItemPestana<Tab>[] = ENFOQUES.find((e) => e.id === enfoque)!.tabs.map((id, i) => ({
    id,
    icono: TABS[id].icono,
    labelEs: TABS[id].labelEs,
    ...(enfoque === 'peso' && { label: `${i + 1} · ${t(`cocina.tab.${id}`, TABS[id].labelEs)}` }),
  }))

  return (
    <div className="mx-auto max-w-2xl space-y-3">
      <PestanasCarpeta
        items={ENFOQUES}
        activo={enfoque}
        onCambio={cambiarEnfoque}
        prefijoClave="cocina.enfoque"
        color={COLOR}
        variante="raiz"
        plegado={plegado}
        onAlternarPliegue={() => setPlegado((v) => !v)}
      />

      {!plegado && (
        <>
          <PestanasCarpeta
            items={subItems}
            activo={tab}
            onCambio={setTab}
            prefijoClave="cocina.tab"
            color={COLOR}
            variante="sub"
          />

          {TABS_CON_FECHA.includes(tab) && (
            <div data-tut="cocina.fecha" className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2 border border-white/10">
              <button
                type="button"
                onClick={() => setFecha((f) => sumarDias(f, -1))}
                className="rounded-lg px-3 py-1 text-lg hover:bg-white/10"
              >
                ‹
              </button>
              <div className="text-center">
                <span className="font-semibold capitalize">{nombreFecha(fecha)}</span>
                {fecha !== hoyISO() && (
                  <button
                    type="button"
                    onClick={() => setFecha(hoyISO())}
                    className="block mx-auto text-[10px] text-amber-400 hover:underline"
                  >
                    {t('nav.irHoy', 'Ir a hoy')}
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => setFecha((f) => sumarDias(f, 1))}
                className="rounded-lg px-3 py-1 text-lg hover:bg-white/10"
              >
                ›
              </button>
            </div>
          )}

          {tab === 'metas' && <MetasTab perfil={perfilRaw} />}
          {tab === 'diario' && (
            <DiarioTab
              fecha={fecha}
              comidas={comidas}
              recetas={recetas}
              aguaMl={aguaDia}
              pesos={pesos}
              perfil={perfil}
            />
          )}
          {tab === 'planComidas' && (
            <PlanSemanal recetas={recetas} dietas={dietas} plan={plan} comidas={comidas} perfil={perfil} />
          )}
          {tab === 'progreso' && (
            <ProgresoTab
              comidas={comidas}
              agua={agua}
              pesos={pesos}
              perfil={perfil}
              perfilRaw={perfilRaw}
              onIrAMetas={() => {
                setPlegado(false)
                setTab('metas')
              }}
            />
          )}
          {tab === 'plan' && <DietasTab dietas={dietas} recetas={recetas} />}
          {tab === 'recetas' && <RecetasTab recetas={recetas} dietas={dietas} cargando={recetasQ === undefined} />}
          {tab === 'compras' && <ComprasTab items={itemsCompra} listas={listasCompra} />}
        </>
      )}
    </div>
  )
}
