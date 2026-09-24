/**
 * Motor del partido de CANCHA en línea (F5: fútbol 1v1). Es el cable entre la
 * sala y el minijuego: abre y cierra el partido, traduce ranura↔egocéntrico en
 * el BORDE (quién lleva la pelota, el marcador) y deja en una bandeja lo que
 * dicta el árbitro, que `house/minijuegos.tsx` aplica dentro de su tick, que es
 * donde vive el marco de la cancha.
 *
 * Reparto de autoridad (B1): el árbitro es dueño de la PELOTA —posesión, robos,
 * rodada, chanfle y goles— y cada cliente es dueño de su cuerpo y de su
 * intención. El invitado NO integra física: aplica `b`, `vuelo` y `punto`, y
 * entre dos mensajes la pelota suelta avanza con la última velocidad que le
 * dictaron (dead reckoning, como los cuerpos remotos), sin fricción, sin
 * bandas y sin goles: de eso decide el árbitro.
 */
import { claseDeCancha, dentroDeCancha, esCancha, type ClaseCancha } from '../state/canchasStore'
import { esObjetoMapa, useDiseño } from '../state/disenoStore'
import { juegoFrame, registrarSalidaOnline, useJuegoCancha } from '../state/juegoCanchaStore'
import { playerPos } from '../state/playerPosition'
import { remotosFrame, type CuerpoRemoto } from '../state/remotosFrame'
import { tGlobal } from '../i18n/useT'
import { cambiarJuego } from './api'
import { usePartida } from './partidaStore'
import { marcadorLocal, miRanura, type MarcadorPartido } from './ranuras'
import * as reloj from './reloj'
import { alRecibir, emitir, fijarJuego, pedirResync, registrarResync, salaViva, soyArbitro } from './sala'
import type { ClaseCanchaRed, JuegoPartida, MsgB, MsgPunto, MsgVuelo, Ranura } from './tipos'

/** El vuelo tal como lo guarda el frame del juego (`juegoCanchaStore.ts:45`). */
export type VueloCancha = NonNullable<typeof juegoFrame.vuelo>

/**
 * Un vuelo que dictó el árbitro, ya en egocéntrico. `pu` son los puntos que
 * anota al aterrizar (básquet) y `undefined` que el tiro NO acaba en ese vuelo.
 */
export interface VueloRecibido {
  v: VueloCancha
  bvx: number
  bvz: number
  quien: 'yo' | 'rival'
  pu: number | undefined
  /** Energía que le queda al bote (tenis): sin ella el primer bote ya diverge. */
  eb: number
  /**
   * Reloj de PARTIDA en que arrancó el vuelo. El tenis no integra el vuelo por
   * dt: cada frame lo fija a `(ahora() - t)/1000`, y así la misma parábola
   * recorre el mismo punto en el mismo instante en los dos clientes.
   */
  t: number
}

/**
 * El raquetazo de un invitado (tenis). Cada quien decide SU golpe: aquí llega
 * fechado (`t`, el instante de partida en que su ventana estaba abierta), con
 * su frente en coordenadas de la cancha y con la calidad que midió su propio
 * timing. El árbitro rebobina la pelota a ese `t`, comprueba la ventana y lo
 * ejecuta con esa calidad; nunca tira él los dados por el invitado.
 */
export interface GolpeRecibido {
  t: number
  dx: number
  dz: number
  cy: number
  cal: number
}

/** Juego de sala que le toca a cada clase de cancha (el béisbol es solo bateo). */
const JUEGO_POR_CLASE: Record<ClaseCanchaRed, JuegoPartida> = {
  futbol: 'futbol',
  basket: 'basquet',
  tenis: 'tenis',
}

/** Periodo del `b` mientras la pelota está suelta (10 Hz, §2.3 del plan). */
const PERIODO_B = 100
/** Salto de pelota que NO se interpola: es una reubicación (un robo, un gol). */
const SALTO_PELOTA = 2
/**
 * Margen alrededor de la cancha dentro del cual se acepta un partido que abren
 * en otra pantalla. Va por debajo del `MARGEN_ABANDONO` del runtime (10 m), que
 * es el que decide cuándo se abandona: entrar desde más lejos sería entrar y
 * salir en el mismo segundo, y de paso cerrarle el partido al otro.
 */
