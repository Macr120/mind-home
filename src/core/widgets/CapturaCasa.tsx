import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import type * as THREE from 'three'
import { Vector3 } from 'three'
import { useLayout, roomWorldPos } from '../state/layoutStore'
import { useCuartos } from '../state/cuartosStore'
import { SPACING, WALL_H } from '../house/walls'

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

/** Recorte en píxeles del canvas. */
export interface Encuadre {
  x: number
  y: number
  w: number
  h: number
}

/**
 * Dónde queda LA CASA dentro de la foto, con la forma del widget.
 *
 * Hace falta porque la cámara sigue al JUGADOR, no a la casa: con el personaje
 * en el jardín, la casa se va a una esquina del canvas. Y el canvas del teléfono
 * es vertical (360×774) mientras el widget es apaisado, así que el `centerCrop`
 * de Android se quedaba con una franja de césped del centro.
 *
 * Se proyectan las esquinas de los cuartos colocados con la MISMA cámara del
 * render, se toma su caja en pantalla y se estira al aspecto del widget.
 */
export function encuadreCasa(aspecto: number): Encuadre | null {
  if (!motor) return null
  const { camera, gl } = motor
  const colocados = useLayout.getState().placed
  const cuartos = useCuartos.getState().cuartos.filter((c) => colocados[c.id] === true)
  if (cuartos.length === 0) return null

  const ancho = gl.domElement.width
  const alto = gl.domElement.height
  const v = new Vector3()
  let x0 = Infinity
  let y0 = Infinity
  let x1 = -Infinity
  let y1 = -Infinity
  const media = SPACING / 2
  for (const c of cuartos) {
    const [cx, cy, cz] = roomWorldPos(c.id)
    // Las 8 esquinas del volumen del cuarto: en isométrica el techo del fondo
    // sube en pantalla y el suelo del frente baja, y las dos cuentan.
    for (const dx of [-media, media]) {
      for (const dz of [-media, media]) {
        for (const dy of [0, WALL_H]) {
          v.set(cx + dx, cy + dy, cz + dz).project(camera)
          const px = (v.x * 0.5 + 0.5) * ancho
          const py = (-v.y * 0.5 + 0.5) * alto
          if (px < x0) x0 = px
          if (px > x1) x1 = px
          if (py < y0) y0 = py
          if (py > y1) y1 = py
        }
      }
    }
  }
  if (!Number.isFinite(x0) || x1 <= x0 || y1 <= y0) return null

  // Un respiro alrededor para que la casa no vaya pegada al borde.
  const margen = Math.min(ancho, alto) * 0.04
  x0 -= margen
  y0 -= margen
  x1 += margen
  y1 += margen

  // Estirar al aspecto del widget por el lado que se quede corto.
  const cx = (x0 + x1) / 2
  const cy = (y0 + y1) / 2
  let w = x1 - x0
  let h = y1 - y0
  if (w / h < aspecto) w = h * aspecto
  else h = w / aspecto

  // Acotar al canvas SIN deformar: si no cabe, se encoge manteniendo el aspecto.
  const escala = Math.min(1, ancho / w, alto / h)
  w *= escala
  h *= escala
  const x = Math.max(0, Math.min(ancho - w, cx - w / 2))
  const y = Math.max(0, Math.min(alto - h, cy - h / 2))
  return { x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(h) }
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
export function reducirFoto(
  dataUrl: string,
  maxAncho: number,
  encuadre?: Encuadre | null,
): Promise<string | null> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      // El encuadre viene en píxeles del canvas, que es lo que mide la imagen.
      const rec = encuadre ?? { x: 0, y: 0, w: img.width, h: img.height }
      const escala = Math.min(1, maxAncho / rec.w)
      const lienzo = document.createElement('canvas')
      lienzo.width = Math.round(rec.w * escala)
      lienzo.height = Math.round(rec.h * escala)
      const ctx = lienzo.getContext('2d')
      if (!ctx) return resolve(null)
      ctx.drawImage(img, rec.x, rec.y, rec.w, rec.h, 0, 0, lienzo.width, lienzo.height)
      resolve(lienzo.toDataURL('image/jpeg', 0.8).split(',')[1] ?? null)
    }
    img.onerror = () => resolve(null)
    img.src = dataUrl
  })
}
