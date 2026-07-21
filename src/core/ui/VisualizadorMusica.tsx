import { useEffect, useRef } from 'react'

/**
 * Barras de espectro en vivo de un AnalyserNode (canvas + rAF, sin librerías).
 * Con `analizador` null pinta una línea base quieta.
 */
export function VisualizadorMusica({
  analizador,
  color = '#a78bfa',
  alto = 44,
}: {
  analizador: AnalyserNode | null
  color?: string
  alto?: number
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx2d = canvas?.getContext('2d')
    if (!canvas || !ctx2d) return
    let rafId = 0
    const datos = analizador ? new Uint8Array(analizador.frequencyBinCount) : null

    const pintar = () => {
      const ancho = canvas.clientWidth
      // Ajusta el buffer al tamaño real (una vez que el layout lo define).
      if (canvas.width !== ancho * 2 || canvas.height !== alto * 2) {
        canvas.width = ancho * 2
        canvas.height = alto * 2
      }
      ctx2d.clearRect(0, 0, canvas.width, canvas.height)
      ctx2d.fillStyle = color
      const n = 32
      const paso = canvas.width / n
      if (analizador && datos) {
        analizador.getByteFrequencyData(datos)
        const porBarra = Math.floor(datos.length / n) || 1
        for (let i = 0; i < n; i++) {
          // Promedio del tramo del espectro que cae en esta barra.
          let suma = 0
          for (let j = 0; j < porBarra; j++) suma += datos[i * porBarra + j]
          const nivel = suma / porBarra / 255
          const h = Math.max(3, nivel * canvas.height)
          ctx2d.globalAlpha = 0.45 + 0.55 * nivel
          ctx2d.fillRect(i * paso + 1, canvas.height - h, paso - 2, h)
        }
        ctx2d.globalAlpha = 1
      } else {
        for (let i = 0; i < n; i++) ctx2d.fillRect(i * paso + 1, canvas.height - 3, paso - 2, 3)
      }
      rafId = requestAnimationFrame(pintar)
    }
    rafId = requestAnimationFrame(pintar)
    return () => cancelAnimationFrame(rafId)
  }, [analizador, color, alto])

  return <canvas ref={canvasRef} className="block w-full rounded-md" style={{ height: alto }} />
}
