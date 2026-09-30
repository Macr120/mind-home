import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useShallow } from 'zustand/react/shallow'
import { useLayout } from '../state/layoutStore'
import { useHouse } from '../state/houseStore'
import { useCuartos } from '../state/cuartosStore'
import { useMapaTablas } from '../state/mapaTablasStore'
import { useDiseño } from '../state/disenoStore'
import { baseDe, getTema, mezclar, type TemaId } from './temas'
import { fachadaDeTema } from './fachadaTema'
import { FOOTPRINT_DEFAULT, SIZE, SPACING, WALL_H, centroCuarto3D, nivelBaseY, roomWallSegments, subId, worldToSubCell } from './walls'
import { ocupadoConZonas } from './planoGeometria'
import { filtrarSegmentosPorForma } from './murosPerimetroLoseta'
import { PINCELES_DEFAULT } from './murosPuertas'

/** Una pieza instanciada: centro, medidas (caja) o radio/alto (cilindro, cono, esfera) y giro sobre Y. */
interface Pieza {
  x: number
  y: number
  z: number
  sx: number
  sy: number
  sz: number
  ry?: number
}

/** Tramo del borde superior de un muro exterior. Su largo corre por el X local tras girar `ry`. */
interface Borde {
  x: number
  z: number
  /** Base del nivel y tope del muro (mundo). */
  y0: number
  yTope: number
  largo: number
  grosor: number
  ry: number
  /** Normal hacia afuera de la casa. */
  nx: number
  nz: number
  /** Pieza de un arco (esquina redondeada): ya viene cortada al paso. */
  arco: boolean
}

/** Esquina de la fachada donde va la torre, el poste o el adorno. */
interface Esquina {
  x: number
  z: number
  y0: number
  tope: number
}

type Forma = 'caja' | 'cilindro' | 'cono' | 'esfera' | 'carambano'

/** Un grupo de piezas iguales: misma forma y mismo material. */
interface Capa {
  forma: Forma
  color: string
  piezas: Pieza[]
  /** Brilla con su color (neón, focos, ventanas encendidas). */
  brilla?: boolean
  rugosidad?: number
  metal?: number
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

/** Pieza a `a` unidades a lo largo del borde, `afuera` hacia el exterior y a la altura `y`. */
function enBorde(b: Borde, a: number, y: number, sLargo: number, sAlto: number, sGrosor: number, afuera = 0): Pieza {
  return {
    x: b.x + Math.cos(b.ry) * a + b.nx * afuera,
    y,
    z: b.z - Math.sin(b.ry) * a + b.nz * afuera,
    sx: sLargo,
    sy: sAlto,
    sz: sGrosor,
    ry: b.ry,
  }
}

/** Posiciones repartidas a lo largo de un borde, una cada ~`paso` unidades. */
function aLoLargo(b: Borde, paso: number): number[] {
  const n = Math.max(1, Math.floor(b.largo / paso))
  return Array.from({ length: n }, (_, i) => -b.largo / 2 + (i + 0.5) * (b.largo / n))
}

/** Instancias de una capa; no atrapan clics (la casa se sigue tocando igual). */
function Instancias({ capa, geometria }: { capa: Capa; geometria: THREE.BufferGeometry }) {
  const ref = useRef<THREE.InstancedMesh>(null)
  const { piezas } = capa
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
    <instancedMesh key={piezas.length} ref={ref} args={[geometria, undefined, piezas.length]} castShadow={!capa.brilla} receiveShadow raycast={sinRayo}>
      <meshStandardMaterial
        color={capa.color}
        roughness={capa.rugosidad ?? 0.9}
        metalness={capa.metal ?? 0}
        emissive={capa.brilla ? capa.color : '#000000'}
        emissiveIntensity={capa.brilla ? 1.3 : 0}
      />
    </instancedMesh>
  )
}

/** Temas estáticos que visten la arquitectura de la casa. */
const CON_ARQUITECTURA: TemaId[] = ['medieval', 'espacio', 'terror', 'barbie', 'vaquero', 'cyberpunk', 'navidad']

