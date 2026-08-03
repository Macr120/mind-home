import { useEffect, useLayoutEffect, useRef, type ReactNode } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { AvatarModelo } from './AvatarModelo'
import { useHouse, playerPos, playerForward, type Transicion } from '../state/houseStore'
import { useDiseño, esObjetoMapa, esObjetoLibreria } from '../state/disenoStore'
import { useLayout, roomWorldPos } from '../state/layoutStore'
import { useCuartos } from '../state/cuartosStore'
import { useEditorUi, PERSONAJE_AVATAR } from '../state/editorUiStore'
import { useCam, camAnim } from '../state/cameraStore'
import { useMontura, monturaFrame } from '../state/monturaStore'
import { useTren, trenFrame, conducirTren } from '../state/trenStore'
import { dialogoFrame } from '../state/dialogoStore'
import { TrenMontado } from './tren'
import { RaquetaJugador, BateJugador } from './minijuegos'
import { juegoFrame, poseBateo } from '../state/juegoCanchaStore'
import { useParque, parqueFrame, ESCALA_JUEGO, VEL_CARRUSEL, anguloColumpio } from '../state/parqueStore'
import { useAccionCuarto, accionCuartoFrame, CFG_ACCION } from '../state/accionCuartoStore'
import { AccesorioAccion } from './especialesPlantilla'
import { nivelBaseY, worldToSubCell, subId, cellToWorld, doorFor, HALF, SIZE, LADO_DIR, AGUA_ALTURA_LOCAL, type AABB, type SideKey } from './walls'
import { claveCeldaOff, formaEnCelda, subformasDeCelda, puntoDentroSilueta } from './formasLoseta'
import { footprintDeTipo } from './catalogo'
import { moveInput, vectorCam } from './movement'
import { dragChar } from './characterDrag'
import { marchaAvatar } from './animacion'
import { sonar } from '../audio/sfx'
import { vehiculoDe, VehiculoMontado } from './vehiculos'
import { FlotadorMontado } from './flotador'
import { useFlotador, flotadorFrame, COLOR_FLOTADOR } from '../state/flotadorStore'
import { registrarMarcasDerrape } from './derrape'
import {
  carreraFrame,
  multiplicadorSuperficie,
  alturaSueloEn,
  SUPERFICIE_SUELO,
  VEL_CARRERA,
  multiplicadorTrompo,
  offsetTrompoJugador,
} from '../state/carreraStore'
import {
  useHerramienta,
  accionFrame,
  offsetSalto,
  offsetCuerda,
  CORRER_MULT,
  AGACHADO_MULT,
  LARGO_RAYO,
  DUR_SALTO,
  type Herramienta,
} from '../state/herramientaStore'
import { ArmaHerramienta, esPistola, pistolaEnMano } from './arma'
import { dispararRafaga } from './proyectiles'
import { yawDeCamara } from './punteria'
import { paintballFrame, dispararPinturaLibre } from '../state/paintballStore'
import { miraFrame } from '../state/miraFrame'
import { usePortales, portalFrame } from './portales'
import { CuerdaSaltar } from './cuerda'
import { buscarMuro } from './PlanoMuroSelector3D'
import { useGrafitis } from '../state/grafitiStore'

const RADIO = 0.4   // radio del personaje para colisiones
const SPEED = 0.0413 // velocidad base (a pie y vehículos escalan desde aquí)
/** Al flotar en una alberca, el origen del avatar (sus pies) queda este tanto bajo la lámina. */
const FLOTA_SUMERGIDO = 1.05

// Temporales reutilizables (un solo Character en escena).
const _fwd = new THREE.Vector3()
const _right = new THREE.Vector3()
const _move = new THREE.Vector3()
// Posición del frame anterior para medir la marcha (misma inicial que playerPos).
const _prevMarcha = new THREE.Vector3(-3, 0, 0)
// Giro de torso del bateo aplicado en el frame anterior (para recuperar el rumbo base).
let _torsoBateo = 0
// Offset de salto aplicado en el frame anterior y último disparo láser procesado.
let saltoAplicado = 0
let disparoProcesado = 0
const _dirRayo = new THREE.Vector3()
const _ladoRayo = new THREE.Vector3()
// Raycast del grafiti: busca el muro de enfrente por la malla real (userData.muroSel).
const _rayoGrafiti = new THREE.Raycaster()
const _origenGrafiti = new THREE.Vector3()
const ALCANCE_GRAFITI = 3.5

/** ¿La posición (x,z) cae dentro de alguna pared (inflada por el radio)? */
export function chocado(x: number, z: number, colliders: AABB[], radio = RADIO) {
  for (const c of colliders) {
    if (
      x > c.minX - radio &&
      x < c.maxX + radio &&
      z > c.minZ - radio &&
      z < c.maxZ + radio
    ) {
      return true
    }
  }
  return false
}

/** Collider de objeto: rectángulo (medias extensiones hx,hz) rotado (cos/sin) en el mundo. */
export interface ObjCol {
  cx: number
  cz: number
  hx: number
  hz: number
  cos: number
  sin: number
}
const _objCols: ObjCol[] = []

/** ¿El AABB (centro ±ex/ez) solapa algún hueco de puerta? (no estorbar el paso). */
function solapaPuerta(cx: number, cz: number, ex: number, ez: number, puertas: AABB[]) {
  for (const p of puertas) {
    if (cx + ex > p.minX && cx - ex < p.maxX && cz + ez > p.minZ && cz - ez < p.maxZ) return true
  }
  return false
}

/** Construye los colliders de los objetos rígidos del nivel del jugador. */
export function objColliders(playerLevel: number): ObjCol[] {
  _objCols.length = 0
  const objetos = useDiseño.getState().objetos
  const layout = useLayout.getState()
  const niveles = layout.niveles
  const puertas = layout.puertasPorNivel.get(playerLevel) ?? []
  const montadoId = useMontura.getState().instanciaId
  for (const o of objetos) {
    if (esObjetoLibreria(o)) continue // los objetos de la biblioteca no están en la casa
    if (o.id != null && o.id === montadoId) continue // el vehículo montado viaja con el jugador
    const fp = footprintDeTipo(o.tipo)
    if (!fp) continue
    let cx: number
    let cz: number
    if (esObjetoMapa(o)) {
      cx = o.x ?? 0
      cz = o.z ?? 0
    } else {
      if ((niveles[o.roomId] ?? 0) !== playerLevel) continue
      const [rx, , rz] = roomWorldPos(o.roomId)
      cx = rx + (o.x ?? 0)
      cz = rz + (o.z ?? 0)
    }
    const rot = ((o.rotY ?? 0) * Math.PI) / 180
    const cos = Math.cos(rot)
    const sin = Math.sin(rot)
    // No estorbar las puertas: si el objeto (su caja rotada) solapa un hueco, se
    // ignora su colisión para que el personaje siempre pueda cruzar la puerta.
    const ex = Math.abs(fp[0] * cos) + Math.abs(fp[1] * sin)
    const ez = Math.abs(fp[0] * sin) + Math.abs(fp[1] * cos)
    if (solapaPuerta(cx, cz, ex, ez, puertas)) continue
    _objCols.push({ cx, cz, hx: fp[0], hz: fp[1], cos, sin })
  }
  return _objCols
}

/** ¿(x,z) cae dentro de algún objeto rígido (rectángulo rotado inflado por el radio)? */
export function chocadoObjeto(x: number, z: number, cols: ObjCol[], radio = RADIO) {
  for (const c of cols) {
    const dx = x - c.cx
    const dz = z - c.cz
    // Lleva el punto al marco local del objeto (rotación inversa).
    const lx = dx * c.cos + dz * c.sin
    const lz = -dx * c.sin + dz * c.cos
    if (lx > -(c.hx + radio) && lx < c.hx + radio && lz > -(c.hz + radio) && lz < c.hz + radio) {
      return true
    }
  }
  return false
}

/**
 * En niveles altos y sótanos no hay piso base: la celda de (x,z) debe pertenecer a un
 * cuarto de ese nivel. En planta baja (`piso` indefinido) hay suelo en todos lados.
 */
function sinPiso(x: number, z: number, piso: Set<string> | undefined) {
  if (!piso) return false
  const { sc, sr } = worldToSubCell(x, z)
  return !piso.has(subId(sc, sr))
}

/**
 * ¿(x,z) cae dentro de la SILUETA real del pozo de algún sótano? (no solo la sub-celda
 * gruesa). Sobre la silueta el personaje baja al -1; sobre las esquinas rellenas
 * (complemento, que son piso exterior al ras) o fuera, se queda en planta baja.
 */
function sobrePozoSotano(x: number, z: number): boolean {
  const layout = useLayout.getState()
  for (const r of useCuartos.getState().cuartos) {
    if (!layout.placed[r.id] || (layout.niveles[r.id] ?? 0) >= 0) continue
    const anchor = layout.cells[r.id]
    const fp = layout.footprints[r.id]
    if (!anchor || !fp) continue
    const fmap = layout.formasCelda[r.id]
    for (const off of fp) {
      const [cx, , cz] = cellToWorld(anchor.col + off.col, anchor.row + off.row)
      const lx = x - cx
      const lz = z - cz
      if (lx < -HALF || lx > HALF || lz < -HALF || lz > HALF) continue
      const forma = formaEnCelda(fmap, claveCeldaOff(off.col, off.row))
      const subformas = subformasDeCelda(fmap, off.col, off.row)
      if (puntoDentroSilueta(lx, lz, forma, subformas, SIZE)) return true
    }
  }
  return false
}

