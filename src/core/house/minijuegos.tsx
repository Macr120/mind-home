import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { useDiseño, esObjetoMapa } from '../state/disenoStore'
import { useCanchas, CANCHAS, PORTERIA, CANASTA, BEISBOL, radioBeisbol, esCancha, claseDeCancha, escalaCancha } from '../state/canchasStore'
import { useJuegoCancha, juegoFrame, poseBateo, orientarBateo } from '../state/juegoCanchaStore'
import { useAsistentes } from '../state/asistentesStore'
import { useHouse } from '../state/houseStore'
import { useLayout } from '../state/layoutStore'
import { playerPos, playerForward } from '../state/playerPosition'
import { monturaFrame } from '../state/monturaStore'
import { trenFrame } from '../state/trenStore'
import { parqueFrame } from '../state/parqueStore'
import { useCaminos } from '../state/caminosStore'
import { useHuerto } from '../state/huertoStore'
import { useGranja } from '../state/granjaStore'
import { usePaintball } from '../state/paintballStore'
import { soyArbitro } from '../partida/sala'
import {
  cerrarPartidoPorMarcador,
  chutarEnLinea,
  cuerpoRival,
  emitirPunto,
  emitirVuelo,
  emitirVueloTenis,
  golpearEnLinea,
  latirPelota,
  pelotaDelArbitro,
  reengancharPartido,
  tirarEnLinea,
  tomarChutRival,
  tomarGolpeRival,
  tomarPunto,
  tomarVuelo,
} from '../partida/cancha'
import type { GolpeRecibido, VueloRecibido } from '../partida/cancha'
import * as reloj from '../partida/reloj'
import type { MarcadorPartido } from '../partida/ranuras'
import { lanzarCohete } from './fuegos'
import { ModeloMascota } from './Asistente3D'
import { Prendas } from './Prendas'
import { anclasDe } from './apariencia'
import type { ObjetoCuarto } from '../data/db'
import type { ClaseCancha } from '../state/canchasStore'

/**
 * Minijuegos de cancha: al caminar dentro de una cancha se elige modo (solo o
 * contra un asistente) y dificultad, y aparece la pelota (y el rival, con el
 * modelo 3D del asistente elegido). Fútbol: patea la pelota y anota. Básquet:
 * toma la pelota y quédate quieto para tirar al aro. Tenis: partido al mejor de
 * 3 sets con saque alternado, red y bola fuera de verdad — apuntas con el frente
 * del avatar y el timing del golpe decide si sale profunda o se queda corta; o
 * contra el FRONTÓN (la media cancha rival se levanta como muro) al jugar solo.
 * Béisbol: SOLO bateo — la máquina (o el asistente pitcher) lanza desde el
 * montículo y un toque batea; la calidad del contacto decide foul, hit o
 * cuadrangular sobre la barda. La física corre en coordenadas LOCALES de la
 * cancha.
 */

/** Dificultad activa (0 = muy fácil, 1 = experto). */
const dif = () => useJuegoCancha.getState().dificultad
/**
 * El rival es otra PERSONA (partido en línea) y no la IA. Con un humano enfrente
 * no corre ninguna máquina de rival y `dif()` queda fuera de las disputas: la
 * dificultad regula a la IA, no reparte ventaja entre dos jugadores.
 */
const rivalHumano = () => useJuegoCancha.getState().modo === 'online'
/** Altura a la que flota el asistente rival sobre la cancha. */
const FLOTE_RIVAL = 1.0

interface Marco {
  o: ObjetoCuarto
  clase: ClaseCancha
  esc: number
  rad: number
  cos: number
  sin: number
  /** Medio largo / medio ancho locales (ya escalados). */
  L: number
  W: number
  /** Altura mundial del piso de la cancha. */
  sueloY: number
}

function marcoDe(o: ObjetoCuarto): Marco {
  const clase = claseDeCancha(o.tipo)
  const def = CANCHAS[clase]
  const esc = escalaCancha(o.escala)
  const rad = ((o.rotY ?? 0) * Math.PI) / 180
  return {
    o,
    clase,
    esc,
    rad,
    cos: Math.cos(rad),
    sin: Math.sin(rad),
    L: (def.largo * esc) / 2,
    W: (def.ancho * esc) / 2,
    sueloY: 0.2 + 0.13 * esc,
  }
}

const aLocal = (m: Marco, wx: number, wz: number) => {
  const dx = wx - (m.o.x ?? 0)
  const dz = wz - (m.o.z ?? 0)
  return { x: dx * m.cos - dz * m.sin, z: dx * m.sin + dz * m.cos }
}

const aMundo = (m: Marco, x: number, z: number) => ({
  x: x * m.cos + z * m.sin + (m.o.x ?? 0),
  z: -x * m.sin + z * m.cos + (m.o.z ?? 0),
})

/** Como aLocal pero para un VECTOR dirección (sin traslación), normalizado. */
const dirLocal = (m: Marco, v: THREE.Vector3) => {
  const x = v.x * m.cos - v.z * m.sin
  const z = v.x * m.sin + v.z * m.cos
  const n = Math.hypot(x, z) || 1
  return { x: x / n, z: z / n }
}

const dentro = (m: Marco, wx: number, wz: number) => {
  const p = aLocal(m, wx, wz)
  return Math.abs(p.x) <= m.L && Math.abs(p.z) <= m.W
}

/**
 * Margen alrededor de la cancha dentro del cual el partido sigue vivo: pisar
 * fuera de la línea (perseguir un balón que salió rodando) no corta el juego,
 * pero alejarse más allá sí lo termina solo.
 */
const MARGEN_ABANDONO = 10

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v))

// ─── Estado auxiliar del juego (module-level, se resetea al empezar) ───

let saquePendiente = false
let ladoCaida: 1 | -1 = 1
/** El vuelo de tenis actual va hacia el frontón (rebota al llegar). */
let haciaMuro = false
/** Falta del último golpe de tenis; se cobra al aterrizar la pelota. */
let faltaTenis: null | 'red' | 'fuera' = null
/** Quién dio el último golpe de tenis (a quién se le cobra la falta). */
let golpeoTenis: 'yo' | 'rival' = 'rival'
/** Velocidad horizontal del vuelo de tenis en curso: el bote conserva parte de ella. */
let velBoteX = 0
let velBoteZ = 0
/** Tenis contra la IA: el saque de este juego es tuyo (cambia de mano cada juego). */
let sacaJugador = true
let tiroRX = 0
let tiroRZ = 0
let tiroElegido = false
/**
 * Posición LOCAL del frame anterior POR JUGADOR ('yo' y el rival remoto): el
 * chanfle sale del movimiento de quien golpea, y con un solo registro el del
 * remoto se calcularía con el movimiento del anfitrión.
 */
const _prevP: Record<'yo' | 'rival', THREE.Vector3> = {
  yo: new THREE.Vector3(),
  rival: new THREE.Vector3(),
}
/** Altura del próximo bote de la pelota de tenis; decae en cada rebote. */
let energiaBote = 1.5
/**
 * Tenis en línea: instante de PARTIDA en que arrancó el vuelo que corre ahora
 * (null fuera de línea). Con él el vuelo no avanza por frames sino por reloj,
 * y la misma parábola pasa por el mismo punto en los dos clientes aunque uno
 * pierda frames: es lo que hace exacto el rebobinado del golpe.
 */
let t0VueloTenis: number | null = null
/** Instante de partida del último golpe (o saque) que aceptó el árbitro. */
let tGolpeTenis = 0
/** Ya se repitió el vuelo de este golpe (ver `REPETIR_VUELO`). */
let reenviadoTenis = false
/**
 * Cuándo repite el árbitro el `vuelo` del golpe. Es el mensaje decisivo del
 * tenis —sin él el invitado sigue con la trayectoria vieja hasta el golpe
 * siguiente— y con 3 % de pérdida se cae uno de cada treinta y tres. Repetirlo
 * una vez, ya empezado, sale por un mensaje más por golpe y es idempotente:
 * lleva el mismo `t` y el invitado que ya lo tiene no lo vuelve a aplicar.
 */
const REPETIR_VUELO = 150
/**
 * Anillo de estados de la pelota del ÁRBITRO. El golpe del invitado llega
 * fechado y aquí se busca dónde estaba la pelota en ese instante: sin rebobinar
 * habría que juzgarlo contra la pelota de ahora, que con 150 ms de ping ya no
 * es la que él vio. Se guarda por TIEMPO y no por número de muestras: a 144 fps
 * treinta estados no llegan ni a un ping.
 */
const anilloTenis: EstadoPelota[] = []
/** Cuánta pelota recuerda el árbitro hacia atrás (ms de partida). */
const MEMORIA_TENIS = 800
/** Golpes descartados por llegar después de otro ya resuelto (HUD de DEV). */
let dobleGolpeTenis = 0

/** La pelota de tenis en un instante: posición y de quién es la ventana abierta. */
interface EstadoPelota {
  t: number
  x: number
  y: number
  z: number
  /** Lado en el que va a caer (+1 = x local positiva). */
  cae: 1 | -1
  muro: boolean
  falta: null | 'red' | 'fuera'
}
/** ms época del último robo de balón (fútbol): evita quitar/perder en ráfaga. */
let ultimoRoboFut = 0
/** Velocidad remanente de un chut elevado al aterrizar (sigue rodando). */
let vueloFutVX = 0
let vueloFutVZ = 0
/** Strikes acumulados del turno de bateo (a los 3 es ponche). */
let strikesBeis = 0
/** El vuelo actual de béisbol es un batazo (si no, es el lanzamiento). */
let bolaBateada = false

// Tiempos de carga (s) y rangos de fuerza; valores arcade, ajustables al probar.
const T_CARGA = 1.05
const OFF_DRIB = 0.65
const FUERZA_BASE = 7
const FUERZA_RANGO = 12
const K_CHANFLE = 0.55
const UMBRAL_ELEVADO = 0.55
// Disputas SIMÉTRICAS: las que se juegan entre dos PERSONAS usan un solo radio
// para los dos y un solo ritmo de robo, sin `dif()`. Contra la IA se conservan
// los números de siempre (radios 1.0/0.9 en fútbol y 0.95/0.85 en básquet, y
// ritmos con `dif()`), que son los que le dan su curva de dificultad.
/** Radio de la disputa de la pelota suelta en fútbol (media de 1.0 y 0.9). */
const DISPUTA_RADIO = 0.95
/** Radio de recogida del balón en básquet (media de 0.95 y 0.85). */
const RECOGIDA_RADIO = 0.9
/** Radio del robo de balón y su ritmo (robos por segundo) entre humanos. */
const ROBO_RADIO = 1.1
const ROBO_RITMO = 2.8
const BAS_ALC_MIN = 2
const BAS_ALC_MAX = 12
/** Cuánto te puedes pasar de largo y aun así dar en el tablero (m locales). */
const REBOTE_VENTANA = 1.3
/** Pasándote menos que esto, el tablero te la mete: tiro de tabla. */
const REBOTE_DENTRO = 0.65
const GOLPE_RADIO = 2.6
const FACTOR_BOTE = 0.62
const Y_MIN_GOLPE = 0.15
const Y_MAX_GOLPE = 1.7
/** Metros que desvía la pelota de tenis por cada m/s de movimiento lateral al golpear. */
const K_CHANFLE_TENIS = 0.35
/** Altura de la red: es parte de la cancha, así que escala con ella. */
const RED_ALTO = 1.0
// Punto dulce del golpe de tenis (altura de la pelota y distancia al cuerpo, en
// metros del avatar: no escalan con la cancha) y su tolerancia. La distancia
// solo penaliza estirarse: tener la pelota encima es un golpe cómodo.
const TENIS_Y_DULCE = 0.8
const TENIS_Y_TOL = 0.95
const TENIS_D_DULCE = 1.1
const TENIS_D_TOL = 1.6
/** Metros que el golpe pasa sobre la red, de un timing pésimo (negativo = red) a uno perfecto. */
const MARGEN_RED_MIN = -0.3
const MARGEN_RED_RANGO = 1.25
/** Hasta dónde alcanza la raqueta del rival, y a qué distancia golpea cómodo. */
const TENIS_ALCANCE_RIVAL = 2.3
const TENIS_COMODO_RIVAL = 1.3
/** Mira del tenis: girando este ángulo desde la red apuntas del centro a la banda. */
const ANG_MIRA = 0.62
/** Parte de la velocidad horizontal que conserva la pelota de tenis en cada bote. */
const K_BOTE = 0.42
const N_ARCO = 16 // vértices de la línea de trayectoria del básquet
// Béisbol: radio de la ventana de bateo, distancia dulce del contacto y
// tolerancia (qué tan lejos del punto dulce aún conecta algo).
const BATE_RADIO = 2.2
const BATE_IDEAL = 0.9
const BATE_TOL = 1.5
/** Caja de bateo (local, sin escalar): a un costado del plato, dentro de su área. */
const CAJA_X = BEISBOL.home + 0.5
const CAJA_Z = -1.1
/** Fuerza del batazo según la carga del botón: sin carga apenas rueda, full se va a la barda. */
const BATE_POT_MIN = 0.55
const BATE_POT_RANGO = 0.85

/** Mide la velocidad lateral de un jugador (perpendicular a su frente) para el chanfle. */
function medirStrafe(
  quien: 'yo' | 'rival',
  fwd: { x: number; z: number },
  p: { x: number; z: number },
  dt: number,
) {
  const f = juegoFrame
  const prev = _prevP[quien]
  const lateral = ((p.x - prev.x) * -fwd.z + (p.z - prev.z) * fwd.x) / Math.max(dt, 1e-3)
  if (quien === 'yo') f.strafe = THREE.MathUtils.lerp(f.strafe, lateral, 0.3)
  else f.strafeRival = THREE.MathUtils.lerp(f.strafeRival, lateral, 0.3)
  prev.set(p.x, 0, p.z)
}

