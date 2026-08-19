import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { playerPos } from '../state/playerPosition'
import { useHouse } from '../state/houseStore'
import { useLayout } from '../state/layoutStore'
import { monturaFrame } from '../state/monturaStore'
import { trenFrame } from '../state/trenStore'
import { parqueFrame } from '../state/parqueStore'
import { useCaminos } from '../state/caminosStore'
import { useCanchas } from '../state/canchasStore'
import { useHuerto } from '../state/huertoStore'
import { useGranja } from '../state/granjaStore'
import { useAsistentes, getAsistente } from '../state/asistentesStore'
import {
  usePaintball,
  paintballFrame,
  registrarLimpiadorPaintball,
  registrarDisparoPintura,
  CADENCIA_JUGADOR,
  COLOR_JUGADOR,
  type JugadorPaintball,
  type BotPaintball,
} from '../state/paintballStore'
import { miraFrame } from '../state/miraFrame'
import { SUPERFICIE_SUELO } from '../state/carreraStore'
import { chocado, chocadoObjeto, objColliders, puntoLibreCerca, type ObjCol } from './Character'
import type { AABB } from './walls'
import { SPACING } from './walls'
import { dirDisparoDesde } from './punteria'
import { Marcadora, pistolaEnMano } from './arma'
import { useCam } from '../state/cameraStore'
import { useHerramienta } from '../state/herramientaStore'
import { ModeloMascota, ALTURA_FLOTE } from './Asistente3D'
import { Prendas } from './Prendas'
import { Rostro } from './Rostro'
import { Peinado } from './Peinado'
import { anclasDe, muestraRostro, soportaPeinado } from './apariencia'
import { categoriaMarcha } from './cuerpos'
import { avanzarMarcha, alturaFlote, type EstadoMarcha } from './animacion'
import { sonar } from '../audio/sfx'

/**
 * Runtime 3D del modo paintball: bolas de pintura integradas por frame (con el
 * MISMO modelo de colisión que el movimiento: `chocado`/`chocadoObjeto`),
 * manchas de pintura como InstancedMesh (patrón derrape.tsx) y bots que son
 * los asistentes cazándose por el mapa. Pools mutables a nivel de módulo +
 * meshes fijos (patrón itemsCarrera.tsx): cero re-renders por frame.
 */

const MAX_BOLAS = 20
/**
 * Velocidad de la bola (u/s). Vuela RECTA, sin caída: la marcadora se apunta y
 * pega donde señala la mira, igual que el láser (no hay que compensar el arco).
 */
const VEL_BOLA = 18
const VIDA_BOLA_MS = 2600
/** Los muros miden 2.4: por encima la bola vuela libre (chocado es 2D). */
const TOPE_MURO = 2.5
// Distancias de la IA: acercarse si está lejos, alejarse si está encima,
// rodear (strafe) en el anillo intermedio; solo dispara con línea de visión.
const RANGO_CERCA = 3.5
const RANGO_LEJOS = 8.5
const RANGO_TIRO = 11

interface Bola {
  activa: boolean
  x: number
  y: number
  z: number
  vx: number
  vy: number
  vz: number
  nace: number
  color: string
  deId: string
  equipo: number
  /** Altura del piso donde se estampa la mancha (varía por nivel de la casa). */
  suelo: number
}

const bolas: Bola[] = Array.from({ length: MAX_BOLAS }, () => ({
  activa: false,
  x: 0,
  y: 0,
  z: 0,
  vx: 0,
  vy: 0,
  vz: 0,
  nace: 0,
  color: '#fff',
  deId: '',
  equipo: 0,
  suelo: 0.215,
}))

// ─── Manchas de pintura: ring buffer para un InstancedMesh (cero re-renders) ───

const MAX_SPLATS = 140
interface Splat {
  m: THREE.Matrix4
  color: THREE.Color
}
const splats: Splat[] = []
let splatIdx = 0
let splatsVersion = 0

