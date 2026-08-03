import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { useThree } from '@react-three/fiber'
import { VACIO, pistasLibresRepo } from '../data/repository'
import { usePistaLibreEditor, curvaDePista, setPistaLibre } from '../state/pistaLibreStore'
import { SUPERFICIE_PISTA } from '../state/carreraStore'
import { useHouse } from '../state/houseStore'
import { useLayout } from '../state/layoutStore'
import { puntoSueloBajoCursor } from './arrastreCelda'
import { MetaPista } from './caminos'
import type { PistaLibre } from '../data/db'

/**
 * Pista de carreras de TRAZO LIBRE: puntos de control → curva Catmull-Rom →
 * cinta de asfalto continua (ribbon). El controller captura los clics del
 * sub-modo de edición y el render vive siempre montado (como Caminos3D).
 */

/** Radio para agarrar/borrar un punto de control con el cursor. */
const RADIO_PUNTO = 1.5

export function TrazoLibreController() {
  const activo = usePistaLibreEditor((s) => s.activo)
  return activo ? <TrazoLibreActivo /> : null
}

function TrazoLibreActivo() {
  const gl = useThree((s) => s.gl)
  const camera = useThree((s) => s.camera)
  const apilado = !useHouse((s) => s.explotado)
  const gridCols = useLayout((s) => s.gridCols)
  const gridRows = useLayout((s) => s.gridRows)
  const puntos = usePistaLibreEditor((s) => s.puntos)

  useEffect(() => {
    const dom = gl.domElement
    const opts = { canvas: dom, camera, nivel: 0, apilado, gridCols, gridRows }
    let downX = 0
    let downY = 0
    let moviendo = -1

    const puntoCerca = (x: number, z: number) => {
      const pts = usePistaLibreEditor.getState().puntos
      let mejor = -1
      let dMin = RADIO_PUNTO
      pts.forEach((p, i) => {
        const d = Math.hypot(p.x - x, p.z - z)
        if (d < dMin) {
          dMin = d
          mejor = i
        }
      })
      return mejor
    }

    // Captura (fase capture): al agarrar un punto se frena a la cámara.
    const onDown = (ev: PointerEvent) => {
      downX = ev.clientX
      downY = ev.clientY
      if (usePistaLibreEditor.getState().herramienta !== 'mover') return
      const p = puntoSueloBajoCursor(ev.clientX, ev.clientY, opts)
      if (!p) return
      const i = puntoCerca(p.x, p.z)
      if (i >= 0) {
        moviendo = i
        ev.stopPropagation()
        dom.setPointerCapture(ev.pointerId)
      }
    }
    const onMove = (ev: PointerEvent) => {
      if (moviendo < 0) return
      ev.stopPropagation()
      const p = puntoSueloBajoCursor(ev.clientX, ev.clientY, opts)
      if (p) usePistaLibreEditor.getState().moverPunto(moviendo, p.x, p.z)
    }
    const onUp = (ev: PointerEvent) => {
      if (moviendo >= 0) {
        moviendo = -1
        ev.stopPropagation()
        usePistaLibreEditor.getState().persistir()
        return
      }
      if (ev.button !== 0) return
      if (Math.hypot(ev.clientX - downX, ev.clientY - downY) > 6) return // fue cámara
      const st = usePistaLibreEditor.getState()
      const p = puntoSueloBajoCursor(ev.clientX, ev.clientY, opts)
      if (!p) return
      if (st.herramienta === 'punto') {
        st.agregarPunto(p.x, p.z)
      } else if (st.herramienta === 'borrarPunto') {
        const i = puntoCerca(p.x, p.z)
        if (i >= 0) st.borrarPunto(i)
      }
    }

    dom.addEventListener('pointerdown', onDown, true)
    dom.addEventListener('pointermove', onMove, true)
    dom.addEventListener('pointerup', onUp, true)
    return () => {
      dom.removeEventListener('pointerdown', onDown, true)
      dom.removeEventListener('pointermove', onMove, true)
      dom.removeEventListener('pointerup', onUp, true)
    }
  }, [gl, camera, apilado, gridCols, gridRows])

  // Marcadores de los puntos de control (el primero es la meta, en blanco).
  return (
    <group>
      {puntos.map((p, i) => (
        <mesh key={i} position={[p.x, 0.55, p.z]}>
          <sphereGeometry args={[0.25, 12, 12]} />
          <meshStandardMaterial
            color={i === 0 ? '#f8fafc' : '#34d399'}
            emissive={i === 0 ? '#f8fafc' : '#34d399'}
            emissiveIntensity={0.35}
          />
        </mesh>
      ))}
    </group>
  )
}

