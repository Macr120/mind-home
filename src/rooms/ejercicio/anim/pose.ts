import { suave } from '../../../core/house/animacion'

/**
 * DSL de poses del visor de ejercicios. Sin three ni React: solo datos y la
 * aritmética que los convierte a los canales numéricos que `RigEjercicio`
 * aplica cada frame.
 *
 * Todo se escribe en GRADOS (más cómodo para autorar a mano) y en metros para
 * `salto`/`hombrosY`. Convención de signos (la resuelve el rig):
 * - `tronco`/`cuello` `[x, y, z]`: x = flexión al frente, y = giro hacia la
 *   izquierda real del avatar (+X), z = inclinación lateral hacia su derecha.
 * - `hombro`/`cadera` `[flex, abd, rot]`: flex = extremidad al frente/arriba,
 *   abd = separarla del cuerpo (negativo = cruzar), rot = rotación externa.
 * - `codo`/`rodilla`: flexión (0 = extendido).
 * - `raiz`: orientación del cuerpo entero. `'supino'` boca arriba, `'prono'`
 *   boca abajo, `'ladoD'` tumbado sobre el costado derecho.
 * Lo que se da para `hombro`/`codo`/`cadera`/`rodilla` aplica a los DOS lados;
 * `…I`/`…D` (izquierda/derecha REALES del avatar, que mira a +Z) lo sustituyen.
 */

type Ang = number | [number, number, number]
type Orientacion = 'pie' | 'supino' | 'prono' | 'ladoI' | 'ladoD' | [number, number]
export type Lado = 'I' | 'D'

export interface Pose {
  raiz?: Orientacion
  /** Giro del cuerpo entero sobre la vertical (ponerlo de perfil). */
  giro?: number
  /** Altura extra sobre el apoyo, en metros (saltos). */
  salto?: number
  /** Elevación escapular en metros (encogimientos). */
  hombrosY?: number
  tronco?: Ang
  cuello?: Ang
  hombro?: Ang
  hombroI?: Ang
  hombroD?: Ang
  codo?: number
  codoI?: number
  codoD?: number
  cadera?: Ang
  caderaI?: Ang
  caderaD?: Ang
  rodilla?: number
  rodillaI?: number
  rodillaD?: number
}

/** Un fotograma clave: `t` en 0..1 dentro del ciclo (el último vuelve al primero). */
export interface Keyframe {
  t: number
  pose: Pose
}

export type MarcadorId =
  | 'pies' | 'pieI' | 'pieD'
  | 'rodillas' | 'rodillaI' | 'rodillaD'
  | 'manos' | 'manoI' | 'manoD'
  | 'codos' | 'codoI' | 'codoD'
  | 'gluteos' | 'espalda' | 'pecho' | 'hombros' | 'cabeza'

/**
 * Cómo se apoya el cuerpo: `'suelo'` = el punto más bajo de todos los marcadores
 * toca y=0 (no hace falta autorar alturas); con marcador, ese punto se fija a la
 * altura dada (la espalda sobre el banco, las manos en la barra fija…).
 */
export type Apoyo = 'suelo' | { marcador: MarcadorId; y: number }

export type UtilId =
  | 'barra' | 'mancuernas' | 'banda' | 'balonManos'
  | 'banco' | 'bancoAtras' | 'tapete' | 'barraFija' | 'paralelas' | 'polea' | 'poleaBaja'
  | 'asiento' | 'caja' | 'pared' | 'paredFrente' | 'paredPies' | 'agua' | 'balon' | 'pelota' | 'rodillo' | 'cuerda' | 'bici'
  /** Caña de pescar en la mano derecha (emote «Pescar» de la rueda). */
  | 'cana'

export type Camara = 'frente' | 'tresCuartos' | 'lado'

export interface Patron {
  /** Segundos del ciclo completo. */
  periodo: number
  keyframes: Keyframe[]
  /** La segunda mitad del ciclo es el ESPEJO de la primera (zancadas, escaladores, bici…). */
  alterno?: boolean
  apoyo?: Apoyo
  utiles?: UtilId[]
  camara?: Camara
  /** Amplitud de la respiración sutil (1 = normal, 0 = ninguna). */
  respiracion?: number
}

/** Ajustes con los que un ejercicio reutiliza un patrón. */
export interface Variante {
  utiles?: UtilId[]
  periodo?: number
  apoyo?: Apoyo
  camara?: Camara
  /** Grados que se SUMAN a todos los fotogramas (la raíz, si viene, sustituye). */
  mezcla?: Pose
  alterno?: boolean
  /** Ejercicio unilateral: los patrones se autoran con el lado D; `'I'` los espeja enteros. */
  lado?: Lado
  /** Solo se mueve el lado D: el I se queda como en el primer fotograma (con `alterno`, se turnan). */
  unilateral?: boolean
  respiracion?: number
}

