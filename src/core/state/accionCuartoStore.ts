import { create } from 'zustand'
import { playerPos } from './playerPosition'

/**
 * Estado runtime de los objetos USABLES de plantilla (caminadora, laptop,
 * tapete…): qué objeto se está usando y la pose del avatar. NO se persiste
 * (patrón `parqueStore`/`monturaStore`). Los datos por-frame van en el módulo
 * mutable `accionCuartoFrame`; la animación guionizada vive en `Character.tsx`
 * (`usarAccion`), la activación por proximidad en el componente del objeto
 * (`useAbordarAccion` en especialesPlantilla.tsx) y las poses las leen
 * `AvatarModelo`/`Prendas`. Tipos como literales (evita ciclos con house).
 */
export type TipoAccionCuarto =
  | 'caminadora'
  | 'laptop'
  | 'tapete-yoga'
  | 'libreta'
  | 'sillon-lectura'

/** Pose corporal de cada acción (la leen AvatarModelo y Prendas por frame). */
export type PoseAccion = 'caminar' | 'sentado-escribe' | 'medita' | 'lee'

const POSE_DE: Record<TipoAccionCuarto, PoseAccion> = {
  caminadora: 'caminar',
  laptop: 'sentado-escribe',
  'tapete-yoga': 'medita',
  libreta: 'sentado-escribe',
  'sillon-lectura': 'lee',
}

/** Distancia al objeto para abordarlo al acercarse (sin botón). */
export const RADIO_ACCION = 2.3

/**
 * Config de colocación del avatar por acción: distancia al frente, si se sienta
 * (en el piso) y su altura extra. `asiento` (si se da) = altura objetivo de la
 * cadera sobre un MUEBLE (sillón): debe quedar por encima del cojín (con margen,
 * para no toparlo) — el avatar se sienta ahí, orientado como el mueble.
 */
export const CFG_ACCION: Record<
  TipoAccionCuarto,
  { frente: number; sentado: boolean; alza: number; asiento?: number; sobreObjeto?: boolean }
> = {
  caminadora: { frente: 0, sentado: false, alza: 0.12 },
  laptop: { frente: 0.9, sentado: true, alza: 0, asiento: 0.65 },
  'tapete-yoga': { frente: 0, sentado: true, alza: 0 },
  libreta: { frente: 0.7, sentado: true, alza: 0 },
  // Sillón de lectura: el personaje se sienta ENCIMA del mueble (no enfrente).
  'sillon-lectura': { frente: 0, sentado: true, alza: 0, asiento: 0.5, sobreObjeto: true },
}

export const accionCuartoFrame = {
  usando: false,
  tipo: null as TipoAccionCuarto | null,
  /** Pose del avatar este frame (la leen AvatarModelo y Prendas). */
  pose: 'caminar' as PoseAccion,
  /** Centro y rotación (Y) del objeto en el mundo (lo publica el componente al abordar). */
  cx: 0,
  cz: 0,
  rotYRad: 0,
  /** Inicio del uso y punto de partida del jugador (para regresarlo al salir). */
  inicio: 0,
  startX: 0,
  startZ: 0,
  /** Armado para bajarse por movimiento (como carrusel/columpio): ver revisarSalidaAccion. */
  salidaLista: false,
  salirPendiente: false,
  /** Objeto del que se acaba de bajar: no re-activarlo hasta alejarse. */
  recienId: null as number | null,
}

/** Ángulo rotation.x de las piernas según la pose (0 = de pie). */
export function anguloPiernaAccion(): number {
  const p = accionCuartoFrame.pose
  return p === 'sentado-escribe' || p === 'medita' || p === 'lee' ? -1.5 : 0
}

/** Ángulo rotation.x de un brazo (signo 1 = brazo del lado izquierdo del cuerpo). */
export function anguloBrazoAccion(signo: 1 | -1): number {
  const t = performance.now() * 0.006
  switch (accionCuartoFrame.pose) {
    case 'sentado-escribe':
      return -1.15 + Math.sin(t * 2 + (signo === 1 ? 0 : 1)) * 0.09 // teclear/escribir
    case 'medita':
      return -0.32
    case 'lee':
      return signo === -1 ? -1.3 : 0 // solo el brazo derecho sostiene el periódico
    default:
      return 0
  }
}

interface AccionState {
  /** Id del objeto que se está usando (null = a pie). */
  instanciaId: number | null
  tipo: TipoAccionCuarto | null
  /** Empieza a usar el objeto (lo dispara la proximidad del componente: sin botón). */
  usar: (id: number, wx: number, wz: number, rotYRad: number, tipo: TipoAccionCuarto) => void
  /** Limpieza inmediata (instancia borrada, entrar al editor, o salir por movimiento). */
  salirForzado: () => void
}

export const useAccionCuarto = create<AccionState>((set, get) => ({
  instanciaId: null,
  tipo: null,
  usar: (id, wx, wz, rotYRad, tipo) => {
    if (get().instanciaId != null) return
    accionCuartoFrame.usando = true
    accionCuartoFrame.tipo = tipo
    accionCuartoFrame.pose = POSE_DE[tipo]
    accionCuartoFrame.cx = wx
    accionCuartoFrame.cz = wz
    accionCuartoFrame.rotYRad = rotYRad
    accionCuartoFrame.inicio = performance.now()
    accionCuartoFrame.startX = playerPos.x
    accionCuartoFrame.startZ = playerPos.z
    accionCuartoFrame.salidaLista = false
    accionCuartoFrame.salirPendiente = false
    set({ instanciaId: id, tipo })
  },
  salirForzado: () => {
    accionCuartoFrame.recienId = get().instanciaId
    accionCuartoFrame.usando = false
    accionCuartoFrame.salirPendiente = false
    accionCuartoFrame.tipo = null
    accionCuartoFrame.pose = 'caminar'
    set({ instanciaId: null, tipo: null })
  },
}))
