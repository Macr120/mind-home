import { useState } from 'react'
import { VACIO, mediaArchivoRepo } from '../../core/data/repository'
import { ArchivoTab } from './ArchivoTab'
import { JuegosMesaTab } from './JuegosMesaTab'
import type { IdJuegoReal } from './juegos/catalogo'
import { useT } from '../../core/i18n/useT'
import { intencionApp } from '../../core/state/intencionApp'
import { PestanasCarpeta, type ItemPestana } from '../_shared/PestanasCarpeta'
import { COLOR } from './constantes'

type Tab = 'archivo' | 'mesa'

const TABS: ItemPestana<Tab>[] = [
  { id: 'mesa', icono: 'dados', labelEs: 'Juegos de mesa' },
  { id: 'archivo', icono: 'serie', labelEs: 'Archivo' },
]

export function EntretenimientoApp() {
  const t = useT()
  // Intención del chat («quiero jugar la viborita»): pestaña + juego inicial.
  // Se limpia al cambiar de pestaña a mano para no reabrir el juego.
  const [intencion, setIntencion] = useState(() => intencionApp('entretenimiento'))
  const [tab, setTab] = useState<Tab>(() => (intencion?.seccion === 'archivo' ? 'archivo' : 'mesa'))
  const [plegado, setPlegado] = useState(false)
  const media = mediaArchivoRepo.useAll() ?? VACIO

  return (
    // El Archivo despliega sus tarjetas en rejilla: usa todo el ancho disponible.
    <div className={`mx-auto space-y-4 ${tab === 'archivo' ? '' : 'max-w-2xl'}`}>
      <p className="text-xs text-white/45 leading-relaxed">
        {t('entre.desc', 'Películas, series, libros, videojuegos y juegos de mesa para jugar — todo en la sala de entretenimiento. Tus datos del archivo anterior se conservan aquí.')}
      </p>

      <PestanasCarpeta
        items={TABS}
        activo={tab}
        onCambio={(id) => {
          setTab(id)
          setIntencion(null)
        }}
        prefijoClave="entre.tab"
        color={COLOR}
        prefijoTut="entretenimiento.tab"
        variante="raiz"
        plegado={plegado}
        onAlternarPliegue={() => setPlegado((v) => !v)}
      />

      {!plegado && (
        <>
          {tab === 'archivo' && <ArchivoTab items={media} />}
          {tab === 'mesa' && <JuegosMesaTab juegoInicial={intencion?.dato as IdJuegoReal | undefined} />}
        </>
      )}
    </div>
  )
}