const _dummy = new THREE.Object3D()
const _normal = new THREE.Vector3()
const _Z = new THREE.Vector3(0, 0, 1)
const _dir = new THREE.Vector3()

/** Estampa una mancha orientada por la normal del impacto (ligeramente separada). */
function agregarSplat(
  x: number,
  y: number,
  z: number,
  nx: number,
  ny: number,
  nz: number,
  color: string,
  tam: number,
) {
  _normal.set(nx, ny, nz).normalize()
  _dummy.position.set(x + _normal.x * 0.02, y + _normal.y * 0.02, z + _normal.z * 0.02)
  _dummy.quaternion.setFromUnitVectors(_Z, _normal)
  _dummy.rotateZ(Math.random() * Math.PI * 2)
  const s = tam * (0.8 + Math.random() * 0.6)
  _dummy.scale.set(s, s, 1)
  _dummy.updateMatrix()
  splats[splatIdx % MAX_SPLATS] = { m: _dummy.matrix.clone(), color: new THREE.Color(color) }
  splatIdx++
  splatsVersion++
}

/** Recoge las bolas en vuelo; con `todo`, también las manchas (al salir del modo). */
function limpiarPaintball(todo: boolean) {
  for (const b of bolas) b.activa = false
  if (todo) {
    splats.length = 0
    splatIdx = 0
    splatsVersion++
  }
}
registrarLimpiadorPaintball(limpiarPaintball)

function dispararBola(
  deId: string,
  equipo: number,
  color: string,
  ox: number,
  oy: number,
  oz: number,
  dx: number,
  dy: number,
  dz: number,
  suelo = 0.215,
) {
  const b = bolas.find((b) => !b.activa)
  if (!b) return
  const n = Math.hypot(dx, dy, dz) || 1
  b.activa = true
  b.x = ox
  b.y = oy
  b.z = oz
  b.vx = (dx / n) * VEL_BOLA
  b.vy = (dy / n) * VEL_BOLA
  b.vz = (dz / n) * VEL_BOLA
  b.nace = performance.now()
  b.color = color
  b.deId = deId
  b.equipo = equipo
  b.suelo = suelo
  sonar('disparo')
}

/** Altura del cañón del avatar (a la altura del pecho, de donde sale la bola). */
const ALTURA_CANON = 1.15
/**
 * Boca del cañón de la marcadora de 1ª persona, en ejes de CÁMARA (x derecha,
 * y arriba, z hacia atrás). Sale de los offsets de `ArmaPrimeraPersona`
 * (0.26, −0.2, −0.5) más la punta del cañón del modelo (z 0.49 × escala 0.9,
 * y 0.05 × 0.9). Sin esto la bola nacía en el pecho del avatar: medio metro por
 * debajo y a la izquierda del arma que se ve en pantalla.
 */
const BOCA_1P = new THREE.Vector3(0.26, -0.155, -0.941)
const _boca = new THREE.Vector3()

/**
 * Dispara una bola del jugador hacia la mira (centro de la pantalla en 1ª/3ª
 * persona). Lo usan la batalla (fuego automático del botón) y la marcadora
 * suelta de la rueda de herramientas, con el mismo tacto.
 */
function dispararJugador(camera: THREE.Camera, color: string, equipo: number, suelo: number) {
  let ox = playerPos.x
  let oy = playerPos.y + ALTURA_CANON
  let oz = playerPos.z
  // En 1ª persona la bola sale de la boca del arma que se está viendo; la
  // dirección se calcula desde ahí para que siga convergiendo con la mira.
  let avance = 0.55
  if (useCam.getState().vista === 'primera') {
    _boca.copy(BOCA_1P).applyQuaternion(camera.quaternion).add(camera.position)
    ox = _boca.x
    oy = _boca.y
    oz = _boca.z
    avance = 0.05
  }
  // Sin apuntar el tiro se abre un poco: apuntar es lo que da precisión.
  dirDisparoDesde(camera, ox, oy, oz, _dir, miraFrame.apuntando ? 0 : 0.035)
  dispararBola(
    'yo',
    equipo,
    color,
    ox + _dir.x * avance,
    oy + _dir.y * avance,
    oz + _dir.z * avance,
    _dir.x,
    _dir.y,
    _dir.z,
    suelo,
  )
  paintballFrame.ultimoDisparo = performance.now()
}

