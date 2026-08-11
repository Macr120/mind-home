import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useHouse } from '../state/houseStore'
import { useLayout, SIN_OCUPACION } from '../state/layoutStore'
import { usePlanos } from '../state/planosStore'
import { playerPos } from '../state/playerPosition'
import type { Acceso } from '../data/db'
import {
  cellToWorld,
  worldToCell,
  cellId,
  ascensoXZ,
  rotAscenso,
  esquinaDeSignos,
  nivelBaseY,
  SIZE,
  WALL_H,
  type TipoAcceso,
  type SideKey,
} from './walls'

/**
 * Estructuras 3D para subir a un nivel: escalera, elevador o resbaladilla (con
 * escalera). Hay UNA por nivel, anclada en la ESQUINA de una celda del nivel (dentro del
 * cuarto, para no tapar puertas). Abarca de la altura del nivel de abajo a la del de
 * arriba: se estira cuando el piso flota (techo OFF) y se compacta al apilarse (techo ON).
 */

const COLOR: Record<TipoAcceso, { base: string; detalle: string }> = {
  escalera: { base: '#c69a72', detalle: '#7f5539' },
  elevador: { base: '#aab2bd', detalle: '#5c636e' },
  resbaladilla: { base: '#bae6fd', detalle: '#38bdf8' },
  'escalera-marina': { base: '#e2e8f0', detalle: '#94a3b8' },
}

/** Medio lado del hueco del elevador / radio del tubo. */
const HUECO = 0.9

/** Escalera de caracol: peldaños radiales en espiral alrededor de un poste central. */
function EscaleraEspiral({
  altura,
  landing,
  base,
  detalle,
}: {
  altura: number
  landing: number
  base: string
  detalle: string
}) {
  const paso = 0.32 // alto entre peldaños
  const n = Math.max(4, Math.round(landing / paso))
  const rise = landing / n
  const R = 1.25 // radio de los peldaños
  const dTheta = Math.PI / 4 // un giro completo cada 8 peldaños
  return (
    <>
      {/* poste central hasta el techo del nivel de arriba */}
      <mesh position={[0, altura / 2, 0]} castShadow>
        <cylinderGeometry args={[0.16, 0.16, altura, 12]} />
        <meshStandardMaterial color={detalle} roughness={0.6} metalness={0.2} />
      </mesh>
      {Array.from({ length: n }, (_, i) => {
        const th = i * dTheta
        const y = (i + 1) * rise
        return (
          <mesh
            key={i}
            position={[(R / 2) * Math.cos(th), y, (R / 2) * Math.sin(th)]}
            rotation={[0, -th, 0]}
            castShadow
            receiveShadow
          >
            <boxGeometry args={[R, 0.12, 0.7]} />
            <meshStandardMaterial color={base} roughness={0.85} />
          </mesh>
        )
      })}
    </>
  )
}

/** Cabina de cristal del elevador (estática por ahora; se anima en la transición). */
function CabinaCristal({ baseY, acceso }: { baseY: number; acceso: Acceso }) {
  const ref = useRef<THREE.Group>(null)
  useFrame(() => {
    if (!ref.current) return
    const t = useHouse.getState().transicion
    const activo = t != null && t.acceso.id === acceso.id
    // En transición la cabina sigue al personaje; si no, reposa cerca del piso de abajo.
    const objetivo = activo ? playerPos.y - baseY : 1
    ref.current.position.y += (objetivo - ref.current.position.y) * (activo ? 1 : 0.12)
  })
  return (
    <group ref={ref} position={[0, 1, 0]}>
      <mesh castShadow>
        <boxGeometry args={[2 * HUECO - 0.12, 1.9, 2 * HUECO - 0.12]} />
        <meshStandardMaterial
          color="#bae6fd"
          transparent
          opacity={0.28}
          metalness={0.1}
          roughness={0.05}
        />
      </mesh>
      {/* piso de la cabina */}
      <mesh position={[0, -0.95, 0]}>
        <boxGeometry args={[2 * HUECO - 0.05, 0.1, 2 * HUECO - 0.05]} />
        <meshStandardMaterial color="#5c636e" metalness={0.5} roughness={0.4} />
      </mesh>
    </group>
  )
}

