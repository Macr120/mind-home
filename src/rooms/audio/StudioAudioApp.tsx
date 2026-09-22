import { useState } from 'react'
import { intencionApp, tabInicial } from '../../core/state/intencionApp'
import { PestanasCarpeta, type ItemPestana } from '../_shared/PestanasCarpeta'
import { Albumes } from './Albumes'
import { COLOR } from './constantes'
import { EditorProyecto } from './EditorProyecto'
import { Mezclador } from './Mezclador'

type Tab = 'canciones' | 'mezclar'
const TABS: ItemPestana<Tab>[] = [
  { id: 'canciones', icono: 'piano', labelEs: 'Canciones' },
  { id: 'mezclar', icono: 'vinilo', labelEs: 'Mezclar' },
]

/** Studio de audio: las canciones (álbumes + banco de Aprender + tomas de mic) y el mezclador DJ. */
export function StudioAudioApp() {
  const [tab, setTab] = useState<Tab>(() => tabInicial('audio', TABS.map((x) => x.id), 'canciones'))
  // La intención puede traer un PROYECTO concreto (`proyecto:12`, uno compartido
  // por enlace): se abre su editor directamente.
  const [abierto, setAbierto] = useState<number | null>(() => {
    const m = /^proyecto:(\d+)$/.exec(intencionApp('audio')?.dato ?? '')
    return m ? Number(m[1]) : null
  })

  // El editor abierto ocupa el cuarto entero (las pestañas estorbarían al timeline).
  if (abierto != null) {
    return (
      <div className="h-full">
        <EditorProyecto id={abierto} alCerrar={() => setAbierto(null)} />
      </div>
    )
  }
  return (
    <div className="flex h-full flex-col gap-3">
      <div className="mx-auto w-full max-w-2xl shrink-0">
        <PestanasCarpeta items={TABS} activo={tab} onCambio={setTab} prefijoClave="audio.tab" color={COLOR} variante="raiz" />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {tab === 'canciones' && <Albumes onAbrir={setAbierto} />}
        {tab === 'mezclar' && <Mezclador />}
      </div>
    </div>
  )
}
