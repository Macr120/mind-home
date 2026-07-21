import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { useDiseño, esObjetoMapa } from '../state/disenoStore'
import { useCanchas, CANCHAS, PORTERIA, esCancha, claseDeCancha } from '../state/canchasStore'
import { useJuegoCancha, juegoFrame } from '../state/juegoCanchaStore'
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
import { lanzarCohete } from './fuegos'
import { ModeloMascota } from './Asistente3D'
import { Prendas } from './Prendas'
import { ANCLAS_FORMA } from './apariencia'
import type { ObjetoCuarto } from '../data/db'
import type { ClaseCancha } from '../state/canchasStore'

/**
 * Minijuegos de cancha: al caminar dentro de una cancha se elige modo (solo o
 * contra un asistente) y dificultad, y aparece la pelota (y el rival, con el
 * modelo 3D del asistente elegido). Fútbol: patea la pelota y anota. Básquet:
 * toma la pelota y quédate quieto para tirar al aro. Tenis: peloteo con raqueta
 * sobre la red (partido al mejor de 3 sets), o contra el FRONTÓN (la media
 * cancha rival se levanta como muro) al jugar solo. La física corre en
 * coordenadas LOCALES de la cancha.
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
  const esc = o.escala ?? 1
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

// Tiempos de carga (s) y rangos de fuerza; valores arcade, ajustables al probar.
const T_CARGA = 1.05
const OFF_DRIB = 0.65
const FUERZA_BASE = 7
const FUERZA_RANGO = 12
const K_CHANFLE = 0.55
const UMBRAL_ELEVADO = 0.55
const BAS_ALC_MIN = 2
const BAS_ALC_MAX = 12
const GOLPE_RADIO = 2.6
const FACTOR_BOTE = 0.62
const Y_MIN_GOLPE = 0.15
const Y_MAX_GOLPE = 1.7
const K_CHANFLE_TENIS = 0.3
const N_ARCO = 16 // vértices de la línea de trayectoria del básquet

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
  saquePendiente = false
  haciaMuro = false
  tiroElegido = false
  energiaBote = 1.5
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

/** Lanza al aro: el ALCANCE sale de la carga; encesta si acierta la distancia. */
function lanzarTiro(m: Marco, quien: 'yo' | 'rival', carga: number) {
  const f = juegoFrame
  const aroX = (-CANCHAS.basket.largo / 2 + 0.82) * m.esc
  const distAro = Math.hypot(f.bx - aroX, f.bz)
  const alcance = (BAS_ALC_MIN + carga * (BAS_ALC_MAX - BAS_ALC_MIN)) * m.esc
  const tol = THREE.MathUtils.lerp(1.4, 0.5, dif()) * m.esc
  const encesta = Math.abs(alcance - distAro) < tol
  const dx = aroX - f.bx
  const dz = -f.bz
  const n = Math.hypot(dx, dz) || 1
  const x1 = encesta ? aroX : f.bx + (dx / n) * alcance
  const z1 = encesta ? 0 : f.bz + (dz / n) * alcance
  const tres = distAro > 6.75 * m.esc
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
  f.duena = 'nadie'
  tiroElegido = false
  // El resultado se resuelve al aterrizar (tickBasket lee estos pendientes).
  pendiente = { quien, puntos: tres ? 3 : 2, encesta, m }
}

let pendiente: { quien: 'yo' | 'rival'; puntos: number; encesta: boolean; m: Marco } | null = null