/**
 * Temas estáticos: sobre cada muro EXTERIOR va el remate del tema (almenas, neón,
 * nieve, fachada del oeste…) y en cada esquina de la fachada su torre o adorno.
 */
export function ArquitecturaTema() {
  const temaId = useDiseño((s) => s.temaGlobal)
  useDiseño((s) => s.temaRev)
  const arrastrando = useLayout((s) => s.draggingId != null)
  const tema = getTema(temaId)
  const base = baseDe(temaId)
  const fachada = fachadaDeTema(temaId, tema)
  // Mientras se arrastra un cuarto las piezas se quedarían en su sitio viejo.
  if (!base || !CON_ARQUITECTURA.includes(base) || !tema || !fachada || arrastrando) return null
  return <Arquitectura base={base} color={fachada.color} acento={tema.paleta[1] ?? tema.paleta[0]} />
}

/** Bordes y esquinas de la fachada, a partir de los muros exteriores de cada cuarto. */
function usePerimetro() {
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

  return useMemo(() => {
    const bordes: Borde[] = []
    const esquinas: Esquina[] = []
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
        // Con un cuarto apilado encima, su piso ocupa ese borde: ahí no caben remates.
        if (arriba?.size) {
          const d = Math.hypot(rx - x, rz - z) || 1
          const { sc, sr } = worldToSubCell(x + ((rx - x) / d) * 0.3, z + ((rz - z) / d) * 0.3)
          if (arriba.has(subId(sc, sr))) continue
        }
        bordes.push({
          x,
          z,
          y0,
          yTope: y0 + tope,
          largo,
          grosor,
          ry: horizontal ? 0 : Math.PI / 2,
          nx: horizontal ? 0 : Math.sign(x - rx) || 1,
          nz: horizontal ? Math.sign(z - rz) || 1 : 0,
          arco: false,
        })
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

    const sueltosH: typeof sueltosV = []
    const sueltosV: { x: number; z: number; y0: number; tope: number; nivel: number; grosor: number }[] = []
    for (const e of extremos.values()) {
      if (e.h && e.v) esquinas.push(e)
      else if (e.h) sueltosH.push(e)
      else sueltosV.push(e)
    }
    // Esquinas redondeadas (celdas con forma): la curva no es un segmento, así que quedan
    // un extremo horizontal y uno vertical sueltos a la misma distancia de la esquina.
    // Se unen con un cuarto de círculo de bordes cortos y la esquina va a la mitad del arco.
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
      const n = Math.max(2, Math.floor((R * Math.abs(a1 - a0)) / 0.9))
      const paso = (R * Math.abs(a1 - a0)) / n
      for (let i = 0; i < n; i++) {
        const a = a0 + ((i + 0.5) / n) * (a1 - a0)
        bordes.push({
          x: ox + Math.cos(a) * R,
          z: oz + Math.sin(a) * R,
          y0: h.y0,
          yTope: h.y0 + tope,
          largo: paso,
          grosor: h.grosor,
          // El largo va tangente al arco.
          ry: Math.PI / 2 - a,
          nx: Math.cos(a),
          nz: Math.sin(a),
          arco: true,
        })
      }
      const am = (a0 + a1) / 2
      esquinas.push({ x: ox + Math.cos(am) * R, z: oz + Math.sin(am) * R, y0: h.y0, tope })
    }
    return { bordes, esquinas }
  }, [L, cuartos, zonas, apilado])
}

/** Radio de las torres según el tamaño de celda. */
const radioTorre = () => Math.min(1.4, Math.max(0.6, SIZE * 0.14))