/**
 * Disputa de la pelota entre los dos jugadores: gana el MÁS CERCANO dentro del
 * mismo radio y el empate exacto no se lo lleva nadie. Sustituye al orden de
 * evaluación (que le daba la pelota al local con solo estar en rango) y a los
 * radios distintos para cada uno. Sin `dif()`: entre personas no hay dificultad
 * que repartir. Es determinista, así que el árbitro y el invitado coinciden.
 */
function disputar(dYo: number, dRival: number, radio: number): 'yo' | 'rival' | 'nadie' {
  const alcanzaYo = dYo < radio
  const alcanzaRival = dRival < radio
  if (alcanzaYo && alcanzaRival) {
    if (dYo === dRival) return 'nadie'
    return dYo < dRival ? 'yo' : 'rival'
  }
  if (alcanzaYo) return 'yo'
  return alcanzaRival ? 'rival' : 'nadie'
}

if (import.meta.env.DEV) {
  // Mismo gesto que `bolasPaintball`: sin esto el reparto de la disputa no se
  // puede medir desde la consola.
  ;(window as unknown as { disputarCancha: typeof disputar }).disputarCancha = disputar
}

function reiniciarJuego(m: Marco) {
  const f = juegoFrame
  f.bx = 0
  f.bz = 0
  f.bvx = 0
  f.bvz = 0
  f.by = 0
  f.vuelo = null
  f.duena = 'nadie'
  f.rFase = 0
  f.rVel = 0
  f.muro = 0
  f.swing = 0
  f.rSwing = 0
  f.cargando = false
  f.carga = 0
  f.soltar = false
  f.golpe = false
  f.chanfle = 0
  f.strafe = 0
  f.strafeRival = 0
  f.bote = 0
  f.botesTenis = 0
  f.enVentana = false
  f.anclaActiva = false
  f.anclaSnap = false
  f.anclaSoltada = false
  f.aroPulso = 0
  f.tableroPulso = 0
  f.bateando = m.clase === 'beisbol'
  saquePendiente = false
  haciaMuro = false
  faltaTenis = null
  golpeoTenis = 'rival'
  velBoteX = 0
  velBoteZ = 0
  sacaJugador = true
  tiroElegido = false
  energiaBote = 1.5
  t0VueloTenis = null
  tGolpeTenis = 0
  anilloTenis.length = 0
  pendiente = null
  rebotePend = null
  tiroRemoto = null
  const pl0 = aLocal(m, playerPos.x, playerPos.z)
  _prevP.yo.set(pl0.x, 0, pl0.z)
  _prevP.rival.set(0, 0, 0)
  // `solo` = no hay nadie enfrente. En línea SÍ hay rival (otra persona), así
  // que los tiempos de arranque son los del partido con rival, no los del solo.
  const solo = useJuegoCancha.getState().modo === 'solo'
  if (m.clase === 'futbol') {
    // El rival arranca en su mitad (defiende la portería de −L, ataca la de +L).
    f.rx = -m.L * 0.5
    f.rz = 0
  } else if (m.clase === 'basket') {
    f.rx = m.L * 0.4
    f.rz = m.W * 0.35
  } else if (m.clase === 'beisbol') {
    // El pitcher (o la máquina) espera en el montículo con la bola en la mano.
    const montX = BEISBOL.monticulo * m.esc
    f.rx = montX
    f.rz = 0
    f.bx = montX
    f.by = 1.2
    strikesBeis = 0
    bolaBateada = false
    f.proximoEvento = performance.now() + (solo ? 1200 : 1800)
    // El bateador se planta en la caja de bateo, junto al home y mirando al
    // montículo. `anclaSnap` lo coloca de golpe (llegaste caminando y el lerp lo
    // dejaba a medio camino) y el destino de caminata se cancela: si no, el clic
    // que te trajo hasta aquí seguiría tirando de él fuera de la caja.
    const caja = aMundo(m, CAJA_X * m.esc, CAJA_Z * m.esc)
    f.anclaX = caja.x
    f.anclaZ = caja.z
    f.anclaHeading = Math.atan2(montX - CAJA_X * m.esc, -CAJA_Z * m.esc) + m.rad
    f.anclaSoltada = false
    anclarBateador(true)
    useHouse.getState().target.set(caja.x, 0, caja.z)
    orientarBateo(f.anclaHeading)
  } else {
    const p = aLocal(m, playerPos.x, playerPos.z)
    f.ladoJugador = p.x >= 0 ? 1 : -1
    f.rx = -f.ladoJugador * m.L * 0.55
    f.rz = 0
    saquePendiente = true
    f.proximoEvento = performance.now() + (solo ? 800 : 1200)
    // `sacaJugador` es egocéntrico: en línea saca primero el anfitrión y sin
    // esto los dos clientes creerían tener el saque (y nadie lo tiraría).
    if (useJuegoCancha.getState().modo === 'online') sacaJugador = soyArbitro()
  }
}

/**
 * Pose del rival REMOTO en coordenadas locales de la cancha, o null si al rival
 * lo mueve la IA. La enchufa F5 desde el interpolador de la partida; aquí queda
 * solo la costura, así que fuera de línea `mueveRival` es exactamente el de hoy.
 */
let fuenteRival: (() => { x: number; z: number; h: number; vel: number } | null) | null = null

/** Costura para F5: quién dicta el cuerpo del rival cuando es otra persona. */
export function registrarFuenteRival(fn: typeof fuenteRival): void {
  fuenteRival = fn
}

/** Camina el rival hacia (tx,tz); devuelve true al llegar. */
function mueveRival(tx: number, tz: number, vel: number, dt: number): boolean {
  const f = juegoFrame
  const remoto = fuenteRival?.()
  if (remoto) {
    // Rival remoto: su cuerpo no lo decide esta máquina, llega por la red. Se
    // interpola hacia la pose recibida y se conserva el contrato del return
    // (`true` = está en el objetivo pedido), que consumen el básquet y el béisbol.
    f.rx = THREE.MathUtils.lerp(f.rx, remoto.x, 0.4)
    f.rz = THREE.MathUtils.lerp(f.rz, remoto.z, 0.4)
    f.rHeading = remoto.h
    f.rVel = remoto.vel
    f.rFase += dt * remoto.vel * 3
    return Math.hypot(tx - f.rx, tz - f.rz) < 0.08
  }
  const dx = tx - f.rx
  const dz = tz - f.rz
  const d = Math.hypot(dx, dz)
  if (d < 0.08) {
    f.rVel = 0
    return true
  }
  const paso = Math.min(vel * dt, d)
  f.rx += (dx / d) * paso
  f.rz += (dz / d) * paso
  f.rHeading = Math.atan2(dx, dz)
  f.rFase += dt * vel * 3
  f.rVel = vel
  return false
}

/** Avanza el vuelo parabólico; true cuando aterriza (deja la pelota en el destino). */
function avanzarVuelo(dt: number): boolean {
  const f = juegoFrame
  const v = f.vuelo
  if (!v) return false
  v.t += dt
  const tau = Math.min(v.t / v.dur, 1)
  f.bx = v.x0 + (v.x1 - v.x0) * tau
  f.bz = v.z0 + (v.z1 - v.z0) * tau
  f.by = v.y0 + (v.y1 - v.y0) * tau + Math.sin(Math.PI * tau) * v.alto
  if (tau >= 1) {
    f.vuelo = null
    f.by = Math.max(0, v.y1)
    return true
  }
  return false
}

// ─── Fútbol ───

/**
 * Dispara la pelota en dirección `dir` (local) con fuerza según la carga.
 * `quien` es de quién es el chut (el vuelo que salga lleva su ranura) y
 * `chanfle` el efecto YA medido por quien golpeó: el del rival remoto viaja en
 * su `accion` porque lo sintió su propio movimiento, no la pose interpolada
 * que ve el árbitro (`f.strafeRival` es la medida de este lado y queda de
 * respaldo).
 */
function dispararFutbol(dir: { x: number; z: number }, carga: number, quien: 'yo' | 'rival' = 'yo', chanfle?: number) {
  const f = juegoFrame
  const fuerza = FUERZA_BASE + FUERZA_RANGO * carga
  f.bvx = dir.x * fuerza
  f.bvz = dir.z * fuerza
  // Efecto: acelera la pelota hacia el lado al que te movías al golpear.
  f.chanfle = chanfle ?? clamp(f.strafe, -6, 6) * K_CHANFLE
  if (carga > UMBRAL_ELEVADO) {
    // Chut por elevado: parábola que al aterrizar sigue rodando con parte de la velocidad.
    const alto = (carga - UMBRAL_ELEVADO) * 3.2
    const dur = 0.5 + carga * 0.4
    f.vuelo = { x0: f.bx, y0: 0, z0: f.bz, x1: f.bx + f.bvx * dur, y1: 0, z1: f.bz + f.bvz * dur, t: 0, dur, alto }
    vueloFutVX = f.bvx * 0.55
    vueloFutVZ = f.bvz * 0.55
    // En línea el vuelo viaja como evento: la parábola es un descriptor, y
    // recalcularla en el invitado con su propia pelota daría otra distinta.
    emitirVuelo(quien, f.vuelo, vueloFutVX, vueloFutVZ)
  }
  f.duena = 'nadie'
}

function tickFutbol(m: Marco, solo: boolean, arbitro: boolean, dt: number) {
  const f = juegoFrame
  const ahora = performance.now()
  const humano = rivalHumano()
  const p = aLocal(m, playerPos.x, playerPos.z)
  const fwd = dirLocal(m, playerForward)
  const goalHalf = (PORTERIA.ancho / 2) * m.esc
  const goalTop = PORTERIA.alto * m.esc
  medirStrafe('yo', fwd, p, dt)
  // El cuerpo del rival remoto no lo decide ninguna máquina: lo trae el
  // interpolador y `mueveRival` lo sigue (en esa rama el objetivo da igual).
  if (humano) {
    mueveRival(f.rx, f.rz, 0, dt)
    if (arbitro) medirStrafe('rival', { x: Math.sin(f.rHeading), z: Math.cos(f.rHeading) }, { x: f.rx, z: f.rz }, dt)
  }
  // Acumular carga mientras mantienes el botón con posesión.
  if (f.cargando && f.duena === 'yo') f.carga = Math.min(1, f.carga + dt / T_CARGA)
  // Lo que dicta el árbitro. La intención del rival se consume SIEMPRE (aunque
  // ya no tenga la pelota: guardada, saldría un chut tarde); el gol y el vuelo
  // se aplican antes que nada, porque los dos mandan sobre la pelota de aquí.
  const chutRival = arbitro && humano ? tomarChutRival() : null
  if (!arbitro && humano) {
    const punto = tomarPunto()
    if (punto) return gol(m, punto.quien, punto.marcador)
    const vuelo = tomarVuelo()
    if (vuelo) {
      f.duena = 'nadie'
      f.vuelo = vuelo.v
      vueloFutVX = vuelo.bvx
      vueloFutVZ = vuelo.bvz
    }
  }

  // Chut elevado en vuelo: gol aéreo bajo el travesaño; al aterrizar sigue rodando.
  if (f.vuelo) {
    const aterrizo = avanzarVuelo(dt)
    // El gol es un veredicto: en línea lo canta el árbitro con `punto`.
    if (arbitro && f.by < goalTop && Math.abs(f.bz) < goalHalf) {
      if (f.bx < -(m.L - 0.35)) return gol(m, 'yo')
      if (f.bx > m.L - 0.35) return gol(m, solo ? 'yo' : 'rival')
    }
    if (aterrizo) {
      f.bvx = vueloFutVX
      f.bvz = vueloFutVZ
    }
    return
  }

  // El invitado no integra física: la pelota es del árbitro y llega en `b`.
  if (!arbitro && humano) pelotaDelArbitro(dt)

  const dp = Math.hypot(f.bx - p.x, f.bz - p.z)
  const dr = solo ? 999 : Math.hypot(f.bx - f.rx, f.bz - f.rz)

  if (f.duena === 'nadie') {
    // Quién se queda la pelota suelta es un VEREDICTO: en línea lo dicta el
    // árbitro y el invitado lo recibirá con la pelota (F5).
    if (arbitro) {
      const gana = humano
        ? disputar(dp, dr, DISPUTA_RADIO)
        : dp < 1.0
          ? 'yo'
          : !solo && dr < 0.9
            ? 'rival'
            : 'nadie'
      if (gana === 'yo') {
        f.duena = 'yo'
        f.carga = 0
      } else if (gana === 'rival') {
        f.duena = 'rival'
      } else if (!solo && !humano) {
        mueveRival(f.bx, f.bz, 3.0 + dif() * 2.8, dt)
      }
    }
  } else if (f.duena === 'yo') {
    // Dribbling: la pelota va pegada al frente del avatar, con botecito.
    f.bx = THREE.MathUtils.lerp(f.bx, p.x + fwd.x * OFF_DRIB, 0.4)
    f.bz = THREE.MathUtils.lerp(f.bz, p.z + fwd.z * OFF_DRIB, 0.4)
    f.bvx = 0
    f.bvz = 0
    f.bote += dt * 10
    f.by = Math.abs(Math.sin(f.bote)) * 0.12
    // El robo también es veredicto del árbitro. Entre personas, mismo radio y
    // mismo ritmo que el mío de `:414` (hoy el local roba con radio 1.3 y hasta
    // 7:1 de ventaja porque `dif()` juega a los dos lados); el cooldown de 800 ms
    // es el mismo de siempre para los dos.
    if (!solo && arbitro) {
      const radio = humano ? ROBO_RADIO : 0.9
      const ritmo = humano ? ROBO_RITMO : (0.12 + dif() * 0.4) * 6
      if (dr < radio && ahora - ultimoRoboFut > 800 && Math.random() < ritmo * dt) {
        f.duena = 'rival'
        f.carga = 0
        f.cargando = false
        ultimoRoboFut = ahora
      } else if (!humano) {
        mueveRival(f.bx, f.bz, 3.0 + dif() * 2.4, dt)
      }
    }
    // Disparo al soltar el botón: hacia donde miras, con la fuerza cargada.
    if (f.soltar) {
      f.soltar = false
      f.by = 0
      dispararFutbol(fwd, f.carga)
      // El invitado no es dueño de la pelota: la patada sale ya en su pantalla
      // (es lo que tiene que sentirse inmediato) y el árbitro la ejecuta de
      // verdad. Si para entonces se la habían robado, su `b` la recoloca.
      if (!arbitro) chutarEnLinea(fwd, f.carga, f.chanfle)
      f.carga = 0
    }
  } else if (f.duena === 'rival') {
    // Rival con la pelota: dribbla hacia tu portería, pero SE FRENA si lo presionas de cerca.
    const objX = m.L + 0.5
    const dirx = objX - f.rx
    const dirz = -f.rz
    const n = Math.hypot(dirx, dirz) || 1
    const dRival = Math.hypot(f.rx - p.x, f.rz - p.z)
    if (humano) {
      // La pelota del remoto va pegada a SU frente (el rumbo que llega por la
      // red), NUNCA al vector hacia la portería, que es a donde apunta la IA.
      // Con el mismo lerp que el dribbling propio y en los DOS clientes: por eso
      // mientras alguien la lleva no viaja un solo mensaje.
      f.bx = THREE.MathUtils.lerp(f.bx, f.rx + Math.sin(f.rHeading) * OFF_DRIB, 0.4)
      f.bz = THREE.MathUtils.lerp(f.bz, f.rz + Math.cos(f.rHeading) * OFF_DRIB, 0.4)
      f.bvx = 0
      f.bvz = 0
      f.bote += dt * 10
      f.by = Math.abs(Math.sin(f.bote)) * 0.12
    } else {
      f.bx = f.rx + (dirx / n) * 0.5
      f.bz = f.rz + (dirz / n) * 0.5
    }
    // De aquí abajo todo son VEREDICTOS (robo, chut del rival): solo el árbitro.
    if (arbitro) {
      const velRival = (dRival < 2.0 ? 0.9 : 1.8) + dif() * 1.3
      if (!humano) mueveRival(f.rx + (dirx / n) * 3, f.rz + (dirz / n) * 3, velRival, dt)
      // Le quitas el balón al pegarte a él: entre personas, con el mismo radio y el
      // mismo ritmo que usa el rival para quitártelo a ti.
      const radio = humano ? ROBO_RADIO : 1.3
      const ritmo = humano ? ROBO_RITMO : (1.0 - dif() * 0.55) * 5
      if (chutRival) {
        // La dirección, la fuerza y el efecto son suyos; que todavía la tuviera,
        // del árbitro (si no, este chut ya no existe y se cayó arriba).
        dispararFutbol({ x: chutRival.dx, z: chutRival.dz }, chutRival.fu, 'rival', chutRival.ch)
      } else if (dRival < radio && ahora - ultimoRoboFut > 800 && Math.random() < ritmo * dt) {
        f.duena = 'yo'
        f.carga = 0
        ultimoRoboFut = ahora
      } else if (!humano && f.rx > m.L * 0.45) {
        const gdx = objX - f.bx
        const gdz = (Math.random() - 0.5) * goalHalf - f.bz
        const gn = Math.hypot(gdx, gdz) || 1
        dispararFutbol({ x: gdx / gn, z: gdz / gn }, 0.55 + dif() * 0.3, 'rival')
      }
    }
  }

  // Física de rodada (solo cuando NO llevas la pelota y no está en vuelo). En
  // línea la integra SOLO el árbitro y viaja en `b`: dos integradores con dados
  // distintos (el chanfle, las bandas) divergen en un par de segundos.
  if (f.duena !== 'yo' && !f.vuelo && arbitro) {
    f.bx += f.bvx * dt
    f.bz += f.bvz * dt
    const fr = Math.max(0, 1 - 1.4 * dt)
    f.bvx *= fr
    f.bvz *= fr
    // Chanfle: acelera perpendicular a la velocidad, decae solo.
    const sp = Math.hypot(f.bvx, f.bvz)
    if (sp > 0.1) {
      const px = -f.bvz / sp
      const pz = f.bvx / sp
      f.bvx += px * f.chanfle * dt
      f.bvz += pz * f.chanfle * dt
    }
    f.chanfle *= Math.max(0, 1 - 1.2 * dt)
    if (Math.abs(f.bz) > m.W - 0.35) {
      f.bz = Math.sign(f.bz) * (m.W - 0.35)
      f.bvz *= -0.75
    }
    if (f.bx < -(m.L - 0.35)) {
      if (Math.abs(f.bz) < goalHalf) return gol(m, 'yo')
      f.bx = -(m.L - 0.35)
      f.bvx *= -0.75
    }
    if (f.bx > m.L - 0.35) {
      if (Math.abs(f.bz) < goalHalf) return gol(m, solo ? 'yo' : 'rival')
      f.bx = m.L - 0.35
      f.bvx *= -0.75
    }
  }
  // La pelota, tal como queda este frame, para el otro cliente (no hace nada
  // fuera de línea, y mientras alguien la dribla tampoco).
  latirPelota()
}

