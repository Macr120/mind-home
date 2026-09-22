/**
 * Motor de la sala: abre las dos direcciones, sella y numera lo que sale,
 * valida lo que entra y lo reparte a los motores de juego.
 *
 * Reparto de autoridad: cada cliente es dueño de SU cuerpo y el anfitrión es
 * dueño del MUNDO. Por eso el anfitrión publica siempre por la bajada y el
 * invitado por la subida, y las poses de los invitados se funden en un solo `s`
 * del anfitrión en vez de que cada uno hable con cada uno.
 */
import { useDiseño } from '../state/disenoStore'
import { useSesion } from '../cuenta/sesionStore'
import * as api from './api'
import { podar } from './aspecto'
import {
  FIABLES,
  leer,
  periodoPose,
  sellar,
  VERSION_PROTO,
  type Direccion,
  type Evento,
  type PayloadDe,
} from './protocolo'
import * as reloj from './reloj'
import { fijarMiRanura } from './ranuras'
import { abrirTransporte, partidaLocal, type Transporte } from './transporte'
import {
  ErrorPartida,
  type AspectoRemoto,
  type BotId,
  type JuegoPartida,
  type JugadorSala,
  type MsgAspecto,
  type MsgI,
  type MsgPing,
  type MsgPong,
  type MsgResync,
  type MsgS,
  type MsgSalir,
  type Pose,
  type PoseCuerpo,
  type Ranura,
  type Sala,
  type TemaResync,
} from './tipos'

const EVENTOS: Evento[] = [
  's',
  'i',
  'ping',
  'pong',
  'resync',
  'sala',
  'aspecto',
  'disparo',
  'veredicto',
  'w',
  'vuelo',
  'b',
  'punto',
  'salir',
  'fin',
  'mesa',
  'sentar',
  'jugada',
  'partido',
  'accion',
]

/** El anfitrión es siempre `j0` (`partida_crear` le da esa ranura). */
const RANURA_ANFITRION: Ranura = 'j0'

/** Una pose de un invitado deja de entrar en el `s` fundido pasado este tiempo. */
const POSE_FRESCA = 3000

const RESYNC_MINIMO = 500

/** Latido al servidor: mantiene viva la sala y barre las muertas (`partida_latido`). */
const LATIDO = 60000

let sala: Sala | null = null
let bajada: Transporte | null = null
let subida: Transporte | null = null
let lobby: BroadcastChannel | null = null
let pingTimer: ReturnType<typeof setInterval> | null = null
let latidoTimer: ReturnType<typeof setInterval> | null = null
/** Sala LOCAL de pruebas: sin backend, el aspecto viaja por el canal y no hay roster. */
let enLocal = false
let contadorPing = 0
let huecos = 0
let ultimoResync = 0
let ultimoReleer = 0

/** Posiciones propias recientes: el árbitro rebobina con ellas (~2 s a 10 Hz). */
const MAX_HISTORIA = 20

/** Un `t` que retrocede más que esto no es reordenamiento: es un reloj reiniciado. */
const RELOJ_ATRAS = 2000

const suscriptores = new Map<Evento, Set<(p: never, de: Ranura) => void>>()
const seqSalida = new Map<Evento, number>()
const seqEntrada = new Map<string, number>()
const pingsEnVuelo = new Map<number, number>()
/** `t` es el reloj con el que la mandó su dueño; `llegada`, cuándo entró aquí. */
const posesRemotas = new Map<Ranura, { p: PoseCuerpo; t: number; llegada: number }>()
const ultimaPose = new Map<Ranura, { t: number; llegada: number }>()
const jitterPorRanura = new Map<Ranura, number[]>()
const historiaPropia: { x: number; z: number; t: number }[] = []
/** El retrato son ≤64 KB por persona: viaja UNA vez (`partida_entrar`) y se cachea. */
const retratos = new Map<Ranura, string | null>()
/** Aspecto de los bots del anfitrión, para que el invitado los dibuje bien. */
const bots = new Map<BotId, CuerpoBotSala>()

