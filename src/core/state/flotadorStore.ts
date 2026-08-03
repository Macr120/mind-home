import { create } from 'zustand'
import type { ObjetoCuarto } from '../data/db'
import { sonar } from '../audio/sfx'

/**
 * Estado runtime de la dona flotadora de las albercas (NO se persiste): en cuál
 * está sentado el personaje. Se sube SOLO al nadar hasta ella y se baja al
 * moverse, sin botones (patrón del carrusel/columpio en `parqueStore`). Los
 * datos por-frame van en el módulo mutable `flotadorFrame`; la mecánica vive en
 * `Character.tsx` y el modelo 3D en `house/flotador.tsx`.
 */

/** Tipo del objeto (aquí, y no en house/, para que el store de diseño lo siembre sin ciclos). */
export const TIPO_FLOTADOR = 'flotador'
export const NOMBRE_FLOTADOR = 'Dona flotadora'
export const COLOR_FLOTADOR = '#f472b6'

export const flotadorFrame = {
  sentado: false,
  /** Centro de la dona: el personaje se queda quieto ahí mientras va sentado. */
  x: 0,
  z: 0,
  /**
   * Armado para bajarse por movimiento. Se activa la primera vez que, ya
   * sentado, no hay input (soltó las teclas con las que nadó hasta la dona);
   * desde ahí, el siguiente movimiento lo baja.
   */
  salidaLista: false,
  /** Dona de la que se acaba de bajar: no volver a subirse hasta alejarse. */
  recienId: null as number | null,
}

/**
 * Piernas colgando dentro del aro (llegan a 0.38 al frente, dentro del hueco de
 * 0.40) y manos apoyadas en el borde del tubo, sin atravesarlo.
 */
export const ANGULO_PIERNA_FLOTADOR = -0.45
export const ANGULO_BRAZO_FLOTADOR = -0.9

interface FlotadorState {
  /** Id del objeto en el que se está sentado (null = nadando o fuera del agua). */
  instanciaId: number | null
  /** Sienta al personaje en la dona (lo dispara FlotadorProximity al acercarse). */
  sentarse: (inst: ObjetoCuarto, x: number, z: number) => void
  /** Baja de la dona (moverse, salir del agua, entrar al editor). */
  salirForzado: () => void
}

export const useFlotador = create<FlotadorState>((set, get) => ({
  instanciaId: null,
  sentarse: (inst, x, z) => {
    if (inst.id == null || get().instanciaId != null) return
    flotadorFrame.sentado = true
    flotadorFrame.x = x
    flotadorFrame.z = z
    flotadorFrame.salidaLista = false
    sonar('montar')
    set({ instanciaId: inst.id })
  },
  salirForzado: () => {
    flotadorFrame.recienId = get().instanciaId // no re-sentarse hasta alejarse
    flotadorFrame.sentado = false
    flotadorFrame.salidaLista = false
    set({ instanciaId: null })
  },
}))
