/**
 * Tipos del multijugador (visitas y juegos). Sin imports de 3D ni de `db`: lo
 * lee tanto el motor de la sala como la escena.
 *
 * Lo ÚNICO que viaja por el canal es la ranura efímera (`j0`..`j3`): ningún
 * uuid ajeno sale al cliente, igual que en el buzón (`buzon/tipos.ts`).
 */

/** Ranura efímera dentro de una sala. Es el id que viaja por el canal. */
export type Ranura = 'j0' | 'j1' | 'j2' | 'j3'

/** Bot del anfitrión. Viaja en los mismos mensajes de cuerpo: son cuerpos, no jugadores. */
export type BotId = 'b0' | 'b1' | 'b2' | 'b3' | 'b4'

/** Bits de `PoseCuerpo.f`. */
export const F_CORRIENDO = 1
export const F_AGACHADO = 2
export const F_FUERA = 4
export const F_AUSENTE = 8

/** Cuerpo en el mundo. x/z/h en unidades y radianes reales (sin cuantizar: el sobre domina). */
export interface PoseCuerpo {
  x: number
  z: number
  /** Rumbo (rotation.y, +Z = frente, como `girarHacia`). */
  h: number
  /** Velocidad de marcha (0-1), para derivar la zancada sin mandar la fase. */
  vel: number
  /** `useHouse.playerLevel`. */
  niv: number
  /**
   * bits: 1 corriendo · 2 agachado · 4 fuera · 8 ausente.
   * NO hay bit de «salto legítimo»: no existe validador de velocidad en el
   * anfitrión (cada cliente es dueño de su cuerpo) y el interpolador ya trata
   * un salto > 2 u como teletransporte sin animar la zancada.
   */
  f: number
}

export interface Pose extends PoseCuerpo {
  j: Ranura | BotId
  /**
   * Reloj de ESTE cuerpo, cuando no es el del sobre. El `s` del anfitrión funde
   * su pose con las últimas de los invitados, que llegaron hasta un periodo
   * antes: sin este `t` por cuerpo el interpolador las fecharía a todas como si
   * acabaran de nacer (y el rebobinado del árbitro no cuadraría).
   */
  t?: number
}

/** Marcador SLOT-RELATIVO: cada cliente lo traduce a su `yo`/`rival`. Nunca egocéntrico en el cable. */
export interface Marcador {
  j: Ranura
  p: number
  ju: number
  se: number
}

/** Aspecto remoto: `Avatar` podado, sin un solo Blob, ≤4 KB. */
export interface AspectoRemoto {
  cabeza: string
  torso: string
  piernas: string
  escala: number
  ropa?: Record<string, string>
  expresion?: string
  peinado?: string
  peloColor?: string
  forma?: string
  formaColor?: string
  cuerpoPresetId?: string
  /** Piezas del cuerpo a medida, con tope de 120 piezas y coerción numérica acotada. */
  modelo3d?: unknown[]
}

// ─── Mensajes (§2.2 del plan) ────────────────────────────────────────────────

/** Sobre común: `v` versión de protocolo, `t` reloj de partida en ms. */
interface Sobre {
  v: number
  t: number
}

/** Poses fundidas de todos los cuerpos. Solo el anfitrión. */
export interface MsgS extends Sobre {
  p: Pose[]
}

/**
 * Pose propia de un invitado. Lleva `j` porque broadcast NO firma al emisor: sin
 * ella el anfitrión no puede atribuir una pose de la subida a una ranura.
 */
export interface MsgI extends Sobre {
  j: Ranura
  p: PoseCuerpo
}

/**
 * `j` es quién pregunta. Como `MsgI`: por la subida nadie firma, y sin la ranura
 * el `pong` de dos invitados con el mismo contador sería ambiguo.
 */
export interface MsgPing extends Sobre {
  j: Ranura
  c: number
}

/** `j` = a quién responde este pong (los demás lo ignoran). */
export interface MsgPong extends Sobre {
  j: Ranura
  c: number
}

export interface MsgResync extends Sobre {
  j: Ranura
  q: TemaResync[]
}

/**
 * Qué se vuelve a pedir en un `resync`. `mesa` es el tablero de Entretenimiento
 * y `partido` el de una cancha en línea (el árbitro contesta con su apertura, o
 * con su cierre si ya no hay partido).
 */