const CERCA_PARTIDO = 8
/**
 * Reintentos del reenganche y su espera. Con una sola petición, el 3 % de
 * pérdida deja el partido inalcanzable (visto al probar: un `resync` perdido y
 * el invitado se queda en la cancha sin que pase nada). Con tope: si el árbitro
 * no contesta es que ya no hay partido, y no se le pregunta para siempre.
 */
const REENGANCHE_ESPERA = 2000
const REENGANCHE_INTENTOS = 3

interface PartidoVivo {
  /** Id del objeto de mapa de la cancha: el mismo en las dos casas. */
  ci: number
  cl: ClaseCanchaRed
  /** El rival TAL COMO viaja: el invitado que eligió el árbitro. */
  ri: Ranura
  /** Mi rival: ese mismo si arbitro, el anfitrión si soy el invitado. */
  rival: Ranura
}

let partido: PartidoVivo | null = null
/** Partido que conozco pero no estoy jugando: se retoma al pisar esa cancha. */
let pendiente: number | null = null
let reenganches = 0
let ultimoReenganche = 0
/** Cómo salí del partido: por el BOTÓN (definitivo) o por un contexto roto. */
let retirado: 'boton' | 'contexto' | null = null
/** El último que cerré: es lo que se contesta a un `resync` ya sin partido. */
let ultimoCerrado: PartidoVivo | null = null
let ultimaB = 0
/** Dueño de la pelota que se difundió por última vez (`undefined` = ninguno aún). */
let ultimoDu: Ranura | null | undefined
let bPend: MsgB | null = null
let vueloPend: VueloRecibido | null = null
let puntoPend: { quien: 'yo' | 'rival'; marcador: MarcadorPartido; mo: 'red' | 'fuera' | null } | null = null
let chutPend: { dx: number; dz: number; fu: number; ch: number } | null = null
/** Raquetazo del invitado, con el `t` al que hay que rebobinar la pelota. */
let golpePend: GolpeRecibido | null = null

function limpiarBandeja(): void {
  bPend = null
  vueloPend = null
  puntoPend = null
  chutPend = null
  golpePend = null
  ultimoDu = undefined
}

/** Cómo se llama quien ocupa una ranura, para los avisos del HUD. */
function etiquetaDe(r: Ranura): string {
  const j = salaViva()?.jugadores.find((x) => x.ranura === r)
  if (!j) return r
  return j.alias ? `@${j.alias}` : j.nombre || r
}

function avisar(texto: string): void {
  useJuegoCancha.getState().avisarOnline(texto)
}

/** Cuerpo del rival tal como lo dejó el interpolador (coordenadas de MUNDO). */
export function cuerpoRival(): CuerpoRemoto | null {
  return partido ? (remotosFrame[partido.rival] ?? null) : null
}

// ─── abrir y cerrar (solo el árbitro) ────────────────────────────────────────

/**
 * Abre el partido contra un rival de la sala. Lo llama la tarjeta «Partido en
 * línea» del marcador, que es la única que lo ofrece, y solo en el anfitrión.
 */
export function abrirPartido(canchaId: number, clase: ClaseCancha, rival: Ranura): void {
  const sala = salaViva()
  if (!sala?.soyAnfitrion || clase === 'beisbol') return
  partido = { ci: canchaId, cl: clase, ri: rival, rival }
  esperarPartido(null)
  retirado = null
  ultimoCerrado = null
  limpiarBandeja()
  emitir('partido', { ci: canchaId, cl: clase, ac: 'abrir', ri: rival })
  cambiarJuegoDeSala(JUEGO_POR_CLASE[clase])
}

/**
 * La sala pasa a este juego. `fijarJuego` es lo que adelanta la tasa de pose a
 * 10 Hz en este cliente sin esperar el rebote del servidor (y lo único que hay
 * en la sala local de pruebas); la RPC es la verdad para los que lleguen luego.
 */
function cambiarJuegoDeSala(juego: JuegoPartida): void {
  const sala = salaViva()
  if (!sala) return
  fijarJuego(juego)
  void cambiarJuego(sala.partidaId, juego).catch(() => undefined)
}

/** Cierra el partido para los dos y devuelve la sala a pasear. Solo el árbitro. */
export function cerrarPartido(): void {
  const p = partido
  if (!p || !soyArbitro()) return
  ultimoCerrado = p
  emitir('partido', { ci: p.ci, cl: p.cl, ac: 'cerrar', ri: p.ri })
  cambiarJuegoDeSala('visita')
  terminarEnLocal()
}

