import * as THREE from 'three'
import type { Camera } from 'three'
import { svgACeldaMedia, svgACelda } from './planoGeometria'
import { worldToCell, worldToCeldaEntera, cellToWorld, nivelBaseY, type Cell } from './walls'
import { zonaEdicionActiva } from '../state/planosStore'
import { celdaEnCuadrante } from './cuadrantesMapa'

/**
 * Con una zona de trabajo activa, las celdas de fuera quedan deshabilitadas: devolver
 * `null` aquí apaga de golpe la edición, el arrastre y los previews de todos los
 * controladores 3D, que resuelven la celda bajo el cursor por esta vía.
 */
function dentroDeZona<T extends Cell>(c: T | null): T | null {
  if (!c) return null
  const z = zonaEdicionActiva()
  return !z || celdaEnCuadrante(c.col, c.row, z) ? c : null
}

const _plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
const _ray = new THREE.Raycaster()
const _hit = new THREE.Vector3()

let svgPlano: SVGSVGElement | null = null

/** Registra el SVG del croquis para proyectar arrastres en la mitad superior. */
export function registrarSvgPlano(el: SVGSVGElement | null) {
  svgPlano = el
}

function celdaDesdeSvg(clientX: number, clientY: number, cols: number, rows: number): Cell | null {
  const svg = svgPlano
  if (!svg) return null
  const rect = svg.getBoundingClientRect()
  if (
    clientX < rect.left ||
    clientX > rect.right ||
    clientY < rect.top ||
    clientY > rect.bottom
  ) {
    return null
  }
  const pt = svg.createSVGPoint()
  pt.x = clientX
  pt.y = clientY
  const ctm = svg.getScreenCTM()
  if (!ctm) return null
  const loc = pt.matrixTransform(ctm.inverse())
  return svgACeldaMedia(loc.x, loc.y, cols, rows)
}

function celdaEnteraDesdeSvg(clientX: number, clientY: number, cols: number, rows: number): Cell | null {
  const svg = svgPlano
  if (!svg) return null
  const rect = svg.getBoundingClientRect()
  if (
    clientX < rect.left ||
    clientX > rect.right ||
    clientY < rect.top ||
    clientY > rect.bottom
  ) {
    return null
  }
  const pt = svg.createSVGPoint()
  pt.x = clientX
  pt.y = clientY
  const ctm = svg.getScreenCTM()
  if (!ctm) return null
  const loc = pt.matrixTransform(ctm.inverse())
  return svgACelda(loc.x, loc.y, cols, rows)
}

const _ndc = new THREE.Vector2()

function celdaDesdeCanvas3D(
  clientX: number,
  clientY: number,
  canvas: HTMLCanvasElement,
  camera: Camera,
  nivel: number,
  apilado: boolean,
  gridCols: number,
  gridRows: number,
): Cell | null {
  const rect = canvas.getBoundingClientRect()
  if (
    clientX < rect.left ||
    clientX > rect.right ||
    clientY < rect.top ||
    clientY > rect.bottom
  ) {
    return null
  }
  const ndcX = ((clientX - rect.left) / rect.width) * 2 - 1
  const ndcY = -((clientY - rect.top) / rect.height) * 2 + 1
  _plane.constant = -nivelBaseY(nivel, apilado)
  _ndc.set(ndcX, ndcY)
  _ray.setFromCamera(_ndc, camera)
  if (!_ray.ray.intersectPlane(_plane, _hit)) return null
  const c = worldToCell(_hit.x, _hit.z)
  if (c.col < 0 || c.row < 0 || c.col > gridCols - 0.5 || c.row > gridRows - 0.5) return null
  return c
}

/** Celda entera bajo el cursor (croquis o suelo 3D) — herramienta Agregar. */
export function celdaEnteraBajoCursor(
  clientX: number,
  clientY: number,
  opts: {
    canvas: HTMLCanvasElement
    camera: Camera
    nivel: number
    apilado: boolean
    gridCols: number
    gridRows: number
  },
): Cell | null {
  return dentroDeZona(
    celdaEnteraDesdeSvg(clientX, clientY, opts.gridCols, opts.gridRows) ??
      celdaEnteraDesdeCanvas3D(
        clientX,
        clientY,
        opts.canvas,
        opts.camera,
        opts.nivel,
        opts.apilado,
        opts.gridCols,
        opts.gridRows,
      ),
  )
}

