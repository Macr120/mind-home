import { create } from 'zustand'
import { playerPos } from './playerPosition'

/**
 * Estado runtime de los objetos USABLES de plantilla (caminadora, laptop,
 * tapete…): qué objeto se está usando y la pose del avatar. NO se persiste
 * (patrón `parqueStore`/`monturaStore`). Los datos por-frame van en el módulo
 * mutable `accionCuartoFrame`; la animación guionizada vive en `Character.tsx`
 * (`usarAccion`), la activación por proximidad en el componente del objeto
 * (el botón «Usar» que ofrece `house/ContextoProximity.tsx`) y las poses las leen
 * `AvatarModelo`/`Prendas`. Tipos como literales (evita ciclos con house).
 */
export type TipoAccionCuarto =
  | 'caminadora'
  | 'laptop'
  | 'tapete-yoga'
  | 'libreta'
  | 'sillon-lectura'
  | 'estacion-computo'
  | 'asiento-generico'
  | 'acostarse-generico'

/**
 * Grupo de acción genérico de CUALQUIER objeto (silla del catálogo, piezas de
 * IA/usuario) — a diferencia de `TipoAccionCuarto`, que son los 5 tipos de
 * plantilla con mecanismo propio. Ver `grupoAccionDe` en `house/catalogo.tsx`.
 */
export type GrupoAccion = 'asiento' | 'vehiculo' | 'acostarse'

/** Pose corporal de cada acción (la leen AvatarModelo y Prendas por frame). */
export type PoseAccion = 'caminar' | 'sentado-escribe' | 'medita' | 'lee' | 'sentado' | 'recostado'

const POSE_DE: Record<TipoAccionCuarto, PoseAccion> = {
  caminadora: 'caminar',
  laptop: 'sentado-escribe',
  'tapete-yoga': 'medita',
  libreta: 'sentado-escribe',
  'sillon-lectura': 'lee',
  'estacion-computo': 'sentado-escribe',
  'asiento-generico': 'sentado',
  'acostarse-generico': 'recostado',
}

/** Distancia al objeto para abordarlo al acercarse (sin botón). */
export const RADIO_ACCION = 2.3

/**
 * Config de colocación del avatar por acción: distancia al frente, si se sienta
 * (en el piso) y su altura extra. `asiento` (si se da) = altura de la superficie
 * donde se sienta, medida desde el plano en que se DIBUJAN los objetos (piso +
 * SUPERFICIE_SUELO), no desde el piso — el avatar se sienta ahí, orientado como
 * el mueble. Es solo el fallback: la altura real se mide del objeto y llega en
 * `accionCuartoFrame.superficieY` (ver `AccionGenerica`).
 */
export const CFG_ACCION: Record<
  TipoAccionCuarto,
  { frente: number; sentado: boolean; alza: number; asiento?: number; sobreObjeto?: boolean }
> = {
  caminadora: { frente: 0, sentado: false, alza: 0.12 },
  // Silla imaginaria frente al escritorio (no hay malla que medir): 0.45 sobre el
  // plano de los objetos = la misma altura final que tenía antes del cambio de origen.
  laptop: { frente: 0.9, sentado: true, alza: 0, asiento: 0.45 },
  'tapete-yoga': { frente: 0, sentado: true, alza: 0 },
  libreta: { frente: 0.7, sentado: true, alza: 0 },
  // Sillón de lectura: el personaje se sienta ENCIMA del mueble (no enfrente).
  // 0.58 = tope real del cojín en coordenadas locales del objeto.
  'sillon-lectura': { frente: 0, sentado: true, alza: 0, asiento: 0.58, sobreObjeto: true },
  // Igual que la laptop, 5 cm más atrás: el escritorio es más ancho y con 0.9 el
  // avatar quedaría con las rodillas dentro del mueble.
  'estacion-computo': { frente: 0.95, sentado: true, alza: 0, asiento: 0.45 },
  // Asiento/acostarse GENÉRICO (cualquier silla/cama del catálogo o de IA): se
  // sienta/acuesta ENCIMA del objeto, igual que el sillón. El 0.45 (silla típica)
  // es solo el fallback — la altura real se mide del objeto (ver `superficieY`).
  'asiento-generico': { frente: 0, sentado: true, alza: 0, asiento: 0.45, sobreObjeto: true },
  'acostarse-generico': { frente: 0, sentado: true, alza: 0, asiento: 0.45, sobreObjeto: true },
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
  /**
   * Y ABSOLUTA de mundo de la superficie donde se sienta/acuesta el avatar,
   * medida del objeto (grupo genérico). Al ser absoluta no depende del offset de
   * dibujado de los objetos, de su `y`, de su escala ni del nivel del cuarto.
   * null = usar el fallback tabulado de `CFG_ACCION`.
   */
  superficieY: null as number | null,
  /** Datos del objeto GENÉRICO "cerca" (grupo asiento/acostarse), listos para activar con el botón del prompt (ver `activarCercano`). */
  cercaWx: 0,
  cercaWz: 0,
  cercaRotY: 0,
  cercaSuperficieY: null as number | null,
}