/**
 * Fin por marcador (los 21 del básquet): cierra para los dos. Al invitado se lo
 * dice el `cerrar`; aquí hay que decirlo a mano, porque el árbitro se queda sin
 * HUD y sin una palabra en el mismo frame en que gana.
 */
export function cerrarPartidoPorMarcador(): void {
  if (!partido || !soyArbitro()) return
  avisar(tGlobal('juego.online.cerrado', 'El partido en línea terminó.'))
  cerrarPartido()
}

/** Suelta el partido en ESTE cliente (sin avisar a nadie) y cierra su HUD. */
function terminarEnLocal(): void {
  partido = null
  limpiarBandeja()
  // La sala vuelve a pasear: sin esto seguiría emitiendo pose a 10 Hz. En el
  // invitado es además lo único que lo baja (la RPC la manda el anfitrión).
  fijarJuego('visita')
  const st = useJuegoCancha.getState()
  // El store vuelve a llamar aquí por el embudo de `terminar`, pero para
  // entonces `partido` ya es null y no hay nada más que soltar.
  if (st.canchaId != null) st.terminar('boton')
}

/**
 * Salida del partido por el embudo del store (botón o contexto roto). El
 * ÁRBITRO lo cierra para los dos —en 1v1 sin rival no hay partido—; el INVITADO
 * se retira él solo con `salir { r:'batalla' }`, que no lo saca de la sala: la
 * casa del anfitrión sigue ahí, y su cuerpo también.
 */
registrarSalidaOnline((motivo) => {
  const p = partido
  if (!p) return
  if (soyArbitro()) {
    cerrarPartido()
    return
  }
  const mia = miRanura()
  partido = null
  esperarPartido(motivo === 'contexto' ? p.ci : null)
  retirado = motivo
  limpiarBandeja()
  fijarJuego('visita')
  if (mia) emitir('salir', { j: mia, r: 'batalla' })
})

/**
 * Vuelve a pedir el partido del que me salí (o el que abrieron mientras estaba
 * lejos). Lo llama el runtime al pisar la cancha: es el gesto que reengancha,
 * el mismo que en el paintball hace `volverAMirarBatalla`.
 */
export function reengancharPartido(canchaId: number): void {
  if (partido || pendiente !== canchaId || retirado === 'boton') return
  const t = performance.now()
  if (reenganches >= REENGANCHE_INTENTOS || t - ultimoReenganche < REENGANCHE_ESPERA) return
  ultimoReenganche = t
  reenganches += 1
  pedirResync(['partido'])
}

/** Un partido del que solo sé que existe: queda esperando a que pise la cancha. */
function esperarPartido(ci: number | null): void {
  pendiente = ci
  reenganches = 0
  ultimoReenganche = 0
}

// ─── lo que llega ────────────────────────────────────────────────────────────

/** Un partido que abre el árbitro en SU pantalla: busco esa cancha en la mía. */
function abrirComoInvitado(ci: number, cl: ClaseCanchaRed, ri: Ranura, de: Ranura): void {
  // El partido es entre el anfitrión y otro de la sala: no es mío.
  if (ri !== miRanura()) return
  if (partido?.ci === ci) return
  const cancha = useDiseño.getState().objetos.find((o) => o.id === ci && esObjetoMapa(o) && esCancha(o.tipo))
  if (!cancha) {
    esperarPartido(null)
    avisar(tGlobal('juego.online.enCasaDe', 'El partido es en la MindHaOS de {quien}', { quien: etiquetaDe(de) }))
    return
  }
  if (!dentroDeCancha(cancha, playerPos.x, playerPos.z, CERCA_PARTIDO)) {
    // Entrar desde el otro extremo de la casa sería salirse en el mismo segundo
    // (y de paso cerrarle el partido al otro): queda esperando a que la pise.
    esperarPartido(ci)
    retirado = null
    avisar(tGlobal('juego.online.acercate', 'Acércate a la cancha: {quien} te espera', { quien: etiquetaDe(de) }))
    return
  }
  const st = useJuegoCancha.getState()
  if (st.canchaId != null) st.terminar('boton')
  partido = { ci, cl, ri, rival: de }
  esperarPartido(null)
  retirado = null
  limpiarBandeja()
  fijarJuego(JUEGO_POR_CLASE[cl])
  const rival = salaViva()?.jugadores.find((x) => x.ranura === de)
  useJuegoCancha.getState().empezarOnline(ci, claseDeCancha(cancha.tipo), {
    id: de,
    nombre: rival?.alias ?? rival?.nombre ?? de,
    color: rival?.aspecto.torso,
  })
}