const DUR_TRANS = 1100 // ms que dura subir/bajar por un acceso
/** Paso desde el pie exterior del acceso hacia el interior del cuarto. */
const PASO_ACCESO = 1.35

/** Pistola equipada (la última) y cuerda: acompañan al avatar a pie o montado. */
function ExtrasHerramientas({ equipadas, escala }: { equipadas: Herramienta[]; escala: number }) {
  const pistola = [...equipadas].reverse().find(esPistola)
  return (
    <>
      {pistola && <ArmaHerramienta tipo={pistola} escala={escala} />}
      {equipadas.includes('cuerda') && <CuerdaSaltar escala={escala} />}
    </>
  )
}

/** Voltereta 360° en X durante el salto mortal, pivotando a media altura del cuerpo. */
function FlipMortal({ escala, children }: { escala: number; children: React.ReactNode }) {
  const g = useRef<THREE.Group>(null)
  const pivote = 0.8 * escala
  useFrame(() => {
    if (!g.current) return
    const p =
      accionFrame.mortal && accionFrame.saltoInicio
        ? Math.min(1, (performance.now() - accionFrame.saltoInicio) / DUR_SALTO)
        : 0
    g.current.rotation.x = p * Math.PI * 2 // p=0|1 → identidad
  })
  return (
    <group position={[0, pivote, 0]} ref={g}>
      <group position={[0, -pivote, 0]}>{children}</group>
    </group>
  )
}

/**
 * Inclina el cuerpo a horizontal al nadar (crol), pivotando en el torso; de vuelta a
 * vertical en cuanto deja de nadar (flotando quieto o fuera del agua). Transición
 * suave (lerp), a diferencia del salto mortal que es una pasada con progreso fijo.
 */
function NadoTilt({ escala, children }: { escala: number; children: React.ReactNode }) {
  const g = useRef<THREE.Group>(null)
  const pivote = 0.85 * escala
  useFrame(() => {
    if (!g.current) return
    // Cabeza hacia el frente de movimiento (medido: -π/2 la dejaba mirando hacia atrás).
    const objetivo = marchaAvatar.nadando ? Math.PI / 2 : 0
    g.current.rotation.x = THREE.MathUtils.lerp(g.current.rotation.x, objetivo, 0.14)
  })
  return (
    <group position={[0, pivote, 0]} ref={g}>
      <group position={[0, -pivote, 0]}>{children}</group>
    </group>
  )
}

/** Deriva el lado (N/S/E/O) de un acceso: usa el campo guardado o lo infiere por posición. */
function ladoDelAcceso(a: { col: number; row: number; lado?: SideKey }): SideKey {
  if (a.lado) return a.lado
  const [cx, , cz] = cellToWorld(a.col, a.row)
  const { axis, sign } = doorFor([cx, 0, cz])
  return axis === 'x' ? (sign < 0 ? 'O' : 'E') : sign < 0 ? 'N' : 'S'
}

/** Pie del acceso (exterior) y dirección hacia el interior del cuarto. */
function posAcceso(a: { col: number; row: number; lado?: SideKey }) {
  const [cx, , cz] = cellToWorld(a.col, a.row)
  const dir = LADO_DIR[ladoDelAcceso(a)]
  const off = HALF + 1.2
  return { cx, cz, dir, colX: cx + dir.dx * off, colZ: cz + dir.dz * off }
}

/** Boca del acceso: un paso dentro del hueco (desde el pie exterior). */
function bocaAcceso(colX: number, colZ: number, dir: { dx: number; dz: number }) {
  return { x: colX - dir.dx * PASO_ACCESO, z: colZ - dir.dz * PASO_ACCESO }
}

/** Punto de aterrizaje al terminar la transición (subir y bajar: junto al hueco). */
function aterrizaje(t: Transicion) {
  const { dir, colX, colZ } = posAcceso(t.acceso)
  return bocaAcceso(colX, colZ, dir)
}

/** Si el aterrizaje cae en mueble/pared, busca un punto libre cerca del acceso. */
function buscarAterrizajeLibre(
  x: number,
  z: number,
  level: number,
  dir: { dx: number; dz: number },
): { x: number; z: number } {
  const colliders = useLayout.getState().wallCollidersByLevel[level] ?? []
  const objCols = objColliders(level)
  const piso = level !== 0 ? useLayout.getState().pisoPorNivel.get(level) : undefined
  const ok = (px: number, pz: number) =>
    !chocado(px, pz, colliders) && !chocadoObjeto(px, pz, objCols) && !sinPiso(px, pz, piso)
  if (ok(x, z)) return { x, z }
  // A lo largo del umbral, luego un poco más adentro/afuera.
  for (const lat of [0, 0.65, -0.65, 1.1, -1.1, 1.6, -1.6]) {
    for (const paso of [0, 0.45, 0.9, -0.35, -0.7]) {
      const px = x + dir.dz * lat - dir.dx * paso
      const pz = z - dir.dz * paso + dir.dx * lat
      if (ok(px, pz)) return { x: px, z: pz }
    }
  }
  return { x, z }
}

/** Punto libre más cercano a (x,z) para un cuerpo de `radio` (anillos crecientes). */
export function puntoLibreCerca(x: number, z: number, nivel: number, radio: number): { x: number; z: number } {
  const colliders = useLayout.getState().wallCollidersByLevel[nivel] ?? []
  const objCols = objColliders(nivel)
  const piso = nivel !== 0 ? useLayout.getState().pisoPorNivel.get(nivel) : undefined
  const ok = (px: number, pz: number) =>
    !chocado(px, pz, colliders, radio) && !chocadoObjeto(px, pz, objCols, radio) && !sinPiso(px, pz, piso)
  if (ok(x, z)) return { x, z }
  for (const dist of [0.8, 1.4, 2.1, 2.9]) {
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2
      const px = x + Math.sin(a) * dist
      const pz = z + Math.cos(a) * dist
      if (ok(px, pz)) return { x: px, z: pz }
    }
  }
  return { x, z }
}

/** Fija posición final y libera al personaje del acceso. */
function completarAcceso(
  t: Transicion,
  cur: THREE.Vector3,
  group: THREE.Group,
  land: { x: number; z: number },
  dir: { dx: number; dz: number },
  cx: number,
  cz: number,
  yHacia: number,
) {
  const libre = buscarAterrizajeLibre(land.x, land.z, t.hacia, dir)
  cur.set(libre.x, yHacia, libre.z)
  playerPos.copy(cur)
  group.lookAt(cx, yHacia, cz)
  useHouse.getState().terminarTransicion()
}

/**
 * Anima al personaje por el acceso: va a la columna, sube/baja (en espiral si es
 * escalera) y llega al aterrizaje. Al terminar, fija el nivel vía terminarTransicion.
 */
function animarTransicion(t: Transicion, cur: THREE.Vector3, group: THREE.Group) {
  const apilado = !useHouse.getState().explotado
  const elapsed = performance.now() - t.inicio
  const p = Math.min(1, elapsed / DUR_TRANS)
  const { cx, cz, dir, colX, colZ } = posAcceso(t.acceso)
  const yDesde = nivelBaseY(t.desde, apilado)
  const yHacia = nivelBaseY(t.hacia, apilado)
  const land = aterrizaje(t)
  const boca = bocaAcceso(colX, colZ, dir)
  const subiendo = t.hacia > t.desde

  let x: number
  let z: number
  let y: number
  if (p < 0.18) {
    const q = p / 0.18
    // Subir: ir al pie de la columna. Bajar: ir a la boca (donde suele estar tras subir).
    const tgtX = subiendo ? colX : boca.x
    const tgtZ = subiendo ? colZ : boca.z
    x = THREE.MathUtils.lerp(t.startX, tgtX, q)
    z = THREE.MathUtils.lerp(t.startZ, tgtZ, q)
    y = yDesde
  } else if (p < 0.82) {
    const q = (p - 0.18) / 0.64
    y = THREE.MathUtils.lerp(yDesde, yHacia, q * q * (3 - 2 * q))
    if (subiendo) {
      x = colX
      z = colZ
    } else {
      // Bajar: deslizar a la columna mientras se desciende (no saltar al exterior en planta alta).
      const qCol = Math.min(1, q * 1.35)
      x = THREE.MathUtils.lerp(boca.x, colX, qCol)
      z = THREE.MathUtils.lerp(boca.z, colZ, qCol)
    }
    if (t.acceso.tipo === 'escalera') {
      const vueltas = Math.max(1, Math.round(Math.abs(yHacia - yDesde) / 2.4))
      const ang = q * Math.PI * 2 * vueltas * (subiendo ? 1 : -1)
      x = colX + 0.9 * Math.cos(ang)
      z = colZ + 0.9 * Math.sin(ang)
    }
  } else {
    const q = (p - 0.82) / 0.18
    x = THREE.MathUtils.lerp(colX, land.x, q)
    z = THREE.MathUtils.lerp(colZ, land.z, q)
    y = yHacia
  }

  if (p >= 1) {
    completarAcceso(t, cur, group, land, dir, cx, cz, yHacia)
    return
  }

  cur.set(x, y, z)
  playerPos.copy(cur)
  group.lookAt(cx, y, cz)
}

/** Encoge al corredor durante la carrera (el rival se encoge igual en carrera.tsx). */
function EscalaCarrera({ children }: { children: ReactNode }) {
  const g = useRef<THREE.Group>(null)
  useFrame(() => {
    g.current?.scale.setScalar(carreraFrame.escala)
  })
  return <group ref={g}>{children}</group>
}

/** Velocidad vertical del OVNI (unidades por frame a input pleno). */
const SUBIDA_OVNI = 0.06
/** Altura máxima de vuelo del OVNI. */
const ALTURA_MAX_OVNI = 35

