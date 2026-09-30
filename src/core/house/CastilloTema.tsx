import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useShallow } from 'zustand/react/shallow'
import { useLayout } from '../state/layoutStore'
import { useHouse } from '../state/houseStore'
import { useCuartos } from '../state/cuartosStore'
import { useMapaTablas } from '../state/mapaTablasStore'
import { useDiseño } from '../state/disenoStore'
import { baseDe, getTema, mezclar } from './temas'
import { FOOTPRINT_DEFAULT, SIZE, SPACING, WALL_H, centroCuarto3D, nivelBaseY, roomWallSegments, subId, worldToSubCell } from './walls'
import { ocupadoConZonas } from './planoGeometria'
import { filtrarSegmentosPorForma } from './murosPerimetroLoseta'
import { PINCELES_DEFAULT } from './murosPuertas'

/** Una pieza instanciada: centro y medidas (caja) o radio/alto (cilindro). */
interface Pieza {
  x: number
  y: number
  z: number
  sx: number
  sy: number
  sz: number
  /** Giro sobre Y (almenas a lo largo de una curva). */
  ry?: number
}

const sinRayo = () => null

/** ¿`v` cae justo en una línea de la rejilla (múltiplo de media celda)? */
function enLinea(v: number): boolean {
  const paso = SPACING / 2
  return Math.abs(Math.round(v / paso) * paso - v) < 1e-6
}

/** Lleva `v` a la línea de rejilla (múltiplo de media celda) si está a menos de `tol`. */
function aLinea(v: number, tol: number): number {
  const paso = SPACING / 2
  const l = Math.round(v / paso) * paso
  return Math.abs(l - v) <= tol ? l : v
}

/** Cajas o cilindros instanciados; no atrapan clics (la casa se sigue tocando igual). */
function Instancias({ piezas, geometria, color, rugosidad = 0.95 }: { piezas: Pieza[]; geometria: THREE.BufferGeometry; color: string; rugosidad?: number }) {
  const ref = useRef<THREE.InstancedMesh>(null)
  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    const m = new THREE.Matrix4()
    const q = new THREE.Quaternion()
    const eje = new THREE.Vector3(0, 1, 0)
    piezas.forEach((p, i) => {
      q.setFromAxisAngle(eje, p.ry ?? 0)
      m.compose(new THREE.Vector3(p.x, p.y, p.z), q, new THREE.Vector3(p.sx, p.sy, p.sz))
      mesh.setMatrixAt(i, m)
    })
    mesh.instanceMatrix.needsUpdate = true
    mesh.computeBoundingSphere()
  }, [piezas])
  if (!piezas.length) return null
  return (
    <instancedMesh key={piezas.length} ref={ref} args={[geometria, undefined, piezas.length]} castShadow receiveShadow raycast={sinRayo}>
      <meshStandardMaterial color={color} roughness={rugosidad} />
    </instancedMesh>
  )
}

/**
 * Tema medieval: la casa se vuelve castillo. Sobre cada muro EXTERIOR va una
 * cornisa con almenas rectangulares y en cada esquina de la fachada una torre
 * redonda con su corona almenada y aspilleras.
 */
export function CastilloTema() {
  const temaId = useDiseño((s) => s.temaGlobal)
  useDiseño((s) => s.temaRev)
  const arrastrando = useLayout((s) => s.draggingId != null)
  const tema = getTema(temaId)
  // Mientras se arrastra un cuarto las almenas se quedarían en su sitio viejo.
  if (baseDe(temaId) !== 'medieval' || !tema || arrastrando) return null
  return <Castillo piedra={mezclar(tema.shell.muroExt, '#c9b48f', 0.35)} />
}

