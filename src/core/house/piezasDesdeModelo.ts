import { Children, isValidElement, Fragment, type ReactNode, type ReactElement } from 'react'
import type { Pieza3D } from '../chat/mascotas'

/**
 * Convierte el modelo 3D de un objeto (árbol de primitivas de React Three Fiber)
 * en una lista editable de `Pieza3D` — la misma que usa el editor de piezas. Así,
 * al pulsar el engrane ⚙️ de un objeto del catálogo o de un recurso, se obtiene
 * una RÉPLICA FIEL de su forma real (no una simple caja) lista para modificar.
 *
 * Recorre el árbol acumulando el desplazamiento de cada `<group>`, lee las mallas
 * intrínsecas (`<mesh>` + geometría + material) y, con `expandir`, ejecuta los
 * componentes primitivos sin hooks (B/C/S/Cone… de modelosRecursos) para bajar a
 * las mallas que dibujan. Las geometrías sin equivalente (p. ej. toro) se omiten.
 */

type Vec3 = [number, number, number]

const v3 = (x: unknown): Vec3 =>
  Array.isArray(x) ? [Number(x[0]) || 0, Number(x[1]) || 0, Number(x[2]) || 0] : [0, 0, 0]
const suma = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]]

/** Extrae una pieza (con su posición local) de una primitiva reconocida por referencia. */
export type Extractor = (props: Record<string, unknown>) => Pieza3D | null

export interface Opciones {
  /** Primitivas reconocidas por referencia (para las que usan hooks y no se pueden ejecutar). */
  prims?: Map<unknown, Extractor>
  /** Ejecutar componentes desconocidos (sin hooks) para llegar a sus `<mesh>`. */
  expandir?: boolean
}

/** Una geometría intrínseca de R3F + color → pieza equivalente. */
function desdeGeometria(tipo: string, args: unknown, color: string, pos: Vec3, rot?: Vec3): Pieza3D | null {
  const a = (Array.isArray(args) ? args : []) as number[]
  const base = rot ? { rot } : {}
  switch (tipo) {
    case 'boxGeometry':
      return { tipo: 'caja', pos, tam: [a[0] ?? 0.3, a[1] ?? 0.3, a[2] ?? 0.3], color, ...base }
    case 'sphereGeometry':
      return { tipo: 'esfera', pos, tam: [a[0] ?? 0.2], color, ...base }
    case 'coneGeometry':
      return { tipo: 'cono', pos, tam: [a[0] ?? 0.2, a[1] ?? 0.4], color, ...base }
    case 'cylinderGeometry':
      return { tipo: 'cilindro', pos, tam: [a[0] ?? 0.15, a[1] ?? 0.15, a[2] ?? 0.4], color, ...base }
    case 'planeGeometry':
      return { tipo: 'plano', pos, tam: [a[0] ?? 0.5, a[1] ?? 0.5], color, ...base }
    default:
      return null // toro u otras: sin equivalente en Pieza3D
  }
}

/** Lee una malla intrínseca (`<mesh>` con su geometría y su material) como pieza. */
function desdeMesh(el: ReactElement, off: Vec3): Pieza3D | null {
  const props = el.props as Record<string, unknown>
  const pos = suma(off, v3(props.position))
  const rot = props.rotation ? v3(props.rotation) : undefined
  let geoTipo: string | null = null
  let geoArgs: unknown = null
  let color = '#cccccc'
  Children.forEach(props.children as ReactNode, (ch) => {
    if (!isValidElement(ch) || typeof ch.type !== 'string') return
    const cp = ch.props as Record<string, unknown>
    if (ch.type.endsWith('Geometry')) {
      geoTipo = ch.type
      geoArgs = cp.args
    } else if (ch.type.endsWith('Material') && typeof cp.color === 'string') {
      color = cp.color
    }
  })
  return geoTipo ? desdeGeometria(geoTipo, geoArgs, color, pos, rot) : null
}

/** Recorre el árbol de un modelo (grupos, mallas y primitivas) y devuelve sus piezas. */
export function piezasDesdeElemento(root: ReactNode, opts: Opciones = {}): Pieza3D[] {
  const out: Pieza3D[] = []
  const visitar = (node: ReactNode, off: Vec3) => {
    Children.forEach(node, (el) => {
      if (!isValidElement(el)) return
      const tipo = el.type as unknown
      const props = el.props as Record<string, unknown>

      // 1) Primitiva reconocida por referencia (no ejecutable por sus hooks).
      const extractor = opts.prims?.get(tipo)
      if (extractor) {
        const pz = extractor(props)
        if (pz) out.push({ ...pz, pos: suma(off, pz.pos) })
        return
      }
      // 2) Fragmento o grupo: bajar (acumulando el desplazamiento del grupo).
      if (tipo === Fragment) return visitar(props.children as ReactNode, off)
      if (tipo === 'group') return visitar(props.children as ReactNode, suma(off, v3(props.position)))
      // 3) Malla intrínseca.
      if (tipo === 'mesh') {
        const pz = desdeMesh(el, off)
        if (pz) out.push(pz)
        return
      }
      // 4) Componente sin hooks: ejecutarlo y bajar a lo que dibuja.
      if (opts.expandir && typeof tipo === 'function') {
        try {
          visitar((tipo as (p: unknown) => ReactNode)(props), off)
        } catch {
          /* usa hooks o no dibuja nada: se omite */
        }
        return
      }
      // 5) Otro contenedor con hijos.
      if (props.children) visitar(props.children as ReactNode, off)
    })
  }
  visitar(root, [0, 0, 0])
  return out
}