alRecibir('partido', (p, de) => {
  if (p.ac === 'cerrar') {
    if (partido?.ci !== p.ci) return
    esperarPartido(null)
    retirado = null
    avisar(tGlobal('juego.online.cerrado', 'El partido en línea terminó.'))
    terminarEnLocal()
    return
  }
  abrirComoInvitado(p.ci, p.cl, p.ri, de)
})

alRecibir('b', (p) => {
  if (partido) bPend = p
})

alRecibir('vuelo', (p: MsgVuelo) => {
  if (!partido) return
  // El vuelo nace ADELANTADO lo que lleva en el aire desde que su dueño golpeó
  // (misma cuenta que la bola de paintball): su recta es exacta, así que llega
  // a su destino a tiempo aunque el mensaje haya tardado.
  const edad = Math.max(0, Math.min((reloj.ahora() - p.t) / 1000, p.f.dur))
  vueloPend = {
    v: { ...p.f, t: edad },
    bvx: p.bv[0],
    bvz: p.bv[1],
    quien: p.j === miRanura() ? 'yo' : 'rival',
    pu: p.pu,
    eb: p.eb,
    t: p.t,
  }
})

alRecibir('punto', (p: MsgPunto) => {
  if (!partido) return
  puntoPend = { quien: p.g === miRanura() ? 'yo' : 'rival', marcador: marcadorLocal(p.mk), mo: p.mo }
})

alRecibir('accion', (p, de) => {
  if (!partido || !soyArbitro() || de !== partido.rival) return
  if (p.q === 'golpe') {
    // Raquetazo de tenis: NO es una intención que se ejecuta cuando llega, sino
    // un golpe fechado. El `t` es el instante de partida en que su ventana
    // estaba abierta y el tick rebobina la pelota hasta ahí. Solo se guarda el
    // más TEMPRANO de los que lleguen en el mismo frame: si dos golpes compiten,
    // el árbitro ya se queda con el primero.
    const g = { t: p.t, dx: p.dx, dz: p.dz, cy: p.ca?.[0] ?? 0, cal: p.ca?.[1] ?? 0 }
    if (!golpePend || g.t < golpePend.t) golpePend = g
    return
  }
  // El tiro al aro del «21» viaja por aquí con la misma forma que el chut: solo
  // cambia el gesto, y el chanfle que no tiene llega en cero.
  chutPend = { dx: p.dx, dz: p.dz, fu: p.fu ?? 0, ch: p.ch ?? 0 }
})

alRecibir('salir', (_p, de) => {
  if (!partido || !soyArbitro() || de !== partido.rival) return
  // 1v1: sin rival no hay partido, se haya ido de la batalla o de la sala.
  avisar(tGlobal('juego.online.rivalSalio', '{quien} dejó el partido.', { quien: etiquetaDe(de) }))
  cerrarPartido()
})

/**
 * Solo el árbitro puede volver a contar el partido. Se contesta también su
 * AUSENCIA: a quien se le perdió el `cerrar` se le quedó una pelota congelada.
 */
registrarResync(() => {
  const p = partido ?? ultimoCerrado
  if (!p) return
  emitir('partido', { ci: p.ci, cl: p.cl, ac: partido ? 'abrir' : 'cerrar', ri: p.ri })
}, 'partido')

usePartida.subscribe((s) => {
  // El partido vive dentro de la sala: si se cierra, no puede quedar un rival
  // fantasma corriendo por la cancha.
  if (!s.sala && partido) {
    esperarPartido(null)
    retirado = null
    terminarEnLocal()
  }
})

// ─── la pelota ───────────────────────────────────────────────────────────────

/**
 * Difunde la pelota. A 10 Hz mientras está SUELTA; mientras alguien la dribla
 * no viaja un solo mensaje (se deriva de la pose de su dueño con el mismo lerp
 * en los dos clientes) y solo se avisa el CAMBIO de dueño.
 */
