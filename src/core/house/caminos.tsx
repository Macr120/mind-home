import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { useThree } from '@react-three/fiber'
import { caminosRepo } from '../data/repository'
import { useCaminos, ALTURA_NIVEL } from '../state/caminosStore'
import { usePistaLibreEditor } from '../state/pistaLibreStore'
import { useLayout } from '../state/layoutStore'
import { useHouse } from '../state/houseStore'
import { celdaEnteraBajoCursor } from './arrastreCelda'
import { cellToWorld, HALF, SIZE } from './walls'
import { esquinaDe, puntoArco, alturaArco, H, type ArcoEsquina } from './caminosCurvas'
import type { CaminoCelda } from '../data/db'

/** Base de los caminos: apenas sobre el tope del piso exterior (~0.19; los objetos de mapa van a 0.2). */
const Y = 0.2
/** Elevación mínima del riel de montaña rusa (nivel 0). */
const COASTER_BASE = 0.25

/** Direcciones de los brazos; rotY orienta el +x local del grupo hacia el vecino. */
const DIRS = [
  { dx: 0, dz: -1, rotY: Math.PI / 2 }, // norte (-z)
  { dx: 1, dz: 0, rotY: 0 }, // este (+x)
  { dx: 0, dz: 1, rotY: -Math.PI / 2 }, // sur (+z)
  { dx: -1, dz: 0, rotY: Math.PI }, // oeste (-x)
]

/** Direcciones diagonales (solo conexiones de pista). */
const DIAGS = [
  { dx: 1, dz: -1 },
  { dx: 1, dz: 1 },
  { dx: -1, dz: 1 },
  { dx: -1, dz: -1 },
]
const SIN_DIAGS: (CaminoCelda | null)[] = [null, null, null, null]

const railY = (altura: number | undefined) => Y + COASTER_BASE + (altura ?? 0) * ALTURA_NIVEL
/** Base de pista/riel elevados (nivel 0 = a ras de suelo, como siempre). */
const yBase = (altura: number | undefined) => Y + (altura ?? 0) * ALTURA_NIVEL

/** Columna de soporte al suelo de los tramos elevados. */
function SoporteCamino({ x, z, y }: { x: number; z: number; y: number }) {
  return (
    <mesh position={[x, y / 2, z]}>
      <cylinderGeometry args={[0.09, 0.12, y, 8]} />
      <meshStandardMaterial color="#52525b" roughness={0.8} />
    </mesh>
  )
}

/**
 * Auto-tiling "hub + brazos": cada celda dibuja un nudo central y un brazo hacia
 * cada vecino del MISMO tipo; rectas, curvas, T y cruces emergen solos. Una celda
 * aislada se dibuja como tramo recto (brazos virtuales este-oeste).
 */