export interface CuerpoBotSala {
  j: BotId
  /** Nombre del asistente que lo encarna (solo la etiqueta: nunca su personalidad). */
  al: string
  em: string
  av: AspectoRemoto
}

let vista: ((s: Sala | null) => void) | null = null
let vistaBots: ((b: CuerpoBotSala[]) => void) | null = null
let alPedirResync: (() => void) | null = null
/** Oyentes de `resync` que solo corren si el que pide nombra su tema en `q`. */
const resyncPorTema = new Map<TemaResync, () => void>()
/** Cuerpos que el anfitrión funde en su `s` además del suyo (los bots del juego). */
let cuerposExtra: (() => Pose[]) | null = null

/** Puente al store de interfaz (patrón `registrarEjecutorColocar`): sin ciclo de imports. */
export function registrarVistaSala(fn: (s: Sala | null) => void): void {
  vista = fn
}

/** Igual, para los cuerpos de bot: los pinta `JugadoresRemotos` en el invitado. */
export function registrarVistaBots(fn: (b: CuerpoBotSala[]) => void): void {
  vistaBots = fn
}

/**
 * Aviso de `resync` para el motor del juego. Lo usa el árbitro, que es el único
 * que puede volver a contar el mundo (y el `fin`, si la batalla ya acabó).
 *
 * Sin `tema` es el de la BATALLA, que reemite ante cualquier `resync` (también
 * el de `aspecto`: quien acaba de llegar no sabe todavía qué pedir). Con `tema`
 * solo corre cuando el que pide lo nombra en su `q`, que es como la mesa de
 * Entretenimiento reparte sin despertar al árbitro del paintball.
 */
export function registrarResync(fn: (() => void) | null, tema?: TemaResync): void {
  if (tema === undefined) {
    alPedirResync = fn
    return
  }
  if (fn) resyncPorTema.set(tema, fn)
  else resyncPorTema.delete(tema)
}

/**
 * El juego (paintball) registra aquí sus cuerpos propios para que viajen dentro
 * del mismo `s`: son cuerpos del mundo, no jugadores, y no merecen un mensaje
 * aparte. `sala.ts` no puede importar el store del juego (él la importa a ella).
 * No se limpia al cerrar la sala: la escena se registra UNA vez al montarse y
 * vive más que cualquier sala (y devuelve una lista vacía fuera de batalla).
 */
export function registrarCuerposExtra(fn: (() => Pose[]) | null): void {
  cuerposExtra = fn
}

export function salaViva(): Sala | null {
  return sala
}

/** ¿Soy el árbitro? (anfitrión de la sala viva, aunque esté eliminado) */
export function soyArbitro(): boolean {
  return sala?.soyAnfitrion === true
}

/** Huecos de `seq` detectados (HUD de DEV). */
export function perdidos(): number {
  return huecos
}

function publicar(): void {
  vista?.(sala)
}

function publicarBots(): void {
  vistaBots?.([...bots.values()])
}

/**
 * Cambia el juego de la sala en ESTE cliente. Con backend la verdad la dice el
 * servidor (`partida_cambiar_juego` → evento `sala` → `partida_estado`); esto es
 * lo que la adelanta sin esperar el rebote, y lo único que hay en la sala local
 * de pruebas, donde no hay servidor que lo diga.
 */
export function fijarJuego(juego: JuegoPartida): void {
  if (!sala || sala.juego === juego) return
  sala = { ...sala, juego }
  reloj.fijarIntervaloEnvio(periodoPose(juego, sala.jugadores.length))
  publicar()
}

/** Aspecto de los bots del anfitrión (lo lee la escena para montarlos). */
export function cuerposBot(): CuerpoBotSala[] {
  return [...bots.values()]
}

/**
 * Un bot del anfitrión se presenta. Va por el canal porque `asistentes` está
 * podada del plano a propósito: sin esto el invitado dibujaría los bots con el
 * avatar por defecto. Solo APARIENCIA: nunca personalidad, historia ni saludo.
 */