export const ALTO_BANCO = 0.45
export const ALTO_ASIENTO = 0.45
export const ALTO_BARRA_FIJA = 2.3
export const ALTO_PARALELAS = 1.15

type ExtraPatron = Omit<Patron, 'periodo' | 'keyframes'>

export function ciclo(periodo: number, keyframes: Keyframe[], extra: ExtraPatron = {}): Patron {
  return { periodo, keyframes, ...extra }
}

/**
 * Postura que se mantiene: desde el reposo (misma orientación) entra, la
 * sostiene la mayor parte del ciclo y vuelve. Con `alterno` repite espejada.
 */
export function sostenido(pose: Pose, o: ExtraPatron & { periodo?: number; base?: Pose } = {}): Patron {
  const { periodo, base, ...extra } = o
  const reposo: Pose = base ?? { raiz: pose.raiz, giro: pose.giro }
  return {
    periodo: periodo ?? (extra.alterno ? 10 : 6),
    keyframes: [
      { t: 0, pose: reposo },
      { t: 0.22, pose },
      { t: 0.78, pose },
    ],
    ...extra,
  }
}

/** Postura fija (solo respira). */
export function estatico(pose: Pose, o: ExtraPatron & { periodo?: number } = {}): Patron {
  const { periodo, ...extra } = o
  return { periodo: periodo ?? 4, keyframes: [{ t: 0, pose }], ...extra }
}

// ───────────────────────── forma numérica ─────────────────────────

/** Índice de cada canal en `PoseNum`. Ángulos en radianes; `salto`/`hombrosY` en metros. */
export const J = {
  raizX: 0, raizZ: 1, giro: 2, salto: 3, hombrosY: 4,
  troncoX: 5, troncoY: 6, troncoZ: 7,
  cuelloX: 8, cuelloY: 9, cuelloZ: 10,
  hombroIF: 11, hombroIA: 12, hombroIR: 13,
  hombroDF: 14, hombroDA: 15, hombroDR: 16,
  codoI: 17, codoD: 18,
  caderaIF: 19, caderaIA: 20, caderaIR: 21,
  caderaDF: 22, caderaDA: 23, caderaDR: 24,
  rodillaI: 25, rodillaD: 26,
} as const
export const N_CANALES = 27
export type PoseNum = Float32Array

const RAD = Math.PI / 180
const ORIENTACION: Record<Exclude<Orientacion, [number, number]>, [number, number]> = {
  pie: [0, 0],
  supino: [-90, 0],
  prono: [90, 0],
  ladoI: [0, -90],
  ladoD: [0, 90],
}

function tres(a: Ang | undefined): [number, number, number] | null {
  if (a === undefined) return null
  return typeof a === 'number' ? [a, 0, 0] : a
}

function pon3(out: PoseNum, i: number, v: [number, number, number] | null): void {
  if (!v) return
  out[i] = v[0] * RAD
  out[i + 1] = v[1] * RAD
  out[i + 2] = v[2] * RAD
}

/** Un lado de hombro/cadera: lo común, sustituido por el override del lado (número = solo flex). */
function lado3(base: Ang | undefined, propio: Ang | undefined): [number, number, number] | null {
  const b = tres(base)
  if (propio === undefined) return b
  if (typeof propio === 'number') return [propio, b?.[1] ?? 0, b?.[2] ?? 0]
  return propio
}

/** Convierte una `Pose` a canales numéricos (simetría y valores por defecto resueltos). */
function resolverPose(p: Pose, out: PoseNum = new Float32Array(N_CANALES)): PoseNum {
  out.fill(0)
  const [rx, rz] =
    p.raiz === undefined ? ORIENTACION.pie : typeof p.raiz === 'string' ? ORIENTACION[p.raiz] : p.raiz
  out[J.raizX] = rx * RAD
  out[J.raizZ] = rz * RAD
  out[J.giro] = (p.giro ?? 0) * RAD
  out[J.salto] = p.salto ?? 0
  out[J.hombrosY] = p.hombrosY ?? 0
  pon3(out, J.troncoX, tres(p.tronco))
  pon3(out, J.cuelloX, tres(p.cuello))
  pon3(out, J.hombroIF, lado3(p.hombro, p.hombroI))
  pon3(out, J.hombroDF, lado3(p.hombro, p.hombroD))
  out[J.codoI] = (p.codoI ?? p.codo ?? 0) * RAD
  out[J.codoD] = (p.codoD ?? p.codo ?? 0) * RAD
  pon3(out, J.caderaIF, lado3(p.cadera, p.caderaI))
  pon3(out, J.caderaDF, lado3(p.cadera, p.caderaD))
  out[J.rodillaI] = (p.rodillaI ?? p.rodilla ?? 0) * RAD
  out[J.rodillaD] = (p.rodillaD ?? p.rodilla ?? 0) * RAD
  return out
}

