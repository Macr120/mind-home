import { useLayoutEffect, type RefObject } from 'react'
import { camAnim, CAM_BASE_AZ, useCam } from '../../state/cameraStore'

/** Grados de rotación del croquis para alinearlo con la vista iso 3D (invertida). */
export function gradosRotacionPlano(az: number): number {
  return -((az - CAM_BASE_AZ) * 180) / Math.PI
}

/**
 * Rota el croquis en sync con la cámara 3D (camAnim.az).
 * Aplica transform en un contenedor HTML (no en nodos SVG que React reconcilia).
 */
export function usePlanoRotacionCam(
  wrapRef: RefObject<HTMLDivElement | null>,
  enabled: boolean,
) {
  const azStore = useCam((s) => s.az)

  useLayoutEffect(() => {
    const limpiar = () => {
      const el = wrapRef.current
      if (el) el.style.transform = ''
    }

    if (!enabled) {
      limpiar()
      return
    }

    let id = 0
    const tick = () => {
      const el = wrapRef.current
      if (el) {
        // camAnim sigue la interpolación de CameraRig; azStore fuerza sync al pulsar ⟲/⟳
        const az = camAnim.az
        const deg = gradosRotacionPlano(az)
        el.style.transformOrigin = 'center center'
        el.style.transform = `rotate(${deg}deg)`
      }
      id = requestAnimationFrame(tick)
    }
    tick()
    return () => {
      cancelAnimationFrame(id)
      limpiar()
    }
  }, [wrapRef, enabled, azStore])
}