export function anunciarBot(b: CuerpoBotSala): void {
  bots.set(b.j, b)
  publicarBots()
  emitir('aspecto', { j: b.j, al: b.al, em: b.em, av: b.av })
}

export function olvidarBots(): void {
  if (bots.size === 0) return
  bots.clear()
  publicarBots()
}

// ─── entrada ─────────────────────────────────────────────────────────────────

/** Quién emitió: por la bajada solo habla el anfitrión; por la subida, quien firme `j`. */
function deQuien(direccion: Direccion, p: unknown): Ranura | null {
  if (direccion === 'bajada') return RANURA_ANFITRION
  const j = (p as { j?: unknown }).j
  return typeof j === 'string' && /^j[0-3]$/.test(j) ? (j as Ranura) : null
}

function entra(ev: Evento, direccion: Direccion, bruto: unknown): void {
  if (!sala) return
  const p = leer(ev, bruto, direccion)
  if (!p) return
  // `sala` lo emite la BD por el canal de bajada, no un jugador: lo procesan
  // TODOS, incluido el anfitrión (que es quien más altas y bajas ve).
  const de = ev === 'sala' ? RANURA_ANFITRION : deQuien(direccion, p)
  if (de === null) return
  if (ev !== 'sala' && de === sala.miRanura) return
  if (FIABLES.has(ev)) {
    const clave = `${de}:${ev}`
    const previo = seqEntrada.get(clave) ?? 0
    const seq = (p as { seq: number }).seq
    if (previo > 0 && seq > previo + 1) {
      huecos += seq - previo - 1
      pedirResync()
    }
    if (seq <= previo) return
    seqEntrada.set(clave, seq)
  }
  interno(ev, direccion, p, de)
  const cbs = suscriptores.get(ev)
  if (cbs) for (const cb of cbs) (cb as (p: unknown, de: Ranura) => void)(p, de)
}

function interno(ev: Evento, direccion: Direccion, p: object, de: Ranura): void {
  if (!sala) return
  switch (ev) {
    case 'ping':
      // El anfitrión es el reloj: responde con SU `t` (lo pone `sellar`).
      if (sala.soyAnfitrion) emitir('pong', { j: (p as MsgPing).j, c: (p as MsgPing).c })
      break
    case 'pong': {
      const m = p as MsgPong
      if (m.j !== sala.miRanura) break
      const salida = pingsEnVuelo.get(m.c)
      if (salida === undefined) break
      pingsEnVuelo.delete(m.c)
      reloj.muestra(performance.now() - salida, m.t)
      break
    }
    case 's':
    case 'i': {
      anotarJitter(de, (p as MsgS | MsgI).t)
      if (ev === 'i' && sala.soyAnfitrion) {
        // Se guarda el `t` del DUEÑO: es el que viaja dentro del `s` fundido y
        // con el que el árbitro rebobina para juzgar sus disparos.
        posesRemotas.set(de, { p: (p as MsgI).p, t: (p as MsgI).t, llegada: reloj.ahora() })
      }
      break
    }
    case 'sala':
      // La BD solo manda la revisión: el roster se relee, nunca viaja por el canal.
      void releerEstado()
      break
    case 'resync':
      anunciarAspecto()
      // Los bots solo los conoce el anfitrión: quien llegó tarde (o perdió el
      // mensaje) los dibujaría con el avatar por defecto.
      if (sala.soyAnfitrion) {
        for (const b of bots.values()) emitir('aspecto', { j: b.j, al: b.al, em: b.em, av: b.av })
        alPedirResync?.()
        for (const tema of (p as MsgResync).q) resyncPorTema.get(tema)?.()
      }
      break
    case 'aspecto': {
      const m = p as MsgAspecto
      if (/^j[0-3]$/.test(m.j)) apuntarJugador(m, m.j as Ranura)
      else {
        bots.set(m.j as BotId, { j: m.j as BotId, al: m.al, em: m.em, av: m.av })
        publicarBots()
      }
      // Con 3-4 ventanas el anfitrión es quien pone al día a los demás.
      if (sala.soyAnfitrion && direccion === 'subida') emitir('aspecto', { j: m.j, al: m.al, em: m.em, av: m.av })
      break
    }
    case 'salir':
      // Retirarse de la BATALLA no es salir de la SALA: sigue en la casa y su
      // cuerpo se sigue viendo. De darlo por fuera del juego se encarga el
      // motor, que recibe este mismo mensaje por la suscripción.
      if ((p as MsgSalir).r === 'batalla') break
      sala = { ...sala, jugadores: sala.jugadores.filter((j) => j.ranura !== de) }
      posesRemotas.delete(de)
      publicar()
      break
  }
}