const PARES: [number, number][] = [
  [J.hombroIF, J.hombroDF], [J.hombroIA, J.hombroDA], [J.hombroIR, J.hombroDR],
  [J.codoI, J.codoD],
  [J.caderaIF, J.caderaDF], [J.caderaIA, J.caderaDA], [J.caderaIR, J.caderaDR],
  [J.rodillaI, J.rodillaD],
]
const NEGADOS = [J.troncoY, J.troncoZ, J.cuelloY, J.cuelloZ, J.giro, J.raizZ]
const LADO_I = [J.hombroIF, J.hombroIA, J.hombroIR, J.codoI, J.caderaIF, J.caderaIA, J.caderaIR, J.rodillaI]

/** Intercambia izquierda↔derecha (vale con `out === p`). */
function espejo(p: PoseNum, out: PoseNum): PoseNum {
  if (out !== p) out.set(p)
  for (const [a, b] of PARES) {
    const t = out[a]
    out[a] = out[b]
    out[b] = t
  }
  for (const i of NEGADOS) out[i] = -out[i]
  return out
}

/** Suma una `Pose` de offsets a `out`; la raíz, si la mezcla la trae, sustituye. */
function mezclar(out: PoseNum, mezcla: Pose): void {
  const m = resolverPose(mezcla)
  for (let i = 0; i < N_CANALES; i++) out[i] += m[i]
  if (mezcla.raiz !== undefined) {
    out[J.raizX] = m[J.raizX]
    out[J.raizZ] = m[J.raizZ]
  } else {
    out[J.raizX] -= m[J.raizX]
    out[J.raizZ] -= m[J.raizZ]
  }
}

export interface PatronResuelto {
  periodo: number
  ts: Float32Array
  poses: PoseNum[]
  alterno: boolean
  apoyo: Apoyo
  utiles: UtilId[]
  camara: Camara
  respiracion: number
}

/** Fase más representativa: la postura sostenida, el fondo del ciclo o, si alterna, un lado. */
export function faseRepresentativa(p: PatronResuelto): number {
  if (p.poses.length === 1) return 0
  return p.alterno ? 0.25 : 0.5
}

export function resolverPatron(p: Patron, v: Variante = {}): PatronResuelto {
  const poses = p.keyframes.map((k) => resolverPose(k.pose))
  if (v.mezcla) for (const q of poses) mezclar(q, v.mezcla)
  if (v.unilateral) for (const q of poses) for (const i of LADO_I) q[i] = poses[0][i]
  if (v.lado === 'I') for (const q of poses) espejo(q, q)
  return {
    periodo: v.periodo ?? p.periodo,
    ts: Float32Array.from(p.keyframes, (k) => k.t),
    poses,
    alterno: v.alterno ?? p.alterno ?? false,
    apoyo: v.apoyo ?? p.apoyo ?? 'suelo',
    utiles: v.utiles ?? p.utiles ?? [],
    camara: v.camara ?? p.camara ?? 'tresCuartos',
    respiracion: v.respiracion ?? p.respiracion ?? 1,
  }
}

/**
 * Pose en la fase `f` (0..1) del ciclo: tramo entre los dos fotogramas que la
 * rodean, interpolado con smoothstep canal a canal (la misma matemática que las
 * poses de `Animado.tsx`). Con `alterno`, la segunda mitad va espejada.
 */
export function poseEnFase(p: PatronResuelto, f: number, out: PoseNum): void {
  let g = f % 1
  if (g < 0) g += 1
  let reflejar = false
  if (p.alterno) {
    g *= 2
    if (g >= 1) {
      g -= 1
      reflejar = true
    }
  }
  const n = p.poses.length
  if (n === 1) {
    out.set(p.poses[0])
  } else {
    let i = -1
    for (let k = 0; k < n; k++) if (p.ts[k] <= g) i = k
    let a: number
    let b: number
    if (i < 0) {
      i = n - 1
      a = p.ts[i] - 1
      b = p.ts[0]
    } else {
      a = p.ts[i]
      b = i + 1 < n ? p.ts[i + 1] : 1 + p.ts[0]
    }
    const q = b > a ? suave((g - a) / (b - a)) : 0
    const A = p.poses[i]
    const B = p.poses[(i + 1) % n]
    for (let c = 0; c < N_CANALES; c++) out[c] = A[c] + (B[c] - A[c]) * q
  }
  if (reflejar) espejo(out, out)
}
