import { Suspense, useLayoutEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { ModeloPiezas, ModeloGLB } from './modeloPersonalizado'
import { useHouse, playerPos, type Transicion } from '../state/houseStore'
import { useDiseño, esObjetoMapa } from '../state/disenoStore'
import { useLayout, roomWorldPos } from '../state/layoutStore'
import { useCam, camAnim } from '../state/cameraStore'
import { nivelBaseY, worldToSubCell, subId, cellToWorld, doorFor, HALF, LADO_DIR, type AABB, type SideKey } from './walls'
import { footprintDeTipo } from './catalogo'
import { moveInput, vectorCam } from './movement'

const RADIO = 0.4   // radio del personaje para colisiones
const SPEED = 0.022 // velocidad base — precisa para navegar cuartos

// Temporales reutilizables (un solo Character en escena).
const _fwd = new THREE.Vector3()
const _right = new THREE.Vector3()
const _move = new THREE.Vector3()

/** ¿La posición (x,z) cae dentro de alguna pared (inflada por el radio)? */
function chocado(x: number, z: number, colliders: AABB[]) {
  for (const c of colliders) {
    if (
      x > c.minX - RADIO &&
      x < c.maxX + RADIO &&
      z > c.minZ - RADIO &&
      z < c.maxZ + RADIO
    ) {
      return true
    }
  }
  return false
}

/** Collider de objeto: rectángulo (medias extensiones hx,hz) rotado (cos/sin) en el mundo. */
interface ObjCol {
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
function objColliders(playerLevel: number): ObjCol[] {
  _objCols.length = 0
  const objetos = useDiseño.getState().objetos
  const layout = useLayout.getState()
  const niveles = layout.niveles
  const puertas = layout.puertasPorNivel.get(playerLevel) ?? []
  for (const o of objetos) {
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
function chocadoObjeto(x: number, z: number, cols: ObjCol[]) {
  for (const c of cols) {
    const dx = x - c.cx
    const dz = z - c.cz
    // Lleva el punto al marco local del objeto (rotación inversa).
    const lx = dx * c.cos + dz * c.sin
    const lz = -dx * c.sin + dz * c.cos
    if (lx > -(c.hx + RADIO) && lx < c.hx + RADIO && lz > -(c.hz + RADIO) && lz < c.hz + RADIO) {
      return true
    }
  }
  return false
}

/**
 * En niveles altos no hay piso base: la celda de (x,z) debe pertenecer a un cuarto de
 * ese nivel. En planta baja (`piso` indefinido) hay suelo en todos lados.
 */
function sinPiso(x: number, z: number, piso: Set<string> | undefined) {
  if (!piso) return false
  const { sc, sr } = worldToSubCell(x, z)
  return !piso.has(subId(sc, sr))
}

const DUR_TRANS = 1100 // ms que dura subir/bajar por un acceso
/** Paso desde el pie exterior del acceso hacia el interior del cuarto. */
const PASO_ACCESO = 1.35

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
  const piso = level > 0 ? useLayout.getState().pisoPorNivel.get(level) : undefined
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
  const conTecho = useHouse.getState().conTecho
  const elapsed = performance.now() - t.inicio
  const p = Math.min(1, elapsed / DUR_TRANS)
  const { cx, cz, dir, colX, colZ } = posAcceso(t.acceso)
  const yDesde = nivelBaseY(t.desde, conTecho)
  const yHacia = nivelBaseY(t.hacia, conTecho)
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

/**
 * Avatar cúbico estilo Roblox.
 * - Movimiento libre (teclado/pad): velocidad relativa a la cámara, con colisiones
 *   (las puertas dejan pasar de un cuarto a otro).
 * - Sin input: se desliza hacia `target` (clic en la casa o menú lateral).
 */
export function Character() {
  const ref = useRef<THREE.Group>(null)
  useHouse((s) => s.navTick)
  const av = useDiseño((s) => s.avatar)
  const camera = useThree((s) => s.camera)
  const vista = useCam((s) => s.vista)

  // Posición inicial sin prop `position`: evita que re-renders reseteen el avatar mid-transición.
  useLayoutEffect(() => {
    ref.current?.position.copy(playerPos)
  }, [])

  useFrame(() => {
    if (!ref.current) return
    const cur = ref.current.position
    // Si hay una animación de subir/bajar en curso, el personaje la sigue (ignora input).
    const trans = useHouse.getState().transicion
    if (trans) {
      animarTransicion(trans, cur, ref.current)
      return
    }
    const { playerLevel, conTecho } = useHouse.getState()
    const colliders = useLayout.getState().wallCollidersByLevel[playerLevel] ?? []
    const objCols = objColliders(playerLevel)
    // En niveles altos se camina por los cuartos de ese nivel Y por el techo (terraza)
    // del nivel inferior; en planta baja hay suelo en todos lados.
    const piso =
      playerLevel > 0 ? useLayout.getState().pisoPorNivel.get(playerLevel) : undefined
    const targetY = nivelBaseY(playerLevel, conTecho)
    const persp = vista !== 'iso'
    const { f, s, kf, ks } = moveInput
    const hayInput = f !== 0 || s !== 0 || kf !== 0 || ks !== 0

    if (hayInput) {
      _move.set(0, 0, 0)

      if (!persp) {
        // Iso: teclado + joystick relativos al azimut animado de la cámara.
        // camAnim.az se actualiza cada frame en CameraRig y refleja la vista actual.
        const v = vectorCam(kf, ks, f, s, camAnim.az)
        _move.set(v.x * SPEED, 0, v.z * SPEED)
      } else {
        // 1ª/3ª persona: teclado + joystick relativos a la dirección de la cámara perspectiva.
        camera.getWorldDirection(_fwd)
        _fwd.y = 0
        if (_fwd.lengthSq() < 1e-6) _fwd.set(0, 0, -1)
        _fwd.normalize()
        _right.set(-_fwd.z, 0, _fwd.x)
        _move.addScaledVector(_fwd, f + kf).addScaledVector(_right, s + ks)
        const mag = Math.min(1, _move.length())
        if (mag > 0.001) _move.normalize().multiplyScalar(mag * SPEED)
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

      const ny = THREE.MathUtils.lerp(cur.y, targetY, 0.2)
      cur.set(x, ny, z)
      playerPos.copy(cur)
      // Mantener el destino en la posición actual (sin re-render) para no "regresar".
      useHouse.getState().target.set(x, 0, z)
      ref.current.lookAt(x + _move.x, ny, z + _move.z)
    } else {
      // Sin input — clic en la casa o menú lateral: deslizar hacia el destino.
      const { target, freeMove } = useHouse.getState()
      const nx = THREE.MathUtils.lerp(cur.x, target.x, 0.32)
      const nz = THREE.MathUtils.lerp(cur.z, target.z, 0.32)

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

      const ny = THREE.MathUtils.lerp(cur.y, targetY, 0.2)
      cur.set(x, ny, z)
      playerPos.copy(cur)
      if (Math.hypot(target.x - x, target.z - z) > 0.05) {
        ref.current.lookAt(target.x, ny, target.z)
      }
    }
  })

  return (
    <group ref={ref} visible={vista !== 'primera'}>
      {av.modeloGlb ? (
        <Suspense fallback={null}>
          <ModeloGLB blob={av.modeloGlb} />
        </Suspense>
      ) : av.modelo3d && av.modelo3d.length > 0 ? (
        <ModeloPiezas piezas={av.modelo3d} />
      ) : (
        <>
          {/* piernas */}
          <mesh position={[-0.14, 0.3, 0]}>
            <boxGeometry args={[0.24, 0.6, 0.26]} />
            <meshStandardMaterial color={av.piernas} />
          </mesh>
          <mesh position={[0.14, 0.3, 0]}>
            <boxGeometry args={[0.24, 0.6, 0.26]} />
            <meshStandardMaterial color={av.piernas} />
          </mesh>
          {/* torso */}
          <mesh position={[0, 0.92, 0]}>
            <boxGeometry args={[0.6, 0.62, 0.3]} />
            <meshStandardMaterial color={av.torso} />
          </mesh>
          {/* brazos */}
          <mesh position={[-0.42, 0.92, 0]}>
            <boxGeometry args={[0.2, 0.6, 0.26]} />
            <meshStandardMaterial color={av.torso} />
          </mesh>
          <mesh position={[0.42, 0.92, 0]}>
            <boxGeometry args={[0.2, 0.6, 0.26]} />
            <meshStandardMaterial color={av.torso} />
          </mesh>
          {/* cabeza */}
          <mesh position={[0, 1.5, 0]}>
            <boxGeometry args={[0.44, 0.44, 0.44]} />
            <meshStandardMaterial color={av.cabeza} />
          </mesh>
        </>
      )}
    </group>
  )
}
