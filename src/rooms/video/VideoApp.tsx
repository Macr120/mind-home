import { useEffect, useState } from 'react'
import { useAjustes } from '../../core/state/ajustesStore'
import { intencionApp, tabInicial } from '../../core/state/intencionApp'
import { usePelicula } from '../../core/state/peliculaStore'
import { BarraEjemplo } from '../_shared/ejemplos/BarraEjemplo'
import { PestanasCarpeta, type ItemPestana } from '../_shared/PestanasCarpeta'
import { ClipearMomentos } from './ClipearMomentos'
import { COLOR } from './constantes'
import { Editor } from './Editor'
import { ejemploAnimacion3d } from './ejemplos'
import { ejemploVideo, sembrarPromo } from './promo'
import { ProyectosTab } from './ProyectosTab'

type Tab = 'videos' | 'animacion3d'

const TABS: ItemPestana<Tab>[] = [
  { id: 'videos', icono: 'pelicula', labelEs: 'Videos' },
  { id: 'animacion3d', icono: 'cubo-vistas', labelEs: 'Animación 3D' },
]

/**
 * Studio de video: los videos (el editor ocupa el cuarto) y las animaciones 3D,
 * que se ruedan en el mapa con los personajes («Modo película»: el cuarto se
 * cierra y el editor se monta encima de la casa). La biblioteca de medios vive
 * dentro del editor.
 */
export function VideoApp() {
  const [tab, setTab] = useState<Tab>(() =>
    tabInicial(
      'video',
      TABS.map((x) => x.id),
      'videos',
    ),
  )
  // «proyecto:12» en la intención: la vuelta de una grabación de la app abre su proyecto directo.
  const [abierto, setAbierto] = useState<number | null>(() => {
    const m = /^proyecto:(\d+)$/.exec(intencionApp('video')?.dato ?? '')
    return m ? Number(m[1]) : null
  })

  // El anuncio de fábrica sale en el idioma activo; si cambia y nadie lo tocó, se rehace en el nuevo.
  const idioma = useAjustes((s) => s.idioma)
  useEffect(() => {
    void sembrarPromo()
  }, [idioma])

  // «Clipear momentos importantes» (desde la lista o desde el editor): cada clip es un proyecto nuevo.
  const [clipear, setClipear] = useState<{ medioId?: number } | null>(null)
  /** El proyecto abierto viene de «Clipear → Editar con IA»: el editor abre esa IA al cargar. */
  const [iaAlAbrir, setIaAlAbrir] = useState(false)
  const modalClipear = clipear && (
    <ClipearMomentos
      medioInicial={clipear.medioId}
      onCerrar={() => setClipear(null)}
      onAbrir={(id, conIA) => {
        setClipear(null)
        setIaAlAbrir(conIA)
        setAbierto(id)
      }}
    />
  )

  if (abierto != null) {
    return (
      <>
        <Editor
          key={abierto}
          id={abierto}
          alCerrar={() => setAbierto(null)}
          onClipear={(medioId) => setClipear({ medioId })}
          editarIAAlAbrir={iaAlAbrir}
        />
        {modalClipear}
      </>
    )
  }

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="mx-auto w-full max-w-2xl shrink-0">
        <PestanasCarpeta items={TABS} activo={tab} onCambio={setTab} prefijoClave="video.tab" color={COLOR} variante="raiz" />
      </div>
      {tab === 'videos' ? (
        <>
          <ProyectosTab
            escenario="video"
            onAbrir={(id) => {
              setIaAlAbrir(false)
              setAbierto(id)
            }}
            onClipear={() => setClipear({})}
          />
          {modalClipear}
          {/* Al pie de la lista. Aquí y no en ProyectosTab: esa la carga también el Modo película. */}
          <div className="mx-auto w-full max-w-2xl shrink-0 empty:hidden">
            <BarraEjemplo paquete={ejemploVideo} />
          </div>
        </>
      ) : (
        <>
          <ProyectosTab escenario="3d" onAbrir={(id) => usePelicula.getState().entrar(id)} />
          <div className="mx-auto w-full max-w-2xl shrink-0 empty:hidden">
            <BarraEjemplo paquete={ejemploAnimacion3d} />
          </div>
        </>
      )}
    </div>
  )
}