/** Remate de cada tema: capas de piezas sobre bordes y esquinas. */
function vestir(base: TemaId, bordes: Borde[], esquinas: Esquina[], color: string, acento: string): Capa[] {
  const r = radioTorre()
  const oscuro = mezclar(color, '#1f1b18', 0.35)
  const capa = (forma: Forma, c: string, extra: Partial<Capa> = {}): Capa => ({ forma, color: c, piezas: [], ...extra })
  // Largo de la cornisa: los tramos rectos cierran la esquina, los del arco se solapan un poco.
  const largoCornisa = (b: Borde) => (b.arco ? b.largo * 1.05 : b.largo + 0.2)

  switch (base) {
    case 'medieval': {
      const cornisas = capa('caja', oscuro)
      const almenas = capa('caja', color)
      const fustes = capa('cilindro', color)
      const coronas = capa('cilindro', oscuro)
      const aspilleras = capa('caja', '#1c1917', { rugosidad: 1 })
      for (const b of bordes) {
        cornisas.piezas.push(enBorde(b, 0, b.yTope + 0.1, largoCornisa(b), 0.22, b.grosor + 0.3))
        const paso = b.largo / Math.max(1, Math.floor(b.largo / 0.9))
        for (const a of aLoLargo(b, 0.9)) almenas.piezas.push(enBorde(b, a, b.yTope + 0.47, paso * 0.55, 0.52, b.grosor + 0.12))
      }
      for (const e of esquinas) {
        const alto = e.tope + 1.3
        fustes.piezas.push({ x: e.x, y: e.y0 + alto / 2, z: e.z, sx: r, sy: alto, sz: r })
        coronas.piezas.push({ x: e.x, y: e.y0 + alto + 0.2, z: e.z, sx: r * 1.2, sy: 0.4, sz: r * 1.2 })
        for (let k = 0; k < 8; k++) {
          const a = (k / 8) * Math.PI * 2
          almenas.piezas.push({ x: e.x + Math.cos(a) * r * 1.08, y: e.y0 + alto + 0.62, z: e.z + Math.sin(a) * r * 1.08, sx: 0.32, sy: 0.45, sz: 0.32, ry: -a })
        }
        // Aspilleras hacia la cámara isométrica (+X/+Z), a media torre y arriba.
        for (const f of [0.35, 0.72]) {
          aspilleras.piezas.push({ x: e.x + r * 0.72, y: e.y0 + alto * f, z: e.z + r * 0.72, sx: 0.14, sy: 0.5, sz: 0.14, ry: Math.PI / 4 })
        }
      }
      return [cornisas, almenas, fustes, coronas, aspilleras]
    }

    case 'espacio': {
      // Estación espacial: cornisa de metal, franja de luz cian, antenas y módulos con cúpula.
      const metal = capa('caja', '#cbd5e1', { rugosidad: 0.3, metal: 0.8 })
      const franja = capa('caja', '#22d3ee', { brilla: true })
      const antenas = capa('cilindro', '#94a3b8', { rugosidad: 0.3, metal: 0.8 })
      const balizas = capa('esfera', '#f87171', { brilla: true })
      const modulos = capa('cilindro', '#e2e8f0', { rugosidad: 0.35, metal: 0.7 })
      const cupulas = capa('esfera', '#7dd3fc', { brilla: true })
      const anillos = capa('cilindro', '#22d3ee', { brilla: true })
      for (const b of bordes) {
        metal.piezas.push(enBorde(b, 0, b.yTope + 0.08, largoCornisa(b), 0.16, b.grosor + 0.25))
        franja.piezas.push(enBorde(b, 0, b.yTope - 0.35, largoCornisa(b), 0.1, b.grosor + 0.08))
        if (!b.arco && b.largo > 3) {
          const a = b.largo * 0.3
          antenas.piezas.push(enBorde(b, a, b.yTope + 0.8, 0.04, 1.4, 0.04))
          balizas.piezas.push(enBorde(b, a, b.yTope + 1.55, 0.1, 0.1, 0.1))
        }
      }
      for (const e of esquinas) {
        const alto = e.tope + 0.5
        modulos.piezas.push({ x: e.x, y: e.y0 + alto / 2, z: e.z, sx: r, sy: alto, sz: r })
        cupulas.piezas.push({ x: e.x, y: e.y0 + alto, z: e.z, sx: r * 0.85, sy: r * 0.7, sz: r * 0.85 })
        anillos.piezas.push({ x: e.x, y: e.y0 + alto * 0.55, z: e.z, sx: r * 1.08, sy: 0.12, sz: r * 1.08 })
      }
      return [metal, franja, antenas, balizas, modulos, cupulas, anillos]
    }

    case 'terror': {
      // Casa embrujada: alero de madera vieja con picos y torres puntiagudas con una luz.
      const alero = capa('caja', '#2b211d', { rugosidad: 1 })
      const picos = capa('cono', '#1c1512', { rugosidad: 1 })
      const fustes = capa('cilindro', oscuro, { rugosidad: 1 })
      const techos = capa('cono', '#2e1f2e', { rugosidad: 0.9 })
      const ventanas = capa('caja', '#fbbf24', { brilla: true })
      for (const b of bordes) {
        alero.piezas.push(enBorde(b, 0, b.yTope + 0.08, largoCornisa(b), 0.16, b.grosor + 0.45, 0.08))
        for (const a of aLoLargo(b, 0.7)) picos.piezas.push(enBorde(b, a, b.yTope + 0.36, 0.1, 0.42, 0.1))
      }
      for (const e of esquinas) {
        const alto = e.tope + 1.6
        fustes.piezas.push({ x: e.x, y: e.y0 + alto / 2, z: e.z, sx: r * 0.8, sy: alto, sz: r * 0.8 })
        techos.piezas.push({ x: e.x, y: e.y0 + alto + 1.1, z: e.z, sx: r * 1.25, sy: 2.2, sz: r * 1.25 })
        ventanas.piezas.push({ x: e.x + r * 0.58, y: e.y0 + alto * 0.78, z: e.z + r * 0.58, sx: 0.36, sy: 0.5, sz: 0.08, ry: Math.PI / 4 })
      }
      return [alero, picos, fustes, techos, ventanas]
    }

    case 'barbie': {
      // Palacio de cuento: cornisa blanca con perlas rosas y torres con cono y banderín.
      const cornisa = capa('caja', '#fff1f7', { rugosidad: 0.5 })
      const perlas = capa('esfera', '#f9a8d4', { rugosidad: 0.3 })
      const fustes = capa('cilindro', color, { rugosidad: 0.6 })
      const conos = capa('cono', '#ec4899', { rugosidad: 0.4 })
      const aros = capa('cilindro', '#fde68a', { rugosidad: 0.3, metal: 0.6 })
      const mastiles = capa('cilindro', '#f5f5f4', { rugosidad: 0.4 })
      const banderas = capa('caja', acento, { rugosidad: 0.6 })
      for (const b of bordes) {
        cornisa.piezas.push(enBorde(b, 0, b.yTope + 0.08, largoCornisa(b), 0.16, b.grosor + 0.3))
        for (const a of aLoLargo(b, 0.6)) perlas.piezas.push(enBorde(b, a, b.yTope + 0.3, 0.2, 0.2, 0.2))
      }
      for (const e of esquinas) {
        const alto = e.tope + 1.2
        fustes.piezas.push({ x: e.x, y: e.y0 + alto / 2, z: e.z, sx: r * 0.9, sy: alto, sz: r * 0.9 })
        aros.piezas.push({ x: e.x, y: e.y0 + alto, z: e.z, sx: r * 1.05, sy: 0.14, sz: r * 1.05 })
        conos.piezas.push({ x: e.x, y: e.y0 + alto + 1.3, z: e.z, sx: r * 1.15, sy: 2.6, sz: r * 1.15 })
        mastiles.piezas.push({ x: e.x, y: e.y0 + alto + 3, z: e.z, sx: 0.04, sy: 1, sz: 0.04 })
        banderas.piezas.push({ x: e.x + 0.3, y: e.y0 + alto + 3.3, z: e.z, sx: 0.55, sy: 0.32, sz: 0.03 })
      }
      return [cornisa, perlas, fustes, aros, conos, mastiles, banderas]
    }

    case 'vaquero': {
      // Pueblo del oeste: fachada falsa escalonada, porche con postes y barriles en las esquinas.
      const tablero = capa('caja', color, { rugosidad: 1 })
      const remate = capa('caja', oscuro, { rugosidad: 1 })
      const postes = capa('caja', '#6b4a28', { rugosidad: 1 })
      const tejaroz = capa('caja', '#5a3a22', { rugosidad: 1 })
      const barriles = capa('cilindro', '#7c4a1e', { rugosidad: 0.9 })
      const aros = capa('cilindro', '#3f3f46', { rugosidad: 0.5, metal: 0.6 })
      for (const b of bordes) {
        const alto = 0.8
        tablero.piezas.push(enBorde(b, 0, b.yTope + alto / 2, largoCornisa(b), alto, 0.12, b.grosor / 2))
        remate.piezas.push(enBorde(b, 0, b.yTope + alto + 0.05, largoCornisa(b) + 0.1, 0.1, 0.22, b.grosor / 2))
        if (!b.arco && b.largo > 2.5) {
          // Escalón central de la fachada falsa.
          tablero.piezas.push(enBorde(b, 0, b.yTope + alto + 0.3, b.largo * 0.4, 0.5, 0.12, b.grosor / 2))
          remate.piezas.push(enBorde(b, 0, b.yTope + alto + 0.6, b.largo * 0.4 + 0.1, 0.1, 0.22, b.grosor / 2))
        }
        // Porche: solo en la planta baja.
        if (!b.arco && Math.abs(b.y0) < 0.01) {
          const h = b.yTope - b.y0 - 0.4
          for (const a of aLoLargo(b, 1.8)) postes.piezas.push(enBorde(b, a, b.y0 + h / 2, 0.14, h, 0.14, b.grosor / 2 + 1))
          tejaroz.piezas.push(enBorde(b, 0, b.y0 + h + 0.04, b.largo, 0.08, 1.15, b.grosor / 2 + 0.55))
        }
      }
      for (const e of esquinas) {
        const alto = e.tope + 0.5
        postes.piezas.push({ x: e.x, y: e.y0 + alto / 2, z: e.z, sx: 0.32, sy: alto, sz: 0.32 })
        barriles.piezas.push({ x: e.x + 0.75, y: e.y0 + 0.42, z: e.z + 0.75, sx: 0.32, sy: 0.84, sz: 0.32 })
        for (const f of [0.15, 0.69]) aros.piezas.push({ x: e.x + 0.75, y: e.y0 + f, z: e.z + 0.75, sx: 0.34, sy: 0.05, sz: 0.34 })
      }
      return [tablero, remate, postes, tejaroz, barriles, aros]
    }

    case 'cyberpunk': {
      // Neón: tiras magenta arriba y cian al pie, antenas con balizas y carteles luminosos.
      const cornisa = capa('caja', '#111018', { rugosidad: 0.4, metal: 0.6 })
      const neonA = capa('caja', '#d946ef', { brilla: true })
      const neonB = capa('caja', '#22d3ee', { brilla: true })
      const antenas = capa('cilindro', '#1f2937', { rugosidad: 0.4, metal: 0.7 })
      const balizas = capa('esfera', '#ef4444', { brilla: true })
      const cartelA = capa('caja', '#f0abfc', { brilla: true })
      const cartelB = capa('caja', '#67e8f9', { brilla: true })
      for (const b of bordes) {
        cornisa.piezas.push(enBorde(b, 0, b.yTope + 0.06, largoCornisa(b), 0.12, b.grosor + 0.2))
        neonA.piezas.push(enBorde(b, 0, b.yTope - 0.08, largoCornisa(b), 0.06, 0.05, b.grosor / 2 + 0.04))
        if (Math.abs(b.y0) < 0.01) neonB.piezas.push(enBorde(b, 0, b.y0 + 0.12, largoCornisa(b), 0.06, 0.05, b.grosor / 2 + 0.04))
      }
      esquinas.forEach((e, i) => {
        const alto = e.tope + 3
        antenas.piezas.push({ x: e.x, y: e.y0 + alto / 2, z: e.z, sx: 0.07, sy: alto, sz: 0.07 })
        for (const f of [0.6, 1]) balizas.piezas.push({ x: e.x, y: e.y0 + alto * f, z: e.z, sx: 0.12, sy: 0.12, sz: 0.12 })
        const cartel = i % 2 ? cartelB : cartelA
        cartel.piezas.push({ x: e.x + 0.35, y: e.y0 + e.tope + 0.9, z: e.z + 0.35, sx: 1.2, sy: 0.55, sz: 0.06, ry: Math.PI / 4 })
      })
      return [cornisa, neonA, neonB, antenas, balizas, cartelA, cartelB]
    }

    case 'navidad': {
      // Cabaña nevada: nieve en la cornisa, carámbanos, guirnalda de focos y bastones de caramelo.
      const nieve = capa('caja', '#f8fafc', { rugosidad: 0.7 })
      const carambanos = capa('carambano', '#dbeafe', { rugosidad: 0.2 })
      const focos = ['#ef4444', '#facc15', '#22c55e', '#3b82f6'].map((c) => capa('esfera', c, { brilla: true }))
      const rojo = capa('cilindro', '#dc2626', { rugosidad: 0.4 })
      const blanco = capa('cilindro', '#fafafa', { rugosidad: 0.4 })
      for (const b of bordes) {
        nieve.piezas.push(enBorde(b, 0, b.yTope + 0.1, largoCornisa(b) + 0.05, 0.2, b.grosor + 0.38))
        aLoLargo(b, 0.5).forEach((a, i) => {
          if (i % 2 === 0) carambanos.piezas.push(enBorde(b, a, b.yTope - 0.22, 0.06, 0.4, 0.06, b.grosor / 2 + 0.12))
        })
        aLoLargo(b, 0.42).forEach((a, i) => focos[i % 4].piezas.push(enBorde(b, a, b.yTope - 0.12, 0.07, 0.09, 0.07, b.grosor / 2 + 0.05)))
      }
      for (const e of esquinas) {
        // Bastón de caramelo: franjas rojas y blancas apiladas.
        const alto = e.tope + 0.6
        const n = Math.round(alto / 0.3)
        for (let i = 0; i < n; i++) {
          const franja = i % 2 ? blanco : rojo
          franja.piezas.push({ x: e.x, y: e.y0 + (i + 0.5) * (alto / n), z: e.z, sx: 0.2, sy: alto / n, sz: 0.2 })
        }
        rojo.piezas.push({ x: e.x + 0.2, y: e.y0 + alto + 0.12, z: e.z, sx: 0.2, sy: 0.24, sz: 0.2 })
      }
      return [nieve, carambanos, ...focos, rojo, blanco]
    }

    default:
      return []
  }
}

