/**
 * Motor de la MESA: los juegos 2D de Entretenimiento jugados en línea sobre la
 * sala que ya existe. Cero SQL — la sala sigue en su juego (`visita` o el que
 * tenga) y la mesa vive SOLO en el canal, así que sirve igual dentro de una
 * visita que con cada uno en su casa y su Entretenimiento.
 *
 * Reparto de autoridad (B1): el ÁRBITRO es el anfitrión de la sala, también
 * cuando la mesa la abre un invitado. Él valida asiento, turno y regla con el
 * MISMO reductor del juego y reemite por la bajada. Nadie aplica su propia
 * jugada hasta que le vuelve: así los dos tableros van en el mismo orden y el
 * eco es la confirmación. Con ping normal son <300 ms y es por turnos.
 *
 * Hay UNA mesa a la vez (dos asientos, `a` quien la abre y `b` quien se sienta;
 * el resto de la sala mira). El estado viaja entero al abrir y en cada
 * `estado`, nunca en cada jugada: lo que se manda por jugada es la jugada.
 */
import { useSyncExternalStore } from 'react'
import { usePartida } from './partidaStore'
import { alRecibir, emitir, pedirResync, registrarResync, salaViva, soyArbitro } from './sala'
import type { JuegoMesa, JugadorSala, MsgJugada, Ranura } from './tipos'

export type Asiento = 'a' | 'b'

export interface JuegoMesaDef<E, M> {
  /** Lo llama el ÁRBITRO al abrir. La semilla la tira él: nunca viaja sola. */
  inicial(semilla: number): E
  /** `null` = ilegal (el asiento, el turno o la regla no cuadran). */
  aplicar(e: E, m: M, asiento: Asiento): E | null
  terminado(e: E): boolean
}

export interface MesaAbierta {
  g: JuegoMesa
  a: JugadorSala
  b: JugadorSala | null
}

export interface Mesa<E, M> {
  /** Hay sala con alguien más: sin esto la tarjeta «En línea» ni se ofrece. */
  enLinea: boolean
  abierta: boolean
  /** La mesa que se estaba mirando se cerró: no hay ninguna abriéndose. */
  cerrada: boolean
  miAsiento: Asiento | null
  asientos: { a: JugadorSala | null; b: JugadorSala | null }
  estado: E | null
  n: number
  abrir(): void
  sentar(): void
  levantar(): void
  cerrar(): void
  /** Manda la jugada; NO la aplica en local hasta que vuelve por la bajada. */
  jugar(m: M): void
}

interface MesaViva {
  g: JuegoMesa
  a: Ranura
  b: Ranura | null
  n: number
  e: unknown
}

/**
 * Un `estado` detrás de cada jugada: es el seguro contra la jugada que se
 * pierde. Sin él, quien se la perdió se queda esperando un turno que en el
 * árbitro ya pasó, y nada le hace sospechar (el hueco de `seq` solo se ve con
 * el mensaje SIGUIENTE, y no lo habrá hasta que alguien mueva). Sale una sola
 * vez por jugada, y con la mesa quieta no se manda nada.
 */
const ECO_ESTADO = 1500

/**
 * La jugada propia que no vuelve se repite: por la SUBIDA no hay eco que la
 * confirme, así que una jugada perdida ahí se tragaría el clic sin que nadie se
 * entere. Repetirla es inocuo: si el árbitro ya la aplicó, el `n` no cuadra y
 * lo único que hace es reemitir el estado.
 */
const REENVIO = 1500
const REENVIOS = 2

const JUEGOS = new Map<JuegoMesa, JuegoMesaDef<unknown, unknown>>()

let mesa: MesaViva | null = null
let version = 0
let ecoTimer: ReturnType<typeof setTimeout> | null = null
let pendiente: { g: JuegoMesa; n: number; m: unknown; quedan: number } | null = null
let reenvioTimer: ReturnType<typeof setTimeout> | null = null
let asientoTimer: ReturnType<typeof setTimeout> | null = null
/** La mesa que estaba mirando se cerró (no es que la mía esté abriéndose). */
let cerradaFuera = false
const oyentes = new Set<() => void>()