/** Desviación entre lo que tardó en llegar y lo que decía su reloj: es el jitter. */
function anotarJitter(de: Ranura, t: number): void {
  const llegada = performance.now()
  const previo = ultimaPose.get(de)
  ultimaPose.set(de, { t, llegada })
  if (!previo) return
  // Su reloj retrocedió: recargó y volvió a entrar. Ni esto es jitter (mediría
  // el salto entero como desviación) ni su historial sigue valiendo.
  if (t < previo.t - RELOJ_ATRAS) {
    jitterPorRanura.delete(de)
    return
  }
  const desvio = Math.abs(llegada - previo.llegada - (t - previo.t))
  reloj.anotarJitter(desvio)
  let suyos = jitterPorRanura.get(de)
  if (!suyos) {
    suyos = []
    jitterPorRanura.set(de, suyos)
  }
  suyos.push(desvio)
  if (suyos.length > 40) suyos.shift()
}

/**
 * Retraso de interpolación que está usando ESE jugador: es la misma fórmula que
 * corre en su cliente (`reloj.retraso()`), con el jitter que se le mide aquí.
 * El árbitro lo resta al `t` de un disparo para juzgar contra la posición que
 * el tirador tenía delante, no contra la de ahora.
 */
export function retrasoDe(de: Ranura): number {
  const suyos = jitterPorRanura.get(de)
  if (!suyos || suyos.length === 0) return reloj.retraso()
  const orden = [...suyos].sort((a, b) => a - b)
  const p95 = orden[Math.min(orden.length - 1, Math.floor(orden.length * 0.95))]
  return Math.min(250, Math.max(80, p95 * 2 + reloj.intervaloPose()))
}

/**
 * Dónde estaba YO en ese instante de partida. Con menos historia que eso se
 * devuelve el extremo: la alternativa (no juzgar) sería peor que juzgar con la
 * posición más cercana que se tiene.
 */
export function posPropiaEn(t: number): { x: number; z: number } | null {
  const n = historiaPropia.length
  if (n === 0) return null
  const primera = historiaPropia[0]
  if (t <= primera.t) return { x: primera.x, z: primera.z }
  const ultima = historiaPropia[n - 1]
  if (t >= ultima.t) return { x: ultima.x, z: ultima.z }
  for (let i = n - 1; i > 0; i -= 1) {
    const a = historiaPropia[i - 1]
    const b = historiaPropia[i]
    if (a.t > t) continue
    const q = b.t > a.t ? (t - a.t) / (b.t - a.t) : 1
    return { x: a.x + (b.x - a.x) * q, z: a.z + (b.z - a.z) * q }
  }
  return { x: primera.x, z: primera.z }
}

function apuntarJugador(m: MsgAspecto, ranura: Ranura): void {
  if (!sala) return
  const jugador: JugadorSala = {
    ranura,
    equipo: ranura === RANURA_ANFITRION ? 0 : 1,
    estado: 'dentro',
    anfitrion: ranura === RANURA_ANFITRION,
    alias: m.al || null,
    nombre: m.al,
    emoji: m.em,
    retrato: null,
    aspecto: m.av,
  }
  const resto = sala.jugadores.filter((j) => j.ranura !== ranura)
  sala = { ...sala, jugadores: [...resto, jugador].sort((a, b) => a.ranura.localeCompare(b.ranura)) }
  reloj.fijarIntervaloEnvio(periodoPose(sala.juego, sala.jugadores.length))
  publicar()
}