/**
 * Gol. Es el único embudo: el árbitro suma y lo canta con `punto`, y el
 * invitado entra por aquí con el marcador que le llegó ya traducido.
 */
function gol(m: Marco, quien: 'yo' | 'rival', deLaRed?: MarcadorPartido) {
  const f = juegoFrame
  const gw = aMundo(m, quien === 'yo' ? -m.L : m.L, 0)
  if (quien === 'yo') lanzarCohete(gw.x, 1, gw.z)
  const mensaje = quien === 'yo' ? 'gol' : 'golRival'
  if (deLaRed) useJuegoCancha.getState().aplicarMarcador(deLaRed, quien, mensaje)
  else {
    void useJuegoCancha.getState().anotar(quien, 1, mensaje)
    emitirPunto(quien)
  }
  f.bx = 0
  f.bz = 0
  f.bvx = 0
  f.bvz = 0
  f.by = 0
  f.vuelo = null
  f.duena = 'nadie'
  f.carga = 0
  f.chanfle = 0
  f.rx = -m.L * 0.5
  f.rz = 0
}

// ─── Básquet ───

/**
 * Margen de acierto del tiro: el aro es generoso, la dificultad lo cierra.
 * Entre personas la dificultad queda FUERA (como en las disputas de F4): es una
 * preferencia de cada cliente y con ella el aro sería más ancho en la pantalla
 * de uno que en la del otro —la mira diría que entra y el árbitro que no—.
 */
const tolTiro = (esc: number) => THREE.MathUtils.lerp(1.6, 0.7, rivalHumano() ? 0.5 : dif()) * esc

/** El «21»: con esa cuenta EXACTA se cierra el partido en línea para los dos. */
const META_21 = 21

interface RebotePend {
  m: Marco
  quien: 'yo' | 'rival'
  puntos: number
  /** El rebote de tabla cae dentro del aro. */
  entra: boolean
  /** Z local del impacto en el tablero. */
  z: number
}
let pendiente: { quien: 'yo' | 'rival'; puntos: number; encesta: boolean; m: Marco } | null = null
let rebotePend: RebotePend | null = null
/**
 * Lo que el INVITADO sabe del tiro que está en el aire: quién lo lanzó y qué
 * anota al caer (`pu` del `vuelo`). Es su mitad de `pendiente`, que junto con
 * `rebotePend` es del árbitro y solo él los toca: el invitado no resuelve tiros.
 */
let tiroRemoto: { quien: 'yo' | 'rival'; pu: number } | null = null

/** Punto donde la recta ball→aro corta la cara del tablero (o null si la falla). */
function puntoTablero(m: Marco, ux: number, uz: number) {
  const f = juegoFrame
  const tabX = CANASTA.tableroX * m.esc
  if (ux > -1e-3) return null // el tiro no va hacia el tablero
  const s = (tabX - f.bx) / ux
  const tabZ = f.bz + uz * s
  if (Math.abs(tabZ) > CANASTA.tableroMedio * m.esc) return null // se va por un lado
  return { x: tabX, z: tabZ, s }
}

/**
 * Lanza al aro: el ALCANCE sale de la carga; encesta si acierta la distancia.
 * Pasarse un poco de largo ya no es fallar: la pelota pega en el TABLERO y de ahí
 * cae dentro (tiro de tabla) o sale rebotada al piso.
 */
function lanzarTiro(m: Marco, quien: 'yo' | 'rival', carga: number) {
  const f = juegoFrame
  const aroX = CANASTA.aroX * m.esc
  const distAro = Math.hypot(f.bx - aroX, f.bz)
  const alcance = (BAS_ALC_MIN + carga * (BAS_ALC_MAX - BAS_ALC_MIN)) * m.esc
  const tol = tolTiro(m.esc)
  const err = alcance - distAro
  const encesta = Math.abs(err) < tol
  const dx = aroX - f.bx
  const dz = -f.bz
  const n = Math.hypot(dx, dz) || 1
  const ux = dx / n
  const uz = dz / n
  const tres = distAro > 6.75 * m.esc
  const puntos = tres ? 3 : 2
  f.duena = 'nadie'
  tiroElegido = false

  const tab = !encesta && err > 0 && err < tol + REBOTE_VENTANA * m.esc ? puntoTablero(m, ux, uz) : null
  if (tab) {
    // Primer vuelo: hasta la cara del tablero. El resto lo decide el rebote.
    f.vuelo = {
      x0: f.bx,
      y0: 1.4 * m.esc,
      z0: f.bz,
      x1: tab.x,
      y1: CANASTA.tableroY * m.esc,
      z1: tab.z,
      t: 0,
      dur: clamp(tab.s / 9, 0.5, 1.2),
      alto: 0.5 + carga * 0.9,
    }
    pendiente = null
    rebotePend = { m, quien, puntos, entra: err < tol + REBOTE_DENTRO * m.esc, z: tab.z }
    // Sin `pu`: este vuelo NO termina el tiro (el segundo sale del tablero).
    emitirVuelo(quien, f.vuelo, 0, 0, 'tiro')
    return
  }

  const x1 = encesta ? aroX : f.bx + ux * alcance
  const z1 = encesta ? 0 : f.bz + uz * alcance
  f.vuelo = {
    x0: f.bx,
    y0: 1.4 * m.esc,
    z0: f.bz,
    x1,
    y1: 0,
    z1,
    t: 0,
    dur: clamp(alcance / 9, 0.6, 1.4),
    alto: 3.05 * m.esc - 1.4 * m.esc + 1.2 + carga * 1.2,
  }
  // El resultado se resuelve al aterrizar (tickBasket lee estos pendientes).
  pendiente = { quien, puntos, encesta, m }
  // En línea el tiro viaja como EVENTO, con lo que anota al caer: recalcularlo
  // en el invitado con su propia pelota daría otra parábola y otro veredicto.
  emitirVuelo(quien, f.vuelo, 0, 0, 'tiro', encesta ? puntos : 0)
}

/** Segundo vuelo tras pegar en el tablero: cae por el aro o sale despedido. */
function rebotarTablero(r: RebotePend) {
  const f = juegoFrame
  const m = r.m
  const aroX = CANASTA.aroX * m.esc
  f.tableroPulso = 1
  if (r.entra) {
    // Cae casi a plomo por el aro y queda bajo la canasta.
    f.vuelo = {
      x0: f.bx,
      y0: f.by,
      z0: f.bz,
      x1: aroX + 0.25 * m.esc,
      y1: 0,
      z1: r.z * 0.3,
      t: 0,
      dur: 0.6,
      alto: 0.12,
    }
  } else {
    // Sale rebotada hacia la cancha, con algo de dispersión.
    const ang = (Math.random() - 0.5) * 1.1
    const dist = (1.8 + Math.random() * 1.8) * m.esc
    f.vuelo = {
      x0: f.bx,
      y0: f.by,
      z0: f.bz,
      x1: f.bx + Math.cos(ang) * dist,
      y1: 0,
      z1: f.bz + Math.sin(ang) * dist,
      t: 0,
      dur: 0.7,
      alto: 0.5,
    }
  }
  pendiente = { quien: r.quien, puntos: r.puntos, encesta: r.entra, m }
  // El rebote lleva dados (la dispersión del fallo): por eso viaja ya resuelto,
  // igual que el primer vuelo. Es lo que impide que las dos pantallas diverjan.
  emitirVuelo(r.quien, f.vuelo, 0, 0, 'tiro', r.entra ? r.puntos : 0)
}

