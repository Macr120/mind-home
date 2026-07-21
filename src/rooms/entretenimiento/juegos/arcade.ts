// Infraestructura mínima de los juegos arcade con canvas: bucle rAF,
// teclas sostenidas y helpers de lienzo con devicePixelRatio.
import { useEffect, useRef, useState } from 'react'

/**
 * Bucle de animación: llama `paso(dt)` cada frame con dt en segundos,
 * con tope de 0.05 s para no dar saltos al volver de segundo plano.
 * El callback vive en un ref (patrón useEvent): siempre corre la versión
 * del último render sin reiniciar el efecto.
 */
export function useBucle(paso: (dt: number) => void, activo: boolean) {
  const ref = useRef(paso)
  useEffect(() => {
    ref.current = paso
  })
  useEffect(() => {
    if (!activo) return
    let id = 0
    let prev = performance.now()
    const marco = (ahora: number) => {
      const dt = Math.min(0.05, (ahora - prev) / 1000)
      prev = ahora
      ref.current(dt)
      id = requestAnimationFrame(marco)
    }
    id = requestAnimationFrame(marco)
    return () => cancelAnimationFrame(id)
  }, [activo])
}

/**
 * Set vivo de teclas presionadas (e.key en minúsculas) para leer dentro del
 * bucle. Hace preventDefault solo de las teclas de `capturar` (pásala como
 * constante de módulo para no re-suscribir). Se vacía al perder el foco.
 */
export function useTeclas(capturar: readonly string[]): ReadonlySet<string> {
  const [teclas] = useState(() => new Set<string>())
  useEffect(() => {
    const set = teclas
    const abajo = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return
      const k = e.key.toLowerCase()
      if (capturar.includes(k)) e.preventDefault()
      set.add(k)
    }
    const arriba = (e: KeyboardEvent) => set.delete(e.key.toLowerCase())
    const vaciar = () => set.clear()
    window.addEventListener('keydown', abajo)
    window.addEventListener('keyup', arriba)
    window.addEventListener('blur', vaciar)
    document.addEventListener('visibilitychange', vaciar)
    return () => {
      window.removeEventListener('keydown', abajo)
      window.removeEventListener('keyup', arriba)
      window.removeEventListener('blur', vaciar)
      document.removeEventListener('visibilitychange', vaciar)
      set.clear()
    }
  }, [capturar, teclas])
  return teclas
}

/**
 * Fija la resolución física del canvas a lógico × devicePixelRatio y escala el
 * contexto: se dibuja en coordenadas lógicas y el CSS decide el tamaño visual.
 * Idempotente (asignar width resetea el contexto), seguro con StrictMode.
 */
export function prepararLienzo(canvas: HTMLCanvasElement, ancho: number, alto: number): CanvasRenderingContext2D {
  const dpr = window.devicePixelRatio || 1
  canvas.width = ancho * dpr
  canvas.height = alto * dpr
  const ctx = canvas.getContext('2d')!
  ctx.scale(dpr, dpr)
  return ctx
}

/** Convierte un evento de puntero a coordenadas lógicas del canvas. */
export function puntoLienzo(
  canvas: HTMLCanvasElement,
  e: { clientX: number; clientY: number },
  ancho: number,
  alto: number,
): { x: number; y: number } {
  const r = canvas.getBoundingClientRect()
  return { x: ((e.clientX - r.left) / r.width) * ancho, y: ((e.clientY - r.top) / r.height) * alto }
}