/**
 * Pide lo que falta. Por defecto los aspectos (hueco de `seq`); los motores lo
 * llaman con `['w']` cuando detectan que se perdieron un mensaje con
 * consecuencia. Con tope: un hueco puede repetirse en cada frame.
 */
export function pedirResync(q: TemaResync[] = ['aspecto']): void {
  const t = performance.now()
  if (!sala || t - ultimoResync < RESYNC_MINIMO) return
  ultimoResync = t
  emitir('resync', { j: sala.miRanura, q })
}

// ─── salida ──────────────────────────────────────────────────────────────────

/**
 * Publica en el topic que corresponde a mi rol; añade `seq` a los fiables.
 * Devuelve el sello (`seq` y `t`) porque quien emite un `disparo` tiene que
 * anotarlo en la bola que acaba de crear: es lo que luego deduplica el
 * veredicto en la víctima.
 *
 * `tOriginal` conserva el reloj de un mensaje que se REEMITE (el anfitrión
 * baja los disparos de los invitados): sin él la bola nacería sin el adelanto
 * que le toca en los demás clientes.
 */
export function emitir(ev: Evento, datos: object, tOriginal?: number): { seq: number; t: number } {
  const t = tOriginal ?? reloj.ahora()
  if (!sala) return { seq: 0, t }
  let seq = 0
  if (FIABLES.has(ev)) {
    seq = (seqSalida.get(ev) ?? 0) + 1
    seqSalida.set(ev, seq)
  }
  const canal = sala.soyAnfitrion ? bajada : subida
  canal?.enviar(ev, sellar(ev, datos, t, seq))
  return { seq, t: Math.round(t) }
}

/** Suscripción de los motores de juego a un evento ya validado. */
export function alRecibir<E extends Evento>(ev: E, cb: (p: PayloadDe<E>, de: Ranura) => void): () => void {
  let cbs = suscriptores.get(ev)
  if (!cbs) {
    cbs = new Set()
    suscriptores.set(ev, cbs)
  }
  const fn = cb as (p: never, de: Ranura) => void
  cbs.add(fn)
  return () => {
    cbs.delete(fn)
  }
}

/**
 * Mi pose de este tick. El invitado manda `i`; el anfitrión funde la suya con
 * las últimas de los invitados y manda un solo `s` (un mensaje en vez de N).
 */
export function emitirPosePropia(p: PoseCuerpo): void {
  if (!sala) return
  const t = reloj.ahora()
  historiaPropia.push({ x: p.x, z: p.z, t })
  if (historiaPropia.length > MAX_HISTORIA) historiaPropia.shift()
  if (!sala.soyAnfitrion) {
    emitir('i', { j: sala.miRanura, p })
    return
  }
  const poses: Pose[] = [{ ...p, j: sala.miRanura }]
  for (const [r, m] of posesRemotas) {
    // Con el `t` del dueño: la pose de un invitado puede llevar aquí hasta un
    // periodo entero y fecharla con la mía la adelantaría ese periodo.
    if (t - m.llegada < POSE_FRESCA) poses.push({ ...m.p, j: r, t: m.t })
  }
  for (const extra of cuerposExtra?.() ?? []) poses.push(extra)
  emitir('s', { p: poses })
}

function anunciarAspecto(): void {
  // Con backend el aspecto sale del ROSTER (`partida_entrar` lo guardó en la BD):
  // no hace falta gastar un mensaje del canal en repetirlo.
  if (!sala || !enLocal) return
  const av = useDiseño.getState().avatar
  const ses = useSesion.getState()
  const etiqueta = (ses.alias || ses.nombre || av.nombre || sala.miRanura).slice(0, 64)
  emitir('aspecto', { j: sala.miRanura, al: etiqueta, em: ses.emoji || '🙂', av: podar(av) })
}