// Disparo de la marcadora fuera de la batalla (herramienta de la rueda): mancha
// el mapa con el color del jugador. El equipo −1 no coincide con ninguno, así
// que la bola libre no golpea a nadie.
registrarDisparoPintura((camera, nivel) => {
  // playerPos.y ya trae la superficie pisable (+0.2); se resta para conservar
  // el plano de mancha original (0.215 al ras en planta baja).
  dispararJugador(camera, COLOR_JUGADOR, -1, playerPos.y - SUPERFICIE_SUELO + (nivel > 0 ? 0.03 : 0.215))
})

/** ¿Hay línea de visión (sin muros ni objetos) entre dos puntos del plano? */
function despejado(
  x0: number,
  z0: number,
  x1: number,
  z1: number,
  colliders: AABB[],
  objCols: ObjCol[],
): boolean {
  const dist = Math.hypot(x1 - x0, z1 - z0)
  const pasos = Math.ceil(dist / 0.25)
  for (let i = 1; i < pasos; i++) {
    const t = i / pasos
    const px = x0 + (x1 - x0) * t
    const pz = z0 + (z1 - z0) * t
    if (chocado(px, pz, colliders, 0.05) || chocadoObjeto(px, pz, objCols, 0.05)) return false
  }
  return true
}

/** Posición y centro de torso de un jugador (para IA e impactos). */
function posDeJugador(id: string | null): { x: number; z: number; y: number } | null {
  if (!id) return null
  if (id === 'yo') return { x: playerPos.x, z: playerPos.z, y: playerPos.y + 0.95 }
  const b = paintballFrame.bots.find((bb) => bb.id === id)
  if (!b || !b.vivo) return null
  return { x: b.x, z: b.z, y: ALTURA_FLOTE + 0.7 * b.escala }
}

/** Enemigo vivo más cercano al bot (en campal, todos menos su propio equipo). */
function objetivoMasCercano(jugadores: JugadorPaintball[], b: BotPaintball): string | null {
  let mejor: string | null = null
  let mejorD = Infinity
  for (const j of jugadores) {
    if (j.fuera || j.equipo === b.equipo) continue
    const p = posDeJugador(j.id)
    if (!p) continue
    const d = Math.hypot(p.x - b.x, p.z - b.z)
    if (d < mejorD) {
      mejorD = d
      mejor = j.id
    }
  }
  return mejor
}