/** Elevador: estructura cuadrada de postes con una cabina de cristal que sube/baja. */
function Elevador({ altura, baseY, acceso, detalle }: { altura: number; baseY: number; acceso: Acceso; detalle: string }) {
  const postes: [number, number][] = [
    [-HUECO, -HUECO],
    [HUECO, -HUECO],
    [-HUECO, HUECO],
    [HUECO, HUECO],
  ]
  return (
    <>
      {postes.map(([x, z], i) => (
        <mesh key={i} position={[x, altura / 2, z]} castShadow>
          <boxGeometry args={[0.18, altura, 0.18]} />
          <meshStandardMaterial color={detalle} metalness={0.6} roughness={0.35} />
        </mesh>
      ))}
      {/* marcos inferior y superior */}
      {[0.09, altura - 0.09].map((y, i) => (
        <mesh key={'m' + i} position={[0, y, 0]}>
          <boxGeometry args={[2 * HUECO + 0.18, 0.16, 2 * HUECO + 0.18]} />
          <meshStandardMaterial color={detalle} metalness={0.5} roughness={0.4} />
        </mesh>
      ))}
      <CabinaCristal baseY={baseY} acceso={acceso} />
    </>
  )
}

/** Tubo de succión: cilindro translúcido con aros, por el que el personaje sube/baja. */
function Tubo({ altura, base, detalle }: { altura: number; base: string; detalle: string }) {
  const aros = Math.max(2, Math.round(altura / 1.6))
  return (
    <>
      <mesh position={[0, altura / 2, 0]}>
        <cylinderGeometry args={[HUECO, HUECO, altura, 20, 1, true]} />
        <meshStandardMaterial
          color={base}
          transparent
          opacity={0.2}
          side={THREE.DoubleSide}
          roughness={0.1}
          metalness={0.1}
        />
      </mesh>
      {Array.from({ length: aros }, (_, i) => (
        <mesh
          key={i}
          position={[0, (i + 0.5) * (altura / aros), 0]}
          rotation={[Math.PI / 2, 0, 0]}
          castShadow
        >
          <torusGeometry args={[HUECO, 0.07, 8, 22]} />
          <meshStandardMaterial color={detalle} metalness={0.4} roughness={0.4} />
        </mesh>
      ))}
    </>
  )
}

