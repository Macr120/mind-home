import { useMemo, useRef, type ReactElement } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { BoxGeometry, ConeGeometry, SphereGeometry } from 'three'
import type { Group, Mesh, MeshBasicMaterial, Object3D } from 'three'
import { useDiseño } from '../state/disenoStore'
import { useLayout } from '../state/layoutStore'
import { useCiclo } from '../state/cicloStore'
import { mezclar } from './temas'
import { getFondo, animacionesDeFondo, type FamiliaAnimId } from './fondos'
import { SIZE } from './walls'

/** Área del cielo donde vuelan / caen las microanimaciones. */
interface CieloExtent {
  x: number
  zMin: number
  zMax: number
  yMin: number
  yMax: number
  /** Cuánto se ha ensanchado respecto a la casa; reparte más elementos si crece. */
  factor: number
}

/** Reparto uniforme y estable por `seed` (fract(sin)); `sal` cambia el eje. */
function hash01(seed: number, sal: number): number {
  const v = Math.sin(seed * 127.1 + sal * 311.7) * 43758.5453
  return v - Math.floor(v)
}

function useCieloExtent(): CieloExtent {
  const gridCols = useLayout((s) => s.gridCols)
  const gridRows = useLayout((s) => s.gridRows)
  // Lo que la cámara ve, en unidades de mundo. El cielo se medía SOLO por la
  // casa, así que en una pantalla ancha —y sobre todo en el fondo de pantalla,
  // que ocupa el monitor entero— los pájaros y las hojas se quedaban en un
  // cuadrado alrededor del mapa y las esquinas de la pantalla salían vacías.
  const ancho = useThree((s) => s.viewport.width)
  const alto = useThree((s) => s.viewport.height)
  return useMemo(() => {
    const casa = Math.max(gridCols, gridRows) * SIZE + 14
    // La cámara es isométrica: el rectángulo de la pantalla llega girado 45°, así
    // que lo que hay que cubrir para no dejar huecos es su diagonal.
    const vista = (Math.abs(ancho) + Math.abs(alto)) * 0.72
    const span = Math.max(casa, vista)
    return {
      // A lo ANCHO se estira hasta cubrir la pantalla…
      x: span,
      // …pero la profundidad y la altura se quedan medidas por la casa. Son la
      // banda de cielo que la cámara encuadra: estirarlas también mandaba a los
      // pájaros y las hojas fuera de cuadro por arriba, y el cielo acababa más
      // vacío que antes en vez de más lleno.
      zMin: -casa * 1.1,
      zMax: -casa * 0.15,
      yMin: 7,
      yMax: 24 + casa * 0.08,
      factor: span / casa,
    }
  }, [gridCols, gridRows, ancho, alto])
}

/**
 * Estado de un elemento del cielo. Cada familia usa los campos libres (`a`, `b`) a su
 * manera; se mutan en el `useFrame` de la familia (nunca se recrean por fotograma).
 */
interface EstadoActor {
  /** Semilla fija del elemento: decide su aspecto (color, tamaño) y no cambia nunca. */
  seed: number
  /** Semilla de posición: cambia en cada reaparición para no repetir el mismo punto. */
  sem: number
  x: number
  y: number
  z: number
  fase: number
  /** 0→1 al aparecer: evita que los elementos salgan de golpe (fundido por escala). */
  vida: number
  /** Segundos que quedan invisible antes de volver a entrar (solo algunas familias). */
  espera: number
  /** Escala propia, ya con la profundidad y la intensidad aplicadas. */
  escala: number
  vel: number
  a: number
  b: number
}

interface FamiliaDef {
  /** Cantidad al 100 % de intensidad. */
  base: number
  /** Malla del elemento (sin `useFrame`: lo mueve la familia). */
  Actor: (p: { seed: number; tinte: string }) => ReactElement
  /** Coloca el elemento la primera vez. */
  init?: (st: EstadoActor, ext: CieloExtent) => void
  /** Un fotograma del elemento (`dt` ya viene acotado). */
  mover: (obj: Object3D, st: EstadoActor, dt: number, ext: CieloExtent) => void
}

