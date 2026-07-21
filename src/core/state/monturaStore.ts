import { create } from 'zustand'
import type { ObjetoCuarto } from '../data/db'
import type { TipoVehiculo } from '../house/vehiculos'
import { setVueloActivo, setDriftActivo } from '../house/movement'
import { sonar } from '../audio/sfx'

/**
 * Estado runtime de la montura (NO se persiste): qué vehículo se conduce y
 * cuál está al alcance. Los datos por-frame (rumbo, velocidad, fase de ruedas)
 * van en el módulo mutable `monturaFrame` (patrón `marchaAvatar`) para no
 * re-renderizar cada frame. La conducción vive en `Character.tsx`.
 */
export const monturaFrame = {
  montado: false,
  tipo: null as TipoVehiculo | null,
  /** Rumbo del vehículo en radianes (0 = +Z, como el frente del avatar). */
  heading: 0,
  /** Velocidad real del último frame (con signo: negativa en reversa). */
  vel: 0,
  /** Distancia rodada acumulada: gira ruedas/pedales y marca el pedaleo. */
  faseRueda: 0,
  /** Inclinación lateral actual (bici/moto al girar). */
  lean: 0,
  /** Al montar: colocar al personaje en la posición del vehículo (una vez). */
  snapPendiente: false,
  snapX: 0,
  snapZ: 0,
  /** Bajarse solicitado: lo resuelve Character en su frame (tiene los colliders). */
  desmontarPendiente: false,
  /** Derrape pedido por el botón táctil (Space hace lo mismo vía teclado). */
  driftInput: false,
  /** Derrapando ahora: la dirección real de avance (dirX/dirZ) se separa del input. */
  drift: false,
  dirX: 0,
  dirZ: 1,
  /** Segundos acumulados deslizando (al soltar con ≥0.8 s dispara el mini-turbo). */
  driftCarga: 0,
  /** Segundos restantes de mini-turbo. */
  boost: 0,
}

/** Ángulo de cadera de una pierna al ir montado: fija sentado; pedaleo alternado en bici. */
export function anguloPiernaMontada(signo: 1 | -1): number {
  if (monturaFrame.tipo === 'bicicleta') {
    return -1.1 + Math.sin(monturaFrame.faseRueda * 2.5) * 0.45 * signo
  }
  return -1.5
}

/** Brazos al frente (hacia el manubrio/volante) al ir montado. */
export const ANGULO_BRAZO_MONTADO = -0.9

interface MonturaState {
  /** Id del objeto del mapa que se está conduciendo (null = a pie). */
  instanciaId: number | null
  tipo: TipoVehiculo | null
  /** Vehículo prestado por el modo carrera (sin objeto del mapa; no persiste pose). */
  prestado: boolean
  /** Vehículo al alcance para subirse (lo publica VehiculoProximity). */
  cercaId: number | null
  cercaTipo: TipoVehiculo | null
  setCerca: (id: number | null, tipo: TipoVehiculo | null) => void
  montar: (inst: ObjetoCuarto) => void
  /** Monta un vehículo prestado (carrera a pie): aparece en x/z mirando a heading. */
  montarPrestado: (tipo: TipoVehiculo, x: number, z: number, heading: number) => void
  /** Pide bajarse: Character persiste la pose del vehículo y libera en su próximo frame. */
  solicitarDesmontar: () => void
  /** Limpieza inmediata sin persistir (instancia borrada, entrar al editor). */
  desmontarForzado: () => void
}

export const useMontura = create<MonturaState>((set, get) => ({
  instanciaId: null,
  tipo: null,
  prestado: false,
  cercaId: null,
  cercaTipo: null,
  setCerca: (id, tipo) => {
    if (get().cercaId === id) return
    set({ cercaId: id, cercaTipo: tipo })
  },
  montar: (inst) => {
    if (inst.id == null || get().instanciaId != null || get().prestado) return
    const tipo = inst.tipo as TipoVehiculo
    monturaFrame.montado = true
    monturaFrame.tipo = tipo
    monturaFrame.heading = ((inst.rotY ?? 0) * Math.PI) / 180
    monturaFrame.vel = 0
    monturaFrame.faseRueda = 0
    monturaFrame.lean = 0
    monturaFrame.snapPendiente = true
    monturaFrame.snapX = inst.x ?? 0
    monturaFrame.snapZ = inst.z ?? 0
    monturaFrame.desmontarPendiente = false
    monturaFrame.driftInput = false
    monturaFrame.drift = false
    monturaFrame.driftCarga = 0
    monturaFrame.boost = 0
    setVueloActivo(tipo === 'ovni')
    setDriftActivo(tipo !== 'ovni')
    sonar('montar')
    set({ instanciaId: inst.id, tipo, prestado: false, cercaId: null, cercaTipo: null })
  },
  montarPrestado: (tipo, x, z, heading) => {
    if (get().instanciaId != null || get().prestado) return
    monturaFrame.montado = true
    monturaFrame.tipo = tipo
    monturaFrame.heading = heading
    monturaFrame.vel = 0
    monturaFrame.faseRueda = 0
    monturaFrame.lean = 0
    monturaFrame.snapPendiente = true
    monturaFrame.snapX = x
    monturaFrame.snapZ = z
    monturaFrame.desmontarPendiente = false
    monturaFrame.driftInput = false
    monturaFrame.drift = false
    monturaFrame.driftCarga = 0
    monturaFrame.boost = 0
    setVueloActivo(false)
    setDriftActivo(true)
    sonar('montar')
    set({ instanciaId: null, tipo, prestado: true, cercaId: null, cercaTipo: null })
  },
  solicitarDesmontar: () => {
    if (get().instanciaId != null || get().prestado) monturaFrame.desmontarPendiente = true
  },
  desmontarForzado: () => {
    monturaFrame.montado = false
    monturaFrame.desmontarPendiente = false
    monturaFrame.tipo = null
    monturaFrame.driftInput = false
    monturaFrame.drift = false
    monturaFrame.boost = 0
    setVueloActivo(false)
    setDriftActivo(false)
    set({ instanciaId: null, tipo: null, prestado: false })
  },
}))