function celdaEnteraDesdeCanvas3D(
  clientX: number,
  clientY: number,
  canvas: HTMLCanvasElement,
  camera: Camera,
  nivel: number,
  apilado: boolean,
  _gridCols: number,
  _gridRows: number,
): Cell | null {
  const rect = canvas.getBoundingClientRect()
  if (
    clientX < rect.left ||
    clientX > rect.right ||
    clientY < rect.top ||
    clientY > rect.bottom
  ) {
    return null
  }
  const ndcX = ((clientX - rect.left) / rect.width) * 2 - 1
  const ndcY = -((clientY - rect.top) / rect.height) * 2 + 1
  _plane.constant = -nivelBaseY(nivel, apilado)
  _ndc.set(ndcX, ndcY)
  _ray.setFromCamera(_ndc, camera)
  if (!_ray.ray.intersectPlane(_plane, _hit)) return null
  return worldToCeldaEntera(_hit.x, _hit.z)
}

/** Celda bajo el cursor: croquis 2D o suelo 3D según dónde esté el puntero. */
export function celdaBajoCursor(
  clientX: number,
  clientY: number,
  opts: {
    canvas: HTMLCanvasElement
    camera: Camera
    nivel: number
    apilado: boolean
    gridCols: number
    gridRows: number
  },
): Cell | null {
  return dentroDeZona(
    celdaDesdeSvg(clientX, clientY, opts.gridCols, opts.gridRows) ??
      celdaDesdeCanvas3D(
        clientX,
        clientY,
        opts.canvas,
        opts.camera,
        opts.nivel,
        opts.apilado,
        opts.gridCols,
        opts.gridRows,
      ),
  )
}

/**
 * Punto del suelo 3D bajo el cursor (x,z mundo) + celda entera. Para colocar muros libres
 * en 3D: la celda elige la forma; el punto, el lado (arista) más cercano dentro de la celda.
 */
export function puntoSueloBajoCursor(
  clientX: number,
  clientY: number,
  opts: {
    canvas: HTMLCanvasElement
    camera: Camera
    nivel: number
    apilado: boolean
    gridCols: number
    gridRows: number
  },
): { x: number; z: number; cell: Cell } | null {
  const rect = opts.canvas.getBoundingClientRect()
  if (clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom) {
    return null
  }
  const ndcX = ((clientX - rect.left) / rect.width) * 2 - 1
  const ndcY = -((clientY - rect.top) / rect.height) * 2 + 1
  _plane.constant = -nivelBaseY(opts.nivel, opts.apilado)
  _ndc.set(ndcX, ndcY)
  _ray.setFromCamera(_ndc, opts.camera)
  if (!_ray.ray.intersectPlane(_plane, _hit)) return null
  const cell = worldToCeldaEntera(_hit.x, _hit.z)
  if (cell.col < 0 || cell.row < 0 || cell.col > opts.gridCols - 1 || cell.row > opts.gridRows - 1) {
    return null
  }
  if (!dentroDeZona(cell)) return null
  return { x: _hit.x, z: _hit.z, cell }
}

/** Cuadrante (¼) bajo el cursor en el suelo 3D (para pintar piso fino). Solo canvas 3D. */
export function cuadranteBajoCursor(
  clientX: number,
  clientY: number,
  opts: { canvas: HTMLCanvasElement; camera: Camera; nivel: number; apilado: boolean },
): Cell | null {
  const rect = opts.canvas.getBoundingClientRect()
  if (
    clientX < rect.left ||
    clientX > rect.right ||
    clientY < rect.top ||
    clientY > rect.bottom
  ) {
    return null
  }
  const ndcX = ((clientX - rect.left) / rect.width) * 2 - 1
  const ndcY = -((clientY - rect.top) / rect.height) * 2 + 1
  _plane.constant = -nivelBaseY(opts.nivel, opts.apilado)
  _ndc.set(ndcX, ndcY)
  _ray.setFromCamera(_ndc, opts.camera)
  if (!_ray.ray.intersectPlane(_plane, _hit)) return null
  const cell = worldToCeldaEntera(_hit.x, _hit.z)
  const [cx, , cz] = cellToWorld(cell.col, cell.row)
  return dentroDeZona({
    col: cell.col + (_hit.x - cx >= 0 ? 0.25 : -0.25),
    row: cell.row + (_hit.z - cz >= 0 ? 0.25 : -0.25),
  })
}

