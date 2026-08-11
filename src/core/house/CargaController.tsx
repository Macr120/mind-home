import { useFrame } from '@react-three/fiber'
import { playerPos } from '../state/houseStore'
import { useCargar } from '../state/cargarStore'
import { useDiseño, esObjetoMapa } from '../state/disenoStore'
import { useLayout, roomWorldPos } from '../state/layoutStore'
import { SIZE, SIZE_DEFAULT } from './walls'

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v))

/**
 * Mientras se carga un OBJETO caminando (herramienta "mover"), lo sigue cada
 * frame a la posición del personaje — mismo dato (`x`/`z` de `disenoStore`) que
 * usa `ObjetoDragController` con el mouse, solo que la fuente es `playerPos` en
 * vez del raycast del puntero (el offset visual hacia arriba lo pone el render
 * de `House.tsx`/`Room3D.tsx` vía `arrastreElevado`). El CUARTO se mueve desde
 * `Character.tsx`, no aquí: necesita poder bloquear el propio avance del
 * personaje cuando el destino no es válido.
 */
export function CargaController() {
  useFrame(() => {
    const sujeto = useCargar.getState().sujeto
    if (sujeto?.tipo !== 'objeto') return
    const id = sujeto.id as number
    const state = useDiseño.getState()
    const o = state.objetos.find((x) => x.id === id)
    if (!o) return

    let newX: number
    let newZ: number
    if (esObjetoMapa(o)) {
      newX = playerPos.x
      newZ = playerPos.z
    } else {
      const [cx, , cz] = roomWorldPos(o.roomId)
      const size = useLayout.getState().sizes[o.roomId] ?? SIZE_DEFAULT
      const halfW = (size.w * SIZE) / 2 - 0.7
      const halfH = (size.h * SIZE) / 2 - 0.7
      newX = clamp(playerPos.x - cx, -halfW, halfW)
      newZ = clamp(playerPos.z - cz, -halfH, halfH)
    }
    state.setObjetoPos(id, newX, newZ)

    if (o.grupoId) {
      const offsets = state.dragGroupOffsets
      for (const m of state.objetos) {
        if (m.grupoId !== o.grupoId || m.id === id || m.id == null) continue
        const off = offsets[m.id] ?? { x: 0, z: 0 }
        if (esObjetoMapa(m)) {
          state.setObjetoPos(m.id, newX + off.x, newZ + off.z)
        } else {
          const ms = useLayout.getState().sizes[m.roomId] ?? SIZE_DEFAULT
          const mhW = (ms.w * SIZE) / 2 - 0.7
          const mhH = (ms.h * SIZE) / 2 - 0.7
          state.setObjetoPos(m.id, clamp(newX + off.x, -mhW, mhW), clamp(newZ + off.z, -mhH, mhH))
        }
      }
    }
  })
  return null
}