function tickBasket(m: Marco, solo: boolean, arbitro: boolean, dt: number) {
  const f = juegoFrame
  const ahora = performance.now()
  const humano = rivalHumano()
  const p = aLocal(m, playerPos.x, playerPos.z)
  // El cuerpo del rival remoto no lo decide ninguna máquina: lo trae el
  // interpolador y `mueveRival` lo sigue (en esa rama el objetivo da igual).
  if (humano) mueveRival(f.rx, f.rz, 0, dt)
  // El tiro del invitado se consume SIEMPRE, aunque ya no sea su turno:
  // guardado, saldría un tiro tarde (mismo criterio que el chut del fútbol).
  const tiroRival = arbitro && humano ? tomarChutRival() : null
  if (!arbitro && humano) {
    const punto = tomarPunto()
    if (punto) {
      // El marcador lo cuenta el árbitro y aquí solo se obedece. Cuánto sumó
      // sale del propio marcador: es lo que distingue el triple del doble.
      const st = useJuegoCancha.getState()
      const suma = punto.quien === 'yo' ? punto.marcador.yo - st.yo : punto.marcador.rival - st.rival
      st.aplicarMarcador(
        punto.marcador,
        punto.quien,
        punto.quien === 'yo' ? (suma === 3 ? 'canasta3' : 'canasta2') : 'canastaRival',
      )
    }
    const vuelo = tomarVuelo()
    if (vuelo) {
      f.duena = 'nadie'
      f.vuelo = vuelo.v
      // Con `pu` el tiro termina en ese vuelo (0 = fallo); sin él, la pelota va
      // al tablero y el segundo vuelo llega detrás.
      tiroRemoto = vuelo.pu === undefined ? null : { quien: vuelo.quien, pu: vuelo.pu }
    }
  }
  if (f.vuelo) {
    if (avanzarVuelo(dt)) {
      // Llegó al tablero: encadena el rebote antes de resolver nada.
      if (rebotePend) {
        const r = rebotePend
        rebotePend = null
        rebotarTablero(r)
        return
      }
      if (pendiente) {
        const r = pendiente
        pendiente = null
        const st = useJuegoCancha.getState()
        if (r.encesta) {
          const aro = aMundo(r.m, CANASTA.aroX * r.m.esc, 0)
          f.aroPulso = 1
          if (r.quien === 'yo') lanzarCohete(aro.x, r.m.sueloY + CANASTA.aroY * r.m.esc, aro.z)
          const antes = r.quien === 'yo' ? st.yo : st.rival
          // El «21» se gana con la cuenta EXACTA: la canasta que se pasaría vale
          // solo lo que falta, y así el partido siempre cierra en 21 clavados.
          const puntos = humano ? Math.min(r.puntos, META_21 - antes) : r.puntos
          void st.anotar(r.quien, puntos, r.quien === 'yo' ? (puntos === 3 ? 'canasta3' : 'canasta2') : 'canastaRival')
          if (humano) {
            emitirPunto(r.quien)
            // Los 21: se acabó para los dos (al invitado lo cierra el `cerrar`).
            if (antes + puntos >= META_21) {
              cerrarPartidoPorMarcador()
              return
            }
          }
        } else if (r.quien === 'yo') {
          st.avisar('fallo')
        }
        // En modo solo el balón vuelve a tus manos para seguir tirando sin ir a buscarlo.
        if (solo) {
          f.duena = 'yo'
          f.carga = 0
        } else if (humano) {
          // Tiros ALTERNADOS: el balón pasa al otro y le llega a las manos sin
          // ir a recogerlo. El cambio de dueño se lo cuenta `latirPelota`.
          f.duena = r.quien === 'yo' ? 'rival' : 'yo'
          f.carga = 0
        }
      } else if (!arbitro && humano) {
        const r = tiroRemoto
        tiroRemoto = null
        // Sin tiro que cerrar, el vuelo acabó en el TABLERO: el árbitro manda el
        // segundo enseguida.
        if (!r) f.tableroPulso = 1
        else if (r.pu > 0) {
          const aro = aMundo(m, CANASTA.aroX * m.esc, 0)
          f.aroPulso = 1
          if (r.quien === 'yo') lanzarCohete(aro.x, m.sueloY + CANASTA.aroY * m.esc, aro.z)
        } else if (r.quien === 'yo') {
          useJuegoCancha.getState().avisar('fallo')
        }
      }
    }
    return
  }
  // Acumular potencia mientras mantienes el botón con la pelota.
  if (f.cargando && f.duena === 'yo') f.carga = Math.min(1, f.carga + dt / T_CARGA)
  // El invitado no decide de quién es la pelota: el turno le llega en `b`.
  if (!arbitro && humano) pelotaDelArbitro(dt)

  if (f.duena === 'nadie') {
    // La pelota es de quien llegue primero: entre personas, con el MISMO radio de
    // recogida para los dos (hoy 0.95 contra 0.85 a favor del local).
    if (arbitro) {
      const dpYo = Math.hypot(f.bx - p.x, f.bz - p.z)
      const dRival = solo ? 999 : Math.hypot(f.bx - f.rx, f.bz - f.rz)
      const gana = humano
        ? disputar(dpYo, dRival, RECOGIDA_RADIO)
        : dpYo < 0.95
          ? 'yo'
          : dRival < 0.85
            ? 'rival'
            : 'nadie'
      if (gana === 'yo') {
        f.duena = 'yo'
        f.carga = 0
      } else if (gana === 'rival') {
        f.duena = 'rival'
        tiroElegido = false
        f.proximoEvento = ahora + 3400 - dif() * 1400
      } else if (!solo && !humano) {
        mueveRival(f.bx, f.bz, 2.4 + dif() * 2.0, dt)
      }
    }
  } else if (f.duena === 'yo') {
    // La llevas contigo: muévete para ajustar la distancia y suelta el botón para tirar.
    f.bx = p.x
    f.bz = p.z
    if (f.soltar) {
      f.soltar = false
      // El invitado no resuelve su tiro: manda la INTENCIÓN (su carga) y el
      // árbitro lo lanza por él; el vuelo vuelve por la red con el resultado.
      if (arbitro) lanzarTiro(m, 'yo', f.carga)
      else tirarEnLinea(dirLocal(m, playerForward), f.carga)
      f.carga = 0
    }
  } else {
    // La pelota va con quien la lleva (cosmético, corre en todos).
    f.bx = f.rx
    f.bz = f.rz
    // El rival busca su punto de tiro y lanza (simula la carga con error por
    // dificultad). Es máquina de IA: con una persona enfrente el tiro llega por
    // la red (F6) y aquí no se decide nada.
    if (arbitro && !humano) {
      if (!tiroElegido) {
        const aroX = CANASTA.aroX * m.esc
        const ang = (Math.random() - 0.5) * 1.6
        const dist = 3 + Math.random() * 4.5
        tiroRX = clamp(aroX + Math.cos(ang) * dist, -m.L + 1, m.L - 1)
        tiroRZ = clamp(Math.sin(ang) * dist, -m.W + 1, m.W - 1)
        tiroElegido = true
      }
      const llego = mueveRival(tiroRX, tiroRZ, 2.2 + dif() * 1.8, dt)
      if (llego || ahora >= f.proximoEvento) {
        const aroX = CANASTA.aroX * m.esc
        const distR = Math.hypot(f.rx - aroX, f.rz) / m.esc
        const ideal = clamp((distR - BAS_ALC_MIN) / (BAS_ALC_MAX - BAS_ALC_MIN), 0, 1)
        const err = (Math.random() - 0.5) * (1 - dif()) * 0.5
        lanzarTiro(m, 'rival', clamp(ideal + err, 0, 1))
      }
    }
    // El tiro del invitado, con SU carga: el árbitro lo ejecuta, nunca su
    // máquina. Fuera de turno no llega aquí, porque en esta rama la pelota
    // todavía es suya.
    if (arbitro && humano && tiroRival) lanzarTiro(m, 'rival', tiroRival.fu)
  }
  // El turno y la pelota, tal como quedan este frame, para el otro cliente (no
  // hace nada fuera de línea, y mientras hay vuelo ni se llega hasta aquí).
  latirPelota()
}

// ─── Tenis ───

/**
 * Altura de parábola que hace pasar la pelota `margen` metros sobre la red. Se
 * calcula así (y no con una altura fija) para que el golpe se mida siempre por
 * lo que le sobra a la red, venga de donde venga y sea cual sea el tamaño de la
 * cancha: con margen negativo el tiro se queda en la red.
 */
function altoParaRed(m: Marco, x1: number, margen: number) {
  const f = juegoFrame
  const y0 = Math.max(0.35, f.by)
  const tau = (0 - f.bx) / (x1 - f.bx || 1e-6)
  if (tau <= 0 || tau >= 1) return 0.9 * m.esc
  return clamp((RED_ALTO * m.esc + margen - y0 * (1 - tau)) / Math.sin(Math.PI * tau), 0.25, 3.5 * m.esc)
}

/**
 * Programa el vuelo de un golpe y decide ahí mismo si es falta: la pelota que no
 * pasa la red muere contra ella, y el destino fuera de la cancha queda marcado
 * para cobrarlo al aterrizar (así se ve botar fuera). `alto` es la altura de la
 * parábola en metros (la da `altoParaRed`) y `vel`, metros por segundo.
 */
function lanzarTenis(m: Marco, quien: 'yo' | 'rival', x1: number, z1: number, alto: number, vel: number) {
  const f = juegoFrame
  const y0 = Math.max(0.35, f.by)
  const dur = clamp(Math.hypot(x1 - f.bx, z1 - f.bz) / vel, 0.32, 1.5)
  golpeoTenis = quien
  haciaMuro = false
  faltaTenis = null
  energiaBote = 1.35
  // ¿Pasa la red? Se mide la altura de la parábola justo en x = 0.
  const tau = (0 - f.bx) / (x1 - f.bx || 1e-6)
  if (tau > 0 && tau < 1 && y0 * (1 - tau) + Math.sin(Math.PI * tau) * alto < RED_ALTO * m.esc) {
    faltaTenis = 'red'
    ladoCaida = f.bx >= 0 ? 1 : -1
    velBoteX = 0
    velBoteZ = 0
    f.vuelo = {
      x0: f.bx,
      y0,
      z0: f.bz,
      x1: f.bx * (1 - tau * 0.9),
      y1: 0,
      z1: f.bz + (z1 - f.bz) * tau * 0.9,
      t: 0,
      dur: dur * tau,
      alto: alto * 0.6,
    }
    return
  }
  ladoCaida = x1 >= 0 ? 1 : -1
  if (Math.abs(x1) > m.L || Math.abs(z1) > m.W) faltaTenis = 'fuera'
  f.vuelo = { x0: f.bx, y0, z0: f.bz, x1, y1: 0, z1, t: 0, dur, alto }
  velBoteX = (x1 - f.bx) / dur
  velBoteZ = (z1 - f.bz) / dur
}

/**
 * Calidad del golpe (0–1) en dos partes, que castigan cosas distintas: `cy` es
 * el TIMING (la pelota a la altura de la raqueta) y decide si el tiro pasa la
 * red; `cd` es el ESTIRÓN (cuánto tuviste que alargar el brazo) y decide lo
 * profundo y preciso que sale. Tener la pelota encima no penaliza.
 */
function calidadTenis(p: { x: number; z: number }) {
  const f = juegoFrame
  const cy = clamp(1 - Math.abs(f.by - TENIS_Y_DULCE) / TENIS_Y_TOL, 0, 1)
  const cd = clamp(1 - Math.max(0, Math.hypot(f.bx - p.x, f.bz - p.z) - TENIS_D_DULCE) / TENIS_D_TOL, 0, 1)
  return { cy, cal: Math.min(cy, cd) }
}

/** Destino y vuelo de una devolución (jugador o rival) a partir de su calidad. */
function tiroTenis(m: Marco, quien: 'yo' | 'rival', hacia: 1 | -1, z1: number, cy: number, cal: number) {
  const x1 = hacia * (0.28 + cal * 0.48) * m.L
  lanzarTenis(
    m,
    quien,
    x1,
    clamp(z1, -m.W - 2, m.W + 2),
    altoParaRed(m, x1, MARGEN_RED_MIN + cy * MARGEN_RED_RANGO),
    8 + cal * 7,
  )
}

/**
 * Devolución de una PERSONA: apuntas con el frente del avatar (de banda a banda)
 * y el golpe decide el resto — limpio sale profundo, tenso y donde apuntaste;
 * llegando estirado sale corto, y con mal timing se queda en la red.
 *
 * `quien` es de quién es el raquetazo: el del rival remoto entra por aquí con
 * SU frente y SU calidad (nunca por `devolverRival`, que tira dados y mira
 * `dif()`), y su chanfle sale de su propio movimiento lateral.
 */
function golpearTenis(m: Marco, fwd: { x: number; z: number }, q: { cy: number; cal: number }, quien: 'yo' | 'rival' = 'yo') {
  const f = juegoFrame
  const hacia = (quien === 'yo' ? -f.ladoJugador : f.ladoJugador) as 1 | -1
  const mira = clamp(Math.atan2(fwd.z, fwd.x * hacia) / ANG_MIRA, -1, 1)
  const strafe = quien === 'yo' ? f.strafe : f.strafeRival
  // A la mira se suman el efecto de moverte de lado y la dispersión del mal golpe.
  const z1 = mira * (m.W - 0.35) + clamp(strafe, -3, 3) * K_CHANFLE_TENIS + (Math.random() - 0.5) * (1 - q.cal) * 2
  tiroTenis(m, quien, hacia, z1, q.cy, q.cal)
}

/**
 * Devolución del rival: la calidad sale de lo cómodo que llegó a la pelota, de
 * la dificultad y de un error no forzado de vez en cuando. De ahí salen sus
 * fallos (a la red o fuera), en vez de un dado que decida si devuelve o no.
 */
function devolverRival(m: Marco, p: { z: number }, alcance: number) {
  const f = juegoFrame
  const d = dif()
  const hacia = f.ladoJugador
  const comodo = clamp(1 - alcance / TENIS_ALCANCE_RIVAL, 0, 1)
  const fallo = Math.random() < 0.15 - d * 0.1
  const cal = clamp((0.42 + d * 0.55) * (0.55 + comodo * 0.6) * (0.8 + Math.random() * 0.4) * (fallo ? 0.4 : 1), 0, 1)
  // Busca el hueco: apunta a la banda contraria a la tuya, con puntería según dificultad.
  const lejos = (p.z >= 0 ? -1 : 1) * (m.W - 0.7)
  const z1 =
    THREE.MathUtils.lerp((Math.random() - 0.5) * 1.6 * m.W, lejos, d * 0.8) + (Math.random() - 0.5) * (1 - cal) * 2.2
  tiroTenis(m, 'rival', hacia, z1, cal, cal)
}

/**
 * Saque al cuadro de servicio contrario; tú apuntas con tu frente (arcade:
 * siempre entra). `conFrente` es lo que distingue el saque de una PERSONA del
 * de la máquina: el del invitado se tira con el frente que mandó él, no con un
 * dado del árbitro.
 */
function saqueTenis(m: Marco, quien: 'yo' | 'rival', fwd: { x: number; z: number }, conFrente = quien === 'yo') {
  const f = juegoFrame
  const hacia = (quien === 'yo' ? -f.ladoJugador : f.ladoJugador) as 1 | -1
  const mira = conFrente ? clamp(Math.atan2(fwd.z, fwd.x * hacia) / ANG_MIRA, -1, 1) : Math.random() * 2 - 1
  const x1 = hacia * (0.28 + Math.random() * 0.16) * m.L
  const z1 = clamp(mira * (m.W - 1.2), -m.W + 0.8, m.W - 0.8)
  lanzarTenis(m, quien, x1, z1, altoParaRed(m, x1, 0.45), 13 + dif() * 4)
}