/**
 * Conduce el vehículo montado: se mueve en la dirección presionada, igual que a
 * pie (relativo al azimut de cámara en iso, o a la vista en 1ª/3ª) — cualquier
 * flecha avanza, sin "controles de tanque" — y gira para mirar hacia donde
 * avanza (tasa limitada por `def.giro`). Colisiona como a pie con el radio del
 * vehículo (el OVNI vuela y las ignora); al bajarse persiste la pose con
 * `setObjetoPose` y deja al personaje a un costado.
 */
function conducir(
  cur: THREE.Vector3,
  group: THREE.Group,
  camera: THREE.Camera,
  persp: boolean,
  dt: number,
) {
  // Igual que a pie: def.velocidad/giro y las constantes SUBIDA_OVNI/boost/drift
  // están calibradas por frame a 60 FPS — se escalan por el delta real (acotado)
  // para no ir lento en dispositivos con menos FPS. OJO: no confundir con la
  // variable local `delta` de abajo (esa es un ángulo, no tiempo).
  const dtFactor = Math.min(dt, 0.3) * 60
  const montura = useMontura.getState()
  const id = montura.instanciaId
  const prestado = montura.prestado
  const inst =
    prestado || id == null ? undefined : useDiseño.getState().objetos.find((o) => o.id === id)
  if (!monturaFrame.tipo || (!prestado && (id == null || !inst))) {
    // La instancia desapareció (borrada desde el inventario): bajar en seco.
    montura.desmontarForzado()
    return
  }
  const def = vehiculoDe(monturaFrame.tipo)
  const esOvni = monturaFrame.tipo === 'ovni'
  const { playerLevel, explotado } = useHouse.getState()
  const targetY = nivelBaseY(playerLevel, !explotado)

  // Al montar: aparecer sobre el vehículo (una sola vez).
  if (monturaFrame.snapPendiente) {
    monturaFrame.snapPendiente = false
    cur.set(monturaFrame.snapX, cur.y, monturaFrame.snapZ)
  }

  // Bajarse: el OVNI desciende primero; ya en el piso se estaciona y se libera.
  if (monturaFrame.desmontarPendiente) {
    if (esOvni && cur.y > targetY + SUPERFICIE_SUELO + 0.05) {
      monturaFrame.vel = 0
      cur.y = Math.max(targetY + SUPERFICIE_SUELO, cur.y - SUBIDA_OVNI * 1.4 * dtFactor)
      playerPos.copy(cur)
      return
    }
    const heading = monturaFrame.heading
    // El vehículo prestado (carrera) no existe en el mapa: no hay pose que guardar.
    if (!prestado && id != null) {
      void useDiseño.getState().setObjetoPose(id, cur.x, cur.z, (heading * 180) / Math.PI)
    }
    montura.desmontarForzado() // limpia store y monturaFrame (reactiva el collider del vehículo)
    const colliders = useLayout.getState().wallCollidersByLevel[playerLevel] ?? []
    const objCols = objColliders(playerLevel)
    const piso = playerLevel !== 0 ? useLayout.getState().pisoPorNivel.get(playerLevel) : undefined
    const libre = (px: number, pz: number) =>
      !chocado(px, pz, colliders) && !chocadoObjeto(px, pz, objCols) && !sinPiso(px, pz, piso)
    // Bajar por el costado izquierdo; si está ocupado, probar derecha/atrás/frente.
    let px = cur.x + Math.sin(heading - Math.PI / 2) * (def.radio + 0.75)
    let pz = cur.z + Math.cos(heading - Math.PI / 2) * (def.radio + 0.75)
    buscar: for (const off of [-Math.PI / 2, Math.PI / 2, Math.PI, 0]) {
      for (const dist of [def.radio + 0.75, def.radio + 1.3]) {
        const cx = cur.x + Math.sin(heading + off) * dist
        const cz = cur.z + Math.cos(heading + off) * dist
        if (libre(cx, cz)) {
          px = cx
          pz = cz
          break buscar
        }
      }
    }
    cur.set(px, targetY, pz)
    playerPos.copy(cur)
    useHouse.getState().target.set(px, 0, pz)
    group.rotation.set(0, heading, 0)
    return
  }

  // Vector de movimiento: igual que a pie (relativo al azimut de cámara en iso,
  // o a la vista en 1ª/3ª) — así CUALQUIER flecha avanza, sin "controles de tanque".
  const { f, s, kf, ks, kv, pv } = moveInput
  const hayInput = f !== 0 || s !== 0 || kf !== 0 || ks !== 0
  let mx = 0
  let mz = 0
  if (hayInput) {
    if (!persp) {
      const v = vectorCam(kf, ks, f, s, camAnim.az)
      mx = v.x
      mz = v.z
    } else {
      camera.getWorldDirection(_fwd)
      _fwd.y = 0
      if (_fwd.lengthSq() < 1e-6) _fwd.set(0, 0, -1)
      _fwd.normalize()
      _right.set(-_fwd.z, 0, _fwd.x)
      _move.set(0, 0, 0).addScaledVector(_fwd, f + kf).addScaledVector(_right, s + ks)
      const mag = Math.min(1, _move.length())
      if (mag > 0.001) {
        _move.normalize().multiplyScalar(mag)
        mx = _move.x
        mz = _move.z
      }
    }
  }
  // Semáforo de carrera: el vehículo queda congelado hasta el banderazo.
  if (carreraFrame.bloqueado) {
    mx = 0
    mz = 0
  }
  // Derrape (Space o botón táctil): la dirección real de avance (dirX/dirZ) se
  // separa del input — persigue lento al stick mientras el rumbo gira más
  // rápido — y al soltar tras ≥0.8 s deslizando hay un mini-turbo.
  const nominal = SPEED * def.velocidad
  // `nominal` es por frame a 60 Hz, pero `monturaFrame.vel` es el avance REAL del
  // frame (ya escalado por delta): sin este factor, arriba de 60 fps la velocidad
  // medida nunca alcanzaba el umbral y el derrape no llegaba a activarse.
  const umbral = nominal * dtFactor
  const driftKey = !esOvni && (kv > 0 || monturaFrame.driftInput)
  if (!monturaFrame.drift) {
    if (driftKey && hayInput && Math.abs(monturaFrame.vel) > umbral * 0.4) {
      monturaFrame.drift = true
      monturaFrame.dirX = Math.sin(monturaFrame.heading)
      monturaFrame.dirZ = Math.cos(monturaFrame.heading)
      monturaFrame.driftCarga = 0
    }
  } else if (!driftKey || !hayInput) {
    monturaFrame.drift = false
    if (monturaFrame.driftCarga >= 0.8) {
      monturaFrame.boost = 0.85
      sonar('turbo')
    }
    monturaFrame.driftCarga = 0
  }
  let ux = mx
  let uz = mz
  if (monturaFrame.drift) {
    const nx = monturaFrame.dirX + (mx - monturaFrame.dirX) * Math.min(1, 0.055 * dtFactor)
    const nz = monturaFrame.dirZ + (mz - monturaFrame.dirZ) * Math.min(1, 0.055 * dtFactor)
    const len = Math.hypot(nx, nz) || 1
    monturaFrame.dirX = nx / len
    monturaFrame.dirZ = nz / len
    ux = monturaFrame.dirX
    uz = monturaFrame.dirZ
    const angDir = Math.atan2(monturaFrame.dirX, monturaFrame.dirZ)
    const deslice = Math.atan2(
      Math.sin(monturaFrame.heading - angDir),
      Math.cos(monturaFrame.heading - angDir),
    )
    if (Math.abs(deslice) > 0.3) monturaFrame.driftCarga += dt
  }
  if (monturaFrame.boost > 0) monturaFrame.boost -= dt
  // Turbo: la herramienta "correr" también acelera el vehículo. La superficie
  // premia el asfalto de la pista (y castiga el pasto en plena carrera).
  const vel =
    nominal *
    (accionFrame.correr ? CORRER_MULT : 1) *
    (monturaFrame.boost > 0 ? 1.45 : 1) *
    (monturaFrame.drift ? 0.93 : 1) *
    (esOvni ? 1 : multiplicadorSuperficie(cur.x, cur.z)) *
    // En carrera se corre encogido: reducir la velocidad de mundo para que se sienta natural.
    (carreraFrame.corriendo ? VEL_CARRERA : 1) *
    // Trompo por banana/bomba: pierdes el control y casi toda la velocidad.
    multiplicadorTrompo(performance.now()) *
    dtFactor
  const dx = ux * vel
  const dz = uz * vel

  let x = cur.x
  let z = cur.z
  if (esOvni) {
    // El OVNI vuela: nada lo detiene.
    x += dx
    z += dz
  } else if (dx !== 0 || dz !== 0) {
    const colliders = useLayout.getState().wallCollidersByLevel[playerLevel] ?? []
    const objCols = objColliders(playerLevel)
    const piso = playerLevel !== 0 ? useLayout.getState().pisoPorNivel.get(playerLevel) : undefined
    // Si el vehículo YA está dentro de algo (nació solapado), dejarlo salir sin
    // validar colisión este frame; si no, validación normal por eje.
    const atascado = chocado(x, z, colliders, def.radio) || chocadoObjeto(x, z, objCols, def.radio)
    if (atascado) {
      if (!sinPiso(x + dx, z, piso)) x += dx
      if (!sinPiso(x, z + dz, piso)) z += dz
    } else {
      if (
        !chocado(x + dx, z, colliders, def.radio) &&
        !chocadoObjeto(x + dx, z, objCols, def.radio) &&
        !sinPiso(x + dx, z, piso)
      )
        x += dx
      if (
        !chocado(x, z + dz, colliders, def.radio) &&
        !chocadoObjeto(x, z + dz, objCols, def.radio) &&
        !sinPiso(x, z + dz, piso)
      )
        z += dz
    }
  }

  // Altura: vuelo libre del OVNI (Space/Shift o botones ↑/↓); los demás, al piso.
  let ny: number
  if (esOvni) {
    const vy = Math.max(-1, Math.min(1, kv + pv))
    ny = Math.max(
      targetY + SUPERFICIE_SUELO,
      Math.min(ALTURA_MAX_OVNI, cur.y + vy * SUBIDA_OVNI * dtFactor),
    )
    saltoAplicado = 0
  } else {
    // Brincos (salto/cuerda) también montado: el vehículo salta con el jugador.
    // Los terrestres además siguen la elevación de la pista (rampas elevadas).
    const salto = offsetSalto(performance.now()) + offsetCuerda(performance.now())
    ny = THREE.MathUtils.lerp(cur.y - saltoAplicado, targetY + alturaSueloEn(x, z), 0.2) + salto
    saltoAplicado = salto
  }

  // Gira hacia donde avanza (ángulo más corto, tasa limitada por def.giro/frame).
  let giroAplicado = 0
  if (mx !== 0 || mz !== 0) {
    const objetivo = Math.atan2(mx, mz)
    const anguloDif = Math.atan2(Math.sin(objetivo - monturaFrame.heading), Math.cos(objetivo - monturaFrame.heading))
    const lim = def.giro * (monturaFrame.drift ? 1.8 : 1) * dtFactor
    giroAplicado = Math.max(-lim, Math.min(lim, anguloDif))
    monturaFrame.heading += giroAplicado
  }

  const velReal = Math.hypot(x - cur.x, z - cur.z)
  cur.set(x, ny, z)
  playerPos.copy(cur)
  // Mantener el destino del click-to-move en la posición actual (no "regresar" al soltar).
  useHouse.getState().target.set(x, 0, z)
  group.rotation.set(0, monturaFrame.heading + offsetTrompoJugador(performance.now()), 0)

  // Alimenta ruedas/pedaleo/inclinación (los modelos y el avatar lo leen por frame).
  monturaFrame.vel = velReal
  monturaFrame.faseRueda += velReal
  const conLean = monturaFrame.tipo === 'bicicleta' || monturaFrame.tipo === 'motocicleta'
  const leanObjetivo = monturaFrame.drift ? -giroAplicado * 6 : conLean ? -giroAplicado * 3 : 0
  monturaFrame.lean = THREE.MathUtils.lerp(monturaFrame.lean, leanObjetivo, Math.min(1, 0.15 * dtFactor))
  // Huellas de las llantas mientras desliza (apenas sobre el asfalto de la pista).
  if (monturaFrame.drift && velReal > umbral * 0.3)
    // `ny` ya es la superficie bajo el vehículo; las huellas van encima, con aire
    // suficiente para no pelearse con el suelo ni quedar tapadas por el chasis.
    registrarMarcasDerrape(x, ny + 0.06, z, monturaFrame.heading, carreraFrame.escala)
}