function TramoCelda({ fila, mapa }: { fila: CaminoCelda; mapa: Map<string, CaminoCelda> }) {
  const vecinos = DIRS.map((d) => {
    const v = mapa.get(`${fila.col + d.dx},${fila.row + d.dz}`)
    return v && v.tipo === fila.tipo ? v : null
  })
  // Conexión diagonal (solo pista): sobra si existe un puente ortogonal por
  // cualquiera de las dos celdas intermedias (regla simétrica: ambas celdas
  // del par diagonal deciden lo mismo y cada una dibuja su media cinta).
  const diags =
    fila.tipo === 'pista'
      ? DIAGS.map((d) => {
          const v = mapa.get(`${fila.col + d.dx},${fila.row + d.dz}`)
          if (!v || v.tipo !== 'pista') return null
          if (mapa.get(`${fila.col + d.dx},${fila.row}`)?.tipo === 'pista') return null
          if (mapa.get(`${fila.col},${fila.row + d.dz}`)?.tipo === 'pista') return null
          return v
        })
      : SIN_DIAGS
  const aislado = vecinos.every((v) => !v) && diags.every((v) => !v)
  // Sin vecinos: tramo recto (los brazos "virtuales" empatan con la propia altura).
  const brazos = vecinos.map((v, i) => (aislado ? (i === 1 || i === 3 ? fila : null) : v))
  // "L" (exactamente dos brazos perpendiculares): el tramo es un arco de esquina.
  const arco = esquinaDe(brazos)

  if (fila.tipo === 'pista') {
    const yb = yBase(fila.altura)
    return (
      <group>
        {arco ? (
          <PistaCurva arco={arco} fila={fila} brazos={brazos} />
        ) : (
          <>
            {/* Nudo: pad de asfalto que cubre esquinas, T y cruces sin costuras. */}
            <mesh position={[0, yb + 0.03, 0]}>
              <boxGeometry args={[2.6, 0.06, 2.6]} />
              <meshStandardMaterial color="#3f3f46" roughness={0.9} />
            </mesh>
            {brazos.map((v, i) => {
              if (!v) return null
              // El brazo interpola su altura al punto medio con el vecino → rampa.
              // Va del borde del nudo (1.3) a la ARISTA de la celda: con `HALF`,
              // no con 3 fijo, o el asfalto no llega con celdas ≠ 6 m.
              const run = HALF - 1.3
              const rise = (yb + yBase(v.altura)) / 2 - yb
              const len = Math.hypot(run, rise)
              const pitch = Math.atan2(rise, run)
              return (
                <group key={i} rotation-y={DIRS[i].rotY}>
                  <group position={[1.3, yb + 0.03, 0]} rotation={[0, 0, pitch]}>
                    <mesh position={[len / 2, 0, 0]}>
                      <boxGeometry args={[len, 0.06, 2.6]} />
                      <meshStandardMaterial color="#3f3f46" roughness={0.9} />
                    </mesh>
                    {/* Rayas centrales discontinuas (repartidas a lo largo del brazo). */}
                    {[0.26, 0.74].map((f) => (
                      <mesh key={f} position={[f * len, 0.036, 0]}>
                        <boxGeometry args={[0.5, 0.012, 0.14]} />
                        <meshStandardMaterial color="#facc15" roughness={0.6} />
                      </mesh>
                    ))}
                  </group>
                </group>
              )
            })}
            {(fila.altura ?? 0) > 0 && <SoporteCamino x={0} z={0} y={yb} />}
          </>
        )}
        {diags.map(
          (v, i) =>
            v && (
              <DiagonalPista
                key={i}
                dx={DIAGS[i].dx}
                dz={DIAGS[i].dz}
                impar={(fila.col & 1) === 1}
                yb={yb}
              />
            ),
        )}
        {fila.meta && <MetaPista ejeEO={!!(vecinos[1] || vecinos[3])} yb={yb} />}
      </group>
    )
  }

  if (fila.tipo === 'riel') {
    if (arco) return <RielCurva arco={arco} fila={fila} brazos={brazos} />
    const yb = yBase(fila.altura)
    return (
      <group>
        {brazos.map((v, i) => {
          if (!v) return null
          // Del centro a la ARISTA (`HALF`, no 3 fijo: con celdas ≠ 6 m la vía
          // no llegaba y quedaban huecos), subiendo al punto medio → rampa.
          const rise = (yb + yBase(v.altura)) / 2 - yb
          const len = Math.hypot(HALF, rise)
          const pitch = Math.atan2(rise, HALF)
          return (
            <group key={i} rotation-y={DIRS[i].rotY}>
              <group position={[0, yb, 0]} rotation={[0, 0, pitch]}>
                {/* Durmientes de madera, repartidos a lo largo del brazo. */}
                {[0.17, 0.42, 0.67, 0.92].map((f) => (
                  <mesh key={f} position={[f * len, 0.03, 0]}>
                    <boxGeometry args={[0.3, 0.06, 1.5]} />
                    <meshStandardMaterial color="#7c5a3a" roughness={0.9} />
                  </mesh>
                ))}
                {/* Dos rieles metálicos (leve desnivel por dirección: evita z-fight en cruces). */}
                {[-0.5, 0.5].map((z) => (
                  <mesh key={z} position={[len / 2, 0.1 + i * 0.002, z]}>
                    <boxGeometry args={[len, 0.08, 0.12]} />
                    <meshStandardMaterial color="#9ca3af" metalness={0.7} roughness={0.35} />
                  </mesh>
                ))}
              </group>
            </group>
          )
        })}
        {(fila.altura ?? 0) > 0 && <SoporteCamino x={0} z={0} y={yb} />}
      </group>
    )
  }

  // Montaña rusa: riel tubular elevable; cada brazo interpola su altura hacia el
  // punto medio con el vecino (las dos mitades empatan en la arista → rampa).
  if (arco) return <CoasterCurva arco={arco} fila={fila} brazos={brazos} />
  const y0 = railY(fila.altura)
  return (
    <group>
      {/* Plataforma del nudo (une brazos y esquinas a la altura propia). */}
      <mesh position={[0, y0, 0]}>
        <boxGeometry args={[0.9, 0.1, 0.9]} />
        <meshStandardMaterial color="#475569" roughness={0.7} />
      </mesh>
      {/* Soporte central al suelo. */}
      <mesh position={[0, y0 / 2, 0]}>
        <cylinderGeometry args={[0.07, 0.09, y0, 8]} />
        <meshStandardMaterial color="#64748b" roughness={0.7} />
      </mesh>
      {brazos.map((v, i) => {
        if (!v) return null
        const yFin = (y0 + railY(v.altura)) / 2
        // Hasta la arista de la celda (`HALF`), no 3 fijo.
        const run = HALF - 0.45
        const rise = yFin - y0
        const len = Math.hypot(run, rise)
        const pitch = Math.atan2(rise, run)
        return (
          <group key={i} rotation-y={DIRS[i].rotY}>
            {/* Dos tubos del riel. */}
            {[-0.35, 0.35].map((z) => (
              <mesh
                key={z}
                position={[0.45 + run / 2, (y0 + yFin) / 2, z]}
                rotation={[0, 0, -Math.PI / 2 + pitch]}
              >
                <cylinderGeometry args={[0.06, 0.06, len, 8]} />
                <meshStandardMaterial color="#ef4444" metalness={0.4} roughness={0.4} />
              </mesh>
            ))}
            {/* Travesaños. */}
            {[0.25, 0.5, 0.75].map((t) => (
              <mesh
                key={t}
                position={[0.45 + run * t, y0 + rise * t, 0]}
                rotation={[0, 0, pitch]}
              >
                <boxGeometry args={[0.09, 0.05, 0.82]} />
                <meshStandardMaterial color="#7f1d1d" roughness={0.6} />
              </mesh>
            ))}
          </group>
        )
      })}
    </group>
  )
}