export function latirPelota(): void {
  if (!partido || !soyArbitro()) return
  const f = juegoFrame
  const du = f.duena === 'nadie' ? null : f.duena === 'yo' ? miRanura() : partido.rival
  const ahora = performance.now()
  if (du === ultimoDu && (du !== null || ahora - ultimaB < PERIODO_B)) return
  ultimoDu = du
  ultimaB = ahora
  emitir('b', { bx: f.bx, bz: f.bz, vx: f.bvx, vz: f.bvz, ch: f.chanfle, du })
}

/**
 * La pelota del invitado: lo que dictó el árbitro y, entre dos mensajes, dead
 * reckoning sobre esa misma velocidad. Un salto grande se obedece de golpe
 * (es una reubicación: un robo, un gol); lo pequeño se alcanza en dos frames,
 * que es lo que suaviza el chut propio cuando vuelve corregido.
 */
export function pelotaDelArbitro(dt: number): void {
  const f = juegoFrame
  const b = bPend
  if (!b) {
    if (f.duena === 'nadie') {
      f.bx += f.bvx * dt
      f.bz += f.bvz * dt
    }
    return
  }
  bPend = null
  f.bvx = b.vx
  f.bvz = b.vz
  f.chanfle = b.ch
  // Aquí y en `punto` es donde la ranura se vuelve egocéntrica: dentro del
  // juego `duena === 'yo'` sigue significando «la tengo yo» en los dos clientes.
  f.duena = b.du === null ? 'nadie' : b.du === miRanura() ? 'yo' : 'rival'
  if (Math.hypot(b.bx - f.bx, b.bz - f.bz) > SALTO_PELOTA) {
    f.bx = b.bx
    f.bz = b.bz
    return
  }
  f.bx += (b.bx - f.bx) * 0.5
  f.bz += (b.bz - f.bz) * 0.5
}

/** Un chut elevado que dictó el árbitro (o null). Lo aplica el tick. */
export function tomarVuelo(): VueloRecibido | null {
  const v = vueloPend
  vueloPend = null
  return v
}

/** Un gol (o un punto de tenis, con su falta) que dictó el árbitro, en egocéntrico. */
export function tomarPunto(): {
  quien: 'yo' | 'rival'
  marcador: MarcadorPartido
  mo: 'red' | 'fuera' | null
} | null {
  const p = puntoPend
  puntoPend = null
  return p
}

/**
 * La intención de chut del invitado (o null). Se consume SIEMPRE, aunque el
 * árbitro ya le hubiera quitado la pelota: guardada, saldría un chut tarde.
 */
export function tomarChutRival(): { dx: number; dz: number; fu: number; ch: number } | null {
  const c = chutPend
  chutPend = null
  return c
}

/**
 * El raquetazo del invitado (o null). Se consume SIEMPRE: un golpe guardado se
 * ejecutaría un peloteo tarde, y el árbitro ya decidió el punto sin él.
 */
export function tomarGolpeRival(): GolpeRecibido | null {
  const g = golpePend
  golpePend = null
  return g
}

// ─── lo que sale ─────────────────────────────────────────────────────────────

/** Chut del invitado: viaja la INTENCIÓN y el árbitro la ejecuta. */
export function chutarEnLinea(dir: { x: number; z: number }, carga: number, chanfle: number): void {
  const mia = miRanura()
  if (!partido || !mia || soyArbitro()) return
  const n = Math.hypot(dir.x, dir.z) || 1
  emitir('accion', {
    j: mia,
    q: 'chut',
    fu: Math.min(1, Math.max(0, carga)),
    ch: chanfle,
    dx: dir.x / n,
    dz: dir.z / n,
  })
}

/**
 * Tiro al aro del invitado (el «21» de básquet). Viaja la CARGA, que es lo
 * único que decide el tiro —el alcance—, porque la parábola apunta siempre a la
 * canasta. `dx`/`dz` es su frente, que el protocolo pide unitario; chanfle no
 * hay.
 */
export function tirarEnLinea(dir: { x: number; z: number }, carga: number): void {
  const mia = miRanura()
  if (!partido || !mia || soyArbitro()) return
  const n = Math.hypot(dir.x, dir.z) || 1
  emitir('accion', {
    j: mia,
    q: 'tiro',
    fu: Math.min(1, Math.max(0, carga)),
    ch: 0,
    dx: dir.x / n,
    dz: dir.z / n,
  })
}