// ---------------------------------------------------------------------------
// Juegos de parque: uso guionizado con el input bloqueado (ver `parqueStore`).
// Resbaladilla y pasamanos son una pasada completa (el pasamanos entra por el
// extremo más cercano, en cualquier dirección); carrusel y columpio quedan en
// bucle hasta que el jugador se mueve (ver `revisarSalidaPorMovimiento`), sin
// botón. Las medidas locales se multiplican por ESCALA_JUEGO × escala de la
// instancia (misma escala que su render).
// ---------------------------------------------------------------------------

const _pjPos = new THREE.Vector3()
const _pjAux = new THREE.Vector3()

/** Punto local del juego (x,z en su marco; y ya mundial) → mundo, según su rotY. */
function mundoJuego(lx: number, y: number, lz: number, out: THREE.Vector3) {
  const c = Math.cos(parqueFrame.rotYRad)
  const s = Math.sin(parqueFrame.rotYRad)
  out.set(parqueFrame.cx + lx * c + lz * s, y, parqueFrame.cz - lx * s + lz * c)
}

/** Rumbo del avatar para mirar en la dirección local (dlx,dlz) del juego. */
function rumboJuego(dlx: number, dlz: number) {
  const c = Math.cos(parqueFrame.rotYRad)
  const s = Math.sin(parqueFrame.rotYRad)
  return Math.atan2(dlx * c + dlz * s, -dlx * s + dlz * c)
}

const lin = THREE.MathUtils.lerp
const suave = (q: number) => q * q * (3 - 2 * q)

/**
 * Dona flotadora (sin botones): se pide bajarse en cuanto el jugador mueve el
 * joystick/teclado o marca un destino lejos de la dona. Se arma (`salidaLista`)
 * la primera vez que, ya sentado, no hay input — así el impulso con el que nadó
 * hasta ella no lo baja de inmediato.
 */
function bajarseDeLaDonaPorMovimiento(): boolean {
  const { f, s, kf, ks } = moveInput
  const hayInput = f !== 0 || s !== 0 || kf !== 0 || ks !== 0
  const { target } = useHouse.getState()
  const destinoLejos = Math.hypot(target.x - flotadorFrame.x, target.z - flotadorFrame.z) > 0.6
  if (!hayInput && !destinoLejos) {
    flotadorFrame.salidaLista = true
    return false
  }
  return flotadorFrame.salidaLista
}

/** Suelta al personaje en un punto libre y limpia el estado del juego. */
function terminarJuego(cur: THREE.Vector3, group: THREE.Group, x: number, z: number, heading: number) {
  useParque.getState().salirForzado()
  const { playerLevel, explotado } = useHouse.getState()
  const libre = puntoLibreCerca(x, z, playerLevel, RADIO)
  cur.set(libre.x, nivelBaseY(playerLevel, !explotado), libre.z)
  playerPos.copy(cur)
  useHouse.getState().target.set(libre.x, 0, libre.z)
  group.rotation.order = 'XYZ'
  group.rotation.set(0, heading, 0)
}

/** Fase de acercamiento: caminar en línea recta del punto de partida a `meta`. */
function acercarse(cur: THREE.Vector3, group: THREE.Group, q: number, meta: THREE.Vector3) {
  const x = lin(parqueFrame.startX, meta.x, q)
  const z = lin(parqueFrame.startZ, meta.z, q)
  if (Math.hypot(meta.x - x, meta.z - z) > 0.02) group.rotation.set(0, Math.atan2(meta.x - x, meta.z - z), 0)
  cur.set(x, lin(cur.y, 0, 0.3), z)
  playerPos.copy(cur)
}

/**
 * Carrusel/columpio (juegos en bucle, sin botón de bajarse): pide bajarse en
 * cuanto el jugador mueve el joystick/teclado hacia otra dirección. Se arma
 * (`salidaLista`) la primera vez que, ya sentado, no hay input — así el
 * impulso con el que caminó hasta el juego no lo expulsa de inmediato.
 */
function revisarSalidaPorMovimiento() {
  if (parqueFrame.pose !== 'sentado') return
  const { f, s, kf, ks } = moveInput
  const hayInput = f !== 0 || s !== 0 || kf !== 0 || ks !== 0
  if (!hayInput) parqueFrame.salidaLista = true
  else if (parqueFrame.salidaLista) parqueFrame.salirPendiente = true
}