/** Sector anular extruido (asfalto/rieles curvos): radios [r0, r1], θ ∈ [a0, a0+π/2]. */
function sectorAnular(a: ArcoEsquina, r0: number, r1: number, alto: number) {
  const s = new THREE.Shape()
  s.absarc(a.cx, a.cz, r1, a.a0, a.a0 + Math.PI / 2, false)
  s.absarc(a.cx, a.cz, r0, a.a0 + Math.PI / 2, a.a0, true)
  const g = new THREE.ExtrudeGeometry(s, { depth: alto, bevelEnabled: false, curveSegments: 24 })
  // El shape vive en XY: girarlo deja (x,y) → (x,z) del mundo y extruye hacia −y.
  g.rotateX(Math.PI / 2)
  return g
}

/** Curva de pista: banda de asfalto en arco (con pendiente si los brazos difieren de altura). */
function PistaCurva({
  arco,
  fila,
  brazos,
}: {
  arco: ArcoEsquina
  fila: CaminoCelda
  brazos: (CaminoCelda | null)[]
}) {
  const yb = yBase(fila.altura)
  const yJ = (yb + yBase(brazos[arco.j]?.altura)) / 2
  const yI = (yb + yBase(brazos[arco.i]?.altura)) / 2
  const plano = yJ === yb && yI === yb
  // Radio del arco = medio lado de celda (el centro está en la esquina): con un
  // radio fijo el arco no llegaba a los medios de arista donde empatan los
  // brazos rectos, y la curva quedaba suelta con celdas ≠ 6 m.
  const R = H
  const geo = useMemo(
    () => (plano ? sectorAnular(arco, R - 1.3, R + 1.3, 0.06) : null),
    [arco, plano, R],
  )
  const medio = puntoArco(arco, R, 0.5)
  const SEG = 12
  const ds = ((Math.PI / 2) * R) / SEG
  return (
    <group>
      {plano && geo ? (
        <mesh geometry={geo} position={[0, yb + 0.06, 0]}>
          <meshStandardMaterial color="#3f3f46" roughness={0.9} />
        </mesh>
      ) : (
        // Con pendiente: la banda se aproxima con segmentos tangentes inclinados.
        Array.from({ length: SEG }, (_, k) => {
          const t0 = k / SEG
          const t1 = (k + 1) / SEG
          const tm = (t0 + t1) / 2
          const p = puntoArco(arco, R, tm)
          const y0 = alturaArco(yJ, yb, yI, t0)
          const y1 = alturaArco(yJ, yb, yI, t1)
          const th = arco.a0 + (tm * Math.PI) / 2
          return (
            <group
              key={k}
              position={[p.x, (y0 + y1) / 2 + 0.03, p.z]}
              rotation-y={-th - Math.PI / 2}
            >
              <mesh rotation={[0, 0, Math.atan2(y1 - y0, ds)]}>
                <boxGeometry args={[Math.hypot(ds, y1 - y0) + 0.04, 0.06, 2.6]} />
                <meshStandardMaterial color="#3f3f46" roughness={0.9} />
              </mesh>
            </group>
          )
        })
      )}
      {[0.25, 0.75].map((t) => {
        const th = arco.a0 + (t * Math.PI) / 2
        const p = puntoArco(arco, R, t)
        return (
          <mesh
            key={t}
            position={[p.x, alturaArco(yJ, yb, yI, t) + 0.066, p.z]}
            rotation-y={-th - Math.PI / 2}
          >
            <boxGeometry args={[0.5, 0.012, 0.14]} />
            <meshStandardMaterial color="#facc15" roughness={0.6} />
          </mesh>
        )
      })}
      {(!plano || (fila.altura ?? 0) > 0) && (
        <SoporteCamino x={medio.x} z={medio.z} y={alturaArco(yJ, yb, yI, 0.5)} />
      )}
    </group>
  )
}

