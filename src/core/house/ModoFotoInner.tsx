import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { WebGLPathTracer } from 'three-gpu-pathtracer'
import { MUESTRAS_FOTO, useModoFoto, type CalidadFoto } from '../state/modoFotoStore'

/**
 * El trazador en sí. Arma su escena UNA vez al entrar (la casa queda congelada
 * en la foto aunque el personaje siga andando) con una copia de la cámara, y
 * toma el render del lienzo con un `useFrame` de prioridad 1 (R3F deja de pintar
 * solo). Al llegar a las muestras pedidas guarda el PNG en el mismo tick: sin
 * `preserveDrawingBuffer` el lienzo solo se puede leer justo después de pintar.
 *
 * Las luces ambiente y hemisférica no existen para el trazador: la luz de relleno
 * la pone el entorno (Lightformers o HDRI), que sí toma de `scene.environment`.
 */
export function ModoFotoInner({ calidad }: { calidad: CalidadFoto }) {
  const gl = useThree((s) => s.gl)
  const scene = useThree((s) => s.scene)
  const camera = useThree((s) => s.camera)
  const trazador = useRef<WebGLPathTracer | null>(null)
  const objetivo = MUESTRAS_FOTO[calidad]

  useEffect(() => {
    let vivo = true
    const pt = new WebGLPathTracer(gl)
    pt.renderScale = calidad === 'alta' ? 1 : 0.5
    pt.tiles.set(2, 2)
    pt.minSamples = 1
    pt.fadeDuration = 0
    pt.renderDelay = 0
    pt.bounces = calidad === 'alta' ? 6 : 4
    // Un frame para que el panel muestre «Preparando…» antes de armar el BVH (bloquea).
    const t = window.setTimeout(() => {
      if (!vivo) return
      try {
        pt.setScene(scene, camera.clone())
        trazador.current = pt
        useModoFoto.setState({ fase: 'trazando' })
      } catch (e) {
        console.warn('[MPH] El modo foto no pudo preparar la escena:', e)
        useModoFoto.setState({ fase: 'error' })
      }
    }, 50)
    return () => {
      vivo = false
      window.clearTimeout(t)
      trazador.current = null
      pt.dispose()
    }
  }, [gl, scene, camera, calidad])

  useFrame(() => {
    const pt = trazador.current
    if (!pt) {
      // Mientras se prepara, la casa se sigue viendo normal.
      gl.render(scene, camera)
      return
    }
    const st = useModoFoto.getState()
    if (st.fase === 'lista') pt.pausePathTracing = true
    pt.renderSample()
    const muestras = Math.floor(pt.samples)
    if (st.fase !== 'trazando') return
    if (muestras !== st.muestras) useModoFoto.setState({ muestras })
    if (muestras >= objetivo || (st.terminarYa && muestras >= 1)) {
      useModoFoto.setState({ fase: 'lista', foto: gl.domElement.toDataURL('image/png') })
    }
  }, 1)

  return null
}