/** Escalera marina (alberca/búnker): dos rieles metálicos con peldaños y manijas curvas arriba. */
function EscaleraMarina({ altura, base, detalle }: { altura: number; base: string; detalle: string }) {
  const ancho = 0.7
  const n = Math.max(2, Math.round(altura / 0.5))
  return (
    <>
      {[-ancho / 2, ancho / 2].map((x, i) => (
        <mesh key={i} position={[x, altura / 2, 0]} castShadow>
          <cylinderGeometry args={[0.06, 0.06, altura, 10]} />
          <meshStandardMaterial color={detalle} metalness={0.7} roughness={0.3} />
        </mesh>
      ))}
      {Array.from({ length: n }, (_, i) => (
        <mesh key={'r' + i} position={[0, (i + 0.5) * (altura / n), 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.045, 0.045, ancho, 8]} />
          <meshStandardMaterial color={base} metalness={0.6} roughness={0.35} />
        </mesh>
      ))}
      {/* Manijas curvas que asoman sobre el borde (para tomarse al salir del agua). */}
      {[-ancho / 2, ancho / 2].map((x, i) => (
        <mesh key={'h' + i} position={[x, altura, 0.16]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <torusGeometry args={[0.16, 0.05, 8, 12, Math.PI]} />
          <meshStandardMaterial color={detalle} metalness={0.7} roughness={0.3} />
        </mesh>
      ))}
    </>
  )
}

function Estructura({
  tipo,
  altura,
  landing,
  baseY,
  acceso,
}: {
  tipo: TipoAcceso
  altura: number
  landing: number
  baseY: number
  acceso: Acceso
}) {
  const c = COLOR[tipo]
  if (tipo === 'elevador')
    return <Elevador altura={altura} baseY={baseY} acceso={acceso} detalle={c.detalle} />
  if (tipo === 'resbaladilla') return <Tubo altura={altura} base={c.base} detalle={c.detalle} />
  if (tipo === 'escalera-marina') return <EscaleraMarina altura={altura} base={c.base} detalle={c.detalle} />
  return <EscaleraEspiral altura={altura} landing={landing} base={c.base} detalle={c.detalle} />
}

/** Radio alrededor del acceso para mostrar el prompt de subir/bajar. */
const RADIO_ACCESO = 3.5

/**
 * Detecta si el personaje está al alcance de un acceso (al pie, para subir; o en la
 * cima, para bajar) según su nivel actual, y lo publica en el store para el prompt 2D.
 */
export function AccesoProximity() {
  const setNearAcceso = useHouse((s) => s.setNearAcceso)
  useFrame(() => {
    const accesos = useLayout.getState().accesos
    if (accesos.length === 0 || useHouse.getState().transicion) {
      setNearAcceso(null, null)
      return
    }
    const level = useHouse.getState().playerLevel
    let mejor: { a: Acceso; dir: 'subir' | 'bajar'; d: number } | null = null
    for (const a of accesos) {
      // La escalera marina del sótano es decorativa: se baja/sube caminando (sin prompt).
      if (a.nivel < 0) continue
      const [bx, bz] = ascensoXZ(a)
      if (a.nivel - 1 === level) {
        // Subir: al pie del acceso (la esquina del cuarto donde se planta la estructura).
        const d = Math.hypot(playerPos.x - bx, playerPos.z - bz)
        if (d <= RADIO_ACCESO && (!mejor || d < mejor.d)) mejor = { a, dir: 'subir', d }
      }
      if (a.nivel === level) {
        // Bajar: en la cima, también junto a la estructura.
        const d = Math.hypot(playerPos.x - bx, playerPos.z - bz)
        if (d <= RADIO_ACCESO && (!mejor || d < mejor.d)) mejor = { a, dir: 'bajar', d }
      }
    }
    setNearAcceso(mejor?.a ?? null, mejor?.dir ?? null)
  })
  return null
}

export function Accesos() {
  const accesos = useLayout((s) => s.accesos)
  const apilado = !useHouse((s) => s.explotado)
  const editMode = useLayout((s) => s.editMode)
  const editingRoomId = useLayout((s) => s.editingRoomId)
  const draggingAcceso = useLayout((s) => s.draggingAcceso)
  const previewAcceso = useLayout((s) => s.previewAcceso)
  const previewLado = useLayout((s) => s.previewLado)
  const previewEsquina = useLayout((s) => s.previewEsquina)
  const startAccesoDrag = useLayout((s) => s.startAccesoDrag)
  const ocupadoPorNivel = useLayout((s) => s.ocupadoPorNivel)
  const modoAscensos = usePlanos((s) => s.modo === 'ascensos')
  if (accesos.length === 0) return null
  // El acceso solo se arrastra en el modo "Ascensos" del editor (sin cuarto aislado).
  const editable = editMode && !editingRoomId && modoAscensos
  // Nivel del acceso que se arrastra (para resaltar dónde se puede soltar).
  const dragNivel = draggingAcceso != null
    ? accesos.find((a) => a.id === draggingAcceso)?.nivel ?? null
    : null
  return (
    <>
      {accesos.map((a) => {
        const arrastrando = draggingAcceso === a.id
        const col = arrastrando && previewAcceso ? previewAcceso.col : a.col
        const row = arrastrando && previewAcceso ? previewAcceso.row : a.row
        // Sótano (alberca/búnker): la escalera marina va DENTRO del pozo, pegada al muro,
        // del fondo (nivel -1) al ras del suelo (0). Pisos altos: en la esquina del cuarto.
        const esSotano = a.nivel < 0
        const ancla = {
          nivel: a.nivel,
          col,
          row,
          lado: (arrastrando && previewLado ? previewLado : a.lado) ?? undefined,
          esquina: (arrastrando && previewEsquina ? previewEsquina : a.esquina) ?? undefined,
        }
        const [bx, bz] = ascensoXZ(ancla)
        const baseY = nivelBaseY(esSotano ? a.nivel : a.nivel - 1, apilado)
        const landing = nivelBaseY(esSotano ? a.nivel + 1 : a.nivel, apilado) - baseY
        const altura = esSotano ? landing + 0.5 : landing + WALL_H
        // El frente local (+Z) mira hacia el centro del cuarto (o del pozo, en el sótano).
        const rotY = rotAscenso(ancla)
        return (
          <group
            key={a.id ?? `${a.nivel}-${a.col}-${a.row}`}
            position={[bx, baseY, bz]}
            rotation={[0, rotY, 0]}
          >
            <Estructura tipo={a.tipo} altura={altura} landing={landing} baseY={baseY} acceso={a} />
            {/* Caja de agarre invisible y AMPLIA: el poste/tubo es muy delgado para
                clicarlo; esta columna cubre toda la altura y facilita el drag. */}
            {editable && (
              <mesh
                position={[0, altura / 2, 0]}
                onPointerDown={(e) => {
                  e.stopPropagation()
                  if (a.id != null) startAccesoDrag(a.id)
                }}
                onPointerOver={(e) => {
                  e.stopPropagation()
                  if (useLayout.getState().draggingAcceso == null)
                    document.body.style.cursor = 'grab'
                }}
                onPointerOut={() => {
                  if (useLayout.getState().draggingAcceso == null)
                    document.body.style.cursor = 'default'
                }}
              >
                <cylinderGeometry args={[1.4, 1.4, altura, 8]} />
                <meshBasicMaterial transparent opacity={arrastrando ? 0.12 : 0} depthWrite={false} color="#7dd3fc" />
              </mesh>
            )}
          </group>
        )
      })}

      {/* Mientras se arrastra un acceso: resaltar las celdas válidas (cuartos del
          nivel del acceso); la celda bajo el cursor se pinta en verde. */}
      {dragNivel != null &&
        [...(ocupadoPorNivel.get(dragNivel) ?? [])].map((key) => {
          const [c, r] = key.split(',').map(Number)
          const [hx, , hz] = cellToWorld(c, r)
          const hy = nivelBaseY(dragNivel, apilado) + 0.18
          const activo = previewAcceso?.col === c && previewAcceso?.row === r
          return (
            <mesh key={`dz-${key}`} position={[hx, hy, hz]} rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[SIZE - 0.2, SIZE - 0.2]} />
              <meshBasicMaterial
                color={activo ? '#34d399' : '#7dd3fc'}
                transparent
                opacity={activo ? 0.5 : 0.22}
                depthWrite={false}
              />
            </mesh>
          )
        })}
    </>
  )
}