/** Fundido de entrada; devuelve el factor de escala a aplicar. */
function crecer(st: EstadoActor, dt: number): number {
  if (st.vida < 1) st.vida = Math.min(1, st.vida + dt * 1.4)
  // Suavizado (smoothstep) para que la aparición no sea lineal.
  return st.vida * st.vida * (3 - 2 * st.vida)
}

/** Reaparece en un punto nuevo del cielo con fundido desde cero. */
function renacer(st: EstadoActor, ext: CieloExtent, salto = 1) {
  st.sem += salto
  colocar(st, ext)
  st.vida = 0
}

/** Punto del cielo bien repartido + escala con profundidad (los lejanos, más chicos). */
function colocar(st: EstadoActor, ext: CieloExtent) {
  const hx = hash01(st.sem, 1)
  const hy = hash01(st.sem, 2)
  const hz = hash01(st.sem, 3)
  st.x = (hx * 2 - 1) * ext.x
  st.y = ext.yMin + hy * (ext.yMax - ext.yMin)
  st.z = ext.zMin + hz * (ext.zMax - ext.zMin)
  // Profundidad: 1 al frente del volumen, 0.65 al fondo.
  st.b = 0.65 + 0.35 * hz
}

// ─── Geometrías compartidas (una sola por forma, no una por elemento) ─────────

const GEO_COMETA = new ConeGeometry(0.12, 0.75, 6)
const GEO_ESTELA = new ConeGeometry(0.06, 1.1, 6)
const GEO_DRAGON = new BoxGeometry(1.4, 0.35, 0.5)
const GEO_HOCICO = new ConeGeometry(0.2, 0.5, 4)
const GEO_ALA_DRAGON = new BoxGeometry(0.9, 0.05, 0.55)
const GEO_ALA_MURCI = new BoxGeometry(0.3, 0.02, 0.18)
const GEO_ALA_AVE = new BoxGeometry(0.5, 0.03, 0.15)
const GEO_CONO_CORAZON = new ConeGeometry(0.28, 0.35, 4)
const GEO_BARRA_COPO = new BoxGeometry(0.8, 0.03, 0.03)
const GEO_RAYA = new BoxGeometry(1, 0.04, 0.04)
/** Esferas unitarias: cada malla las escala a su tamaño. */
const GEO_ESFERA_6 = new SphereGeometry(1, 6, 6)
const GEO_ESFERA_8 = new SphereGeometry(1, 8, 8)

// ─── Cometa (espacio / nebulosa) ──────────────────────────────────────────────