/** Golpe hacia el frontón: a más calidad, más alto en el muro y más rápido. */
function golpeAlMuro(m: Marco, cal: number) {
  const f = juegoFrame
  const lado = f.ladoJugador
  const x1 = -lado * 0.2
  const z1 = clamp(f.bz + (Math.random() - 0.5) * m.W + clamp(f.strafe, -3, 3) * K_CHANFLE_TENIS, -m.W + 1, m.W - 1)
  const dist = Math.hypot(x1 - f.bx, z1 - f.bz)
  haciaMuro = true
  faltaTenis = null
  golpeoTenis = 'yo'
  velBoteX = 0
  velBoteZ = 0
  f.vuelo = {
    x0: f.bx,
    y0: Math.max(0.4, f.by),
    z0: f.bz,
    x1,
    y1: (0.7 + cal * 1.4) * m.esc,
    z1,
    t: 0,
    dur: clamp(dist / (9 + cal * 5), 0.3, 0.9),
    alto: 0.5,
  }
}

/** Rebote del frontón: más dificultad = más rápido y más abierto. */
function reboteDelMuro(m: Marco) {
  const f = juegoFrame
  const d = dif()
  const lado = f.ladoJugador
  const x1 = lado * (0.25 + Math.random() * 0.65) * m.L
  const z1 = (Math.random() - 0.5) * (1.0 + d * 0.9) * m.W
  const dist = Math.hypot(x1 - f.bx, z1 - f.bz)
  const dur = clamp(dist / (8 + d * 7), 0.32, 1.2)
  ladoCaida = lado
  haciaMuro = false
  faltaTenis = null
  energiaBote = 1.35
  f.vuelo = {
    x0: f.bx,
    y0: f.by,
    z0: f.bz,
    x1,
    y1: 0,
    z1,
    t: 0,
    dur,
    alto: 1.2 * m.esc,
  }
  velBoteX = (x1 - f.bx) / dur
  velBoteZ = (z1 - f.bz) / dur
}

/**
 * Bote de la pelota: como una de verdad, sigue avanzando en la dirección del
 * golpe (conserva parte de su velocidad horizontal) y pierde altura en cada uno.
 */
function iniciarBote(m: Marco) {
  const f = juegoFrame
  const alto = energiaBote
  const dur = clamp(0.28 + alto * 0.34, 0.3, 0.9)
  const x1 = clamp(f.bx + velBoteX * K_BOTE * dur, -m.L - 3, m.L + 3)
  const z1 = clamp(f.bz + velBoteZ * K_BOTE * dur, -m.W - 3, m.W + 3)
  f.vuelo = { x0: f.bx, y0: 0, z0: f.bz, x1, y1: 0, z1, t: 0, dur, alto }
  velBoteX *= K_BOTE
  velBoteZ *= K_BOTE
  energiaBote *= FACTOR_BOTE
}

/** Cierra el punto: marcador, motivo de la falta y saque del siguiente. */
function puntoTenisFin(m: Marco, ganador: 'yo' | 'rival', motivo?: 'red' | 'fuera') {
  const f = juegoFrame
  f.botesTenis = 0
  f.enVentana = false
  faltaTenis = null
  saquePendiente = true
  f.proximoEvento = performance.now() + 1600
  if (rivalHumano()) {
    // Punto cerrado: el vuelo deja de correr por reloj y, sobre todo, un golpe
    // que venga en camino con un `t` anterior ya no revive el punto anterior.
    t0VueloTenis = null
    tGolpeTenis = reloj.ahora()
  }
  void useJuegoCancha
    .getState()
    .puntoTenis(ganador)
    .then((msg) => {
      // El saque cambia de mano al cambiar de juego, como en un partido de verdad.
      if (msg !== 'puntoTenis' && msg !== 'puntoTenisRival') sacaJugador = !sacaJugador
      if (ganador === 'yo') celebrar(m, msg)
      // Si el punto lo regalaste tú, el aviso dice por qué (sin tapar juego/set).
      else if (motivo && msg === 'puntoTenisRival')
        useJuegoCancha.getState().avisar(motivo === 'red' ? 'aLaRed' : 'fuera')
    })
  // El marcador se cantó aquí: ya está puesto (`puntoTenis` hace su `set` antes
  // de cualquier await) y viaja entero y slot-relativo, con la falta que lo cerró.
  emitirPunto(ganador, motivo ?? null)
}

/** Celebración según el mensaje del punto (set/partido = más cohetes). */
function celebrar(m: Marco, mensaje: string) {
  const w = aMundo(m, 0, 0)
  if (mensaje === 'puntoTenis' || mensaje === 'juegoTuyo') lanzarCohete(w.x, 1, w.z)
  else if (mensaje === 'setTuyo' || mensaje === 'partidoTuyo') {
    lanzarCohete(w.x - 2, 1, w.z)
    lanzarCohete(w.x + 2, 1, w.z)
  }
}

/**
 * Ventana de golpeo: la pelota cae en TU lado, no va al frontón, no murió en la
 * red, la tienes cerca y a altura de raqueta. Es la MISMA para los dos jugadores
 * —un solo radio, y volear es legal para ambos—: el árbitro la vuelve a correr
 * con la posición del remoto y con la pelota REBOBINADA al `t` de su golpe.
 */
function ventanaTenis(lado: 1 | -1, px: number, pz: number, b: Omit<EstadoPelota, 't'>) {
  return (
    b.cae === lado &&
    !b.muro &&
    b.falta !== 'red' &&
    Math.hypot(b.x - px, b.z - pz) < GOLPE_RADIO &&
    b.y > Y_MIN_GOLPE &&
    b.y < Y_MAX_GOLPE
  )
}

/**
 * Instante de PARTIDA al que corresponde la pelota que se está viendo. Con un
 * vuelo en curso no es `ahora()` sino el punto exacto de la parábola: es lo que
 * hace que el golpe viaje fechado sin el error del frame y que el árbitro
 * rebobine justo a la pelota que vio quien golpeó.
 */
function instantePelota(): number {
  const f = juegoFrame
  return f.vuelo && t0VueloTenis !== null ? t0VueloTenis + f.vuelo.t * 1000 : reloj.ahora()
}

/** Guarda el estado de la pelota de este frame con su instante de partida. */
function anotarPelota(): void {
  const f = juegoFrame
  const t = instantePelota()
  anilloTenis.push({ t, x: f.bx, y: f.by, z: f.bz, cae: ladoCaida, muro: haciaMuro, falta: faltaTenis })
  while (anilloTenis.length > 1 && t - anilloTenis[0].t > MEMORIA_TENIS) anilloTenis.shift()
}

/** La pelota tal como estaba en ese instante de partida (null si ya no se recuerda). */
function pelotaEn(t: number): EstadoPelota | null {
  const n = anilloTenis.length
  if (n === 0 || t < anilloTenis[0].t) return null
  const ultima = anilloTenis[n - 1]
  if (t >= ultima.t) return ultima
  for (let i = n - 1; i > 0; i -= 1) {
    const a = anilloTenis[i - 1]
    const b = anilloTenis[i]
    if (a.t > t) continue
    const q = b.t > a.t ? (t - a.t) / (b.t - a.t) : 1
    // La posición se interpola; el estado (lado de caída, falta) es el del tramo.
    return {
      t,
      x: a.x + (b.x - a.x) * q,
      y: a.y + (b.y - a.y) * q,
      z: a.z + (b.z - a.z) * q,
      cae: a.cae,
      muro: a.muro,
      falta: a.falta,
    }
  }
  return anilloTenis[0]
}

/**
 * Avanza el vuelo de tenis. En línea va en tiempo de PARTIDA y no en frames: si
 * cada cliente lo integrara con su `dt`, dos framerates distintos (o un frame
 * perdido) separarían las dos pelotas en medio peloteo.
 */
function avanzarVueloTenis(dt: number): boolean {
  const f = juegoFrame
  if (t0VueloTenis === null || !f.vuelo) return avanzarVuelo(dt)
  f.vuelo.t = Math.max(0, (reloj.ahora() - t0VueloTenis) / 1000)
  return avanzarVuelo(0)
}

/**
 * Publica el vuelo que acaba de salir de una raqueta. `t` es el instante del
 * GOLPE —el del invitado cuando el árbitro rebobina—: con él los dos clientes
 * arrancan la misma parábola en el mismo momento de partida.
 */
function publicarGolpeTenis(quien: 'yo' | 'rival', q: 'saque' | 'golpe', t: number): void {
  const f = juegoFrame
  tGolpeTenis = t
  t0VueloTenis = t
  reenviadoTenis = false
  if (f.vuelo) emitirVueloTenis(quien, f.vuelo, velBoteX, velBoteZ, energiaBote, q, t)
}

/** Le vuelve a contar al invitado el vuelo vigente (su golpe no valía). */
function reemitirVueloTenis(): void {
  const f = juegoFrame
  // Solo el vuelo del GOLPE: los botes salen de `bv`/`eb` en los dos lados por
  // igual, y reemitir uno se leería allá como un golpe nuevo.
  if (!f.vuelo || t0VueloTenis === null || t0VueloTenis !== tGolpeTenis) return
  emitirVueloTenis(golpeoTenis, f.vuelo, velBoteX, velBoteZ, energiaBote, 'golpe', t0VueloTenis)
}

/**
 * El vuelo que dictó el árbitro, en el invitado. Fija `velBoteX/Z` y
 * `energiaBote` ANTES de que la pelota llegue al suelo: `iniciarBote` sale de
 * esos tres globales y sin ellos el primer bote ya cae en otro sitio.
 */
function aplicarVueloTenis(m: Marco, r: VueloRecibido): void {
  const f = juegoFrame
  // Un vuelo más viejo que el último golpe conocido llegó reordenado, o después
  // de un punto ya cantado: aplicarlo resucitaría la pelota del punto anterior.
  // Con el MISMO `t` es la repetición del árbitro y ya está aplicado: repetirla
  // volvería a poner la cuenta de botes y la energía en su valor de salida.
  if (r.t <= tGolpeTenis) return
  saquePendiente = false
  f.vuelo = r.v
  t0VueloTenis = r.t
  tGolpeTenis = r.t
  velBoteX = r.bvx
  velBoteZ = r.bvz
  energiaBote = r.eb
  haciaMuro = false
  ladoCaida = (r.v.x1 >= 0 ? 1 : -1) as 1 | -1
  // La falta se deduce del propio vuelo, y es solo para MI ventana: el punto lo
  // canta el árbitro. Fuera de la cancha es 'fuera'; morir en el mismo lado del
  // que salió, 'red' (un tiro bueno siempre cruza).
  faltaTenis =
    Math.abs(r.v.x1) > m.L || Math.abs(r.v.z1) > m.W ? 'fuera' : (r.v.x1 >= 0) === (r.v.x0 >= 0) ? 'red' : null
  golpeoTenis = r.quien
  f.botesTenis = 0
  f.enVentana = false
  // Mi raquetazo ya se animó al tocar el botón: repetirlo ahora se vería doble.
  if (r.quien === 'rival') f.rSwing = 1
}

/**
 * Golpe del invitado. Lo único que decide el árbitro es si VALÍA: rebobina la
 * pelota al instante que trae el mensaje y vuelve a correr la ventana con la
 * posición del remoto y su frente. Si vale, ejecuta SU golpe con SU calidad
 * (nunca `devolverRival`, que tira dados y mira `dif()`); si no, lo descarta y
 * le reemite el estado, y el punto sigue.
 */
function golpeDelRemoto(m: Marco, g: GolpeRecibido): void {
  const f = juegoFrame
  const suLado = -f.ladoJugador as 1 | -1
  if (saquePendiente) {
    // Su saque. No hay pelota que rebobinar: espera en su raqueta.
    if (sacaJugador || g.t < tGolpeTenis) return
    saquePendiente = false
    f.rSwing = 1
    f.botesTenis = 0
    saqueTenis(m, 'rival', { x: g.dx, z: g.dz }, true)
    publicarGolpeTenis('rival', 'saque', g.t)
    return
  }
  // Doble golpe: un golpe fechado ANTES del que ya está resuelto. Con la ventana
  // rebobinada esto casi no puede pasar (la pelota cae en un solo lado, así que
  // las dos ventanas no se abren a la vez), pero un mensaje reordenado o un toque
  // repetido llegan igual: gana el más temprano, que es el que ya se ejecutó.
  if (g.t < tGolpeTenis) {
    dobleGolpeTenis += 1
    return
  }
  const b = pelotaEn(g.t)
  if (!b || !ventanaTenis(suLado, f.rx, f.rz, b)) {
    reemitirVueloTenis()
    return
  }
  f.bx = b.x
  f.by = b.y
  f.bz = b.z
  ladoCaida = b.cae
  haciaMuro = b.muro
  faltaTenis = b.falta
  f.rSwing = 1
  f.botesTenis = 0
  golpearTenis(m, { x: g.dx, z: g.dz }, { cy: g.cy, cal: g.cal }, 'rival')
  publicarGolpeTenis('rival', 'golpe', g.t)
  // El vuelo nace ADELANTADO lo que lleva en el aire desde su `t` (la parábola
  // es la misma en los dos lados, solo que aquí se la ve empezada), pero lo
  // adelanta el propio tick unas líneas más abajo: si se adelantara aquí y ya
  // hubiera aterrizado, nadie cobraría ese bote y la pelota se quedaría quieta.
}

/**
 * Qué punto fue (punto, juego, set o partido) comparando el marcador que llega
 * con el que había. El invitado no cuenta el tenis —eso es del árbitro—, pero sí
 * necesita el mensaje para el HUD, los cohetes y el cambio de saque.
 */
function mensajeDelPunto(previo: MarcadorPartido, m: MarcadorPartido, quien: 'yo' | 'rival'): string {
  const yo = quien === 'yo'
  // Al ganar el partido el marcador entero vuelve a cero, sets incluidos.
  if (m.setsYo === 0 && m.setsRival === 0 && (previo.setsYo > 0 || previo.setsRival > 0))
    return yo ? 'partidoTuyo' : 'partidoRival'
  if (m.setsYo !== previo.setsYo || m.setsRival !== previo.setsRival) return yo ? 'setTuyo' : 'setRival'
  if (m.juegosYo !== previo.juegosYo || m.juegosRival !== previo.juegosRival) return yo ? 'juegoTuyo' : 'juegoRival'
  return yo ? 'puntoTenis' : 'puntoTenisRival'
}