/** Geometría del ribbon + rayas + pose de la meta a partir de los puntos. */
function construirRibbon(puntos: { x: number; z: number }[], cerrada: boolean) {
  const curva = curvaDePista(puntos, cerrada)
  if (!curva) return null
  const largo = curva.getLength()
  const n = Math.max(8, Math.round(largo / 0.5))
  const pts = curva.getSpacedPoints(n)
  const cerrado = cerrada && puntos.length >= 3
  if (cerrado) pts.pop() // el último duplica al primero
  const m = pts.length
  if (m < 2) return null
  const pos = new Float32Array(m * 2 * 3)
  for (let i = 0; i < m; i++) {
    // Tangente por diferencia central; normal en el plano = perpendicular.
    const prev = pts[cerrado ? (i - 1 + m) % m : Math.max(0, i - 1)]
    const next = pts[cerrado ? (i + 1) % m : Math.min(m - 1, i + 1)]
    let tx = next.x - prev.x
    let tz = next.z - prev.z
    const len = Math.hypot(tx, tz) || 1
    tx /= len
    tz /= len
    const nx = -tz
    const nz = tx
    pos[i * 6 + 0] = pts[i].x + nx * 1.3
    pos[i * 6 + 1] = SUPERFICIE_PISTA
    pos[i * 6 + 2] = pts[i].z + nz * 1.3
    pos[i * 6 + 3] = pts[i].x - nx * 1.3
    pos[i * 6 + 4] = SUPERFICIE_PISTA
    pos[i * 6 + 5] = pts[i].z - nz * 1.3
  }
  const segs = cerrado ? m : m - 1
  const idx: number[] = []
  for (let i = 0; i < segs; i++) {
    const a = i * 2
    const b = ((i + 1) % m) * 2
    idx.push(a, b, a + 1, a + 1, b, b + 1)
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  geo.setIndex(idx)
  geo.computeVertexNormals()
  // Rayas centrales discontinuas a lo largo de la curva.
  const rayas: { x: number; z: number; rot: number }[] = []
  const nRayas = Math.max(1, Math.floor(largo / 1.75))
  for (let k = 0; k < nRayas; k++) {
    const t = (k + 0.5) / nRayas
    const p = curva.getPointAt(t)
    const tg = curva.getTangentAt(t)
    rayas.push({ x: p.x, z: p.z, rot: Math.atan2(-tg.z, tg.x) })
  }
  // Meta en t=0 orientada por la tangente (+X local = tangente).
  const t0 = curva.getTangentAt(0)
  const meta =
    puntos.length >= 3 ? { x: pts[0].x, z: pts[0].z, rot: Math.atan2(-t0.z, t0.x) } : null
  return { geo, rayas, meta }
}

/** Render de la pista libre (siempre montado; en edición lee el store en vivo). */
export function PistaLibre3D() {
  const filas = pistasLibresRepo.useAll()
  const editor = usePistaLibreEditor((s) => s.activo)
  const puntosEd = usePistaLibreEditor((s) => s.puntos)
  const cerradaEd = usePistaLibreEditor((s) => s.cerrada)
  const pista: PistaLibre | null = filas?.[0] ?? null
  const puntos = editor ? puntosEd : (pista?.puntos ?? VACIO)
  const cerrada = editor ? cerradaEd : (pista?.cerrada ?? false)

  // Sincroniza el runtime de carrera con la pista PERSISTIDA (editando se
  // deshabilita la carrera libre; al salir del editor vuelve a habilitarse).
  useEffect(() => {
    setPistaLibre(editor ? null : pista)
  }, [pista, editor])

  const datos = useMemo(() => construirRibbon(puntos, cerrada), [puntos, cerrada])
  useEffect(() => () => datos?.geo.dispose(), [datos])
  if (!datos) return null
  return (
    <group>
      <mesh geometry={datos.geo}>
        <meshStandardMaterial color="#3f3f46" roughness={0.9} side={THREE.DoubleSide} />
      </mesh>
      {datos.rayas.map((r, i) => (
        <mesh key={i} position={[r.x, SUPERFICIE_PISTA + 0.006, r.z]} rotation-y={r.rot}>
          <boxGeometry args={[0.5, 0.012, 0.14]} />
          <meshStandardMaterial color="#facc15" roughness={0.6} />
        </mesh>
      ))}
      {datos.meta && (
        <group position={[datos.meta.x, 0, datos.meta.z]} rotation-y={datos.meta.rot}>
          <MetaPista ejeEO yb={0.2} />
        </group>
      )}
    </group>
  )
}