export type TemaResync = 'w' | 'aspecto' | 'sala' | 'mesa' | 'partido'

/** Lo emite la BD (`partida_avisar`); el cliente relee con `partida_estado`. */
export interface MsgSala {
  v: number
  r: number
}

export interface MsgAspecto extends Sobre {
  j: Ranura | BotId
  /** Alias (o nombre del asistente, si es un bot): la etiqueta sobre la cabeza. */
  al: string
  em: string
  av: AspectoRemoto
}

export interface MsgDisparo extends Sobre {
  seq: number
  j: Ranura | BotId
  o: [number, number, number]
  /** Dirección YA normalizada. */
  u: [number, number, number]
  c: string
  e: number
  y: number
}

export interface MsgVeredicto extends Sobre {
  seq: number
  /** `seq` del `disparo` que creó la bola: la víctima que ya lo consumió no pinta dos veces. */
  ds: number
  de: Ranura | BotId
  vi: Ranura | BotId
  vid: number
  fue: 0 | 1
  /** Punto de impacto en mundo. */
  pi: [number, number, number]
  c: string
}

export interface MsgW extends Sobre {
  seq: number
  rel: number
  fa: 'cuenta' | 'jugando' | 'fin'
  js: { j: Ranura; eq: number; vid: number; fue: 0 | 1; imp: number }[]
  bo?: { j: BotId; vivo: 0 | 1; col: string; eq: number }[]
  mk?: Marcador[]
}

export interface MsgVuelo extends Sobre {
  seq: number
  j: Ranura
  q: 'saque' | 'golpe' | 'tiro' | 'chut'
  f: { x0: number; y0: number; z0: number; x1: number; y1: number; z1: number; dur: number; alto: number }
  /** `[velBoteX, velBoteZ]`. */
  bv: [number, number]
  eb: number
  pu?: number
}

export interface MsgB extends Sobre {
  bx: number
  bz: number
  vx: number
  vz: number
  ch: number
  du: Ranura | null
}

export interface MsgPunto extends Sobre {
  seq: number
  g: Ranura
  mk: Marcador[]
  mo: 'red' | 'fuera' | null
}

export interface MsgSalir extends Sobre {
  seq: number
  j: Ranura
  /**
   * `batalla` = me retiro del JUEGO, no de la sala: sigo en la casa del
   * anfitrión (abrir un cuarto no puede echarte de la visita). Los otros tres
   * sí dejan la sala.
   */
  r: 'boton' | 'contexto' | 'error' | 'batalla'
}

// ─── Canchas en línea (fútbol, básquet, tenis) ───────────────────────────────

/** Cancha que se puede jugar en línea. El béisbol es solo bateo: no hay 1v1. */
export type ClaseCanchaRed = 'futbol' | 'basket' | 'tenis'

/**
 * Ciclo del partido de cancha. Solo el árbitro lo abre y lo cierra: `ri` es el
 * rival que eligió y `ci` el id del objeto de mapa de la cancha, con el que el
 * invitado busca la MISMA en su escena (de visita el plano trae los mismos
 * `objetosCuarto`, y si no la tiene se le dice dónde es el partido).
 */
export interface MsgPartido extends Sobre {
  seq: number
  ci: number
  cl: ClaseCanchaRed
  ac: 'abrir' | 'cerrar'
  ri: Ranura
}

/**
 * La INTENCIÓN del invitado: el árbitro la ejecuta y lo que resulta vuelve por
 * `b`/`vuelo`/`punto`. `dx`/`dz` es la dirección unitaria en coordenadas de la
 * cancha y `ch` el chanfle que midió su propio movimiento lateral, que es quien
 * lo sintió (el árbitro solo ve su pose ya interpolada).
 */
export interface MsgAccion extends Sobre {
  seq: number
  j: Ranura
  q: 'chut' | 'tiro' | 'golpe'
  /** Carga del botón, 0–1. Solo en `chut` y `tiro`. */
  fu?: number
  /** Solo en `chut` (el tiro al aro no lleva efecto). */
  ch?: number
  dx: number
  dz: number
  /**
   * Raquetazo del tenis: `[cy, cal]`, la calidad que midió SU timing (altura de
   * la pelota y estirón). El `t` del sobre es el instante de partida en que su
   * ventana estaba abierta; el árbitro rebobina la pelota hasta ahí para
   * comprobarlo. Solo en `golpe`.
   */
  ca?: [number, number]
}