/** El punto que cantó el árbitro, en el invitado. Mismo cierre que `puntoTenisFin`. */
function aplicarPuntoTenis(
  m: Marco,
  punto: { quien: 'yo' | 'rival'; marcador: MarcadorPartido; mo: 'red' | 'fuera' | null },
): void {
  const f = juegoFrame
  const st = useJuegoCancha.getState()
  const msg = mensajeDelPunto(st, punto.marcador, punto.quien)
  st.aplicarMarcador(punto.marcador, punto.quien, msg)
  if (msg !== 'puntoTenis' && msg !== 'puntoTenisRival') sacaJugador = !sacaJugador
  if (punto.quien === 'yo') celebrar(m, msg)
  else if (punto.mo && msg === 'puntoTenisRival') st.avisar(punto.mo === 'red' ? 'aLaRed' : 'fuera')
  f.vuelo = null
  f.botesTenis = 0
  f.enVentana = false
  faltaTenis = null
  t0VueloTenis = null
  tGolpeTenis = reloj.ahora()
  saquePendiente = true
  f.proximoEvento = performance.now() + 1600
}

if (import.meta.env.DEV) {
  // El tenis en línea no se puede mirar desde fuera: el doble golpe, el reloj
  // del vuelo y el lado de caída son estado de módulo, y sin esto no hay forma
  // de medir ni de comparar las dos pantallas.
  ;(window as unknown as { tenisEnLinea: () => object }).tenisEnLinea = () => ({
    dobleGolpe: dobleGolpeTenis,
    t0Vuelo: t0VueloTenis,
    tGolpe: tGolpeTenis,
    anillo: anilloTenis.length,
    lado: juegoFrame.ladoJugador,
    ladoCaida,
    falta: faltaTenis,
    golpeo: golpeoTenis,
    saca: sacaJugador,
    saquePendiente,
    velBote: [velBoteX, velBoteZ],
    energiaBote,
  })
}

/** Saque pendiente: contra el frontón lo tira el muro; contra la IA se alterna cada juego. */
function tickSaqueTenis(
  m: Marco,
  solo: boolean,
  arbitro: boolean,
  p: { x: number; z: number },
  fwd: { x: number; z: number },
  intento: boolean,
  dt: number,
) {
  const f = juegoFrame
  const ahora = performance.now()
  const humano = rivalHumano()
  if (solo) {
    f.enVentana = false
    f.bx = -f.ladoJugador * 0.2
    f.bz = 0
    f.by = 1.2
    if (ahora >= f.proximoEvento) {
      saquePendiente = false
      f.botesTenis = 0
      reboteDelMuro(m)
    }
    return
  }
  // Sacas desde donde estés: tu lado se toma de tu posición entre punto y punto.
  // En línea manda el lado del ÁRBITRO (el rival del invitado): si cada uno lo
  // sacara de su propia x, dos jugadores parados en la misma mitad tendrían el
  // mismo lado y la pelota caería «en el campo de los dos».
  f.ladoJugador = humano && !arbitro ? ((f.rx >= 0 ? -1 : 1) as 1 | -1) : p.x >= 0 ? 1 : -1
  const lado = f.ladoJugador
  // Al rival remoto ya lo movió `tickTenis` con lo que trae el interpolador.
  if (!humano) mueveRival(-lado * m.L * 0.7, 0, 4, dt)
  if (sacaJugador) {
    // La pelota espera en tu raqueta hasta que toques el botón.
    f.bx = p.x - lado * 0.35
    f.bz = p.z
    f.by = 1.15
    f.enVentana = ahora >= f.proximoEvento
    if (f.enVentana && intento) {
      f.swing = 1
      f.enVentana = false
      if (humano && !arbitro) {
        // El invitado no saca solo: su toque viaja y el saque vuelve como vuelo.
        // Si ese viaje se pierde, la ventana se reabre sola en medio segundo.
        f.proximoEvento = ahora + 500
        golpearEnLinea(fwd, 1, 1, reloj.ahora())
        return
      }
      saquePendiente = false
      f.botesTenis = 0
      saqueTenis(m, 'yo', fwd)
      if (humano) publicarGolpeTenis('yo', 'saque', reloj.ahora())
    }
    return
  }
  f.enVentana = false
  f.bx = f.rx
  f.bz = f.rz
  f.by = 1.1
  // El saque del rival lo decide su máquina: con una persona enfrente llega por
  // la red como un `accion { q:'golpe' }` y el árbitro lo tira por él.
  if (arbitro && !humano && ahora >= f.proximoEvento) {
    saquePendiente = false
    f.rSwing = 1
    f.botesTenis = 0
    saqueTenis(m, 'rival', fwd)
  }
}

function tickTenis(m: Marco, solo: boolean, arbitro: boolean, dt: number) {
  const f = juegoFrame
  const ahora = performance.now()
  const lado = f.ladoJugador
  const d = dif()
  const humano = rivalHumano()
  const p = aLocal(m, playerPos.x, playerPos.z)
  const fwd = dirLocal(m, playerForward)
  medirStrafe('yo', fwd, p, dt)
  const intento = f.golpe
  f.golpe = false
  // El frontón se levanta al empezar (anima la media cancha volviéndose muro).
  if (solo && f.muro < 1) f.muro = Math.min(1, f.muro + dt * 1.6)
  // Partido en línea. Va ANTES del saque: el saque del otro llega como `vuelo` y
  // hay que soltar la pelota de la raqueta en el mismo frame en que llega.
  if (humano) {
    // El cuerpo del rival no lo decide ninguna máquina: lo trae el interpolador
    // y `mueveRival` lo sigue (en esa rama el objetivo da igual).
    mueveRival(f.rx, f.rz, 0, dt)
    if (arbitro) {
      medirStrafe('rival', { x: Math.sin(f.rHeading), z: Math.cos(f.rHeading) }, { x: f.rx, z: f.rz }, dt)
      // La historia de la pelota es lo que permite rebobinar SU golpe al
      // instante en que él lo dio, en vez de juzgarlo contra la pelota de ahora.
      anotarPelota()
      const golpe = tomarGolpeRival()
      if (golpe) golpeDelRemoto(m, golpe)
      // El vuelo del golpe, repetido una vez por si se perdió (ver REPETIR_VUELO).
      else if (!reenviadoTenis && t0VueloTenis !== null && reloj.ahora() - t0VueloTenis > REPETIR_VUELO) {
        reenviadoTenis = true
        reemitirVueloTenis()
      }
    } else {
      const punto = tomarPunto()
      if (punto) {
        aplicarPuntoTenis(m, punto)
        return
      }
      const vuelo = tomarVuelo()
      if (vuelo) aplicarVueloTenis(m, vuelo)
    }
  }
  if (saquePendiente) {
    tickSaqueTenis(m, solo, arbitro, p, fwd, intento, dt)
    return
  }
  if (!f.vuelo) {
    f.enVentana = false
    return
  }
  // El rival persigue el punto de caída, pero solo cuando la pelota ya cruzó la
  // red (antes no puede adivinar dónde va): mientras, recupera el centro.
  if (!solo && !humano) {
    const suya = ladoCaida !== lado && !haciaMuro && (f.bx >= 0 ? 1 : -1) !== lado
    mueveRival(suya ? f.vuelo.x1 : -lado * m.L * 0.7, suya ? f.vuelo.z1 : 0, 3 + d * 4, dt)
  }
  // Ventana de golpeo: en tu lado, cerca de ti y a altura de raqueta (no yendo al muro).
  f.enVentana = ventanaTenis(lado, p.x, p.z, {
    x: f.bx,
    y: f.by,
    z: f.bz,
    cae: ladoCaida,
    muro: haciaMuro,
    falta: faltaTenis,
  })
  if (f.enVentana && intento) {
    // ¡Le pegas! El timing decide la calidad; tu frente, la dirección.
    f.swing = 1
    f.enVentana = false
    const q = calidadTenis(p)
    if (solo) {
      f.botesTenis = 0
      void useJuegoCancha.getState().sumarPeloteo()
      golpeAlMuro(m, q.cal)
      return
    }
    const tGolpe = instantePelota()
    if (humano && !arbitro) {
      // Cada quien decide SU golpe: viaja fechado con el instante en que esta
      // ventana estaba abierta, y el árbitro rebobina hasta ahí para ejecutarlo.
      // La pelota NO se toca aquí: si el golpe no valiera, se teletransportaría.
      golpearEnLinea(fwd, q.cy, q.cal, tGolpe)
      return
    }
    f.botesTenis = 0
    golpearTenis(m, fwd, q, 'yo')
    if (humano) publicarGolpeTenis('yo', 'golpe', tGolpe)
    return
  }
  // El rival golpea cuando la pelota ya botó en su campo y la tiene encima; si no
  // llegó, se estira en el último momento (y de ahí le sale un mal golpe). Es su
  // máquina de decisión: una persona golpea cuando quiere y su golpe llega por la
  // red con su propia ventana (F7), sin `devolverRival` ni `dif()` de por medio.
  if (!solo && !humano && ladoCaida !== lado && f.botesTenis >= 1 && f.by > Y_MIN_GOLPE && f.by < Y_MAX_GOLPE) {
    const alcance = Math.hypot(f.bx - f.rx, f.bz - f.rz)
    const ultima = f.vuelo.t / f.vuelo.dur > 0.72
    if (alcance < TENIS_COMODO_RIVAL || (ultima && alcance < TENIS_ALCANCE_RIVAL)) {
      f.rSwing = 1
      f.botesTenis = 0
      devolverRival(m, p, alcance)
      return
    }
  }
  const finVuelo = t0VueloTenis !== null && f.vuelo ? t0VueloTenis + f.vuelo.dur * 1000 : 0
  if (!avanzarVueloTenis(dt)) return
  // Lo que venga ahora (el bote) arranca donde ACABÓ el vuelo, no en el frame en
  // que se detecta: si no, cada cliente empezaría el bote con su propio retraso.
  if (t0VueloTenis !== null) t0VueloTenis = finVuelo
  if (solo && haciaMuro) {
    // Llegó al frontón: rebota de vuelta a tu media cancha.
    reboteDelMuro(m)
    f.botesTenis = 0
    return
  }
  // Falta del último golpe: la red o la bola fuera dan el punto al contrario.
  if (faltaTenis) {
    if (solo) {
      // Contra el frontón no hay faltas: la pelota simplemente se perdió.
      faltaTenis = null
      f.botesTenis = 0
      f.enVentana = false
      useJuegoCancha.getState().avisar('seEscapo')
      saquePendiente = true
      f.proximoEvento = ahora + 1300
    } else if (arbitro) {
      // El punto lo canta el ÁRBITRO y viaja con su motivo: el invitado no
      // juzga ni la red ni la línea, solo obedece el marcador que le llega.
      if (golpeoTenis === 'yo') puntoTenisFin(m, 'rival', faltaTenis)
      else puntoTenisFin(m, 'yo')
    }
    return
  }
  f.botesTenis += 1
  if (f.botesTenis < 2) {
    iniciarBote(m)
    return
  }
  // Dos botes sin devolver: el punto es de quien golpeó por última vez.
  if (solo) {
    f.botesTenis = 0
    f.enVentana = false
    useJuegoCancha.getState().avisar('seEscapo')
    saquePendiente = true
    f.proximoEvento = ahora + 1300
  } else if (arbitro) puntoTenisFin(m, ladoCaida === lado ? 'rival' : 'yo')
}

// ─── Béisbol (solo bateo) ───

/**
 * Devuelve al bateador a la caja. Se llama al empezar y ANTES DE CADA
 * LANZAMIENTO: entre pitcheos puedes moverte, pero al llegar el siguiente te
 * vuelve a acomodar solo. Si te saliste a propósito (`anclaSoltada`) ya no.
 */
function anclarBateador(snap: boolean) {
  const f = juegoFrame
  if (f.anclaSoltada) return
  f.anclaActiva = true
  f.anclaSnap = snap
  f.anclaDesde = performance.now()
}

/** Lanzamiento desde el montículo: pasa junto al bateador y sigue un poco de largo. */
function lanzarPitcheo(m: Marco, solo: boolean) {
  const f = juegoFrame
  anclarBateador(false)
  const p = aLocal(m, playerPos.x, playerPos.z)
  // Puntería con desvío: a más dificultad, más lejos del punto dulce te la pone.
  const desvio = (Math.random() - 0.5) * (0.5 + dif() * 1.5)
  const dx = p.x - f.bx
  const dz = p.z - f.bz + desvio
  const d = Math.hypot(dx, dz)
  // Si estás encima del montículo no hay tiro que batear: va hacia el home.
  const x1 = d < 2 ? BEISBOL.home * m.esc : p.x + (dx / d) * 1.3
  const z1 = d < 2 ? 0 : p.z + desvio + (dz / d) * 1.3
  const dist = Math.hypot(x1 - f.bx, z1 - f.bz)
  bolaBateada = false
  f.vuelo = {
    x0: f.bx,
    y0: 1.4,
    z0: f.bz,
    x1,
    y1: 0.35 + Math.random() * 0.5,
    z1,
    t: 0,
    // El montículo está más cerca que en un campo real: velocidad acorde para
    // que quede tiempo de reacción incluso en experto.
    dur: dist / (5.5 + dif() * 6),
    alto: 0.3,
  }
  if (!solo) f.rSwing = 1 // brazada de lanzamiento del pitcher
}

/**
 * Batazo: el TIMING (qué tan cerca del punto dulce le pegas) decide la
 * dirección y qué tan limpio sale; la CARGA del botón, la fuerza con la que se
 * va. Hace falta contacto limpio Y fuerza para pasar la barda.
 */
