import * as THREE from 'three'

/**
 * El grupo 3D de cada objeto de la casa (solo su modelo: sin aro, marcador ni
 * burbuja), por id. Sirve para medir sobre qué pisa el personaje cuando se sube
 * a un objeto: la altura real de su tapa en ese punto (el colchón, la cubierta
 * de la mesa), no una caja envolvente.
 */
const grupos = new Map<number, THREE.Object3D>()

export function registrarGrupoObjeto(id: number | undefined, g: THREE.Object3D | null): void {
  if (id == null) return
  if (g) grupos.set(id, g)
  else grupos.delete(id)
}

const _ray = new THREE.Raycaster()
const _origen = new THREE.Vector3()
const _abajo = new THREE.Vector3(0, -1, 0)

/**
 * Altura de mundo de la superficie del objeto `id` justo en (x, z): el primer
 * impacto de un rayo que baja desde `desdeY`. null si el objeto no está montado
 * o no hay nada suyo en ese punto.
 */
export function superficieObjeto(id: number, x: number, z: number, desdeY: number): number | null {
  const g = grupos.get(id)
  if (!g) return null
  _origen.set(x, desdeY, z)
  _ray.set(_origen, _abajo)
  const hit = _ray.intersectObject(g, true).find((h) => (h.object as THREE.Mesh).isMesh && h.object.visible)
  return hit ? hit.point.y : null
}
