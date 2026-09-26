import { useEffect, useRef } from 'react'
import { marchaAvatar } from './animacion'
import { playerForward, playerPos, useHouse } from '../state/houseStore'
import { accionFrame } from '../state/herramientaStore'
import { periodoPose } from '../partida/protocolo'
import { fijarIntervaloEnvio } from '../partida/reloj'
import { emitirPosePropia, hayPosesDeInvitados } from '../partida/sala'
import { usePartida } from '../partida/partidaStore'
import { F_AGACHADO, F_AUSENTE, F_CORRIENDO } from '../partida/tipos'

/** Umbrales de supresión: por debajo de esto la pose no ha cambiado. */
const DELTA_POS = 0.03
const DELTA_RUMBO = 0.052 // 3°
/** Aunque nada cambie, una pose por segundo para que el otro sepa que sigo aquí. */
const KEEPALIVE = 1000

/**
 * Emite MI pose. Va como hermano de `<Character/>` y con su propio intervalo, no
 * dentro de `Character`: la posición del jugador la escriben 26 sitios (clic
 * para moverse, vehículos, tren, nado, portales, ancla de bateo…) y engancharse
 * a uno solo perdería los otros 25.
 *
 * `setInterval` y no `useFrame`: en segundo plano el navegador lo estrangula a
 * ~1 Hz, que es justo el keepalive que hace falta.
 */
export function EmisorPose(): null {
  const juego = usePartida((s) => s.sala?.juego)
  const jugadores = usePartida((s) => s.sala?.jugadores.length ?? 0)
  const ultima = useRef({ x: 0, z: 0, h: 0, niv: 0, f: -1, at: 0 })

  useEffect(() => {
    if (!juego) return
    const periodo = periodoPose(juego, jugadores)
    fijarIntervaloEnvio(periodo)
    const id = setInterval(() => {
      const h = Math.atan2(playerForward.x, playerForward.z)
      const niv = useHouse.getState().playerLevel
      let f = 0
      if (accionFrame.correr) f |= F_CORRIENDO
      if (accionFrame.agachado) f |= F_AGACHADO
      if (document.hidden) f |= F_AUSENTE
      const u = ultima.current
      const ahora = performance.now()
      const igual =
        Math.hypot(playerPos.x - u.x, playerPos.z - u.z) < DELTA_POS &&
        Math.abs(Math.atan2(Math.sin(h - u.h), Math.cos(h - u.h))) < DELTA_RUMBO &&
        f === u.f &&
        niv === u.niv
      // El anfitrión quieto sigue emitiendo si hay poses de invitados que reenviar.
      if (igual && ahora - u.at < KEEPALIVE && !hayPosesDeInvitados()) return
      ultima.current = { x: playerPos.x, z: playerPos.z, h, niv, f, at: ahora }
      emitirPosePropia({ x: playerPos.x, z: playerPos.z, h, vel: marchaAvatar.velocidad, niv, f })
    }, periodo)
    return () => clearInterval(id)
  }, [juego, jugadores])

  return null
}