/** Curva de riel: durmientes radiales + dos rieles en arco (tubos si hay pendiente). */
function RielCurva({
  arco,
  fila,
  brazos,
}: {
  arco: ArcoEsquina
  fila: CaminoCelda
  brazos: (CaminoCelda | null)[]
}) {
  const yb = yBase(fila.altura)
  const yJ = (yb + yBase(brazos[arco.j]?.altura)) / 2
  const yI = (yb + yBase(brazos[arco.i]?.altura)) / 2
  const plano = yJ === yb && yI === yb
  // Radio del arco = medio lado de celda; los dos rieles van a ±0.5 de él.
  const R = H
  const rieles = useMemo(() => {
    if (plano)
      return [
        sectorAnular(arco, R - 0.5 - 0.06, R - 0.5 + 0.06, 0.08),
        sectorAnular(arco, R + 0.5 - 0.06, R + 0.5 + 0.06, 0.08),
      ]
    // Con pendiente: tubos que siguen el arco subiendo (como la montaña rusa).
    return [R - 0.5, R + 0.5].map((r) => {
      const pts: THREE.Vector3[] = []
      for (let k = 0; k <= 12; k++) {
        const t = k / 12
        const p = puntoArco(arco, r, t)
        pts.push(new THREE.Vector3(p.x, alturaArco(yJ, yb, yI, t) + 0.1, p.z))
      }
      return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, 0.06, 8, false)
    })
  }, [arco, plano, yb, yJ, yI, R])
  const medio = puntoArco(arco, R, 0.5)
  return (
    <group>
      {[0, 1, 2, 3].map((k) => {
        const t = (k + 0.5) / 4
        const th = arco.a0 + (t * Math.PI) / 2
        const p = puntoArco(arco, R, t)
        return (
          <mesh
            key={k}
            position={[p.x, alturaArco(yJ, yb, yI, t) + 0.03, p.z]}
            rotation-y={Math.PI / 2 - th}
          >
            <boxGeometry args={[0.3, 0.06, 1.5]} />
            <meshStandardMaterial color="#7c5a3a" roughness={0.9} />
          </mesh>
        )
      })}
      {rieles.map((g, i) => (
        <mesh key={i} geometry={g} position={plano ? [0, yb + 0.14, 0] : [0, 0, 0]}>
          <meshStandardMaterial color="#9ca3af" metalness={0.7} roughness={0.35} />
        </mesh>
      ))}
      {(!plano || (fila.altura ?? 0) > 0) && (
        <SoporteCamino x={medio.x} z={medio.z} y={alturaArco(yJ, yb, yI, 0.5)} />
      )}
    </group>
  )
}