function medirReloj(veces: number): void {
  for (let i = 0; i < veces; i += 1) {
    setTimeout(() => {
      if (!sala || sala.soyAnfitrion) return
      contadorPing += 1
      const c = contadorPing
      pingsEnVuelo.set(c, performance.now())
      emitir('ping', { j: sala.miRanura, c })
    }, i * 120)
  }
}

/**
 * La pestaña se va (cerrar, recargar o irse a segundo plano en móvil, donde
 * `beforeunload` no dispara). Salida SILENCIOSA y a mejor esfuerzo: el `salir`
 * por el canal es lo que libera el asiento de la mesa y el cuerpo en la casa, y
 * el cierre en el servidor puede no llegar a completarse (la sala muere sola a
 * los 5 minutos sin latido). Como en `abandonarActual`, el anfitrión no lo
 * emite: un `salir` por la bajada lo descarta `leer`, y su sala se cierra con él.
 */
function alIrse(): void {
  if (!sala) return
  if (!sala.soyAnfitrion) emitir('salir', { j: sala.miRanura, r: 'contexto' })
  if (!enLocal) void cerrarEnServidor(sala.partidaId, sala.soyAnfitrion)
}

function alVisible(): void {
  if (document.visibilityState !== 'visible' || !sala) return
  // El WebView pudo suspender el reloj: se remide desde cero y se pide el estado.
  reloj.reiniciar()
  pingsEnVuelo.clear()
  medirReloj(3)
  if (enLocal) emitir('resync', { j: sala.miRanura, q: ['aspecto'] })
  else void releerEstado()
}

/**
 * Relee el roster con `partida_estado`. Lo dispara el evento `sala` de la BD y
 * cada (re)SUBSCRIBED de un canal. Mi propia entrada y los retratos cacheados se
 * conservan: `partida_estado` no devuelve ni la una ni los otros.
 */
async function releerEstado(): Promise<void> {
  const id = sala?.partidaId
  const mi = sala?.miRanura
  if (!id || !mi || enLocal) return
  const t = performance.now()
  if (t - ultimoReleer < RESYNC_MINIMO) return
  ultimoReleer = t
  try {
    const s = await api.estado(id, mi)
    if (sala?.partidaId !== id) return
    sala = { ...s, jugadores: conMiEntrada(s) }
    reloj.fijarIntervaloEnvio(periodoPose(sala.juego, sala.jugadores.length))
    publicar()
  } catch (e) {
    // Expulsado, bloqueado o sala cerrada: se sale de verdad, no se reintenta.
    if (e instanceof ErrorPartida && (e.codigo === 'no-encontrado' || e.codigo === 'expulsado')) {
      cerrarTodo()
      publicar()
    }
    // Cualquier otro fallo lo reconcilia el latido de 60 s.
  }
}

/**
 * Mi entrada del roster: `partida_estado` la trae sin retrato y `partida_crear`
 * no trae roster ninguno, así que se rellena aquí con la sesión y el avatar de
 * este dispositivo, que es donde vive la verdad de mi apariencia.
 */
function conMiEntrada(s: Sala): JugadorSala[] {
  const ses = useSesion.getState()
  const conRetrato = s.jugadores.map((j) => {
    if (j.retrato) retratos.set(j.ranura, j.retrato)
    return j.retrato ? j : { ...j, retrato: retratos.get(j.ranura) ?? null }
  })
  const mio = conRetrato.find((j) => j.ranura === s.miRanura)
  const yo: JugadorSala = {
    ranura: s.miRanura,
    equipo: mio?.equipo ?? (s.soyAnfitrion ? 0 : 1),
    estado: 'dentro',
    anfitrion: s.soyAnfitrion,
    alias: ses.alias,
    nombre: ses.nombre,
    emoji: ses.emoji,
    retrato: ses.retrato,
    aspecto: podar(useDiseño.getState().avatar),
  }
  return [...conRetrato.filter((j) => j.ranura !== s.miRanura), yo].sort((a, b) => a.ranura.localeCompare(b.ranura))
}