function avanzarBots(
  jugadores: JugadorPaintball[],
  dificultad: number,
  d: number,
  colliders: AABB[],
  objCols: ObjCol[],
  halfW: number,
  halfH: number,
) {
  // Error de puntería en radianes: a 8 u, 0.14 rad ya son ~1.1 u de desvío, así
  // que con más apertura el bot no acertaba nunca (medido en pruebas).
  const err = 0.14 - dificultad * 0.1
  const cdBase = 2.1 - dificultad * 1.2
  const vel = 1.7 + dificultad * 0.7
  for (const b of paintballFrame.bots) {
    if (!b.vivo) continue
    b.pensarAcc -= d
    if (b.pensarAcc <= 0) {
      b.pensarAcc = 0.3
      b.objetivo = objetivoMasCercano(jugadores, b)
      if (Math.random() < 0.25) b.strafe = b.strafe === 1 ? -1 : 1
    }
    const obj = posDeJugador(b.objetivo)
    if (!obj) continue
    const dx = obj.x - b.x
    const dz = obj.z - b.z
    const dist = Math.hypot(dx, dz) || 1
    const ux = dx / dist
    const uz = dz / dist
    let mx: number
    let mz: number
    if (dist > RANGO_LEJOS) {
      mx = ux
      mz = uz
    } else if (dist < RANGO_CERCA) {
      mx = -ux
      mz = -uz
    } else {
      // Anillo intermedio: rodea, pero cerrando distancia poco a poco (si solo
      // orbitara se quedaba clavado a la distancia exacta de RANGO_LEJOS).
      mx = -uz * b.strafe + ux * 0.35
      mz = ux * b.strafe + uz * 0.35
      const n = Math.hypot(mx, mz) || 1
      mx /= n
      mz /= n
    }
    // Avance eje por eje (igual que el jugador). Si el rumbo deseado está
    // bloqueado en AMBOS ejes (esquina, mueble), se prueba girado: si no, el bot
    // se quedaba temblando en el sitio toda la partida.
    const paso = vel * d
    for (const giro of [0, 1.1, -1.1, 2.2, -2.2]) {
      const cg = Math.cos(giro)
      const sg = Math.sin(giro)
      const gx = mx * cg - mz * sg
      const gz = mx * sg + mz * cg
      let movido = false
      const nx = Math.max(-halfW, Math.min(halfW, b.x + gx * paso))
      if (!chocado(nx, b.z, colliders, 0.4) && !chocadoObjeto(nx, b.z, objCols, 0.4) && nx !== b.x) {
        b.x = nx
        movido = true
      }
      const nz = Math.max(-halfH, Math.min(halfH, b.z + gz * paso))
      if (!chocado(b.x, nz, colliders, 0.4) && !chocadoObjeto(b.x, nz, objCols, 0.4) && nz !== b.z) {
        b.z = nz
        movido = true
      }
      if (movido) break
      // Ese rumbo no sirvió: al siguiente intento (y cambia el lado del rodeo).
      if (giro !== 0) b.strafe = b.strafe === 1 ? -1 : 1
    }
    // Separación entre bots (que no se apilen).
    for (const o of paintballFrame.bots) {
      if (o === b || !o.vivo) continue
      const ddx = b.x - o.x
      const ddz = b.z - o.z
      const dd = Math.hypot(ddx, ddz)
      if (dd > 0.001 && dd < 1.1) {
        b.x += (ddx / dd) * 0.6 * d
        b.z += (ddz / dd) * 0.6 * d
      }
    }
    // Rumbo suavizado hacia el objetivo.
    const hDeseado = Math.atan2(dx, dz)
    b.h += Math.atan2(Math.sin(hDeseado - b.h), Math.cos(hDeseado - b.h)) * Math.min(1, d * 6)
    // Disparo: cadencia con jitter + puntería con error (ambos por dificultad).
    b.cooldown -= d
    if (b.cooldown <= 0 && dist < RANGO_TIRO) {
      b.cooldown = cdBase * (0.75 + Math.random() * 0.5)
      if (despejado(b.x, b.z, obj.x, obj.z, colliders, objCols)) {
        const oy = ALTURA_FLOTE + 0.7 * b.escala
        const ang = Math.atan2(dx, dz) + (Math.random() * 2 - 1) * err
        const tx = Math.sin(ang)
        const tz = Math.cos(ang)
        // Tiro recto al torso del objetivo (la bola ya no cae: sin compensación).
        const dy = (obj.y - oy) / Math.max(dist, 1)
        dispararBola(b.id, b.equipo, b.color, b.x + tx * 0.5, oy, b.z + tz * 0.5, tx, dy, tz)
        b.fogonazo = performance.now()
      }
    }
  }
}