/** Curva de montaña rusa: tubos que siguen el arco subiendo/bajando en Bézier. */
function CoasterCurva({
  arco,
  fila,
  brazos,
}: {
  arco: ArcoEsquina
  fila: CaminoCelda
  brazos: (CaminoCelda | null)[]
}) {
  const y0 = railY(fila.altura)
  const yJ = (y0 + railY(brazos[arco.j]?.altura)) / 2
  const yI = (y0 + railY(brazos[arco.i]?.altura)) / 2
  // Radio del arco = medio lado de celda; los dos tubos van a ±0.35 de él.
  const R = H
  const tubos = useMemo(
    () =>
      [-0.35, 0.35].map((dr) => {
        const pts: THREE.Vector3[] = []
        for (let k = 0; k <= 12; k++) {
          const t = k / 12
          const p = puntoArco(arco, R + dr, t)
          pts.push(new THREE.Vector3(p.x, alturaArco(yJ, y0, yI, t), p.z))
        }
        return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, 0.06, 8, false)
      }),
    [arco, y0, yJ, yI, R],
  )
  const medio = puntoArco(arco, R, 0.5)
  const yMedio = alturaArco(yJ, y0, yI, 0.5)
  return (
    <group>
      {tubos.map((g, i) => (
        <mesh key={i} geometry={g}>
          <meshStandardMaterial color="#ef4444" metalness={0.4} roughness={0.4} />
        </mesh>
      ))}
      {[0.2, 0.5, 0.8].map((t) => {
        const p = puntoArco(arco, R, t)
        const th = arco.a0 + (t * Math.PI) / 2
        return (
          <mesh key={t} position={[p.x, alturaArco(yJ, y0, yI, t), p.z]} rotation-y={Math.PI / 2 - th}>
            <boxGeometry args={[0.09, 0.05, 0.82]} />
            <meshStandardMaterial color="#7f1d1d" roughness={0.6} />
          </mesh>
        )
      })}
      {/* Soporte al suelo en el punto medio del arco. */}
      <mesh position={[medio.x, yMedio / 2, medio.z]}>
        <cylinderGeometry args={[0.07, 0.09, yMedio, 8]} />
        <meshStandardMaterial color="#64748b" roughness={0.7} />
      </mesh>
    </group>
  )
}

/**
 * Línea de meta del circuito: franja ajedrez cruzando la pista + pórtico.
 * `ejeEO` orienta el cruce según los vecinos (la franja corta el sentido de
 * avance: con vecinos este/oeste el camino corre en x y la franja cruza en z).
 */
export function MetaPista({ ejeEO, yb }: { ejeEO: boolean; yb: number }) {
  return (
    <group rotation-y={ejeEO ? 0 : Math.PI / 2}>
      {[0, 1].map((i) =>
        Array.from({ length: 8 }, (_, j) => (
          <mesh key={`${i}-${j}`} position={[(i - 0.5) * 0.325, yb + 0.07, (j - 3.5) * 0.325]}>
            <boxGeometry args={[0.325, 0.014, 0.325]} />
            <meshStandardMaterial color={(i + j) % 2 === 0 ? '#f8fafc' : '#18181b'} roughness={0.7} />
          </mesh>
        )),
      )}
      {/* Pórtico: dos postes a los lados y pancarta arriba. */}
      {[-1.55, 1.55].map((z) => (
        <mesh key={z} position={[0, yb + 1.1, z]}>
          <cylinderGeometry args={[0.06, 0.06, 2.2, 8]} />
          <meshStandardMaterial color="#e4e4e7" metalness={0.3} roughness={0.5} />
        </mesh>
      ))}
      <mesh position={[0, yb + 2.28, 0]}>
        <boxGeometry args={[0.5, 0.34, 3.4]} />
        <meshStandardMaterial color="#dc2626" roughness={0.6} />
      </mesh>
    </group>
  )
}