function batear(m: Marco, p: { x: number; z: number }, carga: number) {
  const f = juegoFrame
  f.swing = 1
  f.enVentana = false
  const d = Math.hypot(f.bx - p.x, f.bz - p.z)
  const calidad = clamp(1 - Math.abs(d - BATE_IDEAL) / BATE_TOL, 0, 1)
  // Dirección: de vuelta hacia el jardín (sobre el montículo), con dispersión
  // según el contacto y efecto por tu movimiento lateral al batear. Un mal
  // contacto abre lo bastante como para irse de foul por las líneas.
  const montX = BEISBOL.monticulo * m.esc
  let ang = Math.atan2(-f.bz, montX - f.bx)
  ang += (Math.random() - 0.5) * (0.3 + (1 - calidad) * 3.6) + clamp(f.strafe, -3, 3) * 0.06
  // Distancia que le falta a la bola para pasar la barda desde el punto de contacto.
  const aBarda = Math.max(4, BEISBOL.radio * m.esc - Math.hypot(f.bx - BEISBOL.home * m.esc, f.bz))
  const alcance = (1.5 + calidad * calidad * aBarda * 0.9) * (BATE_POT_MIN + carga * BATE_POT_RANGO)
  bolaBateada = true
  f.vuelo = {
    x0: f.bx,
    y0: Math.max(0.4, f.by),
    z0: f.bz,
    x1: f.bx + Math.cos(ang) * alcance,
    y1: 0,
    z1: f.bz + Math.sin(ang) * alcance,
    t: 0,
    dur: clamp(alcance / 13, 0.45, 1.5),
    alto: 1 + calidad * 3 + carga * 1.5,
  }
}

/**
 * Dónde cayó el batazo, medido desde el home como en un campo real: fuera de las
 * líneas de foul = foul; pasando la barda (que se acerca hacia las líneas) =
 * cuadrangular; dentro del campo = hit.
 */
function resolverBatazo(m: Marco) {
  const f = juegoFrame
  const homeX = BEISBOL.home * m.esc
  const ang = Math.atan2(f.bz, f.bx - homeX) // 0 = jardín central
  const dist = Math.hypot(f.bx - homeX, f.bz)
  if (Math.abs(ang) > BEISBOL.apertura) {
    useJuegoCancha.getState().avisar('foul')
  } else if (dist > radioBeisbol(ang) * m.esc) {
    strikesBeis = 0
    const r = radioBeisbol(ang) * m.esc
    const w = aMundo(m, homeX + Math.cos(ang) * r, Math.sin(ang) * r)
    lanzarCohete(w.x, m.sueloY + BEISBOL.cercaAlto, w.z)
    void useJuegoCancha.getState().anotar('yo', 3, 'homerun')
  } else {
    strikesBeis = 0
    void useJuegoCancha.getState().anotar('yo', 1, 'hit')
  }
  f.proximoEvento = performance.now() + 1500
}

/** Lanzamiento sin contacto: strike; al tercero es ponche (punto del rival contra la IA). */
function strikeBeis(solo: boolean) {
  strikesBeis += 1
  if (strikesBeis >= 3) {
    strikesBeis = 0
    if (solo) useJuegoCancha.getState().avisar('ponche')
    else void useJuegoCancha.getState().anotar('rival', 1, 'ponche')
  } else {
    useJuegoCancha.getState().avisar('strike')
  }
  juegoFrame.proximoEvento = performance.now() + 1400
}

function tickBeisbol(m: Marco, solo: boolean, arbitro: boolean, dt: number) {
  const f = juegoFrame
  const ahora = performance.now()
  const p = aLocal(m, playerPos.x, playerPos.z)
  const fwd = dirLocal(m, playerForward)
  medirStrafe('yo', fwd, p, dt)
  // Mantener el botón carga la fuerza del swing; soltarlo lo ejecuta.
  if (f.cargando) f.carga = Math.min(1, f.carga + dt / T_CARGA)
  const intento = f.soltar
  f.soltar = false
  const montX = BEISBOL.monticulo * m.esc

  if (f.vuelo) {
    if (!bolaBateada) {
      // Lanzamiento en camino: la ventana de bateo es cuando la bola pasa junto a ti.
      f.enVentana = Math.hypot(f.bx - p.x, f.bz - p.z) < BATE_RADIO && f.by > 0.1 && f.by < 2.0
      if (intento) {
        const carga = f.carga
        f.cargaSwing = carga
        f.carga = 0
        if (f.enVentana) return batear(m, p, carga)
        f.swing = 1 // abanicaste lejos de la bola
      }
    }
    if (avanzarVuelo(dt)) {
      f.enVentana = false
      if (bolaBateada) resolverBatazo(m)
      else strikeBeis(solo) // pasó de largo sin contacto
    }
    return
  }

  f.enVentana = false
  if (intento) {
    f.swing = 1 // swing de práctica entre lanzamientos
    f.cargaSwing = f.carga
    f.carga = 0
  }
  // Entre lanzamientos la bola espera en la mano del pitcher (o en la máquina).
  if (!solo) {
    if (mueveRival(montX, 0, 3.5, dt)) f.rHeading = Math.atan2(p.x - f.rx, p.z - f.rz)
    f.bx = f.rx
    f.bz = f.rz
  } else {
    f.bx = montX
    f.bz = 0
  }
  f.by = 1.2
  // El pitcheo lo decide quien lanza (máquina o pitcher): en línea sería el
  // árbitro. El béisbol no está entre los juegos de sala, así que aquí el gate
  // solo cierra el hueco.
  if (arbitro && ahora >= f.proximoEvento) lanzarPitcheo(m, solo)
}

// ─── Componentes ───

/** Vigila si el jugador está dentro de una cancha y activa/termina el minijuego. */
export function MinijuegosCanchas() {
  const fase = useJuegoCancha((s) => s.fase)
  const marcoRef = useRef<Marco | null>(null)
  const acc = useRef(0)
  const faseAnterior = useRef<string | null>(null)
  const reinicioPend = useRef(false)

  useFrame((_, dt) => {
    // Al confirmar el modo en el prompt arranca el partido. En línea el invitado
    // entra de una pieza al que abrió el árbitro, así que la fase salta de null
    // a 'jugando' sin pasar por el prompt: lo que dispara el reinicio es ENTRAR
    // en 'jugando', y se espera a tener cancha (él puede no haberla pisado aún).
    const st = useJuegoCancha.getState()
    if (st.fase === 'jugando' && faseAnterior.current !== 'jugando') reinicioPend.current = true
    faseAnterior.current = st.fase
    if (reinicioPend.current && marcoRef.current) {
      reinicioPend.current = false
      reiniciarJuego(marcoRef.current)
    }

    acc.current += dt
    if (acc.current < 0.25) return
    acc.current = 0
    const casa = useHouse.getState()
    const bloqueado =
      useLayout.getState().editMode ||
      casa.activeRoom != null ||
      casa.playerLevel !== 0 ||
      monturaFrame.montado ||
      trenFrame.montado ||
      parqueFrame.usando ||
      useCaminos.getState().activo ||
      useCanchas.getState().activo ||
      useHuerto.getState().activo ||
      useGranja.getState().activo ||
      usePaintball.getState().fase != null
    // Contexto local roto (editor, cuarto abierto, otro piso, montarse, otra
    // infraestructura, paintball): son ONCE condiciones que hoy terminan el
    // partido solas. Con `'contexto'` el store aplica el gate de B7: en línea
    // sacan al invitado él solo y al árbitro solo le suspenden la vista.
    if (bloqueado) {
      if (st.canchaId != null) st.terminar('contexto')
      if (st.cerca) st.setCerca(null)
      // Al ÁRBITRO de un partido en línea `terminar('contexto')` no lo saca, y
      // anularle el marco aquí congelaría la pelota para los dos: su `useFrame`
      // sigue simulando (el Canvas nunca se desmonta) y lo que se suspende es
      // la vista. Para todos los demás el partido ya terminó y el marco sobra.
      if (useJuegoCancha.getState().fase !== 'jugando') marcoRef.current = null
      return
    }
    // Partido en curso: el marco queda anclado a la cancha activa y pisar fuera
    // del área ya NO termina el juego — se sale con el botón «Salir» del
    // marcador, o solo al alejarse de verdad (más de MARGEN_ABANDONO).
    if (st.fase === 'jugando' && st.canchaId != null) {
      const activa = useDiseño.getState().objetos.find((o) => o.id === st.canchaId && esObjetoMapa(o))
      if (!activa || !esCancha(activa.tipo)) {
        // La cancha se borró con el partido andando. Esto no es una vista que se
        // suspende: sin cancha no hay nada que arbitrar, así que sale también el
        // árbitro (y con `'boton'` su motor cierra el partido para los dos).
        st.terminar('boton')
        marcoRef.current = null
        return
      }
      const m = marcoDe(activa)
      const p = aLocal(m, playerPos.x, playerPos.z)
      if (Math.abs(p.x) > m.L + MARGEN_ABANDONO || Math.abs(p.z) > m.W + MARGEN_ABANDONO) {
        st.terminar('contexto')
        // Igual que arriba: el árbitro que se va a pasear no le corta el partido
        // a nadie (sigue arbitrando y vuelve cuando quiera).
        if (useJuegoCancha.getState().fase !== 'jugando') marcoRef.current = null
        return
      }
      marcoRef.current = m
      // Primer marco del partido: el reinicio que esperaba cancha, antes de que
      // la física llegue a correr un solo tick con el frame del partido pasado.
      if (reinicioPend.current) {
        reinicioPend.current = false
        reiniciarJuego(m)
      }
      return
    }
    const cancha = useDiseño
      .getState()
      .objetos.find(
        (o) => o.id != null && esObjetoMapa(o) && esCancha(o.tipo) && dentro(marcoDe(o), playerPos.x, playerPos.z),
      )
    if (cancha?.id != null) {
      const m = marcoDe(cancha)
      marcoRef.current = m
      // Pisar la cancha ya NO empieza el partido: solo ofrece el botón «Jugar»
      // del hueco del cubo (ver `ContextoProximity`). Entrar sin querer a un
      // partido por cruzar el campo era el mismo problema que sentarse solo.
      if (st.canchaId !== cancha.id) st.setCerca({ canchaId: cancha.id, clase: m.clase })
      // Pisarla es también el gesto que retoma un partido en línea: el que me
      // abrieron estando lejos, o el que dejé al abrir un cuarto.
      reengancharPartido(cancha.id)
    } else {
      // Alejarse solo cancela el prompt de modo ('eligiendo'), nunca un partido.
      if (st.canchaId != null) st.terminar('contexto')
      if (st.cerca) st.setCerca(null)
      marcoRef.current = null
    }
  })

  if (fase !== 'jugando') return null
  return <JuegoActivo marcoRef={marcoRef} />
}

/** Raqueta de tenis procedural (mango + aro + cuerdas). */
function RaquetaModelo({ escala = 1 }: { escala?: number }) {
  return (
    <group scale={escala}>
      <mesh position={[0, 0.14, 0]}>
        <cylinderGeometry args={[0.025, 0.03, 0.34, 6]} />
        <meshStandardMaterial color="#7c2d12" roughness={0.7} />
      </mesh>
      <mesh position={[0, 0.42, 0]}>
        <torusGeometry args={[0.16, 0.024, 8, 18]} />
        <meshStandardMaterial color="#1f2937" roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.42, 0]}>
        <circleGeometry args={[0.15, 16]} />
        <meshStandardMaterial color="#e2e8f0" transparent opacity={0.45} side={THREE.DoubleSide} roughness={0.9} />
      </mesh>
    </group>
  )
}

/** Bate de béisbol procedural (barril de madera + grip + perilla). */
function BateModelo({ escala = 1 }: { escala?: number }) {
  return (
    <group scale={escala}>
      <mesh position={[0, 0.42, 0]}>
        <cylinderGeometry args={[0.055, 0.028, 0.78, 10]} />
        <meshStandardMaterial color="#b45309" roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.12, 0]}>
        <cylinderGeometry args={[0.03, 0.03, 0.26, 10]} />
        <meshStandardMaterial color="#1f2937" roughness={0.8} />
      </mesh>
      <mesh position={[0, -0.02, 0]}>
        <cylinderGeometry args={[0.045, 0.045, 0.05, 10]} />
        <meshStandardMaterial color="#7c2d12" roughness={0.7} />
      </mesh>
    </group>
  )
}

// Orientaciones del bate EN LA MANO: guardia (suelta y cargada) e instante de
// contacto. Se pasa de una a otra con slerp: interpolar los ángulos de Euler
// hacía cabecear el bate (la punta bajaba a ras de suelo a media pasada).
const Q_GUARDIA = new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.2, -0.85, 0.4))
const Q_CARGADA = new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.2, -1.15, 0.4))
const Q_CONTACTO = new THREE.Quaternion().setFromEuler(new THREE.Euler(-1.4, 0.55, -1.9))
const _qGuardia = new THREE.Quaternion()

/**
 * Bate EN LA MANO del jugador mientras juega béisbol. Dos grupos encadenados
 * que reproducen la cadena del cuerpo: el primero replica el pivote del hombro
 * del box-man (−0.42, 1.22) y copia la rotación del BRAZO, así el bate va
 * siempre pegado a la mano que se mueve; el segundo, en la mano, es la MUÑECA y
 * le da al bate su movimiento propio. Sumados al giro del torso (Character), la
 * punta describe un arco del doble de recorrido que la mano.
 */
export function BateJugador({ escala }: { escala: number }) {
  const conBate = useJuegoCancha((s) => s.fase === 'jugando' && s.clase === 'beisbol')
  const hombro = useRef<THREE.Group>(null)
  const muneca = useRef<THREE.Group>(null)
  useFrame(() => {
    const pose = poseBateo()
    if (!pose) return
    if (hombro.current) hombro.current.rotation.x = pose.brazo
    if (muneca.current) {
      _qGuardia.slerpQuaternions(Q_GUARDIA, Q_CARGADA, pose.carga)
      muneca.current.quaternion.slerpQuaternions(_qGuardia, Q_CONTACTO, pose.mezcla)
    }
  })
  if (!conBate) return null
  return (
    <group ref={hombro} position={[-0.42 * escala, 1.22 * escala, 0]}>
      {/* Empuñadura al final del brazo (la mano), con el bate hacia arriba. */}
      <group ref={muneca} position={[0, -0.56 * escala, 0.06 * escala]}>
        <BateModelo escala={escala} />
      </group>
    </group>
  )
}

