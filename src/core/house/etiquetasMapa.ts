import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

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
}

const _world = new THREE.Vector3()

/** Va DENTRO del Canvas: proyecta cada ancla registrada a su nodo DOM. */
export function EtiquetasMapaProjector() {
  const camera = useThree((s) => s.camera)
  const size = useThree((s) => s.size)

  useFrame(() => {
    for (const [id, el] of doms) {
      const p = anclas.get(id)?.()
      if (!p) {
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
