import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import type * as THREE from 'three'

/**
 * Foto de la casa para el widget del launcher.
 *
 * El canvas de la casa NO usa `preserveDrawingBuffer` (encarecería cada frame
 * en el teléfono), así que el buffer solo es legible dentro del mismo tick en
 * que se dibuja: por eso la captura hace `gl.render()` y `toDataURL()` seguidos.
 *
 * Y renderiza A MANO en vez de esperar al loop de R3F —igual que el generador
 * de miniaturas (core/house/Miniatura.tsx)— porque justo cuando interesa
 * capturar (la app volviendo de segundo plano) el navegador tiene el
 * requestAnimationFrame throttleado y la foto no llegaría nunca.
 */

let motor: { gl: THREE.WebGLRenderer; scene: THREE.Scene; camera: THREE.Camera } | null = null

/** La foto del estado actual de la casa, o `null` si la escena no está montada. */
export function fotoCasa(): string | null {
  if (!motor) return null
  try {
    motor.gl.render(motor.scene, motor.camera)
    return motor.gl.domElement.toDataURL('image/jpeg', 0.85)
  } catch {
    // Contexto WebGL perdido: el widget se queda con la foto anterior.
    return null
  }
}

// Depuración: window.mhFotoCasa() devuelve la foto que vería el widget.
if (import.meta.env.DEV && typeof window !== 'undefined') {
  ;(window as unknown as { mhFotoCasa: typeof fotoCasa }).mhFotoCasa = fotoCasa
}

/** Va DENTRO del `<Canvas>` de la casa; no pinta nada, solo publica el motor. */
export function CapturaCasa(): null {
  const gl = useThree((s) => s.gl)
  const scene = useThree((s) => s.scene)
  const camera = useThree((s) => s.camera)
  useEffect(() => {
    motor = { gl, scene, camera }
    return () => {
      // Al remontar la escena (cambio de tamaño de celda) el efecto nuevo ya
      // publicó el suyo: no borrar el del sucesor.
      if (motor?.gl === gl) motor = null
    }
  }, [gl, scene, camera])
  return null
}

/**
 * Reescala la captura y devuelve el base64 pelado (sin `data:`). El canvas de la
 * casa es enorme comparado con un widget, y RemoteViews transporta el bitmap YA
 * descomprimido: mandarlo entero reventaría la transacción del binder.
 */
export function reducirFoto(dataUrl: string, maxAncho: number): Promise<string | null> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const escala = Math.min(1, maxAncho / img.width)
      const lienzo = document.createElement('canvas')
      lienzo.width = Math.round(img.width * escala)
      lienzo.height = Math.round(img.height * escala)
      const ctx = lienzo.getContext('2d')
      if (!ctx) return resolve(null)
      ctx.drawImage(img, 0, 0, lienzo.width, lienzo.height)
      resolve(lienzo.toDataURL('image/jpeg', 0.8).split(',')[1] ?? null)
    }
    img.onerror = () => resolve(null)
    img.src = dataUrl
  })
}