function Arquitectura({ base, color, acento }: { base: TemaId; color: string; acento: string }) {
  const { bordes, esquinas } = usePerimetro()
  const gl = useThree((s) => s.gl)
  const capas = useMemo(() => vestir(base, bordes, esquinas, color, acento), [base, bordes, esquinas, color, acento])

  const geometrias = useMemo<Record<Forma, THREE.BufferGeometry>>(
    () => ({
      caja: new THREE.BoxGeometry(1, 1, 1),
      cilindro: new THREE.CylinderGeometry(1, 1.06, 1, 20),
      cono: new THREE.ConeGeometry(1, 1, 16),
      esfera: new THREE.SphereGeometry(1, 16, 12),
      // Cono con la punta hacia abajo (carámbanos).
      carambano: new THREE.ConeGeometry(1, 1, 8).rotateX(Math.PI),
    }),
    [],
  )
  useEffect(() => () => Object.values(geometrias).forEach((g) => g.dispose()), [geometrias])
  // Sombras congeladas: repintarlas cuando cambian las piezas.
  useEffect(() => {
    gl.shadowMap.needsUpdate = true
  }, [gl, capas])

  return (
    <group>
      {capas.map((capa, i) => (
        <Instancias key={`${base}-${i}`} capa={capa} geometria={geometrias[capa.forma]} />
      ))}
    </group>
  )
}