/** Cada juego se registra al importarse (lo hace `JuegosMesaTab` con los cuatro). */
export function registrarJuegoMesa<E, M>(g: JuegoMesa, def: JuegoMesaDef<E, M>): void {
  JUEGOS.set(g, def as unknown as JuegoMesaDef<unknown, unknown>)
}

function publicar(): void {
  version += 1
  for (const o of oyentes) o()
}

function suscribir(fn: () => void): () => void {
  oyentes.add(fn)
  return () => {
    oyentes.delete(fn)
  }
}

function instantanea(): number {
  return version
}

function asientoDe(m: MesaViva, r: Ranura): Asiento | null {
  if (r === m.a) return 'a'
  return r === m.b ? 'b' : null
}

// ─── árbitro (solo el anfitrión de la sala) ──────────────────────────────────

function reemitirEstado(): void {
  if (ecoTimer) {
    clearTimeout(ecoTimer)
    ecoTimer = null
  }
  if (!mesa) return
  emitir('mesa', { g: mesa.g, ac: 'estado', a: mesa.a, b: mesa.b, n: mesa.n, e: mesa.e })
}

function abrirComoArbitro(g: JuegoMesa, a: Ranura): void {
  const def = JUEGOS.get(g)
  if (!def) return
  // Ya hay una mesa: quien la pidió se ha perdido algo, y lo que necesita es el
  // estado, no otra mesa.
  if (mesa) {
    reemitirEstado()
    return
  }
  mesa = { g, a, b: null, n: 0, e: def.inicial(Math.floor(Math.random() * 1e9)) }
  publicar()
  emitir('mesa', { g, ac: 'abrir', a, b: null, n: 0, e: mesa.e })
}

function cerrarMesa(): void {
  if (ecoTimer) {
    clearTimeout(ecoTimer)
    ecoTimer = null
  }
  if (!mesa) return
  const { g, a, b, n, e } = mesa
  mesa = null
  publicar()
  emitir('mesa', { g, ac: 'cerrar', a, b, n, e })
}

function atenderSentar(de: Ranura, g: JuegoMesa, ac: 'abrir' | 'sentar' | 'levantar'): void {
  if (ac === 'abrir') {
    abrirComoArbitro(g, de)
    return
  }
  if (!mesa || mesa.g !== g) return
  if (ac === 'sentar') {
    if (mesa.b !== null || de === mesa.a) {
      reemitirEstado()
      return
    }
    mesa.b = de
    publicar()
    reemitirEstado()
    return
  }
  // Quien abrió la mesa se la lleva al irse; el de enfrente solo deja el sitio.
  if (de === mesa.a) cerrarMesa()
  else if (de === mesa.b) {
    mesa.b = null
    publicar()
    reemitirEstado()
  }
}

/** «Esa mesa aquí ya no existe»: a quien se le perdió el `cerrar` sigue jugando solo. */
function desmentirMesa(g: JuegoMesa): void {
  const yo = salaViva()?.miRanura
  if (yo) emitir('mesa', { g, ac: 'cerrar', a: yo, b: null, n: 0, e: {} })
}

function arbitrarJugada(de: Ranura, g: JuegoMesa, n: number, m: unknown): void {
  if (!mesa || mesa.g !== g) {
    desmentirMesa(g)
    return
  }
  const def = JUEGOS.get(g)
  const asiento = asientoDe(mesa, de)
  if (!def || !asiento || n !== mesa.n) {
    reemitirEstado()
    return
  }
  const siguiente = def.aplicar(mesa.e, m, asiento)
  if (siguiente === null) {
    reemitirEstado()
    return
  }
  mesa.e = siguiente
  mesa.n = n + 1
  publicar()
  emitir('jugada', { de, g, n, m })
  // El final no puede esperar al seguro: las dos pantallas lo cantan a la vez.
  if (def.terminado(siguiente)) reemitirEstado()
  else {
    if (ecoTimer) clearTimeout(ecoTimer)
    ecoTimer = setTimeout(reemitirEstado, ECO_ESTADO)
  }
}

