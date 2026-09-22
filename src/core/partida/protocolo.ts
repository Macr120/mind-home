/**
 * Protocolo de partida: nombres de evento, qué lleva `seq`, quién puede emitir
 * cada cosa, y la LECTURA defensiva de lo que llega por el canal.
 *
 * `leer` nunca lanza: valida forma, versión y rangos, y devuelve null si el
 * mensaje no sirve. Un mensaje inválido se cuenta y se tira en silencio, porque
 * corre dentro del frame y una excepción aquí congelaría la escena.
 */
import type {
  BotId,
  JuegoMesa,
  Marcador,
  MsgAccion,
  MsgAspecto,
  MsgB,
  MsgPartido,
  MsgDisparo,
  MsgFin,
  MsgI,
  MsgJugada,
  MsgMesa,
  MsgPing,
  MsgPong,
  MsgPunto,
  MsgResync,
  MsgS,
  MsgSala,
  MsgSalir,
  MsgSentar,
  MsgVeredicto,
  MsgVuelo,
  MsgW,
  Pose,
  PoseCuerpo,
  Ranura,
  JuegoPartida,
} from './tipos'

export const VERSION_PROTO = 1

export type Evento =
  | 's'
  | 'i'
  | 'ping'
  | 'pong'
  | 'resync'
  | 'sala'
  | 'aspecto'
  | 'disparo'
  | 'veredicto'
  | 'w'
  | 'vuelo'
  | 'b'
  | 'punto'
  | 'salir'
  | 'fin'
  | 'mesa'
  | 'sentar'
  | 'jugada'
  | 'partido'
  | 'accion'

export interface PayloadPorEvento {
  s: MsgS
  i: MsgI
  ping: MsgPing
  pong: MsgPong
  resync: MsgResync
  sala: MsgSala
  aspecto: MsgAspecto
  disparo: MsgDisparo
  veredicto: MsgVeredicto
  w: MsgW
  vuelo: MsgVuelo
  b: MsgB
  punto: MsgPunto
  salir: MsgSalir
  fin: MsgFin
  mesa: MsgMesa
  sentar: MsgSentar
  jugada: MsgJugada
  partido: MsgPartido
  accion: MsgAccion
}

export type PayloadDe<E extends Evento> = PayloadPorEvento[E]

/** Dirección por la que llegó (o va a salir) un mensaje. */
export type Direccion = 'bajada' | 'subida'

/** Eventos con consecuencia: llevan `seq` y activan la detección de huecos. */
export const FIABLES: ReadonlySet<Evento> = new Set<Evento>([
  'disparo',
  'veredicto',
  'w',
  'vuelo',
  'punto',
  'salir',
  'fin',
  'mesa',
  'sentar',
  'jugada',
  'partido',
  'accion',
])

/**
 * Eventos que SOLO puede emitir el anfitrión (defensa en cliente además de la
 * policy). `aspecto` NO está: el invitado declara su propia apariencia por la
 * subida y el anfitrión la reemite (mismo camino que `disparo`). Es cosmética,
 * acotada y validada campo a campo contra el catálogo local.
 *
 * `jugada` tampoco puede estar: viaja en las DOS direcciones (el invitado la
 * propone, el árbitro la reemite aceptada). Lo que la distingue es el firmante,
 * y eso lo comprueba `armar` (`j` por la subida, `de` por la bajada).
 *
 * `vuelo` SÍ está: en las canchas el invitado manda su INTENCIÓN (`accion`) y
 * es el árbitro quien resuelve el vuelo. El raquetazo del tenis (F7) tampoco
 * sube: viaja como `accion { q:'golpe' }` con el `t` en que su ventana estaba
 * abierta, y el árbitro rebobina la pelota hasta ahí para ejecutarlo.
 */
export const SOLO_ANFITRION: ReadonlySet<Evento> = new Set<Evento>([
  's',
  'pong',
  'veredicto',
  'w',
  'b',
  'vuelo',
  'punto',
  'fin',
  'mesa',
  'partido',
])

/** Media anchura del mapa en unidades: fuera de esto la pose es basura. */
const MAPA = 200
const VEL_MAX = 8
const NIV_MAX = 6
/** Vidas de una batalla de paintball (`VIDAS_PAINTBALL`). */
const VIDAS_MAX = 3
/** Cuerpos de una sala: 4 ranuras + 5 bots. También es el tope de equipos. */
const CUERPOS_MAX = 9

