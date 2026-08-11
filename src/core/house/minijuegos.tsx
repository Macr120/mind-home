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
/** Posición LOCAL del jugador el frame anterior (para medir su velocidad lateral). */
const _prevP = new THREE.Vector3()
/** Altura del próximo bote de la pelota de tenis; decae en cada rebote. */
let energiaBote = 1.5
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

/** Mide la velocidad lateral del jugador (perpendicular a su frente) para el chanfle. */
function medirStrafe(fwd: { x: number; z: number }, p: { x: number; z: number }, dt: number) {
  const f = juegoFrame
  const lateral = ((p.x - _prevP.x) * -fwd.z + (p.z - _prevP.z) * fwd.x) / Math.max(dt, 1e-3)
  f.strafe = THREE.MathUtils.lerp(f.strafe, lateral, 0.3)
  _prevP.set(p.x, 0, p.z)
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
  pendiente = null
  rebotePend = null
  const pl0 = aLocal(m, playerPos.x, playerPos.z)
  _prevP.set(pl0.x, 0, pl0.z)
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
  }
}

/** Camina el rival hacia (tx,tz); devuelve true al llegar. */
function mueveRival(tx: number, tz: number, vel: number, dt: number): boolean {
  const f = juegoFrame
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

/** Dispara la pelota en dirección `dir` (local) con fuerza según la carga. */
function dispararFutbol(dir: { x: number; z: number }, carga: number) {
  const f = juegoFrame
  const fuerza = FUERZA_BASE + FUERZA_RANGO * carga
  f.bvx = dir.x * fuerza
  f.bvz = dir.z * fuerza
  // Efecto: acelera la pelota hacia el lado al que te movías al golpear.
  f.chanfle = clamp(f.strafe, -6, 6) * K_CHANFLE
  if (carga > UMBRAL_ELEVADO) {
    // Chut por elevado: parábola que al aterrizar sigue rodando con parte de la velocidad.
    const alto = (carga - UMBRAL_ELEVADO) * 3.2
    const dur = 0.5 + carga * 0.4
    f.vuelo = { x0: f.bx, y0: 0, z0: f.bz, x1: f.bx + f.bvx * dur, y1: 0, z1: f.bz + f.bvz * dur, t: 0, dur, alto }
    vueloFutVX = f.bvx * 0.55
    vueloFutVZ = f.bvz * 0.55
  }
  f.duena = 'nadie'
}

function tickFutbol(m: Marco, solo: boolean, dt: number) {
  const f = juegoFrame
  const ahora = performance.now()
  const p = aLocal(m, playerPos.x, playerPos.z)
  const fwd = dirLocal(m, playerForward)
  const goalHalf = (PORTERIA.ancho / 2) * m.esc
  const goalTop = PORTERIA.alto * m.esc
  medirStrafe(fwd, p, dt)
  // Acumular carga mientras mantienes el botón con posesión.
  if (f.cargando && f.duena === 'yo') f.carga = Math.min(1, f.carga + dt / T_CARGA)

  // Chut elevado en vuelo: gol aéreo bajo el travesaño; al aterrizar sigue rodando.
  if (f.vuelo) {
    const aterrizo = avanzarVuelo(dt)
    if (f.by < goalTop && Math.abs(f.bz) < goalHalf) {
      if (f.bx < -(m.L - 0.35)) return gol(m, 'yo')
      if (f.bx > m.L - 0.35) return gol(m, solo ? 'yo' : 'rival')
    }
    if (aterrizo) {
      f.bvx = vueloFutVX
      f.bvz = vueloFutVZ
    }
    return
  }

  const dp = Math.hypot(f.bx - p.x, f.bz - p.z)
  const dr = solo ? 999 : Math.hypot(f.bx - f.rx, f.bz - f.rz)

  if (f.duena === 'nadie') {
    if (dp < 1.0) {
      f.duena = 'yo'
      f.carga = 0
    } else if (!solo && dr < 0.9) {
      f.duena = 'rival'
    } else if (!solo) {
      mueveRival(f.bx, f.bz, 3.0 + dif() * 2.8, dt)
    }
  } else if (f.duena === 'yo') {
    // Dribbling: la pelota va pegada al frente del avatar, con botecito.
    f.bx = THREE.MathUtils.lerp(f.bx, p.x + fwd.x * OFF_DRIB, 0.4)
    f.bz = THREE.MathUtils.lerp(f.bz, p.z + fwd.z * OFF_DRIB, 0.4)
    f.bvx = 0
    f.bvz = 0
    f.bote += dt * 10
    f.by = Math.abs(Math.sin(f.bote)) * 0.12
    if (!solo) {
      if (dr < 0.9 && ahora - ultimoRoboFut > 800 && Math.random() < (0.12 + dif() * 0.4) * dt * 6) {
        f.duena = 'rival'
        f.carga = 0
        f.cargando = false
        ultimoRoboFut = ahora
      } else {
        mueveRival(f.bx, f.bz, 3.0 + dif() * 2.4, dt)
      }
    }
    // Disparo al soltar el botón: hacia donde miras, con la fuerza cargada.
    if (f.soltar) {
      f.soltar = false
      f.by = 0
      dispararFutbol(fwd, f.carga)
      f.carga = 0
    }
  } else {
    // Rival con la pelota: dribbla hacia tu portería, pero SE FRENA si lo presionas de cerca.
    const objX = m.L + 0.5
    const dirx = objX - f.rx
    const dirz = -f.rz
    const n = Math.hypot(dirx, dirz) || 1
    const dRival = Math.hypot(f.rx - p.x, f.rz - p.z)
    const velRival = (dRival < 2.0 ? 0.9 : 1.8) + dif() * 1.3
    mueveRival(f.rx + (dirx / n) * 3, f.rz + (dirz / n) * 3, velRival, dt)
    f.bx = f.rx + (dirx / n) * 0.5
    f.bz = f.rz + (dirz / n) * 0.5
    // Le quitas el balón al pegarte a él (más fácil en dificultad baja), con cooldown.
    if (dRival < 1.3 && ahora - ultimoRoboFut > 800 && Math.random() < (1.0 - dif() * 0.55) * dt * 5) {
      f.duena = 'yo'
      f.carga = 0
      ultimoRoboFut = ahora
    } else if (f.rx > m.L * 0.45) {
      const gdx = objX - f.bx
      const gdz = (Math.random() - 0.5) * goalHalf - f.bz
      const gn = Math.hypot(gdx, gdz) || 1
      dispararFutbol({ x: gdx / gn, z: gdz / gn }, 0.55 + dif() * 0.3)
    }
  }

  // Física de rodada (solo cuando NO llevas la pelota y no está en vuelo).
  if (f.duena !== 'yo' && !f.vuelo) {
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
}

function gol(m: Marco, quien: 'yo' | 'rival') {
  const f = juegoFrame
  const gw = aMundo(m, quien === 'yo' ? -m.L : m.L, 0)
  if (quien === 'yo') lanzarCohete(gw.x, 1, gw.z)
  void useJuegoCancha.getState().anotar(quien, 1, quien === 'yo' ? 'gol' : 'golRival')
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

/** Margen de acierto del tiro: el aro es generoso, la dificultad lo cierra. */
const tolTiro = (esc: number) => THREE.MathUtils.lerp(1.6, 0.7, dif()) * esc

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
}

function tickBasket(m: Marco, solo: boolean, dt: number) {
  const f = juegoFrame
  const ahora = performance.now()
  const p = aLocal(m, playerPos.x, playerPos.z)
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
        if (r.encesta) {
          const aro = aMundo(r.m, CANASTA.aroX * r.m.esc, 0)
          f.aroPulso = 1
          if (r.quien === 'yo') lanzarCohete(aro.x, r.m.sueloY + CANASTA.aroY * r.m.esc, aro.z)
          void useJuegoCancha
            .getState()
            .anotar(r.quien, r.puntos, r.quien === 'yo' ? (r.puntos === 3 ? 'canasta3' : 'canasta2') : 'canastaRival')
        } else if (r.quien === 'yo') {
          useJuegoCancha.getState().avisar('fallo')
        }
        // En modo solo el balón vuelve a tus manos para seguir tirando sin ir a buscarlo.
        if (solo) {
          f.duena = 'yo'
          f.carga = 0
        }
      }
    }
    return
  }
  // Acumular potencia mientras mantienes el botón con la pelota.
  if (f.cargando && f.duena === 'yo') f.carga = Math.min(1, f.carga + dt / T_CARGA)

  if (f.duena === 'nadie') {
    // La pelota es de quien llegue primero.
    if (Math.hypot(f.bx - p.x, f.bz - p.z) < 0.95) {
      f.duena = 'yo'
      f.carga = 0
    } else if (!solo && Math.hypot(f.bx - f.rx, f.bz - f.rz) < 0.85) {
      f.duena = 'rival'
      tiroElegido = false
      f.proximoEvento = ahora + 3400 - dif() * 1400
    } else if (!solo) {
      mueveRival(f.bx, f.bz, 2.4 + dif() * 2.0, dt)
    }
  } else if (f.duena === 'yo') {
    // La llevas contigo: muévete para ajustar la distancia y suelta el botón para tirar.
    f.bx = p.x
    f.bz = p.z
    if (f.soltar) {
      f.soltar = false
      lanzarTiro(m, 'yo', f.carga)
      f.carga = 0
    }
  } else {
    // El rival busca su punto de tiro y lanza (simula la carga con error por dificultad).
    f.bx = f.rx
    f.bz = f.rz
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
 * Devolución del jugador: apuntas con el frente del avatar (de banda a banda) y
 * el golpe decide el resto — limpio sale profundo, tenso y donde apuntaste;
 * llegando estirado sale corto, y con mal timing se queda en la red.
 */
function golpearTenis(m: Marco, fwd: { x: number; z: number }, q: { cy: number; cal: number }) {
  const f = juegoFrame
  const hacia = -f.ladoJugador as 1 | -1
  const mira = clamp(Math.atan2(fwd.z, fwd.x * hacia) / ANG_MIRA, -1, 1)
  // A la mira se suman el efecto de moverte de lado y la dispersión del mal golpe.
  const z1 = mira * (m.W - 0.35) + clamp(f.strafe, -3, 3) * K_CHANFLE_TENIS + (Math.random() - 0.5) * (1 - q.cal) * 2
  tiroTenis(m, 'yo', hacia, z1, q.cy, q.cal)
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

/** Saque al cuadro de servicio contrario; tú apuntas con tu frente (arcade: siempre entra). */
function saqueTenis(m: Marco, quien: 'yo' | 'rival', fwd: { x: number; z: number }) {
  const f = juegoFrame
  const hacia = (quien === 'yo' ? -f.ladoJugador : f.ladoJugador) as 1 | -1
  const mira = quien === 'yo' ? clamp(Math.atan2(fwd.z, fwd.x * hacia) / ANG_MIRA, -1, 1) : Math.random() * 2 - 1
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

/** Saque pendiente: contra el frontón lo tira el muro; contra la IA se alterna cada juego. */
function tickSaqueTenis(
  m: Marco,
  solo: boolean,
  p: { x: number; z: number },
  fwd: { x: number; z: number },
  intento: boolean,
  dt: number,
) {
  const f = juegoFrame
  const ahora = performance.now()
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
  f.ladoJugador = p.x >= 0 ? 1 : -1
  const lado = f.ladoJugador
  mueveRival(-lado * m.L * 0.7, 0, 4, dt)
  if (sacaJugador) {
    // La pelota espera en tu raqueta hasta que toques el botón.
    f.bx = p.x - lado * 0.35
    f.bz = p.z
    f.by = 1.15
    f.enVentana = ahora >= f.proximoEvento
    if (f.enVentana && intento) {
      saquePendiente = false
      f.enVentana = false
      f.swing = 1
      f.botesTenis = 0
      saqueTenis(m, 'yo', fwd)
    }
    return
  }
  f.enVentana = false
  f.bx = f.rx
  f.bz = f.rz
  f.by = 1.1
  if (ahora >= f.proximoEvento) {
    saquePendiente = false
    f.rSwing = 1
    f.botesTenis = 0
    saqueTenis(m, 'rival', fwd)
  }
}

function tickTenis(m: Marco, solo: boolean, dt: number) {
  const f = juegoFrame
  const ahora = performance.now()
  const lado = f.ladoJugador
  const d = dif()
  const p = aLocal(m, playerPos.x, playerPos.z)
  const fwd = dirLocal(m, playerForward)
  medirStrafe(fwd, p, dt)
  const intento = f.golpe
  f.golpe = false
  // El frontón se levanta al empezar (anima la media cancha volviéndose muro).
  if (solo && f.muro < 1) f.muro = Math.min(1, f.muro + dt * 1.6)
  if (saquePendiente) {
    tickSaqueTenis(m, solo, p, fwd, intento, dt)
    return
  }
  if (!f.vuelo) {
    f.enVentana = false
    return
  }
  // El rival persigue el punto de caída, pero solo cuando la pelota ya cruzó la
  // red (antes no puede adivinar dónde va): mientras, recupera el centro.
  if (!solo) {
    const suya = ladoCaida !== lado && !haciaMuro && (f.bx >= 0 ? 1 : -1) !== lado
    mueveRival(suya ? f.vuelo.x1 : -lado * m.L * 0.7, suya ? f.vuelo.z1 : 0, 3 + d * 4, dt)
  }
  // Ventana de golpeo: en tu lado, cerca de ti y a altura de raqueta (no yendo al muro).
  f.enVentana =
    ladoCaida === lado &&
    !haciaMuro &&
    faltaTenis !== 'red' &&
    Math.hypot(f.bx - p.x, f.bz - p.z) < GOLPE_RADIO &&
    f.by > Y_MIN_GOLPE &&
    f.by < Y_MAX_GOLPE
  if (f.enVentana && intento) {
    // ¡Le pegas! El timing decide la calidad; tu frente, la dirección.
    f.swing = 1
    f.botesTenis = 0
    f.enVentana = false
    const q = calidadTenis(p)
    if (solo) {
      void useJuegoCancha.getState().sumarPeloteo()
      golpeAlMuro(m, q.cal)
    } else golpearTenis(m, fwd, q)
    return
  }
  // El rival golpea cuando la pelota ya botó en su campo y la tiene encima; si no
  // llegó, se estira en el último momento (y de ahí le sale un mal golpe).
  if (!solo && ladoCaida !== lado && f.botesTenis >= 1 && f.by > Y_MIN_GOLPE && f.by < Y_MAX_GOLPE) {
    const alcance = Math.hypot(f.bx - f.rx, f.bz - f.rz)
    const ultima = f.vuelo.t / f.vuelo.dur > 0.72
    if (alcance < TENIS_COMODO_RIVAL || (ultima && alcance < TENIS_ALCANCE_RIVAL)) {
      f.rSwing = 1
      f.botesTenis = 0
      devolverRival(m, p, alcance)
      return
    }
  }
  if (!avanzarVuelo(dt)) return
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
    } else if (golpeoTenis === 'yo') puntoTenisFin(m, 'rival', faltaTenis)
    else puntoTenisFin(m, 'yo')
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
  } else puntoTenisFin(m, ladoCaida === lado ? 'rival' : 'yo')
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

function tickBeisbol(m: Marco, solo: boolean, dt: number) {
  const f = juegoFrame
  const ahora = performance.now()
  const p = aLocal(m, playerPos.x, playerPos.z)
  const fwd = dirLocal(m, playerForward)
  medirStrafe(fwd, p, dt)
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
  if (ahora >= f.proximoEvento) lanzarPitcheo(m, solo)
}

// ─── Componentes ───

/** Vigila si el jugador está dentro de una cancha y activa/termina el minijuego. */
export function MinijuegosCanchas() {
  const fase = useJuegoCancha((s) => s.fase)
  const marcoRef = useRef<Marco | null>(null)
  const acc = useRef(0)
  const faseAnterior = useRef<string | null>(null)

  useFrame((_, dt) => {
    // Al confirmar el modo en el prompt arranca el partido.
    const st = useJuegoCancha.getState()
    if (st.fase === 'jugando' && faseAnterior.current === 'eligiendo' && marcoRef.current)
      reiniciarJuego(marcoRef.current)
    faseAnterior.current = st.fase

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
    if (bloqueado) {
      if (st.canchaId != null) st.terminar()
      if (st.cerca) st.setCerca(null)
      marcoRef.current = null
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
    } else {
      if (st.canchaId != null) st.terminar()
      if (st.cerca) st.setCerca(null)
      marcoRef.current = null
    }
  })

  if (fase !== 'jugando') return null
  return <JuegoActivo marcoRef={marcoRef} />
}

/** Raqueta de tenis procedural (mango + aro + cuerdas). */
export function RaquetaModelo({ escala = 1 }: { escala?: number }) {
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
export function BateModelo({ escala = 1 }: { escala?: number }) {
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

  useFrame((state, dtRaw) => {
    const m = marcoRef.current
    if (!m) return
    const dt = Math.min(dtRaw, 0.08)
    const solo = modo === 'solo'
    if (m.clase === 'futbol') tickFutbol(m, solo, dt)
    else if (m.clase === 'basket') tickBasket(m, solo, dt)
    else if (m.clase === 'beisbol') tickBeisbol(m, solo, dt)
    else tickTenis(m, solo, dt)
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
