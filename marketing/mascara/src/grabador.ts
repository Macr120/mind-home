/**
 * Grabación de la máscara: compone en un canvas 1080×1920 el video de la cámara
 * + el canvas WebGL de la cabeza (requiere `preserveDrawingBuffer`), le suma el
 * micrófono y lo graba con MediaRecorder (Safari ≥14.5 saca MP4 nativo; otros
 * navegadores, WebM). Replica el encuadre que se ve en pantalla:
 *
 * - `lleno`: la cámara recortada a 9:16 (cover).
 * - `amplio`: la cámara COMPLETA centrada (contain) sobre un fondo difuminado —
 *   el máximo zoom-out posible, todo el campo visual del sensor.
 */

const ANCHO = 1080
const ALTO = 1920

export type Encuadre = 'lleno' | 'amplio'

/** El mejor mimeType disponible (MP4 primero: es lo que quiere el pipeline). */
function elegirMime(): string {
  const candidatos = ['video/mp4;codecs=avc1', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm']
  return candidatos.find((m) => MediaRecorder.isTypeSupported(m)) ?? ''
}

export interface Grabador {
  detener: () => Promise<Blob>
  mime: string
}

/** Rectángulo cover (recorta) o contain (cabe entero) de una fuente fw×fh en el 1080×1920. */
function rectoDe(modo: 'cover' | 'contain', fw: number, fh: number) {
  const razon = ANCHO / ALTO
  const va = fw / fh
  if (modo === 'cover') {
    const sw = va > razon ? fh * razon : fw
    const sh = va > razon ? fh : fw / razon
    return { sx: (fw - sw) / 2, sy: (fh - sh) / 2, sw, sh, dx: 0, dy: 0, dw: ANCHO, dh: ALTO }
  }
  const dw = va > razon ? ANCHO : ALTO * va
  const dh = va > razon ? ANCHO / va : ALTO
  return { sx: 0, sy: 0, sw: fw, sh: fh, dx: (ANCHO - dw) / 2, dy: (ALTO - dh) / 2, dw, dh }
}

/** Dibuja la fuente con el rectángulo dado, espejada solo si se ve espejada en pantalla (cámara frontal). */
function dibujar(
  ctx: CanvasRenderingContext2D,
  fuente: CanvasImageSource,
  modo: 'cover' | 'contain',
  fw: number,
  fh: number,
  espejo: boolean,
) {
  const r = rectoDe(modo, fw, fh)
  ctx.save()
  if (espejo) {
    ctx.translate(ANCHO, 0)
    ctx.scale(-1, 1)
  }
  ctx.drawImage(fuente, r.sx, r.sy, r.sw, r.sh, r.dx, r.dy, r.dw, r.dh)
  ctx.restore()
}

export async function iniciarGrabacion(
  video: HTMLVideoElement,
  canvas3d: HTMLCanvasElement,
  encuadre: Encuadre,
  espejo: boolean,
): Promise<Grabador> {
  const comp = document.createElement('canvas')
  comp.width = ANCHO
  comp.height = ALTO
  const ctx = comp.getContext('2d')!

  let corriendo = true
  const pintar = () => {
    if (!corriendo) return
    ctx.fillStyle = '#0f1115'
    ctx.fillRect(0, 0, ANCHO, ALTO)
    const listo = video.readyState >= 2
    if (encuadre === 'amplio') {
      if (listo) {
        // Fondo: la misma cámara en cover, difuminada y oscurecida (si el Safari
        // no soporta ctx.filter, el oscurecido del fillRect lo disimula igual).
        ctx.filter = 'blur(40px) brightness(0.6)'
        dibujar(ctx, video, 'cover', video.videoWidth, video.videoHeight, espejo)
        ctx.filter = 'none'
        ctx.fillStyle = 'rgba(15, 17, 21, 0.35)'
        ctx.fillRect(0, 0, ANCHO, ALTO)
        dibujar(ctx, video, 'contain', video.videoWidth, video.videoHeight, espejo)
      }
      dibujar(ctx, canvas3d, 'contain', canvas3d.width, canvas3d.height, espejo)
    } else {
      if (listo) dibujar(ctx, video, 'cover', video.videoWidth, video.videoHeight, espejo)
      dibujar(ctx, canvas3d, 'cover', canvas3d.width, canvas3d.height, espejo)
    }
    requestAnimationFrame(pintar)
  }
  requestAnimationFrame(pintar)

  // Micrófono aparte (el stream de cámara se pidió sin audio para no duplicar permisos al cargar).
  const mic = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false } })
  const stream = comp.captureStream(30)
  for (const pista of mic.getAudioTracks()) stream.addTrack(pista)

  const mime = elegirMime()
  const grabadora = new MediaRecorder(stream, {
    ...(mime ? { mimeType: mime } : {}),
    videoBitsPerSecond: 8_000_000,
  })
  const trozos: BlobPart[] = []
  grabadora.ondataavailable = (e) => {
    if (e.data.size) trozos.push(e.data)
  }
  grabadora.start(1000)

  return {
    mime,
    detener: () =>
      new Promise<Blob>((resolver) => {
        grabadora.onstop = () => {
          corriendo = false
          for (const pista of mic.getTracks()) pista.stop()
          resolver(new Blob(trozos, { type: mime || 'video/webm' }))
        }
        grabadora.stop()
      }),
  }
}

/** Comparte (Safari iOS → Fotos/Archivos) o descarga el archivo grabado. */
export async function guardarGrabacion(blob: Blob) {
  const ext = blob.type.includes('mp4') ? 'mp4' : 'webm'
  const archivo = new File([blob], `mascara-mph.${ext}`, { type: blob.type })
  if (navigator.canShare?.({ files: [archivo] })) {
    try {
      await navigator.share({ files: [archivo] })
      return
    } catch {
      // cancelado o sin soporte real: cae a la descarga
    }
  }
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = archivo.name
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}