// Canchas. Las coordenadas son LOCALES de la cancha (la mayor mide 25×15), así
// que ±100 deja sitio de sobra a una cancha escalada y nada a un mensaje roto.
const CANCHA = 100
/** Velocidad de la pelota: `FUERZA_BASE + FUERZA_RANGO` son 19 y el chanfle no la dobla. */
const PELOTA_VEL = 60
const CHANFLE_MAX = 10
/** Tope de cada casilla del marcador (puntos, juegos y sets). */
const MARCA_MAX = 99

/** Topes de la mesa: el tablero entero y una jugada suelta. */
const MESA_ESTADO = 32 * 1024
const MESA_JUGADA = 4 * 1024
/** Jugadas de una mesa: con 100 000 se acaba antes la paciencia que el contador. */
const MESA_N_MAX = 1e5
const MESA_HONDURA = 8

let invalidosN = 0

/** Mensajes descartados por `leer` desde que arrancó la pestaña (HUD de DEV). */
export function invalidos(): number {
  return invalidosN
}

function malo(): null {
  invalidosN += 1
  return null
}

function num(v: unknown, min: number, max: number): number | null {
  return typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max ? v : null
}

function texto(v: unknown, tope: number): string | null {
  return typeof v === 'string' && v.length <= tope ? v : null
}

function esRanura(v: unknown): v is Ranura {
  return v === 'j0' || v === 'j1' || v === 'j2' || v === 'j3'
}

function esCuerpo(v: unknown): v is Ranura | BotId {
  return esRanura(v) || (typeof v === 'string' && /^b[0-4]$/.test(v))
}

function esBot(v: unknown): v is BotId {
  return typeof v === 'string' && /^b[0-4]$/.test(v)
}

/** Terna de números acotados (origen, dirección, punto de impacto). */
function trio(v: unknown, tope: number): [number, number, number] | null {
  if (!Array.isArray(v) || v.length !== 3) return null
  const x = num(v[0], -tope, tope)
  const y = num(v[1], -tope, tope)
  const z = num(v[2], -tope, tope)
  return x === null || y === null || z === null ? null : [x, y, z]
}

/** Pareja de números acotados (la velocidad que conserva el bote de la pelota). */
function par(v: unknown, tope: number): [number, number] | null {
  if (!Array.isArray(v) || v.length !== 2) return null
  const a = num(v[0], -tope, tope)
  const b = num(v[1], -tope, tope)
  return a === null || b === null ? null : [a, b]
}

/** Descriptor de un vuelo parabólico (`juegoCanchaStore.ts:45-55`), sin su `t`. */
function leerVuelo(v: unknown): MsgVuelo['f'] | null {
  if (typeof v !== 'object' || v === null) return null
  const o = v as Record<string, unknown>
  const x0 = num(o.x0, -CANCHA, CANCHA)
  const y0 = num(o.y0, -CANCHA, CANCHA)
  const z0 = num(o.z0, -CANCHA, CANCHA)
  const x1 = num(o.x1, -CANCHA, CANCHA)
  const y1 = num(o.y1, -CANCHA, CANCHA)
  const z1 = num(o.z1, -CANCHA, CANCHA)
  const dur = num(o.dur, 0.01, 30)
  const alto = num(o.alto, -CANCHA, CANCHA)
  if (x0 === null || y0 === null || z0 === null || x1 === null || y1 === null) return null
  if (z1 === null || dur === null || alto === null) return null
  return { x0, y0, z0, x1, y1, z1, dur, alto }
}

/** Marcador slot-relativo: una fila por ranura, nunca egocéntrico en el cable. */
function leerMarcador(v: unknown): Marcador[] | null {
  if (!Array.isArray(v) || v.length === 0 || v.length > 4) return null
  const filas: Marcador[] = []
  for (const bruta of v as unknown[]) {
    if (typeof bruta !== 'object' || bruta === null) return null
    const f = bruta as Record<string, unknown>
    const p = num(f.p, 0, MARCA_MAX)
    const ju = num(f.ju, 0, MARCA_MAX)
    const se = num(f.se, 0, MARCA_MAX)
    if (!esRanura(f.j) || p === null || ju === null || se === null) return null
    filas.push({ j: f.j, p, ju, se })
  }
  return filas
}