function usarJuego(cur: THREE.Vector3, group: THREE.Group, delta: number) {
  const dt = Math.min(delta, 0.05) // acota saltos de delta (pestaña inactiva)
  const parque = useParque.getState()
  const id = parque.instanciaId
  const inst = id == null ? undefined : useDiseño.getState().objetos.find((o) => o.id === id)
  const tipo = parqueFrame.tipo
  if (id == null || !inst || !tipo) {
    // La instancia desapareció (borrada desde el inventario): soltar en seco.
    parque.salirForzado()
    return
  }
  const k = ESCALA_JUEGO[tipo] * (inst.escala ?? 1)
  // Los objetos del mapa se renderizan a 0.2 + altura extra (ver ObjetosMapa).
  const baseY = 0.2 + (inst.y ?? 0)
  const avEsc = useDiseño.getState().avatar.escala
  // Velocidad del juego (ObjetoCuarto.fx): escala el reloj del recorrido entero.
  const fx = inst.fx ?? 1
  const e = (performance.now() - parqueFrame.inicio) * fx

  if (tipo === 'resbaladilla') {
    // Subir la escalera (-z), caminar la plataforma, sentarse y deslizar (+z).
    if (e >= 3400) {
      mundoJuego(0, 0, 1.9 * k, _pjPos)
      terminarJuego(cur, group, _pjPos.x, _pjPos.z, rumboJuego(0, 1))
      return
    }
    const yTrasero = 0.6 * avEsc // del origen del avatar a su trasero (pose sentada)
    parqueFrame.pose = 'de-pie'
    if (e < 500) {
      mundoJuego(0, 0, -1.45 * k, _pjPos)
      acercarse(cur, group, e / 500, _pjPos)
      return
    }
    let ly: number
    let lz: number
    if (e < 1600) {
      const q = suave((e - 500) / 1100)
      ly = (baseY + 0.96 * k) * q
      lz = lin(-1.45, -0.62, q) * k
    } else if (e < 2100) {
      const q = (e - 1600) / 500
      ly = baseY + 0.96 * k
      lz = lin(-0.62, -0.12, q) * k
    } else if (e < 2350) {
      const q = (e - 2100) / 250
      parqueFrame.pose = 'sentado'
      ly = lin(baseY + 0.96 * k, baseY + 0.93 * k - yTrasero, q)
      lz = lin(-0.12, -0.05, q) * k
    } else if (e < 3050) {
      const r = (e - 2350) / 700
      const q = r * r // acelera rampa abajo
      parqueFrame.pose = 'sentado'
      ly = lin(baseY + 0.93 * k - yTrasero, baseY + 0.06 * k - yTrasero, q)
      lz = lin(-0.05, 1.14, q) * k
    } else {
      const q = (e - 3050) / 350
      ly = lin(baseY + 0.06 * k - yTrasero, 0, q)
      lz = lin(1.14, 1.8, q) * k
    }
    mundoJuego(0, ly, lz, _pjPos)
    cur.copy(_pjPos)
    playerPos.copy(cur)
    group.rotation.set(0, rumboJuego(0, 1), 0)
    return
  }

  if (tipo === 'pasamanos') {
    // Colgarse en el extremo más cercano a la entrada, cruzar barra a barra y
    // soltarse en el otro: `dir` (±1, fijado al primer frame) es el extremo de
    // entrada, así funciona caminando desde cualquiera de los dos lados.
    if (!parqueFrame.faseLista) {
      parqueFrame.faseLista = true
      const c = Math.cos(parqueFrame.rotYRad)
      const s = Math.sin(parqueFrame.rotYRad)
      const dx = parqueFrame.startX - parqueFrame.cx
      const dz = parqueFrame.startZ - parqueFrame.cz
      parqueFrame.fase0 = dx * c - dz * s >= 0 ? 1 : -1 // extremo de entrada según la x local
    }
    const dir = parqueFrame.fase0 as 1 | -1
    if (e >= 3600) {
      mundoJuego(-dir * 1.35 * k, 0, 0, _pjPos)
      terminarJuego(cur, group, _pjPos.x, _pjPos.z, rumboJuego(-dir, 0))
      return
    }
    const yCuelga = Math.max(0.05, baseY + 1.5 * k - 1.82 * avEsc) // manos arriba alcanzan 1.82·escala
    parqueFrame.pose = 'de-pie'
    if (e < 500) {
      mundoJuego(dir * 1.1 * k, 0, 0, _pjPos)
      acercarse(cur, group, e / 500, _pjPos)
      return
    }
    let lx: number
    let ly: number
    if (e < 850) {
      const q = (e - 500) / 350
      parqueFrame.pose = 'colgado'
      lx = lin(dir * 1.1, dir * 0.6, q) * k
      ly = Math.sin((q * Math.PI) / 2) * yCuelga
    } else if (e < 3250) {
      const q = (e - 850) / 2400
      parqueFrame.pose = 'colgado'
      lx = lin(dir * 0.6, -dir * 0.6, q) * k
      ly = yCuelga + Math.abs(Math.sin(q * Math.PI * 5)) * 0.06 // vaivén barra a barra
    } else {
      const q = (e - 3250) / 350
      lx = lin(-dir * 0.6, -dir * 1.1, q) * k
      ly = yCuelga * (1 - suave(q))
    }
    mundoJuego(lx, ly, 0, _pjPos)
    cur.copy(_pjPos)
    playerPos.copy(cur)
    group.rotation.set(0, rumboJuego(-dir, 0), 0)
    return
  }

  if (tipo === 'carrusel') {
    // Sentarse en el asiento más cercano y girar CON la plataforma hasta bajarse.
    // La plataforma gira a `parqueFrame.giro` (rotation.y); un asiento de ángulo
    // local θ va, en el marco del juego, al ángulo θ - giro (rotación en Y). El
    // jinete se coloca en ese mismo ángulo para orbitar en el MISMO sentido.
    if (e >= 700) parqueFrame.giro += dt * VEL_CARRUSEL * fx // arranca quieto, luego gira
    if (!parqueFrame.faseLista) {
      parqueFrame.faseLista = true
      const c = Math.cos(parqueFrame.rotYRad)
      const s = Math.sin(parqueFrame.rotYRad)
      const dx = parqueFrame.startX - parqueFrame.cx
      const dz = parqueFrame.startZ - parqueFrame.cz
      const alfa = Math.atan2(dx * s + dz * c, dx * c - dz * s) // ángulo local del jugador
      // Asiento (0/90/180/270) más cercano a la entrada dado el giro actual.
      parqueFrame.fase0 = Math.round((alfa + parqueFrame.giro) / (Math.PI / 2)) * (Math.PI / 2)
    }
    const a = parqueFrame.fase0 - parqueFrame.giro // ángulo del asiento en el marco del juego
    const ySentado = baseY + 0.25 * k - 0.6 * avEsc // trasero sobre el asiento bajo de la plataforma
    mundoJuego(Math.cos(a) * 0.52 * k, ySentado, Math.sin(a) * 0.52 * k, _pjPos)
    const heading = rumboJuego(Math.sin(a), -Math.cos(a)) // tangente (a decrece con el giro)
    revisarSalidaPorMovimiento()
    if (parqueFrame.salirPendiente) {
      terminarJuego(cur, group, parqueFrame.startX, parqueFrame.startZ, heading)
      return
    }
    if (e < 700) {
      const q = suave(Math.min(1, e / 700))
      parqueFrame.pose = q > 0.6 ? 'sentado' : 'de-pie'
      cur.set(lin(parqueFrame.startX, _pjPos.x, q), lin(0, ySentado, q), lin(parqueFrame.startZ, _pjPos.z, q))
    } else {
      parqueFrame.pose = 'sentado'
      cur.copy(_pjPos)
    }
    playerPos.copy(cur)
    group.rotation.set(0, heading, 0)
    return
  }

  // Columpio: sentarse en el asiento del lado más cercano y mecerse hasta bajarse.
  if (!parqueFrame.faseLista) {
    parqueFrame.faseLista = true
    const c = Math.cos(parqueFrame.rotYRad)
    const s = Math.sin(parqueFrame.rotYRad)
    const dx = parqueFrame.startX - parqueFrame.cx
    const dz = parqueFrame.startZ - parqueFrame.cz
    parqueFrame.fase0 = dx * c - dz * s >= 0 ? 1 : -1 // lado según la x local del jugador
  }
  const lado = parqueFrame.fase0 as 1 | -1
  if (e >= 1000) parqueFrame.vaivenT += dt * fx // se mece una vez sentado (arranca en reposo)
  const fi = anguloColumpio(parqueFrame.vaivenT)
  const cuerda = 1.055 * k + 0.6 * avEsc // pivote → asiento → trasero del avatar
  const xSeat = 0.4 * k * lado
  mundoJuego(xSeat, baseY + 1.62 * k - cuerda * Math.cos(fi), -cuerda * Math.sin(fi), _pjPos)
  const heading = rumboJuego(0, 1)
  revisarSalidaPorMovimiento()
  if (parqueFrame.salirPendiente) {
    terminarJuego(cur, group, parqueFrame.startX, parqueFrame.startZ, heading)
    return
  }
  if (e < 500) {
    mundoJuego(xSeat, 0, 0.95 * k, _pjAux)
    acercarse(cur, group, e / 500, _pjAux)
    return
  }
  if (e < 1000) {
    const q = suave((e - 500) / 500)
    parqueFrame.pose = q > 0.4 ? 'sentado' : 'de-pie'
    mundoJuego(xSeat, 0, 0.95 * k, _pjAux)
    cur.set(lin(_pjAux.x, _pjPos.x, q), lin(0, _pjPos.y, q), lin(_pjAux.z, _pjPos.z, q))
    playerPos.copy(cur)
    group.rotation.set(0, heading, 0)
    return
  }
  parqueFrame.pose = 'sentado'
  cur.copy(_pjPos)
  playerPos.copy(cur)
  // Inclinarse con el columpio: primero el rumbo (Y) y luego el vaivén (X local).
  group.rotation.order = 'YXZ'
  group.rotation.set(fi, heading, 0)
}

// ---------------------------------------------------------------------------
// Objetos usables de plantilla: el personaje camina al objeto y ejecuta una
// acción (caminar en la caminadora, meditar, escribir, tocar, regar, leer) en
// bucle hasta que se mueve (ver `accionCuartoStore`). La proximidad la dispara
// el componente del objeto (`useAbordarAccion`); aquí va la parte guionizada.
// ---------------------------------------------------------------------------

/** Salir de la acción al mover (armado tras soltar las teclas al llegar, como el parque). */
function revisarSalidaAccion() {
  const { f, s, kf, ks } = moveInput
  const hayInput = f !== 0 || s !== 0 || kf !== 0 || ks !== 0
  if (!hayInput) accionCuartoFrame.salidaLista = true
  else if (accionCuartoFrame.salidaLista) accionCuartoFrame.salirPendiente = true
}

