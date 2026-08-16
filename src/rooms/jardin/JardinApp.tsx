import { useCallback, useState } from 'react'
import { VACIO, gratitudDiariaRepo, sesionesMindfulnessRepo } from '../../core/data/repository'
import { useT } from '../../core/i18n/useT'
import { tabInicial } from '../../core/state/intencionApp'
import { BarraEjemplo } from '../_shared/ejemplos/BarraEjemplo'
import { PestanasCarpeta, type ItemPestana } from '../_shared/PestanasCarpeta'
import { COLOR } from './constantes'
import { AgradecimientosTab } from './AgradecimientosTab'
import { CalmaHeader } from './CalmaHeader'
import { ejemploJardin } from './ejemplos'
import { MeditacionTab } from './MeditacionTab'
import { RespiracionTab } from './RespiracionTab'

type Tab = 'meditacion' | 'respiracion' | 'gratitud'

const TABS: ItemPestana<Tab>[] = [
  { id: 'meditacion', icono: 'cuarto-jardin', labelEs: 'Meditación' },
  { id: 'respiracion', icono: 'respiracion', labelEs: 'Respiración' },
  { id: 'gratitud', icono: 'gratitud', labelEs: 'Agradecimientos' },
]

export function JardinApp() {
  const t = useT()
  const [tab, setTab] = useState<Tab>(() => tabInicial('jardin', TABS.map((x) => x.id), 'meditacion'))
  const [plegado, setPlegado] = useState(false)
  // Con una sesión en curso se ocultan cabecera y tabs (modo inmersivo).
  const [enSesion, setEnSesion] = useState(false)
  const onSesion = useCallback((activa: boolean) => setEnSesion(activa), [])
  const sesiones = sesionesMindfulnessRepo.useAll() ?? VACIO
  const gratitudes = gratitudDiariaRepo.useAll() ?? VACIO

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      {!enSesion && (
        <>
          <p className="text-xs text-white/45 leading-relaxed">
            {t(
              'jardin.desc',
              'Tu espacio de calma: meditación con pistas de sonido, respiración y agradecimientos. Sin puntos ni rachas — el jardín solo crece.',
            )}
          </p>

          <div data-tut="jardin.calma">
            <CalmaHeader sesiones={sesiones} gratitudes={gratitudes} />
          </div>

          <PestanasCarpeta
            items={TABS}
            activo={tab}
            onCambio={setTab}
            prefijoClave="jardin.tab"
            color={COLOR}
            variante="raiz"
            desplazable
            plegado={plegado}
            onAlternarPliegue={() => setPlegado((v) => !v)}
          />
        </>
      )}

      {!plegado && (
        <>
          {tab === 'meditacion' && <MeditacionTab onSesion={onSesion} sesiones={sesiones} />}
          {tab === 'respiracion' && <RespiracionTab onSesion={onSesion} />}
          {tab === 'gratitud' && <AgradecimientosTab />}

          {/* El ejemplo trae prácticas Y agradecimientos: la barra vale para las tres pestañas. */}
          <BarraEjemplo paquete={ejemploJardin} />
        </>
      )}
    </div>
  )
}