/** Los campos de cuerpo de una pose, ya acotados. null si alguno no cuadra. */
function leerPose(o: Record<string, unknown>): PoseCuerpo | null {
  const x = num(o.x, -MAPA, MAPA)
  const z = num(o.z, -MAPA, MAPA)
  const h = num(o.h, -Math.PI * 2, Math.PI * 2)
  const vel = num(o.vel, 0, VEL_MAX)
  const niv = num(o.niv, 0, NIV_MAX)
  const f = num(o.f, 0, 15)
  if (x === null || z === null || h === null || vel === null || niv === null || f === null) return null
  return { x, z, h, vel, niv, f: Math.trunc(f) }
}

/** Filas de jugador de `w` y de `fin` (solo ranuras: los bots van en `bo`). */
function leerFilasW(v: unknown): { j: Ranura; eq: number; vid: number; fue: 0 | 1; imp: number }[] | null {
  if (!Array.isArray(v) || v.length > 4) return null
  const filas: { j: Ranura; eq: number; vid: number; fue: 0 | 1; imp: number }[] = []
  for (const bruta of v as unknown[]) {
    if (typeof bruta !== 'object' || bruta === null) return null
    const f = bruta as Record<string, unknown>
    const eq = num(f.eq, 0, 3)
    const vid = num(f.vid, 0, VIDAS_MAX)
    const imp = num(f.imp, 0, 9999)
    if (!esRanura(f.j) || eq === null || vid === null || imp === null) return null
    // `fue` puede no venir en `fin` (su fila no lo lleva): se deduce de las vidas.
    const fue = f.fue === undefined ? (vid <= 0 ? 1 : 0) : f.fue
    if (fue !== 0 && fue !== 1) return null
    filas.push({ j: f.j, eq, vid, fue, imp })
  }
  return filas
}

/** Bots del anfitrión dentro de `w`: son cuerpos del mundo, no jugadores. */
function leerBots(v: unknown): { j: BotId; vivo: 0 | 1; col: string; eq: number }[] | null {
  if (!Array.isArray(v) || v.length > 5) return null
  const bots: { j: BotId; vivo: 0 | 1; col: string; eq: number }[] = []
  for (const bruto of v as unknown[]) {
    if (typeof bruto !== 'object' || bruto === null) return null
    const b = bruto as Record<string, unknown>
    const col = texto(b.col, 16)
    const eq = num(b.eq, 0, CUERPOS_MAX)
    if (!esBot(b.j) || col === null || eq === null) return null
    if (b.vivo !== 0 && b.vivo !== 1) return null
    bots.push({ j: b.j, vivo: b.vivo, col, eq })
  }
  return bots
}

function esJuegoMesa(v: unknown): v is JuegoMesa {
  return v === 'c4' || v === 'damas' || v === 'ajedrez' || v === 'cartas'
}

/** Datos de la mesa: objeto/array de valores llanos, sin funciones ni `__proto__`. */
function formaLlana(v: unknown, hondura: number): boolean {
  if (v === null) return true
  const tipo = typeof v
  if (tipo === 'string' || tipo === 'boolean') return true
  if (tipo === 'number') return Number.isFinite(v)
  if (tipo !== 'object' || hondura === 0) return false
  if (Array.isArray(v)) return v.every((x) => formaLlana(x, hondura - 1))
  if (Object.getPrototypeOf(v) !== Object.prototype) return false
  for (const [clave, valor] of Object.entries(v as Record<string, unknown>)) {
    if (clave === '__proto__' || !formaLlana(valor, hondura - 1)) return false
  }
  return true
}

/**
 * Estado o jugada de una mesa. Aquí solo se comprueba que sea un dato llano y
 * que quepa: la LEGALIDAD la decide el reductor del juego en el árbitro, que es
 * el único que conoce las reglas.
 */
function datosMesa(v: unknown, tope: number): object | null {
  if (typeof v !== 'object' || v === null) return null
  if (!formaLlana(v, MESA_HONDURA)) return null
  let sobre: string
  try {
    sobre = JSON.stringify(v) ?? ''
  } catch {
    return null
  }
  return sobre.length > 0 && sobre.length <= tope ? (v as object) : null
}

