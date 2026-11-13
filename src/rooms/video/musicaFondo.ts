import { MOODS_LISTA } from '../../core/audio/temas'
import type { ClipMusica, ClipVideo } from '../../core/data/db'
import { tGlobal } from '../../core/i18n/useT'
import type { MoodMusica } from '../../core/state/ajustesStore'
import { nuevoClipId } from './constantes'
import { finPrincipal } from './modelo'
import { traerRecurso } from './traerRecurso'

/**
 * Música de fondo para todo el video: uno de los vibes de la música ambiental
 * (el motor del Studio de audio lo renderiza; la copia se reutiliza si ya se
 * trajo) en bucle, con `agachar` para que baje sola bajo la voz. Gratis.
 * null si el Studio de audio no está disponible o el render falla.
 */
export async function musicaDeFondo(
  vibe: MoodMusica,
  volumen: number,
  clips: ClipVideo[],
): Promise<{ clip: ClipMusica; nombre: string } | null> {
  const nombre = tGlobal(`ajustes.musica.mood.${vibe}`, MOODS_LISTA.find((m) => m.id === vibe)?.defecto ?? vibe)
  const traido = await traerRecurso('audio', { clave: `vibe:${vibe}`, tipo: 'audio', nombre, actualizadoEn: 'vibe' }).catch(() => null)
  if (traido?.tipo !== 'medio') return null
  const duracion = finPrincipal(clips)
  if (duracion <= 0) return null
  return {
    nombre,
    clip: { id: nuevoClipId(), pista: 'musica', inicio: 0, duracion, medioId: traido.medio.id, volumen, bucle: true, agachar: true },
  }
}
