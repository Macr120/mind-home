import { Html } from '@react-three/drei'
import { EMOCIONES } from '../chat/emociones'
import { useEmocionActiva } from '../state/emocionesStore'
import { Icono } from '../ui/iconos/Icono'

/**
 * Burbuja con el emoji de la emoción activa sobre la cabeza del asistente: la
 * señal legible universal de la reacción (sirve para formas sin rostro dibujado,
 * rostro-foto y la vista isométrica lejana). Sin emoción no pinta nada.
 */
export function ReaccionEmoji({ asistenteId, altura }: { asistenteId: string; altura: number }) {
  const emocion = useEmocionActiva(asistenteId)
  if (!emocion) return null
  return (
    // zIndexRange tope 30 (capa "mapa"): que nunca tape los paneles del HUD.
    <Html center position={[0, altura, 0]} distanceFactor={8} zIndexRange={[30, 0]}>
      <div className="ui-pop ui-panel-glass pointer-events-none rounded-full border border-white/10 px-2 py-1 text-2xl shadow-lg">
        <Icono emoji={EMOCIONES[emocion].emoji} />
      </div>
    </Html>
  )
}
