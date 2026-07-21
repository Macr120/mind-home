/**
 * Lienzo 2D del juguete Grafiti: canvas offscreen singleton donde se dibujan los
 * trazos (pincel, spray, borrador) en coordenadas UV de la cara del muro. El plano
 * 3D lo muestra en vivo vía CanvasTexture; al guardar se exporta como PNG con alfa.
 */

export type HerramientaGrafiti = 'pincel' | 'spray' | 'borrador'

/** Resolución de la textura (la cara del muro mide unos pocos metros). */
const PX_POR_METRO = 160
const LADO_MAX = 1024
const MAX_DESHACER = 12

export const canvasGrafiti = document.createElement('canvas')
const ctx = canvasGrafiti.getContext('2d', { willReadFrequently: true })!

let pila: ImageData[] = []
// Último punto del trazo en px (los trazos son líneas entre eventos de puntero).
let ux = 0
let uy = 0

/** Prepara el lienzo para una cara de ancho×alto metros, precargando el PNG si existe. */
export async function iniciar(anchoM: number, altoM: number, blob?: Blob): Promise<void> {
  const esc = Math.min(1, LADO_MAX / (PX_POR_METRO * Math.max(anchoM, altoM)))
  canvasGrafiti.width = Math.max(2, Math.round(anchoM * PX_POR_METRO * esc))
  canvasGrafiti.height = Math.max(2, Math.round(altoM * PX_POR_METRO * esc))
  pila = []
  ctx.clearRect(0, 0, canvasGrafiti.width, canvasGrafiti.height)
  if (blob) {
    const bmp = await createImageBitmap(blob)
    ctx.drawImage(bmp, 0, 0, canvasGrafiti.width, canvasGrafiti.height)
    bmp.close()
  }
}

/** UV del plano (v=0 abajo) → px del canvas (y=0 arriba). */
const aPx = (u: number, v: number): [number, number] => [
  u * canvasGrafiti.width,
  (1 - v) * canvasGrafiti.height,
]

/** Inicia un trazo: snapshot para deshacer y fija el punto de partida. */
export function empezarTrazo(u: number, v: number) {
  pila.push(ctx.getImageData(0, 0, canvasGrafiti.width, canvasGrafiti.height))
  if (pila.length > MAX_DESHACER) pila.shift()
  ;[ux, uy] = aPx(u, v)
}

/** Dibuja del último punto al nuevo con la herramienta activa. */
export function trazar(u: number, v: number, color: string, grosor: number, herr: HerramientaGrafiti) {
  const [x, y] = aPx(u, v)
  if (herr === 'spray') {
    // Aerosol: nubes de puntitos con jitter a lo largo del tramo.
    ctx.globalCompositeOperation = 'source-over'
    ctx.fillStyle = color
    ctx.globalAlpha = 0.3
    const pasos = Math.max(1, Math.ceil(Math.hypot(x - ux, y - uy) / 3))
    for (let i = 1; i <= pasos; i++) {
      const px = ux + ((x - ux) * i) / pasos
      const py = uy + ((y - uy) * i) / pasos
      for (let j = 0; j < 7; j++) {
        const a = Math.random() * Math.PI * 2
        const r = Math.sqrt(Math.random()) * grosor
        ctx.beginPath()
        ctx.arc(px + Math.cos(a) * r, py + Math.sin(a) * r, 1.3, 0, Math.PI * 2)
        ctx.fill()
      }
    }
    ctx.globalAlpha = 1
  } else {
    ctx.globalCompositeOperation = herr === 'borrador' ? 'destination-out' : 'source-over'
    ctx.strokeStyle = color
    ctx.fillStyle = color
    if (Math.hypot(x - ux, y - uy) < 0.5) {
      // Tap sin arrastre: punto redondo (una línea de largo 0 no pinta).
      ctx.beginPath()
      ctx.arc(x, y, grosor / 2, 0, Math.PI * 2)
      ctx.fill()
    } else {
      ctx.lineWidth = grosor
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.beginPath()
      ctx.moveTo(ux, uy)
      ctx.lineTo(x, y)
      ctx.stroke()
    }
    ctx.globalCompositeOperation = 'source-over'
  }
  ux = x
  uy = y
}

/** Restaura el snapshot previo; false si no hay nada que deshacer. */
export function deshacer(): boolean {
  const img = pila.pop()
  if (!img) return false
  ctx.putImageData(img, 0, 0)
  return true
}

/** Borra todo el lienzo (con snapshot: se puede deshacer). */
export function limpiar() {
  pila.push(ctx.getImageData(0, 0, canvasGrafiti.width, canvasGrafiti.height))
  if (pila.length > MAX_DESHACER) pila.shift()
  ctx.clearRect(0, 0, canvasGrafiti.width, canvasGrafiti.height)
}

/** Bote de pintura: rellena todo el lienzo de un color (con snapshot: deshacible). */
export function rellenar(color: string) {
  pila.push(ctx.getImageData(0, 0, canvasGrafiti.width, canvasGrafiti.height))
  if (pila.length > MAX_DESHACER) pila.shift()
  ctx.globalCompositeOperation = 'source-over'
  ctx.fillStyle = color
  ctx.fillRect(0, 0, canvasGrafiti.width, canvasGrafiti.height)
}

export const puedeDeshacer = () => pila.length > 0

/** Exporta el lienzo como PNG (conserva la transparencia). */
export function aBlob(): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvasGrafiti.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob falló'))), 'image/png')
  })
}