// ─── ciclo de vida ───────────────────────────────────────────────────────────

/**
 * Conecta a una sala ya abierta en el servidor. La `Sala` viene entera de
 * `partida_crear` / `partida_entrar`: ranura, roster con aspecto, apps, casa,
 * proto y revisión. La sala LOCAL de pruebas se la fabrica `conectarPartidaLocal`.
 */
export async function conectarSala(s: Sala): Promise<void> {
  // Cambiar de sala sin pasar por `desconectarSala` dejaría al anfitrión
  // anterior viéndome «dentro» hasta el GC de 5 minutos (y mi propia sala
  // abierta con invitados dentro si el que se va soy yo).
  abandonarActual('contexto')
  cerrarTodo()
  enLocal = partidaLocal() !== null
  if (s.soyAnfitrion) reloj.arrancarComoAnfitrion()
  else reloj.reiniciar()
  fijarMiRanura(s.miRanura)
  sala = { ...s, jugadores: conMiEntrada(s) }
  const tr = await abrirTransporte(s.partidaId, s.soyAnfitrion)
  bajada = tr.bajada
  subida = tr.subida
  for (const ev of EVENTOS) {
    bajada.on(ev, (p) => entra(ev, 'bajada', p))
    subida.on(ev, (p) => entra(ev, 'subida', p))
  }
  // Cada (re)conexión del canal relee el roster: lo emitido mientras estaba
  // caído no se repite (mismo criterio que el pull del buzón).
  bajada.alSuscribir?.(() => void releerEstado())
  subida.alSuscribir?.(() => void releerEstado())
  reloj.fijarIntervaloEnvio(periodoPose(sala.juego, sala.jugadores.length))
  document.addEventListener('visibilitychange', alVisible)
  window.addEventListener('pagehide', alIrse)
  publicar()
  if (enLocal) {
    anunciarAspecto()
    // Quien llega después se perdió los `aspecto` que ya se emitieron: pedirlos
    // al entrar es lo mismo que hace el buzón en cada `SUBSCRIBED`.
    emitir('resync', { j: sala.miRanura, q: ['aspecto'] })
  } else {
    latidoTimer = setInterval(() => void api.latido(s.partidaId).catch(() => undefined), LATIDO)
  }
  if (!s.soyAnfitrion) {
    medirReloj(3)
    pingTimer = setInterval(() => medirReloj(1), 20000)
  }
}

/** Abre una sala nueva en el servidor y se conecta a ella. */
export async function crearYConectar(juego: JuegoPartida, apps: readonly string[] = []): Promise<Sala> {
  const s = await api.crearPartida(juego, apps)
  await conectarSala(s)
  return s
}

/** Acepta una invitación: `partida_entrar` y conexión con la ranura que da el servidor. */
export async function entrarYConectar(partidaId: string): Promise<Sala> {
  const s = await api.entrar(partidaId)
  await conectarSala(s)
  return s
}

/**
 * Invita a un contacto a mi casa. Sin sala viva abre una de visita primero: el
 * botón de la lista de amigos es un solo gesto, no dos.
 */
export async function invitarAContacto(contactoId: string): Promise<void> {
  const id = sala?.soyAnfitrion === true ? sala.partidaId : (await crearYConectar('visita')).partidaId
  await api.invitar(id, contactoId)
}

/** Saca a alguien de MI sala por su ranura (nunca por uuid). */
export async function expulsarDeSala(ranura: Ranura): Promise<void> {
  if (!sala?.soyAnfitrion) return
  await api.expulsar(sala.partidaId, ranura)
}

/**
 * Sala LOCAL de pruebas (`?partidaLocal=<codigo>`): sin backend y con dos
 * ventanas del mismo navegador. La primera que llega no encuentra anfitrión y
 * se queda con `j0`; las siguientes le piden ranura por un canal aparte, que NO
 * es el protocolo (no existe fuera de este modo).
 */