/**
 * Valida forma, `v`, rangos y dirección. `direccion` es por la que ENTRÓ el
 * mensaje: un evento de `SOLO_ANFITRION` que llegue por el topic de subida se
 * descarta (broadcast no firma al emisor).
 */
export function leer<E extends Evento>(ev: E, bruto: unknown, direccion: Direccion): PayloadDe<E> | null {
  if (typeof bruto !== 'object' || bruto === null) return malo()
  const o = bruto as Record<string, unknown>
  if (o.v !== VERSION_PROTO) return malo()
  if (direccion === 'subida' && SOLO_ANFITRION.has(ev)) return malo()
  // `sala` la emite la BD y no lleva reloj de partida; el resto sí.
  const t = ev === 'sala' ? 0 : num(o.t, -1e9, 1e9)
  if (t === null) return malo()
  let seq = 0
  if (FIABLES.has(ev)) {
    const s = num(o.seq, 1, Number.MAX_SAFE_INTEGER)
    if (s === null || !Number.isInteger(s)) return malo()
    seq = s
  }
  const salida = armar(ev, o, t, seq, direccion)
  return salida === null ? malo() : (salida as PayloadDe<E>)
}

function armar(ev: Evento, o: Record<string, unknown>, t: number, seq: number, direccion: Direccion): object | null {
  switch (ev) {
    case 's': {
      if (!Array.isArray(o.p) || o.p.length > 9) return null
      const p: Pose[] = []
      for (const bruto of o.p as unknown[]) {
        if (typeof bruto !== 'object' || bruto === null) return null
        const c = bruto as Record<string, unknown>
        const cuerpo = leerPose(c)
        if (!cuerpo || !esCuerpo(c.j)) return null
        // `t` por cuerpo (opcional): la pose de un invitado que el anfitrión
        // funde en su `s` conserva el reloj con el que la mandó su dueño.
        if (c.t === undefined) {
          p.push({ ...cuerpo, j: c.j })
          continue
        }
        const tc = num(c.t, -1e9, 1e9)
        if (tc === null) return null
        p.push({ ...cuerpo, j: c.j, t: tc })
      }
      return { v: VERSION_PROTO, t, p }
    }
    case 'i': {
      if (typeof o.p !== 'object' || o.p === null || !esRanura(o.j)) return null
      const p = leerPose(o.p as Record<string, unknown>)
      return p && { v: VERSION_PROTO, t, j: o.j, p }
    }
    case 'ping':
    case 'pong': {
      const c = num(o.c, 0, 1e9)
      if (c === null || !esRanura(o.j)) return null
      return { v: VERSION_PROTO, t, j: o.j, c }
    }
    case 'resync': {
      if (!Array.isArray(o.q) || o.q.length > 5 || !esRanura(o.j)) return null
      const q = (o.q as unknown[]).filter(
        (x) => x === 'w' || x === 'aspecto' || x === 'sala' || x === 'mesa' || x === 'partido',
      )
      return q.length === o.q.length ? { v: VERSION_PROTO, t, j: o.j, q } : null
    }
    case 'sala': {
      const r = num(o.r, 1, 1e9)
      return r === null ? null : { v: VERSION_PROTO, r }
    }
    case 'aspecto': {
      const al = texto(o.al, 64)
      const em = texto(o.em, 16)
      if (!esCuerpo(o.j) || al === null || em === null) return null
      if (typeof o.av !== 'object' || o.av === null) return null
      // El aspecto lo valida campo a campo `aspecto.aAvatar` contra el catálogo
      // local: aquí solo se comprueba que quepa (el tope del servidor es 4 KB).
      return { v: VERSION_PROTO, t, j: o.j, al, em, av: o.av }
    }
    case 'salir': {
      const r = o.r
      if (!esRanura(o.j)) return null
      if (r !== 'boton' && r !== 'contexto' && r !== 'error' && r !== 'batalla') return null
      // Nadie puede retirar a otro: un `salir` de la bajada sería el anfitrión
      // expulsando por su cuenta, y eso lo dice la BD con `sala`.
      if (direccion === 'bajada') return null
      return { v: VERSION_PROTO, t, seq, j: o.j, r }
    }
    case 'disparo': {
      const origen = trio(o.o, MAPA)
      const u = trio(o.u, 1.01)
      const c = texto(o.c, 16)
      const e = num(o.e, -1, CUERPOS_MAX)
      const y = num(o.y, -50, 50)
      if (!esCuerpo(o.j) || !origen || !u || c === null || e === null || y === null) return null
      // La dirección viaja YA resuelta y normalizada (el raycast cámara→cursor
      // no es reproducible fuera de su cliente): una que no lo esté es basura.
      const n = Math.hypot(u[0], u[1], u[2])
      if (n < 0.9 || n > 1.1) return null
      return { v: VERSION_PROTO, t, seq, j: o.j, o: origen, u, c, e, y }
    }
    case 'veredicto': {
      const pi = trio(o.pi, MAPA)
      const vid = num(o.vid, 0, VIDAS_MAX)
      const ds = num(o.ds, 0, Number.MAX_SAFE_INTEGER)
      const c = texto(o.c, 16)
      if (!esCuerpo(o.de) || !esCuerpo(o.vi) || !pi || vid === null || ds === null || c === null) return null
      if (o.fue !== 0 && o.fue !== 1) return null
      return { v: VERSION_PROTO, t, seq, ds, de: o.de, vi: o.vi, vid, fue: o.fue, pi, c }
    }
    case 'w': {
      const rel = num(o.rel, -10, 36000)
      if (rel === null) return null
      if (o.fa !== 'cuenta' && o.fa !== 'jugando' && o.fa !== 'fin') return null
      const js = leerFilasW(o.js)
      if (!js) return null
      const bo = o.bo === undefined ? undefined : leerBots(o.bo)
      if (bo === null) return null
      if (js.length + (bo?.length ?? 0) > CUERPOS_MAX) return null
      return { v: VERSION_PROTO, t, seq, rel, fa: o.fa, js, ...(bo ? { bo } : {}) }
    }
    case 'fin': {
      const eq = num(o.eq, -1, CUERPOS_MAX)
      const js = leerFilasW(o.js)
      if (eq === null || !js) return null
      if (o.mo !== 'normal' && o.mo !== 'abandono' && o.mo !== 'corte') return null
      return { v: VERSION_PROTO, t, seq, eq, js, mo: o.mo }
    }
    case 'mesa': {
      const n = num(o.n, 0, MESA_N_MAX)
      const e = datosMesa(o.e, MESA_ESTADO)
      if (!esJuegoMesa(o.g) || n === null || !Number.isInteger(n) || e === null) return null
      if (o.ac !== 'abrir' && o.ac !== 'estado' && o.ac !== 'cerrar') return null
      if (!esRanura(o.a) || (o.b !== null && !esRanura(o.b))) return null
      return { v: VERSION_PROTO, t, seq, g: o.g, ac: o.ac, a: o.a, b: o.b, n, e }
    }
    case 'sentar': {
      if (!esJuegoMesa(o.g) || !esRanura(o.j)) return null
      if (o.ac !== 'abrir' && o.ac !== 'sentar' && o.ac !== 'levantar') return null
      // Pedir asiento es cosa de quien lo pide: por la bajada sería el anfitrión
      // sentando a otro, y eso no existe.
      if (direccion === 'bajada') return null
      return { v: VERSION_PROTO, t, seq, j: o.j, g: o.g, ac: o.ac }
    }
    case 'jugada': {
      const n = num(o.n, 0, MESA_N_MAX)
      const m = datosMesa(o.m, MESA_JUGADA)
      if (!esJuegoMesa(o.g) || n === null || !Number.isInteger(n) || m === null) return null
      // Por la subida firma quien propone; por la bajada va el asiento cuya
      // jugada aceptó el árbitro. Nunca las dos cosas.
      if (direccion === 'subida') {
        if (!esRanura(o.j) || o.de !== undefined) return null
        return { v: VERSION_PROTO, t, seq, j: o.j, g: o.g, n, m }
      }
      if (!esRanura(o.de) || o.j !== undefined) return null
      return { v: VERSION_PROTO, t, seq, de: o.de, g: o.g, n, m }
    }
    case 'partido': {
      const ci = num(o.ci, 1, 1e9)
      if (ci === null || !Number.isInteger(ci) || !esRanura(o.ri)) return null
      if (o.cl !== 'futbol' && o.cl !== 'basket' && o.cl !== 'tenis') return null
      if (o.ac !== 'abrir' && o.ac !== 'cerrar') return null
      return { v: VERSION_PROTO, t, seq, ci, cl: o.cl, ac: o.ac, ri: o.ri }
    }
    case 'accion': {
      const dx = num(o.dx, -1.01, 1.01)
      const dz = num(o.dz, -1.01, 1.01)
      if (!esRanura(o.j) || dx === null || dz === null) return null
      if (o.q !== 'chut' && o.q !== 'tiro' && o.q !== 'golpe') return null
      // La dirección viaja ya resuelta en coordenadas de la cancha y unitaria:
      // una que no lo esté es basura (mismo criterio que el `disparo`).
      const n = Math.hypot(dx, dz)
      if (n < 0.9 || n > 1.1) return null
      // La intención es de quien la tiene: por la bajada sería el árbitro
      // chutando en nombre de otro, y eso no existe.
      if (direccion === 'bajada') return null
      if (o.q === 'golpe') {
        // Raquetazo de tenis: la calidad la midió el timing de quien golpeó y el
        // árbitro la ejecuta con ella (no vuelve a tirar dados por él).
        const ca = par(o.ca, 1)
        if (ca === null || ca[0] < 0 || ca[1] < 0) return null
        return { v: VERSION_PROTO, t, seq, j: o.j, q: o.q, dx, dz, ca }
      }
      const fu = num(o.fu, 0, 1)
      const ch = num(o.ch, -CHANFLE_MAX, CHANFLE_MAX)
      if (fu === null || ch === null) return null
      return { v: VERSION_PROTO, t, seq, j: o.j, q: o.q, fu, ch, dx, dz }
    }
    case 'b': {
      const bx = num(o.bx, -CANCHA, CANCHA)
      const bz = num(o.bz, -CANCHA, CANCHA)
      const vx = num(o.vx, -PELOTA_VEL, PELOTA_VEL)
      const vz = num(o.vz, -PELOTA_VEL, PELOTA_VEL)
      const ch = num(o.ch, -CHANFLE_MAX, CHANFLE_MAX)
      if (bx === null || bz === null || vx === null || vz === null || ch === null) return null
      // `du` es una RANURA (o nadie): el `'yo'`/`'rival'` del juego lo resuelve
      // cada cliente en su borde, nunca viaja egocéntrico.
      if (o.du !== null && !esRanura(o.du)) return null
      return { v: VERSION_PROTO, t, bx, bz, vx, vz, ch, du: o.du }
    }
    case 'vuelo': {
      const f = leerVuelo(o.f)
      const bv = par(o.bv, PELOTA_VEL)
      const eb = num(o.eb, 0, 20)
      if (!esRanura(o.j) || f === null || bv === null || eb === null) return null
      if (o.q !== 'saque' && o.q !== 'golpe' && o.q !== 'tiro' && o.q !== 'chut') return null
      const pu = o.pu === undefined ? undefined : num(o.pu, 0, 3)
      if (pu === null) return null
      return { v: VERSION_PROTO, t, seq, j: o.j, q: o.q, f, bv, eb, ...(pu === undefined ? {} : { pu }) }
    }
    case 'punto': {
      const mk = leerMarcador(o.mk)
      if (!esRanura(o.g) || mk === null) return null
      if (o.mo !== null && o.mo !== 'red' && o.mo !== 'fuera') return null
      return { v: VERSION_PROTO, t, seq, g: o.g, mk, mo: o.mo }
    }
    default:
      return null
  }
}

/** Numera y sella: añade `v`, `t` y, si el evento es fiable, `seq`. */
export function sellar(ev: Evento, datos: object, t: number, seq = 0): object {
  const sobre: Record<string, unknown> = { ...datos, v: VERSION_PROTO, t: Math.round(t) }
  if (FIABLES.has(ev)) sobre.seq = seq
  return sobre
}

/**
 * Periodo de emisión de pose en ms (§2.3): pasear 5 Hz, canchas y royale 10 Hz,
 * duelo de paintball 12 Hz. La supresión por delta y el keepalive de 1 s los
 * aplica `EmisorPose` encima de esto.
 */
export function periodoPose(juego: JuegoPartida, jugadores: number): number {
  if (juego === 'visita') return 200
  if (juego === 'paintball' && jugadores <= 2) return 83
  return 100
}