function tickBasket(m: Marco, solo: boolean, dt: number) {
  const f = juegoFrame
  const ahora = performance.now()
  const p = aLocal(m, playerPos.x, playerPos.z)
  if (f.vuelo) {
    if (avanzarVuelo(dt) && pendiente) {
      const r = pendiente
      pendiente = null
      if (r.encesta) {
        const aro = aMundo(r.m, (-CANCHAS.basket.largo / 2 + 0.82) * r.m.esc, 0)
        if (r.quien === 'yo') lanzarCohete(aro.x, r.m.sueloY + 3.05 * r.m.esc, aro.z)
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
      const aroX = (-CANCHAS.basket.largo / 2 + 0.82) * m.esc
      const ang = (Math.random() - 0.5) * 1.6
      const dist = 3 + Math.random() * 4.5
      tiroRX = clamp(aroX + Math.cos(ang) * dist, -m.L + 1, m.L - 1)
      tiroRZ = clamp(Math.sin(ang) * dist, -m.W + 1, m.W - 1)
      tiroElegido = true
    }
    const llego = mueveRival(tiroRX, tiroRZ, 2.2 + dif() * 1.8, dt)
    if (llego || ahora >= f.proximoEvento) {
      const aroX = (-CANCHAS.basket.largo / 2 + 0.82) * m.esc
      const distR = Math.hypot(f.rx - aroX, f.rz) / m.esc
      const ideal = clamp((distR - BAS_ALC_MIN) / (BAS_ALC_MAX - BAS_ALC_MIN), 0, 1)
      const err = (Math.random() - 0.5) * (1 - dif()) * 0.5
      lanzarTiro(m, 'rival', clamp(ideal + err, 0, 1))
    }
  }
}

// ─── Tenis ───

/** Golpe hacia el otro lado; `apuntar` = rival a esquivar; `chan` = efecto según tu movimiento. */
function devolverTenis(m: Marco, hacia: 1 | -1, apuntar?: { z: number }, chan = 0) {
  const f = juegoFrame
  const x1 = hacia * (0.25 + Math.random() * 0.6) * m.L
  let z1 = (Math.random() - 0.5) * 1.5 * m.W
  if (apuntar) {
    const lejos = (apuntar.z >= 0 ? -1 : 1) * (m.W - 0.8)
    z1 = THREE.MathUtils.lerp(z1, lejos, dif())
  }
  z1 = clamp(z1 + chan * m.W * K_CHANFLE_TENIS, -m.W + 0.5, m.W - 0.5)
  const dist = Math.hypot(x1 - f.bx, z1 - f.bz)
  ladoCaida = hacia
  haciaMuro = false
  energiaBote = 1.4
  f.vuelo = { x0: f.bx, y0: Math.max(0.4, f.by), z0: f.bz, x1, y1: 0, z1, t: 0, dur: clamp(dist / 11, 0.5, 1.3), alto: 1.5 }
}

/** Golpe hacia el frontón: la pelota vuela a un punto del muro (en la red). */
function golpeAlMuro(m: Marco, chan = 0) {
  const f = juegoFrame
  const lado = f.ladoJugador
  const x1 = -lado * 0.2
  let z1 = clamp(f.bz + (Math.random() - 0.5) * m.W, -m.W + 1, m.W - 1)
  z1 = clamp(z1 + chan * m.W * K_CHANFLE_TENIS, -m.W + 1, m.W - 1)
  const dist = Math.hypot(x1 - f.bx, z1 - f.bz)
  haciaMuro = true
  f.vuelo = { x0: f.bx, y0: Math.max(0.4, f.by), z0: f.bz, x1, y1: 1 + Math.random() * 1.2, z1, t: 0, dur: clamp(dist / 13, 0.35, 0.9), alto: 0.6 }
}

/** Rebote del frontón: más dificultad = más rápido y más abierto. */
function reboteDelMuro(m: Marco) {
  const f = juegoFrame
  const d = dif()
  const lado = f.ladoJugador
  const x1 = lado * (0.25 + Math.random() * 0.65) * m.L
  const z1 = (Math.random() - 0.5) * (1.0 + d * 0.9) * m.W
  const dist = Math.hypot(x1 - f.bx, z1 - f.bz)
  ladoCaida = lado
  haciaMuro = false
  energiaBote = 1.3
  f.vuelo = { x0: f.bx, y0: f.by, z0: f.bz, x1, y1: 0, z1, t: 0, dur: clamp(dist / (8 + d * 7), 0.32, 1.2), alto: 1.2 }
}

/** Botecito de la pelota en el sitio (parábola menor); pierde energía en cada rebote. */
function iniciarBote(m: Marco) {
  const f = juegoFrame
  const x1 = clamp(f.bx, -m.L + 0.3, m.L - 0.3)
  const z1 = clamp(f.bz, -m.W + 0.3, m.W - 0.3)
  f.vuelo = { x0: f.bx, y0: 0, z0: f.bz, x1, y1: 0, z1, t: 0, dur: 0.6, alto: energiaBote }
  energiaBote *= FACTOR_BOTE
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
  if (f.vuelo) {
    if (!solo && ladoCaida !== lado) mueveRival(f.vuelo.x1, f.vuelo.z1, 3.2 + d * 3.6, dt)
    // Ventana de golpeo: en tu lado, cerca de ti y a altura golpeable (no yendo al muro).
    f.enVentana =
      ladoCaida === lado &&
      !haciaMuro &&
      Math.hypot(f.bx - p.x, f.bz - p.z) < GOLPE_RADIO &&
      f.by > Y_MIN_GOLPE &&
      f.by < Y_MAX_GOLPE
    if (f.enVentana && intento) {
      // ¡Le pegas! Swing + devolución (con efecto según tu movimiento lateral).
      f.swing = 1
      f.botesTenis = 0
      f.enVentana = false
      const chan = clamp(f.strafe, -3, 3)
      if (solo) {
        void useJuegoCancha.getState().sumarPeloteo()
        golpeAlMuro(m, chan)
      } else {
        devolverTenis(m, (-lado) as 1 | -1, { z: f.rz }, chan)
      }
      return
    }
    if (avanzarVuelo(dt)) {
      if (solo && haciaMuro) {
        // Llegó al frontón: rebota de vuelta a tu media cancha.
        reboteDelMuro(m)
        f.botesTenis = 0
        return
      }
      if (ladoCaida === lado) {
        // Cayó en tu lado: rebota; si da 2 botes sin golpear, pierdes el punto.
        f.botesTenis += 1
        if (f.botesTenis >= 2) {
          f.botesTenis = 0
          f.enVentana = false
          if (solo) {
            useJuegoCancha.getState().avisar('seEscapo')
            saquePendiente = true
            f.proximoEvento = ahora + 1300
          } else {
            void useJuegoCancha.getState().puntoTenis('rival')
            saquePendiente = true
            f.proximoEvento = ahora + 1500
          }
        } else {
          iniciarBote(m)
        }
      } else {
        // Cayó en el lado del rival: la devuelve si llegó (con errores no forzados).
        const falla = Math.random() < Math.max(0.02, 0.32 - d * 0.3)
        if (Math.hypot(f.bx - f.rx, f.bz - f.rz) < 2.4 && !falla) {
          f.rSwing = 1
          devolverTenis(m, lado, { z: p.z })
        } else {
          void useJuegoCancha
            .getState()
            .puntoTenis('yo')
            .then((msg) => celebrar(m, msg))
          saquePendiente = true
          f.proximoEvento = ahora + 1500
        }
      }
    }
    return
  }
  f.enVentana = false
  if (saquePendiente) {
    if (solo) {
      // Saque del frontón: el muro te la lanza de vuelta.
      f.bx = -lado * 0.2
      f.bz = 0
      f.by = 1.2
      if (ahora >= f.proximoEvento) {
        saquePendiente = false
        f.botesTenis = 0
        reboteDelMuro(m)
      }
    } else {
      // El rival vuelve a su posición y saca hacia tu lado.
      mueveRival(-lado * m.L * 0.55, 0, 4, dt)
      f.bx = f.rx
      f.bz = f.rz
      f.by = 0.6
      if (ahora >= f.proximoEvento) {
        saquePendiente = false
        f.rSwing = 1
        f.botesTenis = 0
        devolverTenis(m, lado, { z: p.z })
      }
    }
  }
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
      useGranja.getState().activo
    if (bloqueado) {
      if (st.canchaId != null) st.terminar()
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
      if (st.canchaId !== cancha.id) void st.activar(cancha.id, m.clase)
    } else if (st.canchaId != null) {
      st.terminar()
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
    else tickTenis(m, solo, dt)
    const f = juegoFrame
    // Los raquetazos se desvanecen solos.
    f.swing = Math.max(0, f.swing - dt * 3.2)
    f.rSwing = Math.max(0, f.rSwing - dt * 3.2)
    if (pelota.current) {
      const bw = aMundo(m, f.bx, f.bz)
      const r = m.clase === 'tenis' ? 0.16 : 0.33
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
      const aroX = (-CANCHAS.basket.largo / 2 + 0.82) * m.esc
      const distAro = Math.hypot(f.bx - aroX, f.bz)
      const alcance = (BAS_ALC_MIN + f.carga * (BAS_ALC_MAX - BAS_ALC_MIN)) * m.esc
      const tol = THREE.MathUtils.lerp(1.4, 0.5, dif()) * m.esc
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
      ;(linea.material as THREE.LineBasicMaterial).color.set(Math.abs(alcance - distAro) < tol ? '#34d399' : '#fbbf24')
    }
  })

  const m = marcoRef.current
  const conRival = modo === 'ia'
  return (
    <group>
      {/* Pelota. */}
      <group ref={pelota}>
        <mesh>
          <sphereGeometry args={[clase === 'tenis' ? 0.16 : 0.33, 12, 10]} />
          <meshStandardMaterial
            color={clase === 'futbol' ? '#f8fafc' : clase === 'basket' ? '#f97316' : '#d9f99d'}
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
                  brazoRef={brazo}
                />
                <Prendas ropa={asistente.ropa} anclas={ANCLAS_FORMA[asistente.forma]} />
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