function Castillo({ piedra }: { piedra: string }) {
  const L = useLayout(
    useShallow((s) => ({
      ocupadoPorNivel: s.ocupadoPorNivel,
      niveles: s.niveles,
      placed: s.placed,
      cells: s.cells,
      footprints: s.footprints,
      wallOverrides: s.wallOverrides,
      edgeStyles: s.edgeStyles,
      pinceles: s.pinceles,
      formasCelda: s.formasCelda,
      sinMuros: s.sinMuros,
    })),
  )
  const cuartos = useCuartos((s) => s.cuartos)
  const zonas = useMapaTablas((s) => s.zonas)
  const apilado = !useHouse((s) => s.explotado)
  const gl = useThree((s) => s.gl)

  const { cornisas, almenas, fustes, coronas, aspilleras } = useMemo(() => {
    const cornisas: Pieza[] = []
    const almenas: Pieza[] = []
    const fustes: Pieza[] = []
    const coronas: Pieza[] = []
    const aspilleras: Pieza[] = []
    // Extremos de los muros exteriores: donde se cruza uno horizontal con uno vertical hay esquina.
    const extremos = new Map<string, { x: number; z: number; y0: number; tope: number; nivel: number; grosor: number; h: boolean; v: boolean }>()

    for (const c of cuartos) {
      const id = c.id
      const anchor = L.cells[id]
      if (!L.placed[id] || !anchor || L.sinMuros[id]) continue
      const nivel = L.niveles[id] ?? 0
      const fp = L.footprints[id] ?? FOOTPRINT_DEFAULT
      const formas = L.formasCelda[id] ?? {}
      const ocupado = ocupadoConZonas(nivel, L.ocupadoPorNivel, zonas)
      const segs = filtrarSegmentosPorForma(
        roomWallSegments(anchor, fp, ocupado, L.wallOverrides[id], L.edgeStyles[id], L.pinceles[id] ?? PINCELES_DEFAULT, formas),
        formas,
      )
      const [rx, , rz] = centroCuarto3D(anchor, fp)
      const y0 = nivelBaseY(nivel, apilado)
      const arriba = apilado ? L.ocupadoPorNivel.get(nivel + 1) : undefined

      for (const s of segs) {
        if (!s.exterior) continue
        const tope = (s.yBase ?? 0) + (s.alturaM ?? WALL_H * (s.alto ?? 1))
        const horizontal = s.sx >= s.sz
        const largo = horizontal ? s.sx : s.sz
        const grosor = horizontal ? s.sz : s.sx
        const x = rx + s.cx
        const z = rz + s.cz
        // Con un cuarto apilado encima, su piso ocupa ese borde: ahí no caben almenas.
        if (arriba?.size) {
          const d = Math.hypot(rx - x, rz - z) || 1
          const { sc, sr } = worldToSubCell(x + ((rx - x) / d) * 0.3, z + ((rz - z) / d) * 0.3)
          if (arriba.has(subId(sc, sr))) continue
        }
        const yTope = y0 + tope
        cornisas.push({ x, y: yTope + 0.1, z, sx: horizontal ? largo + 0.2 : grosor + 0.3, sy: 0.22, sz: horizontal ? grosor + 0.3 : largo + 0.2 })
        const n = Math.max(1, Math.floor(largo / 0.9))
        const paso = largo / n
        for (let i = 0; i < n; i++) {
          const a = -largo / 2 + (i + 0.5) * paso
          almenas.push({
            x: horizontal ? x + a : x,
            y: yTope + 0.21 + 0.26,
            z: horizontal ? z : z + a,
            sx: horizontal ? paso * 0.55 : grosor + 0.12,
            sy: 0.52,
            sz: horizontal ? grosor + 0.12 : paso * 0.55,
          })
        }
        for (const sgn of [-1, 1]) {
          // El muro exterior se alarga medio grosor para cerrar la esquina: se ajusta el
          // extremo a la línea de la rejilla para que el horizontal y el vertical coincidan.
          const ex = horizontal ? aLinea(x + (sgn * largo) / 2, grosor) : x
          const ez = horizontal ? z : aLinea(z + (sgn * largo) / 2, grosor)
          const clave = `${nivel}:${Math.round(ex * 10)}:${Math.round(ez * 10)}`
          // Un extremo que no cae en la rejilla es el borde de una puerta, no una esquina.
          if (!enLinea(horizontal ? ex : ez)) continue
          const e = extremos.get(clave) ?? { x: ex, z: ez, y0, tope, nivel, grosor, h: false, v: false }
          if (horizontal) e.h = true
          else e.v = true
          e.tope = Math.max(e.tope, tope)
          extremos.set(clave, e)
        }
      }
    }

    const r = Math.min(1.4, Math.max(0.6, SIZE * 0.14))
    const torre = (x: number, z: number, y0: number, tope: number) => {
      const alto = tope + 1.3
      fustes.push({ x, y: y0 + alto / 2, z, sx: r, sy: alto, sz: r })
      coronas.push({ x, y: y0 + alto + 0.2, z, sx: r * 1.2, sy: 0.4, sz: r * 1.2 })
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * Math.PI * 2
        almenas.push({ x: x + Math.cos(a) * r * 1.08, y: y0 + alto + 0.62, z: z + Math.sin(a) * r * 1.08, sx: 0.32, sy: 0.45, sz: 0.32, ry: -a })
      }
      // Aspilleras hacia la cámara isométrica (+X/+Z), a media torre y arriba.
      for (const f of [0.35, 0.72]) {
        aspilleras.push({ x: x + r * 0.72, y: y0 + alto * f, z: z + r * 0.72, sx: 0.14, sy: 0.5, sz: 0.14, ry: Math.PI / 4 })
      }
    }
    const sueltosH: typeof sueltosV = []
    const sueltosV: { x: number; z: number; y0: number; tope: number; nivel: number; grosor: number }[] = []
    for (const e of extremos.values()) {
      if (e.h && e.v) torre(e.x, e.z, e.y0, e.tope)
      else if (e.h) sueltosH.push(e)
      else sueltosV.push(e)
    }
    // Esquinas redondeadas (celdas con forma): la curva no es un segmento, así que quedan
    // un extremo horizontal y uno vertical sueltos a la misma distancia de la esquina.
    // Se une con un cuarto de círculo almenado y la torre va a la mitad del arco.
    const usados = new Set<number>()
    for (const h of sueltosH) {
      let mejor = -1
      let dMejor = Infinity
      sueltosV.forEach((v, i) => {
        if (usados.has(i) || v.nivel !== h.nivel) return
        const dx = Math.abs(v.x - h.x)
        const dz = Math.abs(v.z - h.z)
        if (dx < 0.2 || dx > SPACING * 1.05 || Math.abs(dx - dz) > 0.3) return
        if (dx < dMejor) {
          dMejor = dx
          mejor = i
        }
      })
      if (mejor < 0) continue
      usados.add(mejor)
      const v = sueltosV[mejor]
      // Centro del arco: x del extremo horizontal, z del vertical.
      const ox = h.x
      const oz = v.z
      const R = Math.abs(v.x - h.x)
      const a0 = Math.atan2(h.z - oz, h.x - ox)
      let a1 = Math.atan2(v.z - oz, v.x - ox)
      if (a1 - a0 > Math.PI) a1 -= Math.PI * 2
      if (a0 - a1 > Math.PI) a1 += Math.PI * 2
      const tope = Math.max(h.tope, v.tope)
      const yTope = h.y0 + tope
      const n = Math.max(2, Math.floor((R * Math.abs(a1 - a0)) / 0.9))
      for (let i = 0; i < n; i++) {
        const a = a0 + ((i + 0.5) / n) * (a1 - a0)
        const px = ox + Math.cos(a) * R
        const pz = oz + Math.sin(a) * R
        const paso = (R * Math.abs(a1 - a0)) / n
        cornisas.push({ x: px, y: yTope + 0.1, z: pz, sx: h.grosor + 0.3, sy: 0.22, sz: paso * 1.05, ry: -a })
        almenas.push({ x: px, y: yTope + 0.47, z: pz, sx: h.grosor + 0.12, sy: 0.52, sz: paso * 0.55, ry: -a })
      }
      const am = (a0 + a1) / 2
      torre(ox + Math.cos(am) * R, oz + Math.sin(am) * R, h.y0, tope)
    }
    return { cornisas, almenas, fustes, coronas, aspilleras }
  }, [L, cuartos, zonas, apilado])

  const caja = useMemo(() => new THREE.BoxGeometry(1, 1, 1), [])
  const cilindro = useMemo(() => new THREE.CylinderGeometry(1, 1.06, 1, 20), [])
  useEffect(
    () => () => {
      caja.dispose()
      cilindro.dispose()
    },
    [caja, cilindro],
  )
  // Sombras congeladas: repintarlas cuando el castillo cambia.
  useEffect(() => {
    gl.shadowMap.needsUpdate = true
  }, [gl, cornisas, fustes])

  const oscura = mezclar(piedra, '#3f3a33', 0.3)
  return (
    <group>
      <Instancias piezas={cornisas} geometria={caja} color={oscura} />
      <Instancias piezas={almenas} geometria={caja} color={piedra} />
      <Instancias piezas={fustes} geometria={cilindro} color={piedra} />
      <Instancias piezas={coronas} geometria={cilindro} color={oscura} />
      <Instancias piezas={aspilleras} geometria={caja} color="#1c1917" rugosidad={1} />
    </group>
  )
}
