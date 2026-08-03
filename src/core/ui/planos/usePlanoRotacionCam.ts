import { useLayoutEffect, useRef, type RefObject } from 'react'
import { CAM_BASE_AZ, useCam } from '../../state/cameraStore'

/** Suavizado del giro del croquis (mismo ritmo que CameraRig). */
const SUAVIZADO = 0.14

/**
 * Grados de rotación del croquis para alinearlo con la vista 3D (invertida),
 * ajustados SIEMPRE al ángulo recto más cercano: las vistas de planta y de alzado
 * del cubo usan azimuts múltiplos de 90° (la iso parte de 45°), lo que dejaría el
 * croquis en diagonal.
 */
function gradosRotacionPlano(az: number): number {
  const deg = -((az - CAM_BASE_AZ) * 180) / Math.PI
  return Math.round(deg / 90) * 90
}

/**
 * Rota el croquis en sync con la cámara 3D (camAnim.az).
 * Aplica transform en un contenedor HTML (no en nodos SVG que React reconcilia).
 */
export function usePlanoRotacionCam(
  wrapRef: RefObject<HTMLDivElement | null>,
  enabled: boolean,
) {
  const degRef = useRef(gradosRotacionPlano(useCam.getState().az))

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
        // Se sigue el azimut OBJETIVO del store, no la interpolación de CameraRig
        // (camAnim): sus ángulos intermedios pondrían el croquis en diagonal.
        const objetivo = gradosRotacionPlano(useCam.getState().az)
        degRef.current += (objetivo - degRef.current) * SUAVIZADO
        if (Math.abs(objetivo - degRef.current) < 0.05) degRef.current = objetivo
        el.style.transformOrigin = 'center center'
        el.style.transform = `rotate(${degRef.current}deg)`
      }
      id = requestAnimationFrame(tick)
    }
    tick()
    return () => {
      cancelAnimationFrame(id)
      limpiar()
    }
  }, [wrapRef, enabled])
}