/**
 * Media cinta diagonal de pista (del centro de la celda a la esquina
 * compartida); la otra mitad la pinta la celda vecina. `impar` la baja 2 mm
 * para que las dos mitades no coplaneen donde se tocan.
 */
function DiagonalPista({
  dx,
  dz,
  impar,
  yb,
}: {
  dx: number
  dz: number
  impar: boolean
  yb: number
}) {
  const off = impar ? 0 : 0.002
  // Media diagonal entre los dos centros de celda (proporcional al lado, no fija).
  const alcance = HALF * Math.SQRT2
  return (
    <group rotation-y={Math.atan2(-dz, dx)}>
      <mesh position={[alcance / 2, yb + 0.028 + off, 0]}>
        <boxGeometry args={[alcance + 0.11, 0.055, 2.2]} />
        <meshStandardMaterial color="#3f3f46" roughness={0.9} />
      </mesh>
      {[0.33, 0.66].map((f) => (
        <mesh key={f} position={[f * alcance, yb + 0.0615 + off, 0]}>
          <boxGeometry args={[0.5, 0.012, 0.14]} />
          <meshStandardMaterial color="#facc15" roughness={0.6} />
        </mesh>
      ))}
    </group>
  )
}

/** Caminos construidos en el mapa (siempre montado; reacciona a db.caminos). */
export function Caminos3D() {
  const filas = caminosRepo.useAll() ?? []
  const gridCols = useLayout((s) => s.gridCols)
  const gridRows = useLayout((s) => s.gridRows)
  const mapa = useMemo(() => {
    const m = new Map<string, CaminoCelda>()
    for (const f of filas) m.set(`${f.col},${f.row}`, f)
    return m
  }, [filas])
  return (
    <group>
      {filas
        .filter((f) => f.col < gridCols && f.row < gridRows)
        .map((f) => {
          const [wx, , wz] = cellToWorld(f.col, f.row)
          return (
            <group key={`${f.col},${f.row}`} position={[wx, 0, wz]}>
              <TramoCelda fila={f} mapa={mapa} />
            </group>
          )
        })}
    </group>
  )
}

/** Color del fantasma según la herramienta activa. */
const COLOR_HERRAMIENTA: Record<string, string> = {
  pintar: '#4ade80',
  borrar: '#f87171',
  subir: '#60a5fa',
  bajar: '#60a5fa',
  meta: '#f8fafc',
}

/**
 * Con el editor activo: clic en una celda aplica la herramienta (un arrastre
 * mayor a 6 px es cámara, como en los controladores de planos). Esc sale.
 */
export function CaminosController() {
  const activo = useCaminos((s) => s.activo)
  // Con el sub-modo de trazo libre activo, los clics son del TrazoLibreController.
  const trazo = usePistaLibreEditor((s) => s.activo)
  return activo && !trazo ? <CaminosControllerActivo /> : null
}