/** Raqueta en la mano del jugador mientras juega tenis (con raquetazo al golpear). */
export function RaquetaJugador({ escala }: { escala: number }) {
  const conRaqueta = useJuegoCancha((s) => s.fase === 'jugando' && s.clase === 'tenis')
  const g = useRef<THREE.Group>(null)
  useFrame(() => {
    if (!g.current) return
    // Raquetazo: la raqueta cruza hacia adelante y vuelve a la guardia.
    const s = Math.sin(juegoFrame.swing * Math.PI)
    g.current.rotation.set(0.5 - s * 2.0, -s * 0.9, -0.5 + s * 0.6)
  })
  if (!conRaqueta) return null
  return (
    <group position={[0.44 * escala, 0.95 * escala, 0.1 * escala]} ref={g} rotation={[0.5, 0, -0.5]}>
      <RaquetaModelo escala={escala} />
    </group>
  )
}

/** Muñeco de cubos: rival de respaldo si el asistente elegido ya no existe. */
function MunecoRival({
  color,
  piernaI,
  piernaD,
}: {
  color: string
  piernaI: React.RefObject<THREE.Group | null>
  piernaD: React.RefObject<THREE.Group | null>
}) {
  return (
    <group>
      <group ref={piernaI} position={[-0.12, 0.55, 0]}>
        <mesh position={[0, -0.27, 0]}>
          <boxGeometry args={[0.19, 0.55, 0.22]} />
          <meshStandardMaterial color="#1e3a8a" roughness={0.8} />
        </mesh>
      </group>
      <group ref={piernaD} position={[0.12, 0.55, 0]}>
        <mesh position={[0, -0.27, 0]}>
          <boxGeometry args={[0.19, 0.55, 0.22]} />
          <meshStandardMaterial color="#1e3a8a" roughness={0.8} />
        </mesh>
      </group>
      <mesh position={[0, 0.88, 0]}>
        <boxGeometry args={[0.56, 0.6, 0.3]} />
        <meshStandardMaterial color={color} roughness={0.8} />
      </mesh>
      {[-0.37, 0.37].map((x) => (
        <mesh key={x} position={[x, 0.88, 0]}>
          <boxGeometry args={[0.16, 0.55, 0.24]} />
          <meshStandardMaterial color={color} roughness={0.8} />
        </mesh>
      ))}
      <mesh position={[0, 1.42, 0]}>
        <boxGeometry args={[0.42, 0.42, 0.42]} />
        <meshStandardMaterial color="#fde68a" roughness={0.8} />
      </mesh>
    </group>
  )
}

/** Pelota + rival (y frontón de tenis solo) del minijuego activo. */
function JuegoActivo({ marcoRef }: { marcoRef: React.MutableRefObject<Marco | null> }) {
  const clase = useJuegoCancha((s) => s.clase)
  const modo = useJuegoCancha((s) => s.modo)
  const rivalId = useJuegoCancha((s) => s.rivalId)
  const rivalColor = useJuegoCancha((s) => s.rivalColor)
  const asistente = useAsistentes((s) => s.lista.find((a) => a.id === rivalId))
  const pelota = useRef<THREE.Group>(null)
  const rival = useRef<THREE.Group>(null)
  const flote = useRef<THREE.Group>(null)
  const brazo = useRef<THREE.Group>(null)
  const raqueta = useRef<THREE.Group>(null)
  const piernaI = useRef<THREE.Group>(null)
  const piernaD = useRef<THREE.Group>(null)
  const muro = useRef<THREE.Group>(null)
  // Mira de básquet: línea continua de la trayectoria prevista (verde si la carga encestaría).
  const linea = useMemo(() => {
    const g = new THREE.BufferGeometry().setFromPoints(Array.from({ length: N_ARCO }, () => new THREE.Vector3()))
    const l = new THREE.Line(g, new THREE.LineBasicMaterial({ color: '#fbbf24', transparent: true, opacity: 0.9 }))
    l.visible = false
    return l
  }, [])
  useEffect(
    () => () => {
      linea.geometry.dispose()
      ;(linea.material as THREE.Material).dispose()
    },
    [linea],
  )

  // Quién mueve al rival cuando es otra persona: el interpolador de la partida.
  // Su pose llega en coordenadas de MUNDO y la cancha vive en las suyas, así que
  // se traslada al origen del objeto y se le resta su giro (como `dirLocal`).
  // Fuera de un partido en línea no hay cuerpo y la costura devuelve null, que
  // es lo que deja intacta a la IA.
  useEffect(() => {
    registrarFuenteRival(() => {
      const m = marcoRef.current
      const c = cuerpoRival()
      if (!m || !c) return null
      const local = aLocal(m, c.x, c.z)
      return { x: local.x, z: local.z, h: c.h - m.rad, vel: c.vel }
    })
    return () => registrarFuenteRival(null)
  }, [marcoRef])

  useFrame((state, dtRaw) => {
    const m = marcoRef.current
    if (!m) return
    const dt = Math.min(dtRaw, 0.08)
    // `solo` = sin nadie enfrente; en línea hay rival (otra persona), así que es
    // false. `arbitro` es el corte anfitrión/invitado: las MÁQUINAS DE DECISIÓN
    // (posesión, robos, tiros del rival, pitcheo, rodada de la pelota) solo corren
    // en quien arbitra. Fuera de línea arbitra siempre este cliente, así que el
    // partido en un jugador es exactamente el de antes.
    // Del STORE y no del valor del render (como `rivalHumano`): el modo entra en
    // el mismo frame en que empieza el partido y con el valor de React —un
    // render por detrás— el invitado arbitraría su primer frame.
    const modoAhora = useJuegoCancha.getState().modo
    const solo = modoAhora === 'solo'
    const arbitro = modoAhora !== 'online' || soyArbitro()
    if (m.clase === 'futbol') tickFutbol(m, solo, arbitro, dt)
    else if (m.clase === 'basket') tickBasket(m, solo, arbitro, dt)
    else if (m.clase === 'beisbol') tickBeisbol(m, solo, arbitro, dt)
    else tickTenis(m, solo, arbitro, dt)
    const f = juegoFrame
    // Los raquetazos y los pulsos de la canasta se desvanecen solos.
    f.swing = Math.max(0, f.swing - dt * 3.2)
    f.rSwing = Math.max(0, f.rSwing - dt * 3.2)
    f.aroPulso = Math.max(0, f.aroPulso - dt * 2.2)
    f.tableroPulso = Math.max(0, f.tableroPulso - dt * 3.5)
    if (pelota.current) {
      const bw = aMundo(m, f.bx, f.bz)
      const r = m.clase === 'tenis' ? 0.16 : m.clase === 'beisbol' ? 0.14 : 0.33
      pelota.current.position.set(bw.x, m.sueloY + r + f.by, bw.z)
    }
    if (rival.current) {
      const rw = aMundo(m, f.rx, f.rz)
      rival.current.position.set(rw.x, m.sueloY, rw.z)
      rival.current.rotation.y = f.rHeading + m.rad
    }
    // El asistente flota (como en el mapa); el muñeco de respaldo camina.
    if (flote.current)
      flote.current.position.y = asistente ? FLOTE_RIVAL + Math.sin(state.clock.elapsedTime * 2) * 0.12 : 0
    const ang = Math.sin(f.rFase) * 0.55 * Math.min(1, f.rVel / 3)
    if (piernaI.current) piernaI.current.rotation.x = ang
    if (piernaD.current) piernaD.current.rotation.x = -ang
    // Brazo del asistente: levanta la raqueta al golpear.
    if (brazo.current) brazo.current.rotation.z = 0.1 + Math.sin(f.rSwing * Math.PI) * 1.8
    if (raqueta.current) {
      const s = Math.sin(f.rSwing * Math.PI)
      raqueta.current.rotation.set(0.5 - s * 2.0, -s * 0.9, -0.5 + s * 0.6)
    }
    // El frontón se levanta (escala en Y) al empezar el juego solo de tenis.
    if (muro.current) muro.current.scale.y = Math.max(0.001, f.muro)
    // Mira de básquet: línea de la trayectoria prevista, solo al cargar el tiro.
    const verMira = f.cargando && f.duena === 'yo' && m.clase === 'basket'
    linea.visible = verMira
    if (verMira) {
      const aroX = CANASTA.aroX * m.esc
      const distAro = Math.hypot(f.bx - aroX, f.bz)
      const alcance = (BAS_ALC_MIN + f.carga * (BAS_ALC_MAX - BAS_ALC_MIN)) * m.esc
      const tol = tolTiro(m.esc)
      const dx = aroX - f.bx
      const dz = -f.bz
      const n = Math.hypot(dx, dz) || 1
      const x1 = f.bx + (dx / n) * alcance
      const z1 = f.bz + (dz / n) * alcance
      const alto = 3.05 * m.esc - 1.4 * m.esc + 1.2 + f.carga * 1.2
      const pos = linea.geometry.attributes.position as THREE.BufferAttribute
      for (let i = 0; i < N_ARCO; i++) {
        const tau = i / (N_ARCO - 1)
        const ly = 1.4 * m.esc * (1 - tau) + Math.sin(Math.PI * tau) * alto
        const w = aMundo(m, f.bx + (x1 - f.bx) * tau, f.bz + (z1 - f.bz) * tau)
        pos.setXYZ(i, w.x, m.sueloY + ly, w.z)
      }
      pos.needsUpdate = true
      // Verde = entra limpio; azul = se pasa, pero la mete de tabla; ámbar = falla.
      const err = alcance - distAro
      const color =
        Math.abs(err) < tol
          ? '#34d399'
          : err > 0 && err < tol + REBOTE_DENTRO * m.esc
            ? '#38bdf8'
            : '#fbbf24'
      ;(linea.material as THREE.LineBasicMaterial).color.set(color)
    }
  })

  const m = marcoRef.current
  // Solo la IA se dibuja aquí: en línea el cuerpo del rival es el de otra persona
  // y lo pinta `JugadorRemoto3D` con su avatar (F5). Montarlo también aquí lo
  // duplicaría en pantalla.
  const conRival = modo === 'ia'
  return (
    <group>
      {/* Pelota. */}
      <group ref={pelota}>
        <mesh>
          <sphereGeometry args={[clase === 'tenis' ? 0.16 : clase === 'beisbol' ? 0.14 : 0.33, 12, 10]} />
          <meshStandardMaterial
            color={clase === 'basket' ? '#f97316' : clase === 'tenis' ? '#d9f99d' : '#f8fafc'}
            roughness={0.5}
          />
        </mesh>
        {clase === 'futbol' && (
          <mesh>
            <sphereGeometry args={[0.335, 6, 4]} />
            <meshStandardMaterial color="#1f2937" wireframe />
          </mesh>
        )}
      </group>
      {/* Mira de básquet: línea de la trayectoria prevista. */}
      <primitive object={linea} />
      {/* Frontón de tenis solo: la media cancha rival levantada como muro. */}
      {clase === 'tenis' && modo === 'solo' && m && (
        <group
          position={[
            aMundo(m, -juegoFrame.ladoJugador * 0.15, 0).x,
            m.sueloY,
            aMundo(m, -juegoFrame.ladoJugador * 0.15, 0).z,
          ]}
          rotation-y={-m.rad}
          ref={muro}
        >
          <mesh position={[0, 1.75, 0]}>
            <boxGeometry args={[0.3, 3.5, m.W * 2]} />
            <meshStandardMaterial color={m.o.color} roughness={0.85} />
          </mesh>
          {/* Línea de frontón (altura de la red). */}
          <mesh position={[juegoFrame.ladoJugador * 0.16, 1.0, 0]} rotation={[0, Math.PI / 2, 0]}>
            <planeGeometry args={[m.W * 2 - 0.3, 0.1]} />
            <meshStandardMaterial color="#f8fafc" roughness={0.7} />
          </mesh>
        </group>
      )}
      {/* Máquina lanzadora del béisbol solo: tripié con cañón hacia el home. */}
      {clase === 'beisbol' && modo === 'solo' && m && (
        <group
          position={[aMundo(m, BEISBOL.monticulo * m.esc, 0).x, m.sueloY, aMundo(m, BEISBOL.monticulo * m.esc, 0).z]}
          rotation-y={-m.rad}
        >
          <mesh position={[0, 0.45, 0]}>
            <boxGeometry args={[0.5, 0.9, 0.5]} />
            <meshStandardMaterial color="#334155" roughness={0.7} />
          </mesh>
          <mesh position={[-0.32, 1.0, 0]} rotation={[0, 0, 1.2]}>
            <cylinderGeometry args={[0.09, 0.12, 0.7, 10]} />
            <meshStandardMaterial color="#64748b" metalness={0.3} roughness={0.5} />
          </mesh>
        </group>
      )}
      {/* Rival: el modelo 3D del asistente elegido (o un muñeco si ya no existe). */}
      {conRival && (
        <group ref={rival}>
          <group ref={flote}>
            {asistente ? (
              <group scale={asistente.escala ?? 1}>
                <ModeloMascota
                  forma={asistente.forma}
                  color={asistente.color}
                  modelo3d={asistente.modelo3d}
                  modeloGlb={asistente.modeloGlb}
                  cuerpoPresetId={asistente.cuerpoPresetId}
                  brazoRef={brazo}
                  estado={{ velocidad: 0, fase: 0 }}
                />
                <Prendas ropa={asistente.ropa} anclas={anclasDe(asistente)} />
              </group>
            ) : (
              <MunecoRival color={rivalColor ?? '#f97316'} piernaI={piernaI} piernaD={piernaD} />
            )}
            {/* Raqueta del rival en tenis. */}
            {clase === 'tenis' && (
              <group ref={raqueta} position={[0.5, asistente ? -0.1 : 0.95, 0.1]} rotation={[0.5, 0, -0.5]}>
                <RaquetaModelo />
              </group>
            )}
          </group>
        </group>
      )}
    </group>
  )
}
