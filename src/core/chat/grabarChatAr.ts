import { formatoGrabacion } from '../grabacionPantalla'

/**
 * Grabar el Chat AR para el Studio de video: compone por frame la cámara (en
 * cover, espejada si es la frontal, como se ve) y el lienzo 3D del asistente
 * (necesita `preserveDrawingBuffer`) en un canvas con el aspecto de la pantalla,
 * le suma el micrófono y lo graba con MediaRecorder. La voz del asistente solo
 * entra por el micrófono (altavoz): la síntesis del sistema no se captura.
 */

/** Lado mayor de la toma en px (el resto escala con el aspecto de la pantalla). */
const LADO_MAX = 1280

export interface GrabadorAr {
  detener: () => Promise<{ blob: Blob; duracion: number }>
  /** Descarta la toma (al cerrar el overlay con la grabación andando). */
  cancelar: () => void
}

export async function iniciarGrabacionAr(
  video: HTMLVideoElement,
  canvas3d: HTMLCanvasElement,
  espejo: () => boolean,
): Promise<GrabadorAr> {
  const formato = formatoGrabacion()
  if (!formato) throw new Error('sin-soporte')
  const cw = Math.max(1, window.innerWidth)
  const ch = Math.max(1, window.innerHeight)
  const escala = Math.min(1, LADO_MAX / Math.max(cw, ch))
  const W = Math.max(2, Math.round((cw * escala) / 2) * 2)
  const H = Math.max(2, Math.round((ch * escala) / 2) * 2)
  const comp = document.createElement('canvas')
  comp.width = W
  comp.height = H
  const ctx = comp.getContext('2d')!

  let corriendo = true
  const pintar = () => {
    if (!corriendo) return
    ctx.fillStyle = '#000000'
    ctx.fillRect(0, 0, W, H)
    const fw = video.videoWidth
    const fh = video.videoHeight
    if (video.readyState >= 2 && fw > 0 && fh > 0) {
      // Cover: el mismo recorte que `object-cover` en pantalla.
      const razon = W / H
      const va = fw / fh
      const sw = va > razon ? fh * razon : fw
      const sh = va > razon ? fh : fw / razon
      ctx.save()
      if (espejo()) {
        ctx.translate(W, 0)
        ctx.scale(-1, 1)
      }
      ctx.drawImage(video, (fw - sw) / 2, (fh - sh) / 2, sw, sh, 0, 0, W, H)
      ctx.restore()
    }
    ctx.drawImage(canvas3d, 0, 0, W, H)
    requestAnimationFrame(pintar)
  }
  requestAnimationFrame(pintar)

  // Micrófono aparte (la cámara se pidió sin audio); sin permiso la toma sale muda.
  let mic: MediaStream | null = null
  try {
    mic = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false } })
  } catch {
    mic = null
  }
  const stream = comp.captureStream(30)
  for (const p of mic?.getAudioTracks() ?? []) stream.addTrack(p)
  const limpiar = () => {
    corriendo = false
    for (const p of stream.getTracks()) p.stop()
    mic?.getTracks().forEach((p) => p.stop())
  }
  let rec: MediaRecorder
  try {
    rec = new MediaRecorder(stream, { mimeType: formato.mime, videoBitsPerSecond: 6_000_000 })
  } catch (e) {
    limpiar()
    throw e
  }
  const trozos: Blob[] = []
  let inicio = performance.now()
  rec.onstart = () => {
    inicio = performance.now()
  }
  rec.ondataavailable = (e) => {
    if (e.data.size > 0) trozos.push(e.data)
  }
  rec.start(1000)

  return {
    detener: () =>
      new Promise((resolver) => {
        rec.onstop = () => {
          limpiar()
          resolver({
            blob: new Blob(trozos, { type: rec.mimeType || formato.mime }),
            duracion: Math.round((performance.now() - inicio) / 10) / 100,
          })
        }
        rec.stop()
      }),
    cancelar: () => {
      rec.onstop = null
      if (rec.state !== 'inactive') rec.stop()
      limpiar()
    },
  }
}
