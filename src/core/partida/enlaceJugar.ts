/**
 * Enlace a un juego de mesa abierto en frío (`?jugar=<sala>&juego=<j>`, lo arma
 * `enlaceJuego`): se une a la sala y abre la mesa en la casa PROPIA. A
 * diferencia de la cancha o el paintball, no hay visita: cada quien juega desde
 * su cuenta.
 */
import { esperarSesion } from '../cuenta/sesionStore'
import { irAlJuego } from './irAlJuego'
import { esJuegoInvitable } from './juegosInvitables'
import { entrarYConectar } from './sala'

export async function unirseDesdeEnlace(): Promise<void> {
  const url = new URL(location.href)
  const partidaId = url.searchParams.get('jugar')
  const juego = url.searchParams.get('juego')
  // Se limpia ya: una recarga no debe volver a unirse.
  url.searchParams.delete('jugar')
  url.searchParams.delete('juego')
  history.replaceState(null, '', url.toString())
  if (!partidaId || !esJuegoInvitable(juego)) return
  await esperarSesion()
  try {
    await entrarYConectar(partidaId)
    irAlJuego(juego, 1, false)
  } catch (e) {
    console.error('[partida] enlace', e)
  }
}