const COMETA: FamiliaDef = {
  base: 16,
  Actor: ({ seed }) => (
    <group>
      <mesh geometry={GEO_COMETA}>
        <meshBasicMaterial color="#e0f4ff" toneMapped={false} />
      </mesh>
      <mesh geometry={GEO_ESTELA} position={[-0.45, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <meshBasicMaterial
          color={hash01(seed, 9) > 0.5 ? '#7dd3fc' : '#c4b5fd'}
          transparent
          opacity={0.4}
          toneMapped={false}
        />
      </mesh>
    </group>
  ),
  init: (st) => {
    // a/vel: dirección del vuelo (siempre hacia abajo, con inclinación variable).
    st.a = (hash01(st.seed, 4) * 2 - 1) * 5.5
    st.vel = -(2.5 + hash01(st.seed, 5) * 1.5)
    st.escala *= 0.8 + hash01(st.seed, 6) * 0.5
  },
  mover: (obj, st, dt, ext) => {
    st.x += st.a * dt
    st.y += st.vel * dt
    if (Math.abs(st.x) > ext.x || st.y < ext.yMin - 2) renacer(st, ext, 7)
    obj.position.set(st.x, st.y, st.z)
    obj.rotation.z = Math.atan2(st.vel, st.a)
    obj.scale.setScalar(st.escala * st.b * crecer(st, dt))
  },
}

/** Estrella fugaz: el mismo cometa, pero cruza de vez en cuando y se apaga. */
const FUGAZ: FamiliaDef = {
  ...COMETA,
  base: 4,
  init: (st) => {
    st.a = (hash01(st.seed, 4) * 2 - 1) * 5.5
    st.vel = -(2.5 + hash01(st.seed, 5) * 1.5)
    st.escala *= 1.1 + hash01(st.seed, 6) * 0.5
    st.espera = hash01(st.seed, 7) * 9
  },
  mover: (obj, st, dt, ext) => {
    if (st.espera > 0) {
      st.espera -= dt
      obj.scale.setScalar(0)
      return
    }
    st.x += st.a * 2.2 * dt
    st.y += st.vel * 2.2 * dt
    if (Math.abs(st.x) > ext.x || st.y < ext.yMin - 2) {
      renacer(st, ext, 3)
      st.espera = 3 + hash01(st.seed, 8) * 9
    }
    obj.position.set(st.x, st.y, st.z)
    obj.rotation.z = Math.atan2(st.vel, st.a)
    obj.scale.setScalar(st.escala * st.b * crecer(st, dt))
  },
}

// ─── Dragón (medieval) ────────────────────────────────────────────────────────

const DRAGON: FamiliaDef = {
  base: 8,
  Actor: () => (
    <group>
      <mesh geometry={GEO_DRAGON}>
        <meshBasicMaterial color="#6b4423" toneMapped={false} />
      </mesh>
      <mesh geometry={GEO_HOCICO} position={[0.75, 0.1, 0]}>
        <meshBasicMaterial color="#4a2f15" toneMapped={false} />
      </mesh>
      {/* Las dos alas (hijos 2 y 3) las bate el `mover` de la familia. */}
      <mesh geometry={GEO_ALA_DRAGON} position={[0, 0.15, 0.35]}>
        <meshBasicMaterial color="#8b5a2b" transparent opacity={0.85} toneMapped={false} />
      </mesh>
      <mesh geometry={GEO_ALA_DRAGON} position={[0, 0.15, -0.35]} rotation={[0, Math.PI, 0]}>
        <meshBasicMaterial color="#8b5a2b" transparent opacity={0.85} toneMapped={false} />
      </mesh>
    </group>
  ),
  init: (st) => {
    st.a = 10 + hash01(st.seed, 4) * 16 // radio de la órbita
    st.vel = 0.16 + hash01(st.seed, 5) * 0.16
    st.escala *= 0.75 + hash01(st.seed, 6) * 0.4
    st.x *= 0.6
  },
  mover: (obj, st, dt) => {
    st.fase += dt * st.vel
    const t = st.fase
    obj.position.set(
      st.x + Math.cos(t) * st.a,
      st.y + Math.sin(t * 2.2) * 2,
      st.z + Math.sin(t) * st.a * 0.45,
    )
    obj.rotation.y = -t + Math.PI / 2
    const bate = Math.sin(t * 8) * 0.35
    const alaA = obj.children[2]
    const alaB = obj.children[3]
    if (alaA) alaA.rotation.z = bate
    if (alaB) alaB.rotation.z = -bate
    obj.scale.setScalar(st.escala * st.b * crecer(st, dt))
  },
}

// ─── Murciélago (terror) ──────────────────────────────────────────────────────

const MURCIELAGO: FamiliaDef = {
  base: 13,
  Actor: () => (
    <group>
      <mesh geometry={GEO_ESFERA_6} scale={0.1}>
        <meshBasicMaterial color="#1f2937" toneMapped={false} />
      </mesh>
      <mesh geometry={GEO_ALA_MURCI} position={[-0.18, 0, 0]} rotation={[0, 0, 0.6]}>
        <meshBasicMaterial color="#374151" toneMapped={false} />
      </mesh>
      <mesh geometry={GEO_ALA_MURCI} position={[0.18, 0, 0]} rotation={[0, 0, -0.6]}>
        <meshBasicMaterial color="#374151" toneMapped={false} />
      </mesh>
    </group>
  ),
  init: (st) => {
    st.vel = 0.35 + hash01(st.seed, 4) * 0.55
    st.a = 4 + hash01(st.seed, 5) * 9 // amplitud del zigzag
    st.escala *= 0.5 + hash01(st.seed, 6) * 0.25
  },
  mover: (obj, st, dt) => {
    st.fase += dt * st.vel
    const t = st.fase
    obj.position.set(
      st.x + Math.sin(t * 1.3) * st.a,
      st.y + Math.sin(t * 2) * 2.5,
      st.z + Math.cos(t * 0.9) * st.a * 0.6,
    )
    obj.rotation.y = Math.sin(t) * 0.5
    obj.scale.setScalar(st.escala * st.b * (1 + Math.sin(t * 6) * 0.18) * crecer(st, dt))
  },
}

// ─── Partícula brumosa (terror) ───────────────────────────────────────────────

const BRUMA: FamiliaDef = {
  base: 10,
  Actor: ({ seed }) => (
    <group>
      <mesh geometry={GEO_ESFERA_8} scale={0.35 + hash01(seed, 10) * 0.35}>
        <meshBasicMaterial
          color="#94a3b8"
          transparent
          opacity={0.1}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
    </group>
  ),
  init: (st) => {
    st.vel = 0.14 + hash01(st.seed, 4) * 0.14
    st.escala *= 1.4 + hash01(st.seed, 5)
  },
  mover: (obj, st, dt) => {
    st.fase += dt * st.vel
    const t = st.fase
    obj.position.set(
      st.x + Math.sin(t) * 6,
      st.y + Math.cos(t * 0.7) * 1.5,
      st.z + Math.cos(t * 0.5) * 4,
    )
    obj.scale.setScalar(st.escala * st.b * crecer(st, dt))
    const malla = obj.children[0] as Mesh | undefined
    if (malla) {
      ;(malla.material as MeshBasicMaterial).opacity = (0.12 + Math.sin(t * 0.9) * 0.06) * st.vida
    }
  },
}

// ─── Corazón flotante (barbie) ────────────────────────────────────────────────

const CORAZON: FamiliaDef = {
  base: 20,
  Actor: ({ seed }) => {
    const color = hash01(seed, 11) > 0.5 ? '#ff5fa2' : '#c084fc'
    return (
      <group>
        <mesh geometry={GEO_ESFERA_8} position={[-0.15, 0.1, 0]} scale={0.2}>
          <meshBasicMaterial color={color} toneMapped={false} />
        </mesh>
        <mesh geometry={GEO_ESFERA_8} position={[0.15, 0.1, 0]} scale={0.2}>
          <meshBasicMaterial color={color} toneMapped={false} />
        </mesh>
        <mesh geometry={GEO_CONO_CORAZON} position={[0, -0.12, 0]} rotation={[0, 0, Math.PI]}>
          <meshBasicMaterial color={color} toneMapped={false} />
        </mesh>
      </group>
    )
  },
  init: (st) => {
    st.vel = 0.9 + hash01(st.seed, 4) * 0.8 // velocidad de ascenso
    st.a = (hash01(st.seed, 5) * 2 - 1) * 0.4 // deriva lateral
    st.escala *= 0.3 + hash01(st.seed, 6) * 0.18
  },
  mover: (obj, st, dt, ext) => {
    st.fase += dt
    st.y += st.vel * dt
    // Al salir por arriba vuelve abajo con fundido (antes reaparecía de golpe).
    if (st.y > ext.yMax + 2) {
      renacer(st, ext, 5)
      st.y = ext.yMin - 1
      st.fase = 0
    }
    obj.position.set(
      st.x + Math.sin(st.fase * 0.6) * 3 + st.a * st.fase,
      st.y,
      st.z + Math.cos(st.fase * 0.4) * 2,
    )
    obj.rotation.z = Math.sin(st.fase * 2) * 0.2
    obj.scale.setScalar(st.escala * st.b * crecer(st, dt))
  },
}

// ─── Ave (vaquero / cielos despejados) ────────────────────────────────────────

const AVE: FamiliaDef = {
  base: 10,
  Actor: () => (
    <group>
      <mesh geometry={GEO_ALA_AVE} rotation={[0, 0, 0.4]}>
        <meshBasicMaterial color="#5c4033" toneMapped={false} />
      </mesh>
      <mesh geometry={GEO_ALA_AVE} rotation={[0, 0, -0.4]}>
        <meshBasicMaterial color="#5c4033" toneMapped={false} />
      </mesh>
    </group>
  ),
  init: (st) => {
    st.a = hash01(st.seed, 4) > 0.5 ? 1 : -1 // sentido
    st.vel = 3 + hash01(st.seed, 5) * 3
    st.escala *= 0.36 + hash01(st.seed, 6) * 0.22
  },
  mover: (obj, st, dt, ext) => {
    st.fase += dt
    st.x += st.vel * st.a * dt
    if (Math.abs(st.x) > ext.x + 3) {
      const sentido = st.a
      renacer(st, ext, 11)
      st.a = sentido
      st.x = -sentido * (ext.x + 2)
    }
    obj.position.set(st.x, st.y + Math.sin(st.fase * 4) * 0.6, st.z + Math.sin(st.fase * 0.5) * 5)
    obj.rotation.y = st.a > 0 ? 0 : Math.PI
    obj.rotation.z = Math.sin(st.fase * 8) * 0.25 * st.a
    obj.scale.setScalar(st.escala * st.b * crecer(st, dt))
  },
}

// ─── Raya neón (cyberpunk) ────────────────────────────────────────────────────

const RAYA: FamiliaDef = {
  base: 23,
  Actor: ({ seed }) => (
    <group>
      <mesh geometry={GEO_RAYA} scale={[1.8 + hash01(seed, 12) * 1.4, 1, 1]}>
        <meshBasicMaterial
          color={hash01(seed, 13) > 0.5 ? '#d946ef' : '#22d3ee'}
          toneMapped={false}
        />
      </mesh>
    </group>
  ),
  init: (st) => {
    st.a = hash01(st.seed, 4) > 0.5 ? 1 : -1
    st.vel = 6 + hash01(st.seed, 5) * 14
    st.escala *= 0.85 + hash01(st.seed, 6) * 0.4
  },
  mover: (obj, st, dt, ext) => {
    st.x += st.vel * st.a * dt
    if (Math.abs(st.x) > ext.x + 5) {
      const sentido = st.a
      renacer(st, ext, 13)
      st.a = sentido
      st.x = -sentido * (ext.x + 4)
    }
    obj.position.set(st.x, st.y, st.z)
    obj.scale.setScalar(st.escala * st.b * crecer(st, dt))
  },
}

// ─── Copo de nieve (navidad) ──────────────────────────────────────────────────

const COPO: FamiliaDef = {
  base: 46,
  Actor: () => (
    <group>
      {[0, 1, 2].map((i) => (
        <mesh key={i} geometry={GEO_BARRA_COPO} rotation={[0, 0, (i * Math.PI) / 3]}>
          <meshBasicMaterial color="#f8fafc" transparent opacity={0.85} toneMapped={false} />
        </mesh>
      ))}
    </group>
  ),
  init: (st) => {
    st.vel = 1.6 + hash01(st.seed, 4) * 1.6
    st.a = 1.5 + hash01(st.seed, 5) * 2.5 // vaivén lateral
    st.escala *= 0.16 + hash01(st.seed, 6) * 0.14
  },
  mover: (obj, st, dt, ext) => {
    st.fase += dt
    st.y -= st.vel * dt
    if (st.y < ext.yMin - 4) {
      renacer(st, ext, 17)
      st.y = ext.yMax + 2
    }
    obj.position.set(
      st.x + Math.sin(st.fase * 0.9) * st.a,
      st.y,
      st.z + Math.cos(st.fase * 0.6) * 3,
    )
    obj.rotation.y = st.fase * 0.8
    obj.scale.setScalar(st.escala * st.b * crecer(st, dt))
  },
}

// ─── Nube (cielos despejados / atardecer) ─────────────────────────────────────

const NUBE: FamiliaDef = {
  base: 10,
  Actor: ({ seed, tinte }) => (
    <group>
      {[
        [0, 0, 0, 1] as const,
        [1.1, -0.15, 0.2, 0.72] as const,
        [-1.05, -0.2, -0.15, 0.66] as const,
      ].map(([x, y, z, s], i) => (
        <mesh
          key={i}
          geometry={GEO_ESFERA_8}
          position={[x, y, z]}
          scale={[s * (0.9 + hash01(seed, 14 + i) * 0.4), s * 0.55, s]}
        >
          <meshBasicMaterial
            color={tinte}
            transparent
            opacity={0.4}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      ))}
    </group>
  ),
  init: (st) => {
    st.a = hash01(st.seed, 4) > 0.5 ? 1 : -1
    st.vel = 0.35 + hash01(st.seed, 5) * 0.55
    st.escala *= 1.6 + hash01(st.seed, 6) * 2.2
    // Las nubes viven en la franja alta del cielo.
    st.y += 3
  },
  mover: (obj, st, dt, ext) => {
    st.fase += dt
    st.x += st.vel * st.a * dt
    if (Math.abs(st.x) > ext.x + 6) {
      const sentido = st.a
      renacer(st, ext, 19)
      st.a = sentido
      st.x = -sentido * (ext.x + 5)
      st.y += 3
    }
    obj.position.set(st.x, st.y + Math.sin(st.fase * 0.25) * 0.6, st.z)
    obj.scale.setScalar(st.escala * st.b * crecer(st, dt))
  },
}

// ─── Polvo en suspensión (desierto, nebulosa, aurora) ─────────────────────────

const POLVO: FamiliaDef = {
  base: 24,
  Actor: ({ tinte }) => (
    <group>
      <mesh geometry={GEO_ESFERA_6} scale={0.09}>
        <meshBasicMaterial
          color={tinte}
          transparent
          opacity={0.55}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
    </group>
  ),
  init: (st) => {
    st.vel = 0.25 + hash01(st.seed, 4) * 0.5
    st.a = 2 + hash01(st.seed, 5) * 5
    st.escala *= 0.7 + hash01(st.seed, 6) * 1.1
  },
  mover: (obj, st, dt) => {
    st.fase += dt * st.vel
    const t = st.fase
    obj.position.set(
      st.x + Math.sin(t * 0.8) * st.a,
      st.y + Math.sin(t * 0.5) * 1.8,
      st.z + Math.cos(t * 0.6) * st.a * 0.5,
    )
    // Titileo suave, no parpadeo.
    obj.scale.setScalar(st.escala * st.b * (0.8 + Math.sin(t * 2.2) * 0.2) * crecer(st, dt))
  },
}

const FAMILIAS: Record<FamiliaAnimId, FamiliaDef> = {
  cometas: COMETA,
  fugaz: FUGAZ,
  dragones: DRAGON,
  murcielagos: MURCIELAGO,
  bruma: BRUMA,
  corazones: CORAZON,
  aves: AVE,
  rayas: RAYA,
  copos: COPO,
  nubes: NUBE,
  polvo: POLVO,
}

/**
 * Una familia completa: un único `useFrame` mueve todos sus elementos (antes había
 * uno por elemento, hasta 28 en el tema de navidad).
 */
function Familia({
  id,
  def,
  cantidad,
  discrecion,
  tinte,
  ext,
}: {
  id: FamiliaAnimId
  def: FamiliaDef
  cantidad: number
  discrecion: number
  tinte: string
  ext: CieloExtent
}) {
  const grupo = useRef<Group>(null)
  const estados = useMemo(() => {
    return Array.from({ length: cantidad }, (_, i) => {
      const st: EstadoActor = {
        seed: i * 7 + 1,
        sem: i * 7 + 1,
        x: 0,
        y: 0,
        z: 0,
        fase: hash01(i * 7 + 1, 20) * 10,
        vida: 0,
        espera: 0,
        escala: discrecion,
        vel: 1,
        a: 0,
        b: 1,
      }
      colocar(st, ext)
      def.init?.(st, ext)
      return st
    })
  }, [def, cantidad, discrecion, ext])

  useFrame((_, dt) => {
    const g = grupo.current
    if (!g) return
    // Acotado: al volver de una pestaña oculta `dt` es enorme y todo se teletransporta.
    // El tope tiene que ser MAYOR que el fotograma más lento de verdad: con 0,05
    // y el fondo de pantalla a bajo ritmo, el cielo avanzaba a la cuarta parte de
    // su velocidad y parecía muerto.
    const d = Math.min(dt, 0.25)
    for (let i = 0; i < estados.length; i++) {
      const obj = g.children[i]
      if (obj) def.mover(obj, estados[i], d, ext)
    }
  })

  return (
    <group ref={grupo} name={`anim-${id}`}>
      {estados.map((st) => (
        <def.Actor key={st.seed} seed={st.seed} tinte={tinte} />
      ))}
    </group>
  )
}

/**
 * Microanimaciones repartidas por todo el cielo. Se eligen a mano en el editor y, si
 * están en automático, las sugiere el fondo activo. La intensidad regula cuántas hay
 * y cuánto se notan.
 */
export function FondoAnimaciones() {
  const activas = useDiseño((s) => s.animacionesFondo)
  const intensidad = useDiseño((s) => s.animacionesIntensidad)
  const elegidas = useDiseño((s) => s.animacionesIds)
  const fondoId = useDiseño((s) => s.fondoId)
  const fondoImagenActivo = useDiseño((s) => s.fondoImagenActivo)
  // Selector booleano: `minutos` cambia cada pocos segundos y aquí solo importa el turno.
  const deNoche = useCiclo((s) => s.minutos < 6 * 60 || s.minutos >= 19 * 60)
  const ext = useCieloExtent()
  const reducirMovimiento = useMemo(
    () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false,
    [],
  )

  const fondo = getFondo(fondoId)
  const familias: FamiliaAnimId[] = elegidas ?? animacionesDeFondo(fondo, deNoche)
  // Las nubes y el polvo se tiñen con el cielo para no desentonar con el fondo.
  const tinte = mezclar(fondo.gradiente[fondo.id === 'auto' ? 0 : 1], '#ffffff', 0.45)

  if (!activas || reducirMovimiento) return null
  // Con imagen propia de cielo no hay sugerencia posible: solo lo que se elija a mano.
  if (fondoImagenActivo != null && !elegidas) return null

  return (
    <>
      {familias.map((id) => {
        const def = FAMILIAS[id]
        return (
          <Familia
            key={id}
            id={id}
            def={def}
            // Con el cielo ensanchado, la cantidad de siempre lo dejaría desierto:
            // sube en la MISMA proporción que el ancho —que es la única dimensión
            // que ha crecido— para que la densidad quede igual que en una ventana
            // pequeña. Con tope, que esto también corre en un fondo de pantalla.
            cantidad={Math.max(1, Math.round(def.base * intensidad * Math.min(3, ext.factor)))}
            // Al bajar la intensidad los elementos también se hacen más discretos
            // (0.6 = la densidad y el tamaño de siempre).
            discrecion={0.55 + 0.75 * intensidad}
            tinte={tinte}
            ext={ext}
          />
        )
      })}
    </>
  )
}