function avanzarBolas(d: number, colliders: AABB[], objCols: ObjCol[]) {
  const s = usePaintball.getState()
  const ahora = performance.now()
  for (const b of bolas) {
    if (!b.activa) continue
    if (ahora - b.nace > VIDA_BOLA_MS) {
      b.activa = false
      continue
    }
    // Subpasos según lo que avanza este frame: un paso entero atravesaría los
    // muros finos (grosor 0.35) en cuanto baja el framerate.
    const subpasos = Math.min(6, Math.max(2, Math.ceil((VEL_BOLA * d) / 0.25)))
    for (let p = 0; p < subpasos && b.activa; p++) {
      const dt = d / subpasos
      const nx = b.x + b.vx * dt
      const ny = b.y + b.vy * dt
      const nz = b.z + b.vz * dt
      // Suelo del piso donde nació el tiro (tope y≈0.19 en planta baja): mancha plana.
      if (ny <= b.suelo + 0.025) {
        agregarSplat(nx, b.suelo, nz, 0, 1, 0, b.color, 0.55)
        sonar('impacto')
        b.activa = false
        break
      }
      // Muros y objetos rígidos (solo bajo la altura de muro).
      if (ny < TOPE_MURO) {
        const choqueX = chocado(nx, b.z, colliders, 0.06) || chocadoObjeto(nx, b.z, objCols, 0.06)
        const choqueZ = chocado(b.x, nz, colliders, 0.06) || chocadoObjeto(b.x, nz, objCols, 0.06)
        if (choqueX || choqueZ || chocado(nx, nz, colliders, 0.06) || chocadoObjeto(nx, nz, objCols, 0.06)) {
          // La mancha se estampa en la última posición libre, mirando contra el avance.
          if (choqueZ && !choqueX) {
            agregarSplat(b.x, Math.max(0.3, ny), b.z, 0, 0, -(Math.sign(b.vz) || 1), b.color, 0.5)
          } else {
            agregarSplat(b.x, Math.max(0.3, ny), b.z, -(Math.sign(b.vx) || 1), 0, 0, b.color, 0.5)
          }
          sonar('impacto')
          b.activa = false
          break
        }
      }
      b.x = nx
      b.y = ny
      b.z = nz
      // Impacto contra personajes (radio generoso, estilo itemsCarrera).
      for (const j of s.jugadores) {
        if (j.fuera || j.id === b.deId || j.equipo === b.equipo) continue
        const p2 = posDeJugador(j.id)
        if (!p2) continue
        const radio = j.id === 'yo' ? 0.55 : 0.55 * Math.max(0.8, paintballFrame.bots.find((bb) => bb.id === j.id)?.escala ?? 1)
        if (Math.hypot(b.x - p2.x, b.z - p2.z) > radio) continue
        if (Math.abs(b.y - p2.y) > 1.15) continue
        const res = usePaintball.getState().registrarImpacto(b.deId, j.id)
        if (res) {
          agregarSplat(p2.x, b.suelo, p2.z, 0, 1, 0, b.color, 0.85)
          sonar('impacto')
          if (res === 'fuera') sonar('anotacion')
          b.activa = false
        }
        break
      }
    }
  }
}

