import { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useHouse } from '../state/houseStore'
import { useLayout } from '../state/layoutStore'
import { nivelBaseY, WALL_H, type AABB } from './walls'

/**
 * Etiquetas flotantes del mapa (parcelas del huerto, animales de la granja…):
 * cada etiqueta es un nodo DOM del overlay 2D anclado a un punto 3D. El
 * proyector escribe su posición en pantalla de forma imperativa por frame
 * (sin re-render de React y sin Html de drei, que bloquearía el raycast).
 */

/** id → posición mundial actual del ancla (null = ocultar la etiqueta). */
const anclas = new Map<string, () => THREE.Vector3 | null>()
/** id → nodo DOM del overlay a posicionar. */
const doms = new Map<string, HTMLElement>()
/** id → ¿un muro tapa el ancla? (se recalcula espaciado, no por frame). */
const ocluidas = new Map<string, boolean>()

export const registrarAncla = (id: string, f: () => THREE.Vector3 | null): void => {
  anclas.set(id, f)
}
export const quitarAncla = (id: string): void => {
  anclas.delete(id)
}
export const registrarDom = (id: string, el: HTMLElement): void => {
  doms.set(id, el)
}
export const quitarDom = (id: string): void => {
  doms.delete(id)
  ocluidas.delete(id)
}

const _world = new THREE.Vector3()
const _cam = new THREE.Vector3()

/**
 * ¿El tramo ancla→cámara cruza la franja de alto de un muro? Test de segmento
 * contra el AABB (XZ) más el alto del muro en su nivel — la misma geometría que
 * usan las colisiones, sin raycast contra la escena.
 */
function cortaMuro(p: THREE.Vector3, c: THREE.Vector3, caja: AABB, y0: number, y1: number): boolean {
  const dx = c.x - p.x
  const dz = c.z - p.z
  let t0 = 0
  let t1 = 1
  if (Math.abs(dx) < 1e-9) {
    if (p.x < caja.minX || p.x > caja.maxX) return false
  } else {
    const a = (caja.minX - p.x) / dx
    const b = (caja.maxX - p.x) / dx
    t0 = Math.max(t0, Math.min(a, b))
    t1 = Math.min(t1, Math.max(a, b))
    if (t0 > t1) return false
  }
  if (Math.abs(dz) < 1e-9) {
    if (p.z < caja.minZ || p.z > caja.maxZ) return false
  } else {
    const a = (caja.minZ - p.z) / dz
    const b = (caja.maxZ - p.z) / dz
    t0 = Math.max(t0, Math.min(a, b))
    t1 = Math.min(t1, Math.max(a, b))
    if (t0 > t1) return false
  }
  // Alto del tramo dentro de la caja: solo tapa si toca la franja [y0, y1].
  const ya = p.y + (c.y - p.y) * t0
  const yb = p.y + (c.y - p.y) * t1
  return Math.min(ya, yb) <= y1 && Math.max(ya, yb) >= y0
}

/** ¿Algún muro de la casa queda entre el ancla y la cámara? */
function anclaOcluida(p: THREE.Vector3, cam: THREE.Vector3): boolean {
  const porNivel = useLayout.getState().wallCollidersByLevel
  const apilado = !useHouse.getState().explotado
  for (const k in porNivel) {
    const nivel = Number(k)
    const y0 = nivelBaseY(nivel, apilado)
    const y1 = y0 + WALL_H
    for (const caja of porNivel[nivel]) {
      if (cortaMuro(p, cam, caja, y0, y1)) return true
    }
  }
  return false
}

/** Va DENTRO del Canvas: proyecta cada ancla registrada a su nodo DOM. */
export function EtiquetasMapaProjector() {
  const camera = useThree((s) => s.camera)
  const size = useThree((s) => s.size)
  const cuadro = useRef(0)

  useFrame(() => {
    // La oclusión se recalcula espaciada (cada 6 cuadros): entre ticks la cámara
    // apenas se mueve y el test contra todos los muros no merece ir por frame.
    const recalcular = ++cuadro.current % 6 === 0
    if (doms.size) camera.getWorldPosition(_cam)
    for (const [id, el] of doms) {
      const p = anclas.get(id)?.()
      if (!p) {
        el.style.display = 'none'
        continue
      }
      let tapada = ocluidas.get(id)
      if (recalcular || tapada === undefined) {
        tapada = anclaOcluida(p, _cam)
        ocluidas.set(id, tapada)
      }
      // Un muro por delante: la etiqueta se esconde (queda «detrás» de la pared).
      if (tapada) {
        el.style.display = 'none'
        continue
      }
      _world.copy(p).project(camera)
      const x = (_world.x * 0.5 + 0.5) * size.width
      const y = (-_world.y * 0.5 + 0.5) * size.height
      // Detrás de la cámara o proyección degenerada: fuera de pantalla.
      if (_world.z >= 1 || !Number.isFinite(x) || !Number.isFinite(y)) {
        el.style.display = 'none'
        continue
      }
      el.style.display = ''
      el.style.transform = `translate3d(${x}px, ${y}px, 0)`
    }
  })

  return null
}