function usarAccion(cur: THREE.Vector3, group: THREE.Group, delta: number) {
  const dt = Math.min(delta, 0.05)
  const st = useAccionCuarto.getState()
  const tipo = accionCuartoFrame.tipo
  if (st.instanciaId == null || !tipo) {
    st.salirForzado()
    return
  }
  const { playerLevel, explotado } = useHouse.getState()
  const floorY = nivelBaseY(playerLevel, !explotado)
  const avEsc = useDiseño.getState().avatar.escala
  const cfg = CFG_ACCION[tipo]
  const e = performance.now() - accionCuartoFrame.inicio
  // Punto de uso: `frente` unidades del objeto hacia donde venía el jugador.
  const ox = accionCuartoFrame.cx
  const oz = accionCuartoFrame.cz
  let dx = accionCuartoFrame.startX - ox
  let dz = accionCuartoFrame.startZ - oz
  const dist = Math.hypot(dx, dz) || 1
  dx /= dist
  dz /= dist
  let spotX = ox + dx * cfg.frente
  let spotZ = oz + dz * cfg.frente
  let heading: number
  let yPose: number
  if (cfg.asiento != null) {
    const c = Math.cos(accionCuartoFrame.rotYRad)
    const s = Math.sin(accionCuartoFrame.rotYRad)
    if (cfg.sobreObjeto) {
      // Sentado ENCIMA del mueble (sillón): en su centro, mirando su frente (+z local).
      spotX = ox
      spotZ = oz
      heading = accionCuartoFrame.rotYRad
    } else {
      // Sentado en una silla FRENTE al objeto (escritorio): en su +z local, mirándolo.
      spotX = ox + cfg.frente * s
      spotZ = oz + cfg.frente * c
      heading = accionCuartoFrame.rotYRad + Math.PI
    }
    yPose = floorY + cfg.asiento - 0.6 * avEsc
  } else {
    // Encara el objeto; parado justo encima (frente 0) mira hacia donde llegó.
    heading =
      cfg.frente < 0.15
        ? Math.atan2(spotX - accionCuartoFrame.startX, spotZ - accionCuartoFrame.startZ)
        : Math.atan2(ox - spotX, oz - spotZ)
    yPose = cfg.sentado ? floorY - 0.35 * avEsc : floorY + cfg.alza
  }
  group.rotation.order = 'XYZ'
  // Aproximación: caminar del punto de partida al punto de uso.
  if (e < 500) {
    const q = e / 500
    const x = lin(accionCuartoFrame.startX, spotX, q)
    const z = lin(accionCuartoFrame.startZ, spotZ, q)
    if (Math.hypot(spotX - x, spotZ - z) > 0.02) group.rotation.set(0, Math.atan2(spotX - x, spotZ - z), 0)
    cur.set(x, lin(cur.y, floorY, 0.3), z)
    playerPos.copy(cur)
    return
  }
  // En posición: mantener la pose, encarando el objeto.
  cur.set(spotX, lin(cur.y, yPose, 0.25), spotZ)
  playerPos.copy(cur)
  group.rotation.set(0, heading, 0)
  if (tipo === 'caminadora') {
    marchaAvatar.velocidad = 1
    marchaAvatar.fase += dt * 9 // camina en el sitio sobre la banda
  }
  revisarSalidaAccion()
  if (accionCuartoFrame.salirPendiente) {
    st.salirForzado()
    const libre = puntoLibreCerca(accionCuartoFrame.startX, accionCuartoFrame.startZ, playerLevel, RADIO)
    cur.set(libre.x, floorY, libre.z)
    playerPos.copy(cur)
    useHouse.getState().target.set(libre.x, 0, libre.z)
  }
}

/**
 * Avatar cúbico estilo Roblox.
 * - Movimiento libre (teclado/pad): velocidad relativa a la cámara, con colisiones
 *   (las puertas dejan pasar de un cuarto a otro).
 * - Sin input: se desliza hacia `target` (clic en la casa o menú lateral).
 * - Montado en un vehículo: `conducir` mueve el conjunto (vehículo + avatar sentado).
 */