/** Runtime (sin render): cuenta atrás, disparo del jugador, IA y física de bolas. */
function PaintballRuntime() {
  useFrame((estado, delta) => {
    const s = usePaintball.getState()
    const d = Math.min(delta, 0.1)
    // Fuera de batalla solo viven las bolas de la marcadora suelta (rueda de
    // herramientas): manchan el mapa sin tocar a nadie.
    if (!s.fase) {
      if (bolas.some((b) => b.activa)) {
        const nivel = Math.max(0, useHouse.getState().playerLevel)
        avanzarBolas(d, useLayout.getState().wallCollidersByLevel[nivel] ?? [], objColliders(nivel))
      }
      return
    }
    const casa = useHouse.getState()
    const layout = useLayout.getState()
    const infraActiva =
      useCaminos.getState().activo ||
      useCanchas.getState().activo ||
      useHuerto.getState().activo ||
      useGranja.getState().activo
    // Contexto roto (editor, cuarto abierto, otro editor de infra): se cancela.
    if (layout.editMode || casa.activeRoom != null || infraActiva) {
      s.cancelar()
      return
    }
    if (s.fase === 'config' || s.fase === 'fin') return
    // En plena batalla: montarse, subir de nivel o usar un juego la corta.
    if (
      casa.playerLevel !== 0 ||
      casa.transicion ||
      monturaFrame.montado ||
      trenFrame.montado ||
      parqueFrame.usando
    ) {
      s.cancelar()
      return
    }
    if (s.fase === 'cuenta') {
      // Los spawns del anillo se ajustan al modelo de colisión una sola vez.
      for (const b of paintballFrame.bots) {
        if (!b.recolocar) continue
        const p = puntoLibreCerca(b.x, b.z, 0, 0.45)
        b.x = p.x
        b.z = p.z
        b.h = Math.atan2(playerPos.x - b.x, playerPos.z - b.z)
        b.recolocar = false
      }
      paintballFrame.reloj += d
      if (paintballFrame.reloj >= 0) s.banderazo()
      return
    }
    // fase === 'jugando'
    paintballFrame.reloj += d
    const colliders = layout.wallCollidersByLevel[0] ?? []
    const objCols = objColliders(0)
    const halfW = (layout.gridCols * SPACING) / 2 - 0.6
    const halfH = (layout.gridRows * SPACING) / 2 - 0.6
    // Disparo del jugador: botón/Espacio mantenidos, con cadencia.
    const ahora = performance.now()
    const yo = s.jugadores.find((j) => j.id === 'yo')
    if (
      paintballFrame.disparar &&
      yo &&
      !yo.fuera &&
      ahora - paintballFrame.ultimoDisparo >= CADENCIA_JUGADOR
    ) {
      dispararJugador(estado.camera, yo.color, 0, 0.215)
    }
    avanzarBots(s.jugadores, s.dificultad, d, colliders, objCols, halfW, halfH)
    avanzarBolas(d, colliders, objCols)
  })
  return null
}