const _planeA = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
const _rayA = new THREE.Raycaster()
const _hitA = new THREE.Vector3()

/**
 * Arrastre de un acceso en edición: proyecta el cursor sobre el plano del NIVEL del
 * acceso (donde flotan los cuartos superiores visibles, hacia los que el usuario
 * apunta). Solo acepta soltar sobre una celda con un cuarto de ese nivel.
 */
export function AccesoDrag() {
  const camera = useThree((s) => s.camera)
  const pointer = useThree((s) => s.pointer)
  useFrame(() => {
    const { draggingAcceso, accesos } = useLayout.getState()
    if (draggingAcceso == null) return
    document.body.style.cursor = 'grabbing'
    const ac = accesos.find((a) => a.id === draggingAcceso)
    if (!ac) return
    // Plano del nivel superior: ahí se ven (flotando) los cuartos a los que se suelta.
    _planeA.constant = -nivelBaseY(ac.nivel, !useHouse.getState().explotado)
    _rayA.setFromCamera(pointer, camera)
    if (_rayA.ray.intersectPlane(_planeA, _hitA)) {
      const cell = worldToCell(_hitA.x, _hitA.z)
      const occ = useLayout.getState().ocupadoPorNivel.get(ac.nivel) ?? SIN_OCUPACION
      if (occ.has(cellId(cell.col, cell.row))) {
        const [ccx, , ccz] = cellToWorld(cell.col, cell.row)
        const dx = _hitA.x - ccx
        const dz = _hitA.z - ccz
        // Pisos altos: esquina más cercana al cursor (la estructura va DENTRO del cuarto).
        // Sótano: la escalera marina sigue eligiendo pared del pozo.
        if (ac.nivel < 0) {
          const lado: SideKey =
            Math.abs(dx) >= Math.abs(dz) ? (dx >= 0 ? 'E' : 'O') : dz >= 0 ? 'S' : 'N'
          useLayout.getState().setAccesoPreview(cell, { lado })
        } else {
          useLayout.getState().setAccesoPreview(cell, { esquina: esquinaDeSignos(dx, dz) })
        }
      }
    }
  })
  useEffect(() => {
    const soltar = () => {
      if (useLayout.getState().draggingAcceso != null) {
        useLayout.getState().endAccesoDrag()
        document.body.style.cursor = 'default'
      }
    }
    window.addEventListener('pointerup', soltar)
    return () => window.removeEventListener('pointerup', soltar)
  }, [])
  return null
}
