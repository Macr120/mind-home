import { useEspaciosStore } from '../espaciosStore'
import { PanelCompartir } from './PanelCompartir'

/**
 * El panel de compartir, montado UNA vez en `App.tsx` junto a
 * `<InvitacionModal/>`: se abre desde el botón de un editor, desde la lista de
 * calendarios o desde el chat, y en varios de esos sitios el componente que lo
 * pidió se desmonta al abrirse (como pasaba con el timbre de las partidas).
 */
export function PanelCompartirGlobal() {
  const espacioId = useEspaciosStore((s) => s.panelCompartir)
  const cerrar = useEspaciosStore((s) => s.cerrarCompartir)
  if (!espacioId) return null
  // `key`: cambiar de espacio remonta el panel con su estado limpio.
  return <PanelCompartir key={espacioId} espacioId={espacioId} onCerrar={cerrar} />
}
