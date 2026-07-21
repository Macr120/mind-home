import { CanvasTexture, RepeatWrapping, type Texture } from 'three'

/**
 * Texturas de muro generadas por canvas (patrón neutro que el color del material tiñe).
 * Sirven para las paredes curvas (`MuroCurvo3D`), donde no se pueden usar los detalles
 * en malla de los muros rectos. Se cachean por tipo.
 */
const cache: Record<string, Texture> = {}

export function texturaMuro(tipo: string): Texture | null {
  if (!tipo || tipo === 'solido') return null
  if (cache[tipo]) return cache[tipo]

  const s = 128
  const cv = document.createElement('canvas')
  cv.width = cv.height = s
  const x = cv.getContext('2d')!
  x.fillStyle = '#ffffff'
  x.fillRect(0, 0, s, s)

  if (tipo === 'ladrillo') {
    const filas = 4
    const fh = s / filas
    x.strokeStyle = 'rgba(0,0,0,0.30)'
    x.lineWidth = s * 0.04
    for (let i = 0; i <= filas; i++) {
      x.beginPath()
      x.moveTo(0, i * fh)
      x.lineTo(s, i * fh)
      x.stroke()
    }
    // Juntas verticales alternadas por fila.
    for (let r = 0; r < filas; r++) {
      const off = r % 2 ? s / 4 : 0
      for (let c = -1; c < 2; c++) {
        const vx = off + s / 2 + c * (s / 2)
        x.beginPath()
        x.moveTo(vx, r * fh)
        x.lineTo(vx, (r + 1) * fh)
        x.stroke()
      }
    }
  } else if (tipo === 'madera') {
    const tablas = 5
    const tw = s / tablas
    x.strokeStyle = 'rgba(0,0,0,0.24)'
    x.lineWidth = s * 0.025
    for (let i = 0; i <= tablas; i++) {
      x.beginPath()
      x.moveTo(i * tw, 0)
      x.lineTo(i * tw, s)
      x.stroke()
    }
    // Veta suave.
    x.strokeStyle = 'rgba(0,0,0,0.08)'
    x.lineWidth = 1
    for (let i = 0; i < tablas; i++) {
      x.beginPath()
      x.moveTo(i * tw + tw * 0.5, 0)
      x.bezierCurveTo(i * tw + tw * 0.3, s * 0.35, i * tw + tw * 0.7, s * 0.65, i * tw + tw * 0.5, s)
      x.stroke()
    }
  } else if (tipo === 'vitraje') {
    // Cristal: rombos claros con plomos.
    x.strokeStyle = 'rgba(40,60,90,0.45)'
    x.lineWidth = 2
    const p = s / 4
    for (let i = -s; i < s * 2; i += p) {
      x.beginPath()
      x.moveTo(i, 0)
      x.lineTo(i + s, s)
      x.stroke()
      x.beginPath()
      x.moveTo(i, s)
      x.lineTo(i + s, 0)
      x.stroke()
    }
  }

  const tex = new CanvasTexture(cv)
  tex.wrapS = tex.wrapT = RepeatWrapping
  tex.needsUpdate = true
  cache[tipo] = tex
  return tex
}