// ─── bajada (todos, árbitro incluido por el eco de `arbitrarJugada`) ─────────

function aplicarJugadaBajada(p: MsgJugada): void {
  const m = mesa
  if (!m || p.de === undefined || m.g !== p.g) {
    pedirResync(['mesa'])
    return
  }
  const def = JUEGOS.get(p.g)
  const asiento = asientoDe(m, p.de)
  if (!def || !asiento) return
  // Un `n` que no cuadra es una jugada perdida por el camino: el tablero no se
  // reconstruye a trozos, se pide entero.
  if (p.n !== m.n) {
    pedirResync(['mesa'])
    return
  }
  const siguiente = def.aplicar(m.e, p.m, asiento)
  if (siguiente === null) {
    pedirResync(['mesa'])
    return
  }
  m.e = siguiente
  m.n = p.n + 1
  publicar()
}

alRecibir('mesa', (p) => {
  if (p.ac === 'cerrar') {
    if (!mesa) return
    mesa = null
    cerradaFuera = true
    publicar()
    return
  }
  mesa = { g: p.g, a: p.a, b: p.b, n: p.n, e: p.e }
  cerradaFuera = false
  publicar()
})

alRecibir('sentar', (p, de) => {
  if (!soyArbitro()) return
  if (p.ac !== 'abrir' && mesa?.g !== p.g) desmentirMesa(p.g)
  else atenderSentar(de, p.g, p.ac)
})

alRecibir('jugada', (p, de) => {
  // Por la bajada viene ya aceptada (la aplica todo el mundo); por la subida es
  // una propuesta, y de esas solo entiende el árbitro.
  if (p.de !== undefined) aplicarJugadaBajada(p)
  else if (soyArbitro()) arbitrarJugada(de, p.g, p.n, p.m)
})

// Retirarse de la BATALLA no es dejar la sala (ni la mesa); irse de verdad sí
// deja el asiento libre.
alRecibir('salir', (p, de) => {
  if (soyArbitro() && mesa && p.r !== 'batalla') atenderSentar(de, mesa.g, 'levantar')
})

registrarResync(reemitirEstado, 'mesa')

usePartida.subscribe((s, previo) => {
  // La mesa vive dentro de la sala: al cerrarse no puede quedar un tablero
  // fantasma en la pantalla de nadie.
  if (!s.sala) {
    if (!mesa) return
    mesa = null
    publicar()
    return
  }
  // Acabo de entrar: la mesa pudo abrirse antes de que llegara, y sin esto no
  // me enteraría hasta que abriera ese juego.
  if (!previo.sala && !mesa && !soyArbitro()) pedirResync(['mesa'])
})

// ─── interfaz ────────────────────────────────────────────────────────────────

/** Manda mi jugada y la vigila: mientras el tablero no avance, se repite. */
function proponerJugada(yo: Ranura, g: JuegoMesa, n: number, m: unknown): void {
  pendiente = { g, n, m, quedan: REENVIOS }
  emitir('jugada', { j: yo, g, n, m })
  vigilarPendiente()
}

function vigilarPendiente(): void {
  if (reenvioTimer) clearTimeout(reenvioTimer)
  reenvioTimer = setTimeout(() => {
    reenvioTimer = null
    const p = pendiente
    const yo = salaViva()?.miRanura
    // Con el tablero ya avanzado (o sin mesa) la jugada llegó: no hay nada que repetir.
    if (!p || !yo || mesa?.g !== p.g || mesa.n !== p.n || p.quedan === 0) {
      pendiente = null
      return
    }
    p.quedan -= 1
    emitir('jugada', { j: yo, g: p.g, n: p.n, m: p.m })
    vigilarPendiente()
  }, REENVIO)
}

