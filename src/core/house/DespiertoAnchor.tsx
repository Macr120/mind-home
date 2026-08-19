import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useDiseño, objetoPorId, esObjetoMapa } from '../state/disenoStore'
import { useDespierto } from '../state/despiertoStore'
import { useHouse } from '../state/houseStore'
import { useLayout, roomWorldPos } from '../state/layoutStore'
import { getCuarto } from '../state/cuartosStore'
import { altoDeTipo } from './catalogo'
import { footprintBounds, nivelBaseY, FOOTPRINT_DEFAULT, SIZE, WALL_H } from './walls'

const _world = new THREE.Vector3()
/** Hueco entre la punta de lo despierto y su menú. */
const HOLGURA = 0.8

/**
 * Proyecta al 2D el objeto o cuarto despertado con una pulsación larga, para
 * colgar de él su menú flotante (`MenuDespierto`). Espejo de `InteractAnchor`.
 */
export function DespiertoAnchor() {
  const camera = useThree((s) => s.camera)
  const size = useThree((s) => s.size)
  const sujeto = useDespierto((s) => s.sujeto)
  const setScreen = useDespierto((s) => s.setScreen)

  useFrame(() => {
    if (!sujeto) return
    // Lectura en el frame (sin suscripción): arrastrarlo no re-renderiza este ancla.
    if (sujeto.tipo === 'objeto') {
      const o = objetoPorId(useDiseño.getState().objetos, sujeto.id)
      if (!o) return
      const alto = 0.2 + (o.y ?? 0) + (altoDeTipo(o.tipo) + HOLGURA) * (o.escala ?? 1)
      if (esObjetoMapa(o)) {
        _world.set(o.x ?? 0, alto, o.z ?? 0)
      } else {
        // Objeto de cuarto: sus x/z son LOCALES (y sin ellas manda su ranura, la
        // misma cuenta que hace `ObjetoEnCuarto`), y su piso sube con el nivel.
        const layout = useLayout.getState()
        const bounds = footprintBounds(layout.footprints[o.roomId] ?? FOOTPRINT_DEFAULT)
        const ox = o.x ?? (o.slot % 2 === 0 ? -1 : 1) * ((bounds.w * SIZE) / 2 - 1.4)
        const oz = o.z ?? (o.slot < 2 ? -1 : 1) * ((bounds.h * SIZE) / 2 - 1.4)
        const [rx, , rz] = roomWorldPos(o.roomId)
        const y0 = nivelBaseY(layout.niveles[o.roomId] ?? 0, !useHouse.getState().explotado)
        _world.set(rx + ox, y0 + alto, rz + oz)
      }
    } else {
      if (!getCuarto(sujeto.id)) return
      const [rx, , rz] = roomWorldPos(sujeto.id)
      const y0 = nivelBaseY(
        useLayout.getState().niveles[sujeto.id] ?? 0,
        !useHouse.getState().explotado,
      )
      _world.set(rx, y0 + WALL_H + HOLGURA, rz)
    }
    _world.project(camera)

    const x = (_world.x * 0.5 + 0.5) * size.width
    const y = (-_world.y * 0.5 + 0.5) * size.height

    if (!Number.isFinite(x) || !Number.isFinite(y)) return

    setScreen(x, y)
  })

  return null
}
