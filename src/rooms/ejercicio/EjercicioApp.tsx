import { useEffect, useState } from 'react'
import { VACIO,
  rutinasRepo,
  sesionesEjercicioRepo,
  seriesFlexRepo,
  seriesFuerzaRepo,
} from '../../core/data/repository'
import { agendaDelDia } from './agenda'
import { FlexibilidadTab } from './FlexibilidadTab'
import { FuerzaTab } from './FuerzaTab'
import { MetasTab } from './MetasTab'
import { ResistenciaTab } from './ResistenciaTab'
import { hoyISO, nombreFecha, sumarDias } from './fecha'
import type { Periodo } from './periodo'
import { perfilEfectivo, usePerfilEjercicio } from './usePerfil'
import { sembrarEjercicio } from './seed'
import { useT } from '../../core/i18n/useT'
import { tabInicial } from '../../core/state/intencionApp'
import { PestanasCarpeta, type ItemPestana } from '../_shared/PestanasCarpeta'
import { COLOR, TIPOS } from './constantes'
import type { TipoEntrenamiento } from '../../core/data/db'

// El cronograma NO es pestaña: vive al final de Metas, que es donde se decide qué
// entrenar. El deep-link «cronograma» sigue existiendo y cae aquí (ver index.tsx).
type Tab = 'metas' | 'fuerza' | 'resistencia' | 'flexibilidad'

// Cada modalidad con su color (los mismos de TIPOS); el rosa de la app queda solo en Metas.
const colorTipo = (id: TipoEntrenamiento) => TIPOS.find((x) => x.id === id)!.color

const TABS: ItemPestana<Tab>[] = [
  { id: 'metas', icono: 'objetivo', labelEs: 'Metas' },
  { id: 'fuerza', icono: 'tab-fuerza', labelEs: 'Fuerza', color: colorTipo('fuerza') },
  { id: 'resistencia', icono: 'tab-cardio', labelEs: 'Resistencia', color: colorTipo('resistencia') },
  { id: 'flexibilidad', icono: 'cuarto-jardin', labelEs: 'Flexibilidad', color: colorTipo('flexibilidad') },
]

export function EjercicioApp() {
  const t = useT()
  const [tab, setTab] = useState<Tab>(() => tabInicial('ejercicio', TABS.map((x) => x.id), 'metas'))
  const [plegado, setPlegado] = useState(false)
  const [fecha, setFecha] = useState(hoyISO())
  // Un solo filtro para todo el cuarto: Metas y los tres «Progreso» lo comparten.
  const [periodo, setPeriodo] = useState<Periodo>('semana')

  const perfilRaw = usePerfilEjercicio()
  const perfil = perfilEfectivo(perfilRaw)
  const sesiones = sesionesEjercicioRepo.useAll() ?? VACIO
  const todasSeries = seriesFuerzaRepo.useAll() ?? VACIO
  const todasSeriesFlex = seriesFlexRepo.useAll() ?? VACIO
  // Lo agendado sale del calendario: las rutinas ya son bloques como los demás.
  const rutinas = rutinasRepo.useAll()
  const planDia = (tipo: 'fuerza' | 'resistencia' | 'flexibilidad') =>
    agendaDelDia(rutinas, tipo, fecha)

  useEffect(() => {
    void sembrarEjercicio()
  }, [])

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <PestanasCarpeta
        items={TABS}
        activo={tab}
        onCambio={setTab}
        prefijoClave="ejercicio.tab"
        color={COLOR}
        variante="raiz"
        desplazable
        plegado={plegado}
        onAlternarPliegue={() => setPlegado((v) => !v)}
      />

      {!plegado && (
        <>
          {tab !== 'metas' && (
            <div data-tut="ejercicio.fecha" className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2 border border-white/10">
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
                    className="block mx-auto text-[10px] text-rose-400 hover:underline"
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

          {tab === 'fuerza' && (
            <FuerzaTab
              fecha={fecha}
              sesiones={sesiones}
              todasSeries={todasSeries}
              planDia={planDia('fuerza')}
              metaMinutos={perfil.sesionesFuerzaSemana * 45}
              metaSesiones={perfil.sesionesFuerzaSemana}
              unidades={perfil.unidades}
              periodo={periodo}
              setPeriodo={setPeriodo}
            />
          )}
          {tab === 'resistencia' && (
            <ResistenciaTab
              fecha={fecha}
              sesiones={sesiones}
              planDia={planDia('resistencia')}
              metaMinutos={perfil.minutosResistenciaSemana}
              metaSesiones={perfil.diasActivosSemana}
              unidades={perfil.unidades}
              periodo={periodo}
              setPeriodo={setPeriodo}
            />
          )}
          {tab === 'flexibilidad' && (
            <FlexibilidadTab
              fecha={fecha}
              sesiones={sesiones}
              planDia={planDia('flexibilidad')}
              todasSeriesFlex={todasSeriesFlex}
              metaMinutos={perfil.minutosFlexibilidadSemana}
              metaSesiones={perfil.diasActivosSemana}
              periodo={periodo}
              setPeriodo={setPeriodo}
            />
          )}
          {tab === 'metas' && (
            <MetasTab
              perfil={perfilRaw}
              perfilEfectivo={perfil}
              sesiones={sesiones}
              periodo={periodo}
              setPeriodo={setPeriodo}
            />
          )}
        </>
      )}
    </div>
  )
}
