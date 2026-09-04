import type { MedioVideo } from '../../core/data/db'
import { mediosVideoRepo } from '../../core/data/repository'
import { tGlobal } from '../../core/i18n/useT'
import { confirmar } from '../../core/state/confirmarStore'
import { comprimirFoto, miniaturaFoto } from '../_shared/fotos'
import { AVISO_MB, TOPE_MB } from './constantes'

/**
 * Importación de medios del Studio de video: límites de tamaño, metadatos
 * (duración/dimensiones) y miniatura. Los blobs son SOLO locales (fuera del
 * sync), así que aquí no hay compresión de video: se guarda tal cual.
 */

/** Metadatos y miniatura de un video: primer frame a ~200 px (timeout 8 s). */
function analizarVideo(blob: Blob): Promise<{ duracion: number; ancho: number; alto: number; miniatura?: Blob }> {
  return new Promise((resolver, rechazar) => {
    const url = URL.createObjectURL(blob)
    const video = document.createElement('video')
    video.preload = 'metadata'
    video.muted = true
    ;(video as HTMLVideoElement & { playsInline: boolean }).playsInline = true
    const timeout = window.setTimeout(() => terminar(new Error('timeout')), 8000)
    const terminar = (err: Error | null, datos?: { duracion: number; ancho: number; alto: number; miniatura?: Blob }) => {
      window.clearTimeout(timeout)
      URL.revokeObjectURL(url)
      video.src = ''
      if (err || !datos) rechazar(err ?? new Error('sin datos'))
      else resolver(datos)
    }
    video.onerror = () => terminar(new Error('formato no soportado'))
    video.onloadedmetadata = () => {
      // Seek corto para tener un frame pintable (el 0 exacto a veces sale negro).
      video.currentTime = Math.min(0.1, (video.duration || 1) / 2)
    }
    video.onseeked = () => {
      const datos = {
        duracion: Number.isFinite(video.duration) ? video.duration : 0,
        ancho: video.videoWidth,
        alto: video.videoHeight,
      }
      const canvas = document.createElement('canvas')
      const escala = 200 / Math.max(1, Math.max(video.videoWidth, video.videoHeight))
      canvas.width = Math.max(1, Math.round(video.videoWidth * escala))
      canvas.height = Math.max(1, Math.round(video.videoHeight * escala))
      try {
        canvas.getContext('2d')?.drawImage(video, 0, 0, canvas.width, canvas.height)
        canvas.toBlob((mini) => terminar(null, { ...datos, miniatura: mini ?? undefined }), 'image/jpeg', 0.7)
      } catch {
        terminar(null, datos)
      }
    }
    video.src = url
  })
}

/** Duración de un audio por sus metadatos (0 si no se pudo leer). */
export function duracionAudio(blob: Blob): Promise<number> {
  return new Promise((resolver) => {
    const url = URL.createObjectURL(blob)
    const audio = document.createElement('audio')
    audio.preload = 'metadata'
    const timeout = window.setTimeout(() => terminar(0), 8000)
    const terminar = (d: number) => {
      window.clearTimeout(timeout)
      URL.revokeObjectURL(url)
      resolver(d)
    }
    audio.onerror = () => terminar(0)
    audio.onloadedmetadata = () => terminar(Number.isFinite(audio.duration) ? audio.duration : 0)
    audio.src = url
  })
}

/**
 * Importa un archivo del dispositivo como medio. Devuelve el id, o null si el
 * usuario canceló o el archivo no pasó los límites (ya avisado aquí).
 */
export async function importarMedio(archivo: File): Promise<number | null> {
  const mb = archivo.size / (1024 * 1024)
  if (mb > TOPE_MB) {
    await confirmar({
      titulo: tGlobal('video.medios.grande', 'Archivo demasiado grande'),
      mensaje: tGlobal('video.medios.grandeMsg', 'El tope es {n} MB.', { n: TOPE_MB }),
    })
    return null
  }
  if (mb > AVISO_MB) {
    const seguir = await confirmar({
      titulo: tGlobal('video.medios.pesado', 'Archivo pesado'),
      mensaje: tGlobal('video.medios.pesadoMsg', 'Pesa {n} MB y se guarda en este dispositivo. ¿Importarlo?', {
        n: Math.round(mb),
      }),
    })
    if (!seguir) return null
  }

  const nombre = archivo.name.replace(/\.[a-z0-9]+$/i, '') || 'medio'
  const ahora = new Date().toISOString()
  let fila: Omit<MedioVideo, 'id'>
  if (archivo.type.startsWith('video/')) {
    const meta = await analizarVideo(archivo)
    fila = { tipo: 'video', nombre, blob: archivo, ...meta, origen: 'importado', creadoEn: ahora }
  } else if (archivo.type.startsWith('audio/')) {
    fila = { tipo: 'audio', nombre, blob: archivo, duracion: await duracionAudio(archivo), origen: 'importado', creadoEn: ahora }
  } else if (archivo.type.startsWith('image/')) {
    // Comprimida a 1280 px: al lienzo de 720p le sobra.
    const blob = await comprimirFoto(archivo)
    const bmp = await createImageBitmap(blob)
    fila = {
      tipo: 'imagen', nombre, blob, ancho: bmp.width, alto: bmp.height,
      miniatura: await miniaturaFoto(blob), origen: 'importado', creadoEn: ahora,
    }
    bmp.close()
  } else {
    return null
  }
  return mediosVideoRepo.add(fila)
}

/**
 * Completa una toma de la app (`core/grabacionPantalla.ts` la guarda en crudo,
 * con la duración medida): miniatura y dimensiones. Sin ellas el clip solo
 * pierde el fondo de la timeline, así que un fallo se traga.
 */
export async function completarGrabacion(medio: MedioVideo & { id: number }): Promise<void> {
  try {
    const { ancho, alto, miniatura } = await analizarVideo(medio.blob)
    await mediosVideoRepo.update(medio.id, { ancho, alto, miniatura })
  } catch {
    /* sin miniatura */
  }
}
