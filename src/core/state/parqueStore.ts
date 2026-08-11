import { create } from 'zustand'
import type { ObjetoCuarto } from '../data/db'
import { playerPos } from './playerPosition'

/**
 * Estado runtime de los juegos de parque (NO se persiste): qué juego se está
 * usando y cuál está al alcance (patrón `monturaStore`). Los datos por-frame
 * van en el módulo mutable `parqueFrame`; la animación del uso vive en
 * `Character.tsx` (`usarJuego`) y el render en `especiales.tsx`. Tipos como
 * literales para no importar módulos de house (ciclos).
 */
export type TipoJuegoParque = 'resbaladilla' | 'pasamanos' | 'carrusel' | 'columpio'

export const esJuegoParque = (tipo: string): tipo is TipoJuegoParque =>
  tipo === 'resbaladilla' || tipo === 'pasamanos' || tipo === 'carrusel' || tipo === 'columpio'

/** Escala visual de cada juego (a la talla del avatar, ~1.7 de alto). */
export const ESCALA_JUEGO: Record<TipoJuegoParque, number> = {
  resbaladilla: 1.6,
  pasamanos: 1.6,
  carrusel: 1.7,
  columpio: 1.5,
}

/** Velocidad angular del carrusel (rad/s): el jinete la acumula en `parqueFrame.giro`. */
export const VEL_CARRUSEL = 0.7

/** Vaivén del columpio (rad) según el tiempo mecido: arranca en reposo (0). */
export const anguloColumpio = (t: number) => Math.sin(t * 1.6) * 0.35

export type PoseParque = 'de-pie' | 'sentado' | 'colgado'

export const parqueFrame = {
  usando: false,
  tipo: null as TipoJuegoParque | null,
  /** Pose del avatar este frame (la leen AvatarModelo y Prendas). */
  pose: 'de-pie' as PoseParque,
  /** Pose del juego en el mundo (centro y rotación de la instancia). */
  cx: 0,
  cz: 0,
  rotYRad: 0,
  /** Inicio del uso y punto de partida del jugador (regreso al bajarse). */
  inicio: 0,
  startX: 0,
  startZ: 0,
  /** Carrusel: asiento elegido (rad); columpio: lado (±1). Se fija al primer frame. */
  fase0: 0,
  faseLista: false,
  /** Ángulo acumulado del carrusel (solo avanza mientras se usa; persiste, sin saltos). */
  giro: 0,
  /** Tiempo mecido del columpio (s): arranca en 0 al sentarse. */
  vaivenT: 0,
  /** Bajarse solicitado (carrusel/columpio): lo resuelve Character en su frame. */
  salirPendiente: false,
  /** Juego del que se acaba de bajar (legado del abordaje automático). */
  recienId: null as number | null,
  /**
   * Carrusel/columpio: armado para bajarse por movimiento. Se activa la primera
   * vez que, ya sentado, no hay input (soltó las teclas con las que caminó hasta
   * el juego); desde ahí, el siguiente input de movimiento pide bajarse.
   */
  salidaLista: false,
}

/** Cadera al usar un juego: sentado fijo; colgado del pasamanos, balanceo leve. */
export function anguloPiernaParque(signo: 1 | -1): number {
  if (parqueFrame.pose === 'colgado') return -0.3 + Math.sin(performance.now() * 0.004) * 0.12 * signo
  return -1.5
}

/** Brazos al usar un juego: arriba (colgado), a las cuerdas (columpio) o al frente. */
export function anguloBrazoParque(): number {
  if (parqueFrame.pose === 'colgado') return Math.PI
  return parqueFrame.tipo === 'columpio' ? -2.2 : -0.9
}

interface ParqueState {
  /** Id del objeto del mapa que se está usando (null = a pie). */
  instanciaId: number | null
  tipo: TipoJuegoParque | null
  /** Empieza a usar el juego (lo dispara el botón «Subirte» del hueco del cubo). */
  usar: (inst: ObjetoCuarto) => void
  /** Limpieza inmediata (instancia borrada, entrar al editor, o el jugador se mueve
   *  para bajarse de un carrusel/columpio: ver `salidaLista` en `parqueFrame`). */
  salirForzado: () => void
}

export const useParque = create<ParqueState>((set, get) => ({
  instanciaId: null,
  tipo: null,
  usar: (inst) => {
    if (inst.id == null || get().instanciaId != null) return
    const tipo = inst.tipo as TipoJuegoParque
    parqueFrame.usando = true
    parqueFrame.tipo = tipo
    parqueFrame.pose = 'de-pie'
    parqueFrame.cx = inst.x ?? 0
    parqueFrame.cz = inst.z ?? 0
    parqueFrame.rotYRad = ((inst.rotY ?? 0) * Math.PI) / 180
    parqueFrame.inicio = performance.now()
    parqueFrame.startX = playerPos.x
    parqueFrame.startZ = playerPos.z
    parqueFrame.fase0 = 0
    parqueFrame.faseLista = false
    parqueFrame.vaivenT = 0 // el columpio arranca en reposo (el giro del carrusel persiste)
    parqueFrame.salirPendiente = false
    parqueFrame.salidaLista = false
    set({ instanciaId: inst.id, tipo })
  },
  salirForzado: () => {
    parqueFrame.recienId = get().instanciaId // no re-activar hasta que el jugador se aleje
    parqueFrame.usando = false
    parqueFrame.salirPendiente = false
    parqueFrame.tipo = null
    parqueFrame.pose = 'de-pie'
    set({ instanciaId: null, tipo: null })
  },
}))
