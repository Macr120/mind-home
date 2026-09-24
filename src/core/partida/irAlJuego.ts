/**
 * Llevar al jugador al juego que se acaba de proponer, en SU casa o en la que
 * está visitando. Cada familia aterriza donde le toca: la cancha navegando hasta
 * ella, el juego de mesa abriendo la app de Entretenimiento y el paintball por
 * el menú de batalla del anfitrión.
 *
 * Importa `paintballStore` (que a su vez importa `partida/sala`) a propósito:
 * el ciclo solo aparecería si `sala.ts` importara este módulo, y no lo hace.
 */
import { abrirAppOPlantilla } from '../abrirApp'
import { useDiseño } from '../state/disenoStore'
import { useHouse } from '../state/houseStore'
import { useLayout } from '../state/layoutStore'
import { usePaintball } from '../state/paintballStore'
import { JUEGOS_INVITABLES, posicionDeJuego, type JuegoInvitable } from './juegosInvitables'

/**
 * `lado` separa a los dos jugadores dentro de la cancha (-1 el anfitrión, 1 el
 * invitado). `anfitrion` decide quién abre la batalla de paintball: el invitado
 * no la abre nunca, espera a que el dueño de la casa la monte.
 *
 * Devuelve false solo cuando NO se pudo llevar y hay que decírselo al usuario
 * (editor abierto, otro piso, cancha o app ausente).
 */
export function irAlJuego(juego: JuegoInvitable, lado: -1 | 1, anfitrion: boolean): boolean {
  const def = JUEGOS_INVITABLES[juego]
  if (def.mesa) {
    // Sin Entretenimiento en la casa se juega en la plantilla, sin cuarto.
    abrirAppOPlantilla('entretenimiento', 'mesa', def.mesa)
    return true
  }
  if (!def.cancha) {
    if (anfitrion) usePaintball.getState().iniciar()
    return true
  }
  if (useLayout.getState().editMode || useHouse.getState().playerLevel !== 0) return false
  const punto = posicionDeJuego(juego, useDiseño.getState().objetos, lado)
  if (!punto) return false
  const casa = useHouse.getState()
  if (casa.activeRoom) casa.closeRoom()
  // `playerPos` no se puede escribir con el personaje ya montado (él la pisa
  // cada frame): se navega como desde el menú lateral, deslizando hasta el punto
  // y atravesando muros (`freeMove`).
  casa.setTarget(punto.x, punto.z)
  return true
}