export interface MsgFin extends Sobre {
  seq: number
  /** Equipo GANADOR. */
  eq: number
  js: { j: Ranura; eq: number; imp: number; vid: number }[]
  mo: 'normal' | 'abandono' | 'corte'
}

// ─── Mesa de juegos 2D (Entretenimiento) ─────────────────────────────────────

/** Juego de mesa que se puede jugar en línea dentro de la sala. */
export type JuegoMesa = 'c4' | 'damas' | 'ajedrez' | 'cartas'

/**
 * La mesa tal como la cuenta el árbitro (el anfitrión de la sala). Lleva el
 * estado ENTERO: se manda al abrir y en cada `estado`, nunca en cada jugada.
 * `a` es quien abrió la mesa y `b` quien se sentó enfrente; el resto mira.
 */
export interface MsgMesa extends Sobre {
  seq: number
  g: JuegoMesa
  ac: 'abrir' | 'estado' | 'cerrar'
  a: Ranura
  b: Ranura | null
  /** Jugadas ya aplicadas sobre `e`. */
  n: number
  /** Estado serializable del juego (≤32 KB). Lo interpreta solo su reductor. */
  e: unknown
}

/** Petición de asiento por la subida: abrir la mesa, sentarse o levantarse. */
export interface MsgSentar extends Sobre {
  seq: number
  j: Ranura
  g: JuegoMesa
  ac: 'abrir' | 'sentar' | 'levantar'
}

/**
 * Una jugada. Por la subida la firma quien la propone (`j`); por la bajada va
 * la que el árbitro aceptó, con el asiento del que la hizo (`de`). `n` es el
 * número de jugadas que se le suponen al tablero: si no cuadra, el que recibe
 * no la aplica (el árbitro la ignora y reemite el estado completo).
 */
export interface MsgJugada extends Sobre {
  seq: number
  j?: Ranura
  de?: Ranura
  g: JuegoMesa
  n: number
  /** Jugada serializable (≤4 KB). */
  m: unknown
}

// ─── Sala ────────────────────────────────────────────────────────────────────

export type JuegoPartida = 'visita' | 'paintball' | 'futbol' | 'tenis' | 'basquet'

export type EstadoJugador = 'invitado' | 'dentro' | 'fuera' | 'expulsado'

export interface JugadorSala {
  ranura: Ranura
  equipo: number
  estado: EstadoJugador
  anfitrion: boolean
  alias: string | null
  nombre: string
  emoji: string
  retrato: string | null
  aspecto: AspectoRemoto
}

export interface Sala {
  partidaId: string
  juego: JuegoPartida
  soyAnfitrion: boolean
  miRanura: Ranura
  apps: readonly string[]
  casa: boolean
  proto: number
  rev: number
  jugadores: JugadorSala[]
}

/**
 * Timbre de invitación. Llega por el canal personal `buzon:<uid>`, que ya está
 * vivo en todo cliente con sesión, no por el canal de la partida (todavía no se
 * es miembro de nada).
 */
export interface InvitacionRecibida {
  partidaId: string
  juego: JuegoPartida
  proto: number
  apps: readonly string[]
  casa: boolean
  alias: string | null
  nombre: string
  emoji: string
  retrato: string | null
}

/** Códigos de error que devuelven las RPC de partida (contrato `{error:'<codigo>'}`). */
export type CodigoErrorPartida =
  | 'sin-sesion'
  | 'peticion-invalida'
  | 'aspecto-grande'
  | 'limite'
  | 'no-encontrado'
  | 'no-contacto'
  | 'sala-llena'
  | 'no-invitado'
  | 'expulsado'
  | 'version'
  | 'offline'
  | 'servidor'
  | 'red'
  | 'sin-backend'

export class ErrorPartida extends Error {
  codigo: CodigoErrorPartida
  constructor(codigo: CodigoErrorPartida, mensaje?: string) {
    super(mensaje ?? codigo)
    this.name = 'ErrorPartida'
    this.codigo = codigo
  }
}