/** Un asistente combatiente: mismo armado visual que Companero, pose del frame. */
function BotPaintball3D({ jugadorId }: { jugadorId: string }) {
  const g = useRef<THREE.Group>(null)
  const brazo = useRef<THREE.Group>(null)
  const fogonazo = useRef<THREE.Mesh>(null)
  const marcha = useRef<EstadoMarcha>({ velocidad: 0, fase: 0 })
  const prev = useRef({ x: 0, z: 0, listo: false })
  /** Quedó tumbado por eliminación: hay que volver a ponerlo en pie al revivir. */
  const caido = useRef(false)
  const a = getAsistente(jugadorId)
  const categoria = categoriaMarcha(a)
  const color = usePaintball((s) => s.jugadores.find((j) => j.id === jugadorId)?.color)

  useFrame((state, delta) => {
    const gr = g.current
    if (!gr) return
    const b = paintballFrame.bots.find((bb) => bb.id === jugadorId)
    if (!b) return
    if (fogonazo.current) fogonazo.current.visible = performance.now() - b.fogonazo < 120
    const t = state.clock.elapsedTime
    if (!prev.current.listo) {
      gr.position.set(b.x, ALTURA_FLOTE, b.z)
      prev.current = { x: b.x, z: b.z, listo: true }
    }
    // Eliminado: cae acostado sobre su mancha (y ahí se queda hasta el final).
    if (!b.vivo) {
      gr.position.x = b.x
      gr.position.z = b.z
      gr.position.y = THREE.MathUtils.lerp(gr.position.y, 0.55, 0.12)
      gr.rotation.x = THREE.MathUtils.lerp(gr.rotation.x, -Math.PI / 2, 0.12)
      caido.current = true
      return
    }
    // Revive (otra ronda): se pone en pie de golpe en su nuevo sitio. React
    // reutiliza este componente entre partidas, así que sin esto se quedaría
    // tumbado con la rotación de la caída puesta.
    if (caido.current) {
      caido.current = false
      gr.rotation.x = 0
      gr.position.set(b.x, ALTURA_FLOTE, b.z)
      prev.current = { x: b.x, z: b.z, listo: true }
      marcha.current.velocidad = 0
    }
    gr.position.x = b.x
    gr.position.z = b.z
    // Un bot avanza como mucho ~0.25 u por frame: más que eso es un teletransporte
    // (recolocación del spawn) y no debe contar como zancada.
    const salto = Math.hypot(b.x - prev.current.x, b.z - prev.current.z)
    avanzarMarcha(marcha.current, salto > 2 ? 0 : salto, delta, 2.0)
    prev.current.x = b.x
    prev.current.z = b.z
    gr.position.y =
      categoria === 'flotan' ? alturaFlote(marcha.current, ALTURA_FLOTE, t, b.x) : ALTURA_FLOTE
    gr.rotation.y += Math.atan2(Math.sin(b.h - gr.rotation.y), Math.cos(b.h - gr.rotation.y)) * 0.18
  })

  return (
    <group ref={g}>
      <group scale={a.escala ?? 1}>
        <ModeloMascota
          forma={a.forma}
          color={a.color}
          modelo3d={a.modelo3d}
          modeloGlb={a.modeloGlb}
          cuerpoPresetId={a.cuerpoPresetId}
          brazoRef={brazo}
          anim={a.animacion}
          estado={marcha.current}
          sinOjos={muestraRostro(a)}
        />
        <Prendas
          ropa={a.ropa}
          anclas={anclasDe(a)}
          marcha={categoria !== 'flotan'}
          marchaEstado={marcha.current}
          esJugador={false}
        />
        {muestraRostro(a) && (
          <Rostro anclas={anclasDe(a)} expresion={a.expresion} rostro={a.rostro} />
        )}
        {soportaPeinado(a) && (
          <Peinado anclas={anclasDe(a)} peinado={a.peinado} color={a.peloColor} />
        )}
        {/* Marcadora al costado derecho, a la altura del brazo (los asistentes
            tienen cuerpos muy distintos: va a una altura media que sirve a todos). */}
        <group position={[0.34, 0.78, 0.18]}>
          <Marcadora pintura={color} />
          <mesh ref={fogonazo} visible={false} position={[0, 0.05, 0.5]}>
            <sphereGeometry args={[0.06, 8, 8]} />
            <meshStandardMaterial color={color ?? '#fff'} emissive={color ?? '#fff'} emissiveIntensity={0.6} />
          </mesh>
        </group>
      </group>
    </group>
  )
}

function BotsPaintball() {
  const jugadores = usePaintball((s) => s.jugadores)
  // Reacciona a ediciones/borrado de asistentes (getAsistente da fallback seguro).
  useAsistentes((s) => s.lista)
  return (
    <>
      {jugadores
        .filter((j) => j.esBot)
        .map((j) => (
          <BotPaintball3D key={j.id} jugadorId={j.id} />
        ))}
    </>
  )
}

/**
 * La marcadora en PRIMERA persona: ahí el avatar entero se oculta de la cámara
 * principal (estás dentro de su cabeza), así que el arma se ancla a la cámara
 * como el "viewmodel" de cualquier shooter.
 */
function ArmaPrimeraPersona() {
  const vista = useCam((s) => s.vista)
  const fase = usePaintball((s) => s.fase)
  const equipadas = useHerramienta((s) => s.equipadas)
  const g = useRef<THREE.Group>(null)
  const mostrar =
    vista === 'primera' &&
    (fase === 'cuenta' || fase === 'jugando' || pistolaEnMano(equipadas) === 'pintura')

  useFrame((st) => {
    const gr = g.current
    if (!gr) return
    gr.position.copy(st.camera.position)
    gr.quaternion.copy(st.camera.quaternion)
    // Offset en los ejes de la cámara: abajo a la derecha y un poco al frente.
    gr.translateX(0.26)
    gr.translateY(-0.2)
    gr.translateZ(-0.5)
    // El modelo apunta a +Z; la cámara mira a −Z.
    gr.rotateY(Math.PI)
  })

  if (!mostrar) return null
  return (
    <group ref={g} scale={0.9}>
      <Marcadora pintura={COLOR_JUGADOR} />
    </group>
  )
}