/** ¿Ya se cumplió lo que pedí? Sentado a esta mesa, o fuera de ella. */
function asientoCumplido(g: JuegoMesa, ac: 'sentar' | 'levantar', yo: Ranura): boolean {
  if (mesa?.g !== g) return ac === 'levantar'
  return (asientoDe(mesa, yo) !== null) === (ac === 'sentar')
}

/** Un solo reintento: la petición de asiento también se pierde por la subida. */
function vigilarAsiento(g: JuegoMesa, ac: 'sentar' | 'levantar'): void {
  if (asientoTimer) clearTimeout(asientoTimer)
  asientoTimer = setTimeout(() => {
    asientoTimer = null
    const yo = salaViva()?.miRanura
    if (!yo || asientoCumplido(g, ac, yo)) return
    emitir('sentar', { j: yo, g, ac })
  }, REENVIO)
}

function accion(g: JuegoMesa, ac: 'abrir' | 'sentar' | 'levantar'): void {
  const yo = salaViva()?.miRanura
  if (!yo) return
  if (ac === 'abrir') cerradaFuera = false
  if (soyArbitro()) {
    atenderSentar(yo, g, ac)
    return
  }
  emitir('sentar', { j: yo, g, ac })
  if (ac !== 'abrir') vigilarAsiento(g, ac)
}

/** Hook para la UI del juego. Sin sala, `enLinea` es false y todo lo demás inerte. */
export function useMesa<E, M>(g: JuegoMesa): Mesa<E, M> {
  const sala = usePartida((s) => s.sala)
  useSyncExternalStore(suscribir, instantanea)
  const viva = sala && mesa?.g === g ? mesa : null
  const quien = (r: Ranura | null | undefined) =>
    (r && sala?.jugadores.find((j) => j.ranura === r)) || null
  return {
    enLinea: (sala?.jugadores.length ?? 0) >= 2,
    abierta: viva !== null,
    cerrada: viva === null && cerradaFuera,
    miAsiento: viva && sala ? asientoDe(viva, sala.miRanura) : null,
    asientos: { a: quien(viva?.a), b: quien(viva?.b) },
    estado: viva ? (viva.e as E) : null,
    n: viva?.n ?? 0,
    abrir: () => accion(g, 'abrir'),
    sentar: () => accion(g, 'sentar'),
    levantar: () => accion(g, 'levantar'),
    cerrar: () => {
      if (!soyArbitro()) accion(g, 'levantar')
      else if (mesa?.g === g) cerrarMesa()
    },
    jugar: (m) => {
      const yo = salaViva()?.miRanura
      if (!yo || !mesa || mesa.g !== g || asientoDe(mesa, yo) === null) return
      if (soyArbitro()) arbitrarJugada(yo, g, mesa.n, m)
      else proponerJugada(yo, g, mesa.n, m)
    },
  }
}

/** Mesas abiertas ahora mismo (nunca más de una). La lee la banda de avisos. */
export function mesasAbiertas(): MesaAbierta[] {
  const sala = salaViva()
  const m = mesa
  if (!sala || !m) return []
  const a = sala.jugadores.find((j) => j.ranura === m.a)
  return a ? [{ g: m.g, a, b: sala.jugadores.find((j) => j.ranura === m.b) ?? null }] : []
}

/** La misma lista, suscrita: la banda se repinta cuando se abre o se cierra. */
export function useMesasAbiertas(): MesaAbierta[] {
  usePartida((s) => s.sala)
  useSyncExternalStore(suscribir, instantanea)
  return mesasAbiertas()
}

/** Cómo se llama a quien ocupa un asiento: «@alias», su nombre o su ranura. */
export function etiquetaAsiento(j: JugadorSala): string {
  if (j.alias) return `@${j.alias}`
  return j.nombre || j.ranura
}

if (import.meta.env.DEV) {
  ;(window as unknown as { mesaPartida: () => MesaViva | null }).mesaPartida = () => mesa
}