export function Character() {
  const ref = useRef<THREE.Group>(null)
  useHouse((s) => s.navTick)
  const av = useDiseño((s) => s.avatar)
  const camera = useThree((s) => s.camera)
  const scene = useThree((s) => s.scene)
  const get3f = useThree((s) => s.get)
  const vista = useCam((s) => s.vista)
  const editMode = useLayout((s) => s.editMode)
  const editingRoomId = useLayout((s) => s.editingRoomId)
  const editarPersonaje = useEditorUi((s) => s.editarPersonaje)
  const setPersonajeSel = useEditorUi((s) => s.setPersonajeSel)
  const tab = useEditorUi((s) => s.tab)
  const editor3d = useEditorUi((s) => s.editor3d)
  // En modo edición (sin cuarto) o en el editor 3D, tocar el personaje lo selecciona.
  const seleccionable = (editMode && !editingRoomId) || editor3d
  // En la pestaña Personajes (editor iso) se puede arrastrar; en perspectiva no
  // (el personaje sigue caminando con el joystick).
  const arrastrable = editMode && !editingRoomId && !editor3d && tab === 'personajes'
  const montadoId = useMontura((s) => s.instanciaId)
  const montadoTipo = useMontura((s) => s.tipo)
  const montadoPrestado = useMontura((s) => s.prestado)
  const trenMontado = useTren((s) => s.montado)
  const trenTipo = useTren((s) => s.tipo)
  // Color de la instancia montada (selector de primitivo estable: no re-renderiza por drags ajenos).
  const colorVehiculo = useDiseño((s) =>
    montadoId == null ? undefined : s.objetos.find((o) => o.id === montadoId)?.color,
  )
  const donaId = useFlotador((s) => s.instanciaId)
  const colorDona = useDiseño((s) =>
    donaId == null ? undefined : s.objetos.find((o) => o.id === donaId)?.color,
  )
  const equipadas = useHerramienta((s) => s.equipadas)

  // Entrar al editor con montura activa: bajarse (persistiendo la pose actual).
  useEffect(() => {
    if (editMode && (useMontura.getState().instanciaId != null || useMontura.getState().prestado)) {
      useMontura.getState().solicitarDesmontar()
    }
    // Con un juego de parque en uso: soltar en seco y volver al punto de partida.
    if (editMode && useParque.getState().instanciaId != null) {
      const { playerLevel, explotado } = useHouse.getState()
      const libre = puntoLibreCerca(parqueFrame.startX, parqueFrame.startZ, playerLevel, RADIO)
      useParque.getState().salirForzado()
      const g = ref.current
      if (g) {
        g.rotation.order = 'XYZ'
        g.rotation.x = 0
        g.position.set(libre.x, nivelBaseY(playerLevel, !explotado), libre.z)
        playerPos.copy(g.position)
        useHouse.getState().target.set(libre.x, 0, libre.z)
      }
    }
    // Sentado en la dona de la alberca: bajarse (la dona se queda donde estaba).
    if (editMode && useFlotador.getState().instanciaId != null) useFlotador.getState().salirForzado()
    // Con una acción de cuarto en uso: soltar y volver al punto de partida.
    if (editMode && useAccionCuarto.getState().instanciaId != null) {
      const { playerLevel, explotado } = useHouse.getState()
      const libre = puntoLibreCerca(accionCuartoFrame.startX, accionCuartoFrame.startZ, playerLevel, RADIO)
      useAccionCuarto.getState().salirForzado()
      const g = ref.current
      if (g) {
        g.rotation.order = 'XYZ'
        g.rotation.x = 0
        g.position.set(libre.x, nivelBaseY(playerLevel, !explotado), libre.z)
        playerPos.copy(g.position)
        useHouse.getState().target.set(libre.x, 0, libre.z)
      }
    }
  }, [editMode])

  // Posición inicial sin prop `position`: evita que re-renders reseteen el avatar mid-transición.
  useLayoutEffect(() => {
    ref.current?.position.copy(playerPos)
  }, [])

  useFrame((_st3f, delta) => {
    if (!ref.current) return
    const cur = ref.current.position
    // Marcha: el desplazamiento producido por el frame anterior alimenta el balanceo
    // del avatar (brazos/piernas/ropa). Los teleports no cuentan como pasos.
    const paso = Math.hypot(cur.x - _prevMarcha.x, cur.z - _prevMarcha.z)
    _prevMarcha.set(cur.x, 0, cur.z)
    const d = paso > 0.5 ? 0 : paso
    marchaAvatar.velocidad = THREE.MathUtils.lerp(marchaAvatar.velocidad, Math.min(1, d / SPEED), 0.2)
    marchaAvatar.fase += d * 9
    // Rumbo del avatar (frente = +Z) para apuntar en los minijuegos de cancha. Se toma
    // aquí, antes de los return tempranos, para reflejar siempre la orientación (1 frame de lag).
    ref.current.getWorldDirection(playerForward)
    // Si hay una animación de subir/bajar en curso, el personaje la sigue (ignora input).
    const trans = useHouse.getState().transicion
    if (trans) {
      animarTransicion(trans, cur, ref.current)
      return
    }
    // Arrastre en el editor (pestaña Personajes): el avatar sigue al cursor.
    if (dragChar.id === PERSONAJE_AVATAR) {
      const { playerLevel: lvl, explotado: expl } = useHouse.getState()
      cur.set(dragChar.x, nivelBaseY(lvl, !expl), dragChar.z)
      playerPos.copy(cur)
      useHouse.getState().target.set(dragChar.x, 0, dragChar.z)
      return
    }
    // Conversación cara a cara: quieto, girando suave hacia el asistente.
    if (dialogoFrame.activo) {
      marchaAvatar.velocidad = THREE.MathUtils.lerp(marchaAvatar.velocidad, 0, 0.3)
      const obj = Math.atan2(dialogoFrame.npcX - cur.x, dialogoFrame.npcZ - cur.z)
      ref.current.rotation.y +=
        Math.atan2(Math.sin(obj - ref.current.rotation.y), Math.cos(obj - ref.current.rotation.y)) * 0.15
      playerPos.copy(cur)
      return
    }
    // Bateando en el béisbol: el avatar se queda en la caja de bateo mirando al
    // montículo. Pedir movimiento suelta el ancla (si no, no podrías salir de la cancha).
    if (juegoFrame.anclaActiva) {
      if (moveInput.kf || moveInput.ks || moveInput.f || moveInput.s) {
        juegoFrame.anclaActiva = false
        _torsoBateo = 0
      } else {
        marchaAvatar.velocidad = THREE.MathUtils.lerp(marchaAvatar.velocidad, 0, 0.3)
        cur.x = THREE.MathUtils.lerp(cur.x, juegoFrame.anclaX, 0.18)
        cur.z = THREE.MathUtils.lerp(cur.z, juegoFrame.anclaZ, 0.18)
        // El rumbo al montículo se sigue suave, pero el giro del swing va DIRECTO
        // encima (con lerp se amortiguaría y el batazo no llegaría a girar).
        const torso = poseBateo()?.torso ?? 0
        const base = ref.current.rotation.y - _torsoBateo
        const obj = juegoFrame.anclaHeading
        ref.current.rotation.y =
          base + Math.atan2(Math.sin(obj - base), Math.cos(obj - base)) * 0.18 + torso
        _torsoBateo = torso
        playerPos.copy(cur)
        return
      }
    }
    // Usando un juego de parque: animación guionizada (ignora el input).
    if (parqueFrame.usando) {
      usarJuego(cur, ref.current, delta)
      return
    }
    // Usando un objeto del cuarto (caminadora, tapete…): acción guionizada.
    if (accionCuartoFrame.usando) {
      usarAccion(cur, ref.current, delta)
      return
    }
    // Montado en el tren/carrito: recorre la vía solo (ignora el input).
    if (trenFrame.montado) {
      marchaAvatar.velocidad = 0 // va de pie sobre el vagón, sin marcha
      conducirTren(cur, ref.current, delta)
      return
    }
    const { explotado } = useHouse.getState()
    let playerLevel = useHouse.getState().playerLevel
    // Sótanos (nivel -1): suelo CONTINUO con la planta baja. Al pisar la sub-celda de un
    // cuarto excavado el personaje baja al hueco; al salir de él sube de vuelta. Sin
    // escaleras: el desnivel lo da la Y (cae al entrar, sube al salir), no un bloqueo.
    const sotanoSubs = useLayout.getState().ocupadoPorNivel.get(-1)
    const subActual = worldToSubCell(cur.x, cur.z)
    const claveSubActual = subId(subActual.sc, subActual.sr)
    // A pie: montado en vehículo se puentea la alberca (no se cae al hueco). Se baja al -1
    // SOLO sobre la silueta real del pozo; sobre las esquinas rellenas (complemento, que
    // son piso exterior al ras) el personaje sube de vuelta a planta baja.
    if (sotanoSubs && sotanoSubs.size && playerLevel <= 0 && !monturaFrame.montado) {
      const deseado = sobrePozoSotano(cur.x, cur.z) ? -1 : 0
      if (deseado !== playerLevel) {
        useHouse.setState({ playerLevel: deseado })
        playerLevel = deseado
      }
    }
    // Colisiones de pared: la planta baja y el sótano comparten las paredes de nivel 0
    // (los muros del pozo no bloquean: se entra y sale caminando).
    const colliders = useLayout.getState().wallCollidersByLevel[Math.max(0, playerLevel)] ?? []
    const objCols = objColliders(playerLevel)
    // Piso caminable: en pisos altos, cuartos del nivel + terraza de abajo. En planta baja
    // y sótano no se restringe (el suelo continuo lo permite todo; la Y marca el desnivel).
    const piso =
      playerLevel > 0 ? useLayout.getState().pisoPorNivel.get(playerLevel) : undefined
    // Altura destino: piso del nivel. En una alberca el personaje FLOTA en la lámina de
    // agua (con un leve vaivén); en un búnker (sin agua) pisa el fondo, normal.
    let targetY = nivelBaseY(playerLevel, !explotado)
    let flotandoEnAgua = false
    if (playerLevel === -1 && useLayout.getState().subCeldasAgua.has(claveSubActual)) {
      flotandoEnAgua = true
      const bob = Math.sin(performance.now() * 0.0022) * 0.06
      // Sentado en la dona el avatar va SOBRE la lámina (el aro lo sostiene);
      // nadando, con el cuerpo sumergido.
      const hundido = flotadorFrame.sentado ? 0 : FLOTA_SUMERGIDO
      targetY = nivelBaseY(-1, !explotado) + AGUA_ALTURA_LOCAL - hundido + bob
    }
    // Sentado en la dona: se queda quieto en ella meciéndose (la dona se dibuja
    // dentro de su grupo) hasta que se mueve; entonces se baja y sigue nadando.
    if (flotadorFrame.sentado) {
      if (!flotandoEnAgua || bajarseDeLaDonaPorMovimiento()) {
        useFlotador.getState().salirForzado()
      } else {
        marchaAvatar.velocidad = THREE.MathUtils.lerp(marchaAvatar.velocidad, 0, 0.3)
        marchaAvatar.nadando = false
        // Se acomoda en el centro del aro con un tirón suave (no un teletransporte).
        cur.set(
          THREE.MathUtils.lerp(cur.x, flotadorFrame.x, 0.25),
          THREE.MathUtils.lerp(cur.y, targetY, 0.2),
          THREE.MathUtils.lerp(cur.z, flotadorFrame.z, 0.25),
        )
        playerPos.copy(cur)
        useHouse.getState().target.set(cur.x, 0, cur.z)
        return
      }
    }
    // Quieto en el agua: se queda en la pose de reposo (solo el vaivén de flotar).
    // Moviéndose: nada (brazada/patada) en vez de caminar — lo lee AvatarModelo/Prendas.
    // En la dona no se nada: va sentado, remando con las manos.
    marchaAvatar.nadando = flotandoEnAgua && !flotadorFrame.sentado && marchaAvatar.velocidad > 0.05
    // Disparo del blaster: marcha 2D hasta la primera pared/objeto (mismo modelo
    // de colisión que el movimiento) y lanzar la ráfaga de bolts viajeros. Con la
    // marcadora equipada el tiro es una bola de pintura hacia la mira.
    if (accionFrame.disparoT && accionFrame.disparoT !== disparoProcesado) {
      disparoProcesado = accionFrame.disparoT
      if (pistolaEnMano(useHerramienta.getState().equipadas) === 'pintura') {
        dispararPinturaLibre(camera, playerLevel)
      } else {
        ref.current.getWorldDirection(_dirRayo) // +Z = frente del avatar
        _ladoRayo.set(1, 0, 0).applyQuaternion(ref.current.quaternion) // lado de la mano derecha
        const ox = cur.x + _dirRayo.x * 0.5 + _ladoRayo.x * 0.42 * av.escala
        const oz = cur.z + _dirRayo.z * 0.5 + _ladoRayo.z * 0.42 * av.escala
        let largo = LARGO_RAYO
        for (let dist = 0; dist < LARGO_RAYO; dist += 0.1) {
          const px = ox + _dirRayo.x * dist
          const pz = oz + _dirRayo.z * dist
          if (chocado(px, pz, colliders) || chocadoObjeto(px, pz, objCols)) {
            largo = dist
            break
          }
        }
        dispararRafaga(ox, cur.y + 0.71 * av.escala, oz, _dirRayo.x, _dirRayo.z, largo, largo < LARGO_RAYO)
      }
    }
    // Portales: colocar el pendiente y teleportar al cruzar uno (solo planta baja).
    if (accionFrame.portalPendiente) {
      accionFrame.portalPendiente = false
      if (playerLevel === 0) {
        ref.current.getWorldDirection(_dirRayo)
        let dist = 2.2
        for (let d2 = 0.6; d2 < 2.2; d2 += 0.1) {
          if (
            chocado(cur.x + _dirRayo.x * d2, cur.z + _dirRayo.z * d2, colliders, 0.35) ||
            chocadoObjeto(cur.x + _dirRayo.x * d2, cur.z + _dirRayo.z * d2, objCols, 0.35)
          ) {
            dist = d2 - 0.5
            break
          }
        }
        if (dist > 0.5) usePortales.getState().colocar(cur.x + _dirRayo.x * dist, cur.z + _dirRayo.z * dist)
      }
    }
    // Grafiti: buscar el muro de enfrente (malla real) y entrar al modo pintar.
    if (accionFrame.grafitiPendiente) {
      accionFrame.grafitiPendiente = false
      ref.current.getWorldDirection(_dirRayo)
      _rayoGrafiti.set(_origenGrafiti.set(cur.x, cur.y + 1.3, cur.z), _dirRayo)
      _rayoGrafiti.far = ALCANCE_GRAFITI
      let sel: ReturnType<typeof buscarMuro> = null
      let normal: THREE.Vector3 | null = null
      for (const h of _rayoGrafiti.intersectObjects(scene.children, true)) {
        const r = buscarMuro(h.object)
        if (!r || !h.face) continue
        sel = r
        normal = h.face.normal.clone().transformDirection(h.object.matrixWorld)
        break
      }
      if (sel?.muro && normal) {
        void useGrafitis.getState().iniciar(sel.muro, normal)
      } else if (sel?.muroLibre != null && normal) {
        void useGrafitis.getState().iniciar({ muroLibreId: sel.muroLibre, seg: sel.muroLibreSeg ?? 0 }, normal)
      } else {
        useGrafitis.getState().avisar('sinMuro')
      }
    }
    const portales = usePortales.getState().portales
    if (portales.length === 2 && playerLevel === 0) {
      const d0 = Math.hypot(cur.x - portales[0].x, cur.z - portales[0].z)
      const d1 = Math.hypot(cur.x - portales[1].x, cur.z - portales[1].z)
      if (portalFrame.inhibido) {
        // Rearmar al alejarse de ambos (evita el ping-pong entre portales).
        if (d0 > 0.9 && d1 > 0.9) portalFrame.inhibido = false
      } else if (d0 < 0.55 || d1 < 0.55) {
        const destino = d0 < 0.55 ? portales[1] : portales[0]
        portalFrame.inhibido = true
        sonar('teletransporte')
        cur.set(destino.x + 0.01, cur.y, destino.z)
        playerPos.copy(cur)
        useHouse.getState().target.set(destino.x + 0.01, 0, destino.z)
      }
    }
    // Montado en un vehículo: conducirlo (turbo y brincos se aplican dentro).
    if (monturaFrame.montado) {
      conducir(cur, ref.current, camera, vista !== 'iso', delta)
      return
    }
    // Salto/cuerda: parábolas sobre la Y de piso; se resta el offset del frame
    // anterior para que el lerp al piso no pelee con el brinco.
    const ahoraF = performance.now()
    const salto = offsetSalto(ahoraF) + offsetCuerda(ahoraF)
    const ny = THREE.MathUtils.lerp(cur.y - saltoAplicado, targetY, 0.2) + salto
    saltoAplicado = salto
    const persp = vista !== 'iso'
    const { f, s, kf, ks } = moveInput
    const hayInput = f !== 0 || s !== 0 || kf !== 0 || ks !== 0
    // Flotando en el agua se avanza más despacio (braceo), como en una alberca real;
    // agachado, a paso corto (y manda sobre el correr).
    const mult = accionFrame.agachado
      ? AGACHADO_MULT
      : (accionFrame.correr ? CORRER_MULT : 1) * (flotandoEnAgua ? 0.6 : 1)
    // SPEED está calibrada por frame a 60 FPS: escalar por el delta real (acotado
    // contra saltos de pestaña inactiva) para que la velocidad sea la misma sin
    // importar el FPS del dispositivo (antes se veía lento en móviles con menos FPS:
    // medido hasta ~150-300ms/frame en Android, por eso el tope va holgado).
    const dtFactor = Math.min(delta, 0.3) * 60
    // Moverse (input directo o click-to-move) corta el baile y la cuerda.
    if (accionFrame.bailando && (hayInput || paso > 0.01)) useHerramienta.getState().setBailando(false)
    if (accionFrame.cuerda && (hayInput || paso > 0.01)) useHerramienta.getState().setCuerda(false)

    if (hayInput) {
      _move.set(0, 0, 0)

      if (!persp) {
        // Iso: teclado + joystick relativos al azimut animado de la cámara.
        // camAnim.az se actualiza cada frame en CameraRig y refleja la vista actual.
        const v = vectorCam(kf, ks, f, s, camAnim.az)
        _move.set(v.x * SPEED * mult * dtFactor, 0, v.z * SPEED * mult * dtFactor)
      } else {
        // 1ª/3ª persona: teclado + joystick relativos a la dirección de la cámara perspectiva.
        camera.getWorldDirection(_fwd)
        _fwd.y = 0
        if (_fwd.lengthSq() < 1e-6) _fwd.set(0, 0, -1)
        _fwd.normalize()
        _right.set(-_fwd.z, 0, _fwd.x)
        _move.addScaledVector(_fwd, f + kf).addScaledVector(_right, s + ks)
        const mag = Math.min(1, _move.length())
        if (mag > 0.001) _move.normalize().multiplyScalar(mag * SPEED * mult * dtFactor)
        else _move.set(0, 0, 0)
      }

      let x = cur.x
      let z = cur.z
      if (
        !chocado(cur.x + _move.x, cur.z, colliders) &&
        !chocadoObjeto(cur.x + _move.x, cur.z, objCols) &&
        !sinPiso(cur.x + _move.x, cur.z, piso)
      )
        x = cur.x + _move.x
      if (
        !chocado(x, cur.z + _move.z, colliders) &&
        !chocadoObjeto(x, cur.z + _move.z, objCols) &&
        !sinPiso(x, cur.z + _move.z, piso)
      )
        z = cur.z + _move.z

      cur.set(x, ny, z)
      playerPos.copy(cur)
      // Mantener el destino en la posición actual (sin re-render) para no "regresar".
      useHouse.getState().target.set(x, 0, z)
      ref.current.lookAt(x + _move.x, ny, z + _move.z)
    } else {
      // Sin input — clic en la casa o menú lateral: deslizar hacia el destino.
      const { target, freeMove } = useHouse.getState()
      const factorDeslizar = Math.min(1, 0.32 * dtFactor)
      const nx = THREE.MathUtils.lerp(cur.x, target.x, factorDeslizar)
      const nz = THREE.MathUtils.lerp(cur.z, target.z, factorDeslizar)

      let x = cur.x
      let z = cur.z
      if (freeMove) {
        // Ignora paredes (entrar desde el menú) pero NO los objetos (son rígidos);
        // respeta el piso en niveles altos.
        if (!chocadoObjeto(nx, z, objCols) && !sinPiso(nx, z, piso)) x = nx
        if (!chocadoObjeto(x, nz, objCols) && !sinPiso(x, nz, piso)) z = nz
      } else {
        if (!chocado(nx, z, colliders) && !chocadoObjeto(nx, z, objCols) && !sinPiso(nx, z, piso)) x = nx
        if (!chocado(x, nz, colliders) && !chocadoObjeto(x, nz, objCols) && !sinPiso(x, nz, piso)) z = nz
      }

      cur.set(x, ny, z)
      playerPos.copy(cur)
      if (Math.hypot(target.x - x, target.z - z) > 0.05) {
        ref.current.lookAt(target.x, ny, target.z)
      }
    }

    // Modo shooter (apuntando o en plena batalla de paintball): el avatar encara
    // SIEMPRE hacia donde mira la cámara, así el cañón apunta a la mira y el
    // movimiento lateral se siente como un strafe. En iso no aplica: no hay mira.
    if (persp && (miraFrame.apuntando || paintballFrame.jugando)) {
      ref.current.rotation.set(0, yawDeCamara(camera), 0)
    }
  })

  // En 1ª persona el avatar no debe verse por la cámara PRINCIPAL (estás dentro de
  // su cabeza) y en el modo grafiti tampoco (taparía el lienzo), pero sí en los
  // reflejos: los espejos re-renderizan la escena con su cámara virtual, así que se
  // oculta solo durante el render de la cámara principal (con visible={false} a
  // secas el espejo tampoco te reflejaría).
  useEffect(() => {
    const g = ref.current
    if ((vista !== 'primera' && vista !== 'grafiti') || !g) return
    const prevBefore = scene.onBeforeRender
    const prevAfter = scene.onAfterRender
    scene.onBeforeRender = (_r, _e, cam) => {
      g.visible = cam !== get3f().camera
    }
    scene.onAfterRender = () => {
      g.visible = true
    }
    return () => {
      scene.onBeforeRender = prevBefore
      scene.onAfterRender = prevAfter
      g.visible = true
    }
  }, [vista, scene, get3f])

  return (
    <group
      ref={ref}
      onClick={
        seleccionable
          ? (e) => {
              e.stopPropagation()
              editarPersonaje(PERSONAJE_AVATAR)
            }
          : undefined
      }
      onPointerDown={
        arrastrable
          ? (e) => {
              e.stopPropagation()
              setPersonajeSel(PERSONAJE_AVATAR)
              dragChar.id = PERSONAJE_AVATAR
              dragChar.x = ref.current?.position.x ?? 0
              dragChar.z = ref.current?.position.z ?? 0
              document.body.style.cursor = 'grabbing'
            }
          : undefined
      }
      onPointerOver={
        seleccionable
          ? (e) => {
              e.stopPropagation()
              document.body.style.cursor = arrastrable ? 'grab' : 'pointer'
            }
          : undefined
      }
      onPointerOut={seleccionable ? () => { document.body.style.cursor = 'default' } : undefined}
    >
      {(montadoId != null || montadoPrestado) && montadoTipo ? (
        <EscalaCarrera>
          <VehiculoMontado
            tipo={montadoTipo}
            color={colorVehiculo ?? vehiculoDe(montadoTipo).defaultColor}
          >
            <FlipMortal escala={av.escala}>
              <AvatarModelo av={av} casco={editor3d} animar caminar />
              <ExtrasHerramientas equipadas={equipadas} escala={av.escala} />
            </FlipMortal>
          </VehiculoMontado>
        </EscalaCarrera>
      ) : donaId != null ? (
        <FlotadorMontado color={colorDona ?? COLOR_FLOTADOR}>
          <FlipMortal escala={av.escala}>
            <AvatarModelo av={av} casco={editor3d} animar caminar />
            <ExtrasHerramientas equipadas={equipadas} escala={av.escala} />
          </FlipMortal>
        </FlotadorMontado>
      ) : trenMontado && trenTipo ? (
        <TrenMontado tipo={trenTipo}>
          <FlipMortal escala={av.escala}>
            <AvatarModelo av={av} casco={editor3d} animar caminar />
            <ExtrasHerramientas equipadas={equipadas} escala={av.escala} />
          </FlipMortal>
        </TrenMontado>
      ) : (
        <NadoTilt escala={av.escala}>
          <FlipMortal escala={av.escala}>
            <AvatarModelo av={av} casco={editor3d} animar caminar />
            <ExtrasHerramientas equipadas={equipadas} escala={av.escala} />
            <AccesorioAccion escala={av.escala} />
            <RaquetaJugador escala={av.escala} />
            <BateJugador escala={av.escala} />
          </FlipMortal>
        </NadoTilt>
      )}
    </group>
  )
}