/** Ángulo rotation.x de las piernas según la pose (0 = de pie). */
export function anguloPiernaAccion(): number {
  const p = accionCuartoFrame.pose
  // 'recostado' NO dobla las piernas: el cuerpo entero se tumba (ver `usarAccion`
  // en Character.tsx), piernas rectas se ven acostadas; dobladas se verían de lado.
  return p === 'sentado-escribe' || p === 'medita' || p === 'lee' || p === 'sentado' ? -1.5 : 0
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
  /**
   * Empieza a usar el objeto (lo dispara la proximidad del componente: sin botón).
   * `superficieY`: Y de mundo de la superficie medida del objeto (grupo genérico);
   * si se omite, `usarAccion` en Character.tsx cae al fallback de `CFG_ACCION`.
   */
  usar: (
    id: number,
    wx: number,
    wz: number,
    rotYRad: number,
    tipo: TipoAccionCuarto,
    superficieY?: number,
  ) => void
  /** Limpieza inmediata (instancia borrada, entrar al editor, o salir por movimiento). */
  salirForzado: () => void
  /**
   * Salida ORDENADA (botón «Levantarte»): la ejecuta `usarAccion` en Character,
   * que además devuelve al personaje a un punto libre y le quita la pose. Forzar
   * el store aquí lo dejaría de pie DENTRO del mueble, encerrado por su collider.
   */
  pedirSalir: () => void
  /**
   * Objeto GENÉRICO (asiento/acostarse) al alcance, publicado por `AccionGenerica`
   * cada ~5 veces/s: alimenta el botón dinámico "Sentarte/Acostarte" del hueco
   * del cubo (`ControlHerramienta`), igual que `monturaStore.cercaId/cercaTipo`
   * alimenta "Subirte". A diferencia de los 5 usables de plantilla (que se
   * activan solos), estos requieren el botón.
   */
  cercaId: number | null
  cercaGrupo: GrupoAccion | null
  setCerca: (
    pend: { id: number; grupo: GrupoAccion; wx: number; wz: number; rotY: number; superficieY?: number } | null,
  ) => void
  /** Activa la acción del objeto "cerca" (lo llama el botón del prompt). */
  activarCercano: () => void
}

export const useAccionCuarto = create<AccionState>((set, get) => ({
  instanciaId: null,
  tipo: null,
  cercaId: null,
  cercaGrupo: null,
  usar: (id, wx, wz, rotYRad, tipo, superficieY) => {
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
    accionCuartoFrame.superficieY = superficieY ?? null
    set({ instanciaId: id, tipo })
  },
  salirForzado: () => {
    accionCuartoFrame.recienId = get().instanciaId
    accionCuartoFrame.usando = false
    accionCuartoFrame.salirPendiente = false
    accionCuartoFrame.tipo = null
    accionCuartoFrame.pose = 'caminar'
    accionCuartoFrame.superficieY = null
    set({ instanciaId: null, tipo: null })
  },
  pedirSalir: () => {
    if (get().instanciaId == null) return
    accionCuartoFrame.salirPendiente = true
  },
  setCerca: (pend) => {
    // Los datos por-frame se refrescan SIEMPRE: el objeto se pudo mover mientras
    // sigues cerca (p. ej. cargándolo con la herramienta "mover"). El corte de
    // abajo solo evita el `set` de zustand, que es lo que cuesta (re-renders).
    if (pend) {
      accionCuartoFrame.cercaWx = pend.wx
      accionCuartoFrame.cercaWz = pend.wz
      accionCuartoFrame.cercaRotY = pend.rotY
      accionCuartoFrame.cercaSuperficieY = pend.superficieY ?? null
    }
    const id = pend?.id ?? null
    const grupo = pend?.grupo ?? null
    if (get().cercaId === id && get().cercaGrupo === grupo) return
    set({ cercaId: id, cercaGrupo: grupo })
  },
  activarCercano: () => {
    const { cercaId, cercaGrupo } = get()
    if (cercaId == null || !cercaGrupo) return
    const tipo: TipoAccionCuarto = cercaGrupo === 'acostarse' ? 'acostarse-generico' : 'asiento-generico'
    const { cercaWx, cercaWz, cercaRotY, cercaSuperficieY } = accionCuartoFrame
    set({ cercaId: null, cercaGrupo: null })
    get().usar(cercaId, cercaWx, cercaWz, cercaRotY, tipo, cercaSuperficieY ?? undefined)
  },
}))