/** Render de las bolas: meshes fijos que el frame mueve, colorea y oculta. */
function BolasPaintball3D() {
  const refs = useRef<(THREE.Mesh | null)[]>([])
  useFrame(() => {
    for (let i = 0; i < MAX_BOLAS; i++) {
      const m = refs.current[i]
      if (!m) continue
      const b = bolas[i]
      m.visible = b.activa
      if (!b.activa) continue
      m.position.set(b.x, b.y, b.z)
      const mat = m.material as THREE.MeshStandardMaterial
      mat.color.set(b.color)
      mat.emissive.set(b.color)
    }
  })
  return (
    <group>
      {bolas.map((_, i) => (
        <mesh
          key={i}
          ref={(el) => {
            refs.current[i] = el
          }}
          visible={false}
        >
          <sphereGeometry args={[0.09, 8, 8]} />
          <meshStandardMaterial emissiveIntensity={0.35} roughness={0.4} />
        </mesh>
      ))}
    </group>
  )
}

/** Manchas de pintura: un solo InstancedMesh; solo se rearma cuando cambian. */
function SplatsPaintball() {
  const ref = useRef<THREE.InstancedMesh>(null)
  const versionPintada = useRef(-1)
  const textura = useMemo(() => {
    // Mancha blanca irregular (se tiñe por instancia): centro + gotas satélite.
    const c = document.createElement('canvas')
    c.width = c.height = 64
    const g = c.getContext('2d')
    if (g) {
      g.fillStyle = '#ffffff'
      g.beginPath()
      g.arc(32, 32, 17, 0, Math.PI * 2)
      g.fill()
      for (let i = 0; i < 9; i++) {
        const a = Math.random() * Math.PI * 2
        const d = 13 + Math.random() * 15
        const r = 2 + Math.random() * 4.5
        g.beginPath()
        g.arc(32 + Math.cos(a) * d, 32 + Math.sin(a) * d, r, 0, Math.PI * 2)
        g.fill()
      }
    }
    return new THREE.CanvasTexture(c)
  }, [])
  useFrame(() => {
    const m = ref.current
    if (!m || versionPintada.current === splatsVersion) return
    versionPintada.current = splatsVersion
    let n = 0
    for (let i = 0; i < Math.min(splats.length, MAX_SPLATS); i++) {
      const sp = splats[i]
      if (!sp) continue
      m.setMatrixAt(n, sp.m)
      m.setColorAt(n, sp.color)
      n++
    }
    m.count = n
    m.instanceMatrix.needsUpdate = true
    if (m.instanceColor) m.instanceColor.needsUpdate = true
  })
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, MAX_SPLATS]} frustumCulled={false}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial
        map={textura}
        transparent
        depthWrite={false}
        polygonOffset
        polygonOffsetFactor={-2}
      />
    </instancedMesh>
  )
}

/**
 * Controlador del modo (montado en House). Las bolas y las manchas viven
 * SIEMPRE (con sus atajos de coste cero cuando no hay ninguna): la marcadora de
 * la rueda de herramientas también pinta fuera de la batalla. Los combatientes
 * solo existen mientras dura la partida.
 */
export function PaintballController() {
  const fase = usePaintball((s) => s.fase)
  return (
    <>
      <PaintballRuntime />
      <BolasPaintball3D />
      <SplatsPaintball />
      <ArmaPrimeraPersona />
      {fase != null && fase !== 'config' && <BotsPaintball />}
    </>
  )
}