/**
 * Una pelota por el aire que dicta el árbitro (suya o ejecutada por cuenta del
 * rival). `q` dice de qué gesto salió y `eb` la energía que le quede al botar;
 * los valores por defecto son los del chut de fútbol, que fue el primero.
 * `pu` son los puntos que anotará ese vuelo al aterrizar (básquet): sin él, el
 * tiro NO termina ahí (pegó en el tablero y sigue el segundo vuelo).
 */
export function emitirVuelo(
  quien: 'yo' | 'rival',
  v: VueloCancha,
  bvx: number,
  bvz: number,
  q: MsgVuelo['q'] = 'chut',
  pu?: number,
  eb = 0,
): void {
  if (!partido || !soyArbitro()) return
  const j = quien === 'yo' ? miRanura() : partido.rival
  if (!j) return
  emitir('vuelo', {
    j,
    q,
    f: { x0: v.x0, y0: v.y0, z0: v.z0, x1: v.x1, y1: v.y1, z1: v.z1, dur: v.dur, alto: v.alto },
    bv: [bvx, bvz],
    eb,
    ...(pu === undefined ? {} : { pu }),
  })
}

/**
 * El saque o el golpe de tenis. No es `emitirVuelo` porque el raquetazo viaja
 * con el `t` ORIGINAL del golpe —el del invitado cuando el árbitro lo rebobina,
 * el de este frame cuando golpea el árbitro—: es ese `t` el que hace que la
 * parábola arranque en el mismo instante de partida en los dos clientes, y sin
 * él el invitado la vería nacer un ping tarde y con otra trayectoria.
 */
export function emitirVueloTenis(
  quien: 'yo' | 'rival',
  v: VueloCancha,
  bvx: number,
  bvz: number,
  eb: number,
  q: 'saque' | 'golpe',
  t: number,
): void {
  if (!partido || !soyArbitro()) return
  const j = quien === 'yo' ? miRanura() : partido.rival
  if (!j) return
  emitir(
    'vuelo',
    {
      j,
      q,
      f: { x0: v.x0, y0: v.y0, z0: v.z0, x1: v.x1, y1: v.y1, z1: v.z1, dur: v.dur, alto: v.alto },
      bv: [bvx, bvz],
      eb,
    },
    t,
  )
}

/**
 * Raquetazo del invitado: viaja fechado y el árbitro lo ejecuta rebobinando.
 * `t` no es «ahora» sino el instante de partida de la pelota que vio al golpear
 * (el punto exacto de su parábola): con el `t` del envío, el árbitro rebobinaría
 * a una pelota un frame más adelantada que la que él tuvo delante.
 */
export function golpearEnLinea(dir: { x: number; z: number }, cy: number, cal: number, t: number): void {
  const mia = miRanura()
  if (!partido || !mia || soyArbitro()) return
  const n = Math.hypot(dir.x, dir.z) || 1
  emitir(
    'accion',
    {
      j: mia,
      q: 'golpe',
      dx: dir.x / n,
      dz: dir.z / n,
      ca: [Math.min(1, Math.max(0, cy)), Math.min(1, Math.max(0, cal))],
    },
    t,
  )
}

/**
 * Un gol. El marcador viaja SLOT-RELATIVO (nunca egocéntrico en el cable) y con
 * el estado completo: quien se pierda un `punto` se recoloca con el siguiente.
 * `mo` es la falta que lo cerró (tenis): con ella el que lo recibe dice por qué
 * lo regaló, sin tener que juzgar él la red ni la línea.
 */
export function emitirPunto(quien: 'yo' | 'rival', mo: 'red' | 'fuera' | null = null): void {
  const mia = miRanura()
  if (!partido || !mia || !soyArbitro()) return
  const s = useJuegoCancha.getState()
  emitir('punto', {
    g: quien === 'yo' ? mia : partido.rival,
    mk: [
      { j: mia, p: s.yo, ju: s.juegosYo, se: s.setsYo },
      { j: partido.rival, p: s.rival, ju: s.juegosRival, se: s.setsRival },
    ],
    mo,
  })
}

if (import.meta.env.DEV) {
  ;(window as unknown as { partidoCancha: () => PartidoVivo | null }).partidoCancha = () => partido
  // Abrir el partido a mano: la tarjeta del marcador pide tener la cancha bajo
  // los pies y el panel abierto, y en dos ventanas eso no se puede automatizar.
  ;(window as unknown as { abrirPartidoCancha: typeof abrirPartido }).abrirPartidoCancha = abrirPartido
}