function CaminosControllerActivo() {
  const gl = useThree((s) => s.gl)
  const camera = useThree((s) => s.camera)
  const herramienta = useCaminos((s) => s.herramienta)
  const tipoSel = useCaminos((s) => s.tipo)
  const filas = caminosRepo.useAll() ?? []
  const mapaReal = useMemo(() => {
    const m = new Map<string, CaminoCelda>()
    for (const f of filas) m.set(`${f.col},${f.row}`, f)
    return m
  }, [filas])
  const aplicarEnCelda = useCaminos((s) => s.aplicarEnCelda)
  const salir = useCaminos((s) => s.salir)
  const apilado = !useHouse((s) => s.explotado)
  const gridCols = useLayout((s) => s.gridCols)
  const gridRows = useLayout((s) => s.gridRows)
  const [hover, setHover] = useState<{ col: number; row: number } | null>(null)

  useEffect(() => {
    const dom = gl.domElement
    let downX = 0
    let downY = 0
    const opts = { canvas: dom, camera, nivel: 0, apilado, gridCols, gridRows }
    const onDown = (ev: PointerEvent) => {
      downX = ev.clientX
      downY = ev.clientY
    }
    const onUp = (ev: PointerEvent) => {
      if (ev.button !== 0) return
      if (Math.hypot(ev.clientX - downX, ev.clientY - downY) > 6) return // fue arrastre de cámara
      const c = celdaEnteraBajoCursor(ev.clientX, ev.clientY, opts)
      if (c) void aplicarEnCelda(Math.round(c.col), Math.round(c.row))
    }
    const onMove = (ev: PointerEvent) => {
      const c = celdaEnteraBajoCursor(ev.clientX, ev.clientY, opts)
      setHover(c ? { col: Math.round(c.col), row: Math.round(c.row) } : null)
    }
    const onLeave = () => setHover(null)
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') salir()
    }
    dom.addEventListener('pointerdown', onDown)
    dom.addEventListener('pointerup', onUp)
    dom.addEventListener('pointermove', onMove)
    dom.addEventListener('pointerleave', onLeave)
    window.addEventListener('keydown', onKey)
    return () => {
      dom.removeEventListener('pointerdown', onDown)
      dom.removeEventListener('pointerup', onUp)
      dom.removeEventListener('pointermove', onMove)
      dom.removeEventListener('pointerleave', onLeave)
      window.removeEventListener('keydown', onKey)
      setHover(null)
    }
  }, [gl, camera, apilado, gridCols, gridRows, aplicarEnCelda, salir])

  if (!hover) return null
  const [hx, , hz] = cellToWorld(hover.col, hover.row)
  return (
    <>
      <ContornoCelda
        cx={hx}
        cz={hz}
        y={Y + 0.25}
        lado={SIZE - 0.15}
        color={COLOR_HERRAMIENTA[herramienta] ?? '#ffffff'}
      />
      {herramienta === 'pintar' && (
        <FantasmaPintado col={hover.col} row={hover.row} tipo={tipoSel} mapa={mapaReal} />
      )}
    </>
  )
}

/**
 * Vista previa translúcida de la pieza que se pintaría en la celda bajo el
 * cursor, conectada a los vecinos reales (mismo auto-tiling que el render).
 */
function FantasmaPintado({
  col,
  row,
  tipo,
  mapa,
}: {
  col: number
  row: number
  tipo: CaminoCelda['tipo']
  mapa: Map<string, CaminoCelda>
}) {
  const previa = mapa.get(`${col},${row}`)
  if (previa?.tipo === tipo) return null // ya hay una pieza igual: nada que previsualizar
  const fila: CaminoCelda = { col, row, tipo, altura: previa?.altura }
  const m2 = new Map(mapa)
  m2.set(`${col},${row}`, fila)
  const [wx, , wz] = cellToWorld(col, row)
  return (
    // Levantado 8 cm: se distingue como preview y no coplanea con lo ya pintado.
    <group position={[wx, 0.08, wz]}>
      <TramoFantasma fila={fila} mapa={m2} />
    </group>
  )
}

function TramoFantasma({ fila, mapa }: { fila: CaminoCelda; mapa: Map<string, CaminoCelda> }) {
  const g = useRef<THREE.Group>(null)
  // Tras cada render: los materiales del fantasma (instancias propias) se vuelven translúcidos.
  useLayoutEffect(() => {
    g.current?.traverse((o) => {
      const mesh = o as THREE.Mesh
      if (!mesh.isMesh) return
      const mat = mesh.material as THREE.Material
      mat.transparent = true
      mat.opacity = 0.45
      mat.depthWrite = false
    })
  })
  return (
    <group ref={g}>
      <TramoCelda fila={fila} mapa={mapa} />
    </group>
  )
}

/** Contorno cuadrado sobre la celda bajo el cursor (fantasma del editor). */
export function ContornoCelda({
  cx,
  cz,
  y,
  lado,
  color,
}: {
  cx: number
  cz: number
  y: number
  lado: number
  color: string
}) {
  const geo = useMemo(() => {
    const h = lado / 2
    return new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-h, 0, -h),
      new THREE.Vector3(h, 0, -h),
      new THREE.Vector3(h, 0, h),
      new THREE.Vector3(-h, 0, h),
    ])
  }, [lado])
  return (
    <lineLoop position={[cx, y, cz]} geometry={geo}>
      <lineBasicMaterial color={color} transparent opacity={0.9} depthTest={false} />
    </lineLoop>
  )
}