export async function conectarPartidaLocal(codigo: string): Promise<void> {
  if (sala) return
  let canal: BroadcastChannel
  try {
    canal = new BroadcastChannel(`mph.partida.${codigo}.lobby`)
  } catch {
    return
  }
  const asignada = await new Promise<Ranura | null>((resolver) => {
    const espera = setTimeout(() => resolver(null), 600)
    canal.onmessage = (e: MessageEvent<unknown>) => {
      const d = e.data as { a?: unknown; ranura?: unknown } | null
      if (d?.a !== 'anfitrion' || typeof d.ranura !== 'string') return
      clearTimeout(espera)
      resolver(d.ranura as Ranura)
    }
    canal.postMessage({ q: 'quien-manda' })
  })
  const esAnfitrion = asignada === null
  if (esAnfitrion) {
    const dadas = new Set<Ranura>([RANURA_ANFITRION])
    canal.onmessage = (e: MessageEvent<unknown>) => {
      if ((e.data as { q?: unknown } | null)?.q !== 'quien-manda') return
      const libre = (['j1', 'j2', 'j3'] as Ranura[]).find((r) => !dadas.has(r))
      if (!libre) return
      dadas.add(libre)
      canal.postMessage({ a: 'anfitrion', ranura: libre })
    }
  } else {
    canal.close()
  }
  // Sin servidor no hay `partida_entrar`: la sala se fabrica con lo mínimo y el
  // roster se completa con los `aspecto` que anuncia cada ventana.
  await conectarSala({
    partidaId: codigo,
    juego: 'visita',
    soyAnfitrion: esAnfitrion,
    miRanura: asignada ?? RANURA_ANFITRION,
    apps: [],
    casa: false,
    proto: VERSION_PROTO,
    rev: 1,
    jugadores: [],
  })
  // DESPUÉS de conectar: `conectarSala` empieza cerrando lo que hubiera abierto.
  if (esAnfitrion) lobby = canal
}

/** Deja la sala viva de verdad (canal + servidor). No limpia memoria ni publica. */
function abandonarActual(motivo: 'boton' | 'contexto' | 'error'): void {
  if (!sala) return
  if (!sala.soyAnfitrion) emitir('salir', { j: sala.miRanura, r: motivo })
  if (!enLocal) void cerrarEnServidor(sala.partidaId, sala.soyAnfitrion)
}

export function desconectarSala(motivo: 'boton' | 'contexto' | 'error'): void {
  if (!sala) return
  abandonarActual(motivo)
  cerrarTodo()
  publicar()
}

/**
 * El anfitrión borra el plano ANTES de `partida_salir`: Storage no borra el
 * archivo físico cuando muere la fila, así que este es el único momento en el
 * que se limpia de verdad (C2). Un fallo no importa: la sala muere sola por
 * falta de latido y el huérfano queda acotado a ≤4 MB.
 */
async function cerrarEnServidor(partidaId: string, eraAnfitrion: boolean): Promise<void> {
  try {
    if (eraAnfitrion) await api.borrarPlano(partidaId)
    await api.salir(partidaId)
  } catch {
    // Sin red la sala se cierra sola a los 5 minutos sin latido.
  }
}

function cerrarTodo(): void {
  if (pingTimer) clearInterval(pingTimer)
  pingTimer = null
  if (latidoTimer) clearInterval(latidoTimer)
  latidoTimer = null
  document.removeEventListener('visibilitychange', alVisible)
  window.removeEventListener('pagehide', alIrse)
  bajada?.cerrar()
  subida?.cerrar()
  bajada = null
  subida = null
  lobby?.close()
  lobby = null
  seqSalida.clear()
  seqEntrada.clear()
  pingsEnVuelo.clear()
  posesRemotas.clear()
  ultimaPose.clear()
  jitterPorRanura.clear()
  historiaPropia.length = 0
  retratos.clear()
  bots.clear()
  publicarBots()
  ultimoReleer = 0
  fijarMiRanura(null)
  sala = null
}
