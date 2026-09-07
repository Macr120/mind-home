import { contextoAudio, desbloquearAudio } from '../../core/audio/motor'
import type { MedioVideo } from '../../core/data/db'
import { formatoGrabacion } from '../../core/grabacionPantalla'
import { peliculaFrame } from '../../core/state/peliculaStore'
import { BITRATE_AUDIO, BITRATE_VIDEO, FPS_EXPORT, RESOLUCIONES } from './constantes'
import { crearPool } from './fuentes'
import { duracionTotal, esClipAudio, type ProyectoAbierto } from './modelo'
import { MotorVideo } from './motor'
import type { Fuente3D, RenderizadorAvatar } from './render'

/**
 * Export del proyecto: render EN TIEMPO REAL a `canvas.captureStream` mezclado
 * con el audio por WebAudio, grabado con MediaRecorder. Dura lo que dura el
 * video (aceptable en básico; la UI enseña progreso y pide pantalla activa).
 *
 * El pool de fuentes es FRESCO y desechable: `createMediaElementSource` ata el
 * elemento a un contexto PARA SIEMPRE, así que los elementos del preview no se
 * tocan — estos nacen y mueren con el export.
 */

/** Primer contenedor soportado, o null si no hay MediaRecorder utilizable (el mismo que la grabación de la app). */
export const mimeExport = formatoGrabacion

/** ¿Este dispositivo sabe grabar MP4 (H.264)? Instagram no acepta otra cosa. */
export const soportaMp4 = () => formatoGrabacion({ preferirMp4: true })?.extension === 'mp4'

export interface OpcionesExport {
  onProgreso?: (fraccion: number) => void
  senal?: AbortSignal
  /** El canvas 3D del avatar (compartido con el preview, que está en pausa). */
  avatar?: RenderizadorAvatar | null
  /** Al publicar en redes: MP4 si el dispositivo lo graba (ver `formatoGrabacion`). */
  preferirMp4?: boolean
  /** Al publicar en redes: velocidad CONSTANTE por WebCodecs (ver `grabarConCodecs`). */
  codecs?: boolean
  /** Modo película: la escena 3D viva como fuente de los clips `escena3d` (ver `capturarEscena3d`). */
  fuente3d?: Fuente3D
  /** Cada tick del motor de export, antes de emitir el frame: el Director lleva la escena a ese segundo. */
  onTiempo?: (seg: number) => void
  /** Modo película: la resolución sigue al aspecto de la pantalla (ausente = `RESOLUCIONES[aspecto]`). */
  resolucion?: { ancho: number; alto: number }
  /** El canvas de la composición del export, nada más nacer: el monitor del HUD lo enseña mientras se graba. */
  onLienzo?: (canvas: HTMLCanvasElement) => void
}

/**
 * Captura el lienzo 3D de la casa en un `<video>` mudo del que `renderFrame`
 * recorta el encuadre (`peliculaFrame.encuadre`, px CSS → px del lienzo con
 * `width/clientWidth`, que absorbe el dpr de House). No necesita
 * preserveDrawingBuffer: es la misma vía que la grabación de la app en WebView.
 * null donde no hay `captureStream`.
 */
export async function capturarEscena3d(): Promise<{ fuente3d: Fuente3D; cerrar: () => void } | null> {
  const lienzo = document.querySelector<HTMLCanvasElement>('[data-lienzo-casa] canvas')
  if (!lienzo || typeof lienzo.captureStream !== 'function') return null
  const stream = lienzo.captureStream(FPS_EXPORT)
  const video = document.createElement('video')
  video.muted = true
  video.playsInline = true
  video.autoplay = true
  video.srcObject = stream
  try {
    await video.play()
  } catch {
    /* nace de un gesto: no debería fallar */
  }
  const recorte = () => {
    const k = lienzo.width / Math.max(1, lienzo.clientWidth)
    const e = peliculaFrame.encuadre
    return { sx: Math.round(e.x * k), sy: Math.round(e.y * k), sw: Math.round(e.w * k), sh: Math.round(e.h * k) }
  }
  const cerrar = () => {
    for (const p of stream.getTracks()) p.stop()
    video.srcObject = null
  }
  return { fuente3d: { video, recorte }, cerrar }
}

/** El archivo exportado y la firma del proyecto que lo produjo (para no volver a renderizar lo mismo). */
export interface ExportListo {
  blob: Blob
  extension: 'webm' | 'mp4'
  mime: string
  firma: string
}

/**
 * Qué produce el mismo archivo: última edición, aspecto, contenedor y grabador.
 * El grabador entra porque descargar y publicar pueden coincidir en contenedor y
 * NO son el mismo archivo: el de publicar va a velocidad constante.
 */
export const firmaExport = (p: ProyectoAbierto, mime: string, codecs = false) =>
  `${p.actualizadoEn}|${p.aspecto}|${mime}|${codecs ? 'cfr' : 'vfr'}`

/** ¿Se puede grabar con WebCodecs? (Chromium y Safari 16.4+; si no, MediaRecorder.) */
export const soportaCodecs = () => typeof VideoEncoder !== 'undefined' && typeof AudioEncoder !== 'undefined'

/** Renderiza el proyecto entero y devuelve el archivo. Lanza `Error('sin-soporte')`, `Error('sin-clips')` o `Error('cancelado')`. */
export async function exportarVideo(
  proyecto: ProyectoAbierto,
  medios: MedioVideo[],
  opciones: OpcionesExport = {},
): Promise<ExportListo> {
  const formato = mimeExport({ preferirMp4: opciones.preferirMp4 })
  if (!formato) throw new Error('sin-soporte')
  const ctxAudio = contextoAudio()
  if (!ctxAudio) throw new Error('sin-soporte')
  desbloquearAudio()

  const total = duracionTotal(proyecto.clips)
  if (total <= 0) throw new Error('sin-clips')

  const { ancho, alto } = opciones.resolucion ?? RESOLUCIONES[proyecto.aspecto]
  // OffscreenCanvas no tiene captureStream: canvas normal fuera del DOM.
  const canvas = document.createElement('canvas')
  canvas.width = ancho
  canvas.height = alto
  opciones.onLienzo?.(canvas)

  const pool = crearPool(medios)
  // Los elementos de video con volumen y los audios pasan por WebAudio hacia el
  // stream (y también a la salida: oír el export delata errores).
  const destino = ctxAudio.createMediaStreamDestination()
  // Silencio constante SIEMPRE conectado: un destino sin fuentes deja su track
  // «muted» y el muxer del MediaRecorder se queda esperando audio → webm de 0
  // bytes (un proyecto solo de colores y títulos no tiene ninguna otra fuente).
  const silencio = ctxAudio.createConstantSource()
  silencio.offset.value = 0
  silencio.connect(destino)
  silencio.start()
  const nodos: AudioNode[] = []
  // Un Set: conectar dos veces el mismo elemento lanza InvalidStateError.
  const elementos = new Set<HTMLMediaElement>()
  for (const c of proyecto.clips) {
    if (c.pista === 'video' && c.fuente.tipo === 'video') {
      const f = pool.de(c.fuente.medioId)
      if (f?.tipo === 'video') elementos.add(f.el)
    } else if (esClipAudio(c)) {
      const el = pool.audioDe(c)
      if (el) elementos.add(el)
    }
  }
  for (const el of elementos) {
    const nodo = ctxAudio.createMediaElementSource(el)
    nodo.connect(destino)
    nodo.connect(ctxAudio.destination)
    nodos.push(nodo)
  }

  // Best-effort: sin pantalla activa el rAF se congela y el stream deja de emitir.
  type NavegadorConWakeLock = Navigator & { wakeLock?: { request(tipo: 'screen'): Promise<{ release(): Promise<void> }> } }
  let wakeLock: { release(): Promise<void> } | null
  try {
    wakeLock = (await (navigator as NavegadorConWakeLock).wakeLock?.request('screen')) ?? null
  } catch {
    wakeLock = null
  }

  // El pool es fresco: sin esperar sus metadatos, bitmaps y el modelo del
  // avatar, el primer sonido y la primera imagen saldrían tarde (o en blanco).
  await Promise.all([pool.esperar(4000 + 100 * elementos.size), opciones.avatar?.esperar()])

  // Reloj por intervalo: con la pestaña tapada el rAF se congela y el export
  // no terminaría nunca (el wake lock ayuda, pero no cubre el cambio de app).
  const motor = new MotorVideo(canvas, proyecto, pool, medios, {
    intervaloMs: 1000 / FPS_EXPORT,
    avatar: opciones.avatar ?? null,
    fuente3d: opciones.fuente3d,
  })
  const grabacion: Grabacion = {
    canvas,
    pistaAudio: destino.stream.getAudioTracks()[0] as MediaStreamAudioTrack,
    motor,
    total,
    proyecto,
    formato,
    opciones,
  }
  try {
    return opciones.codecs && soportaCodecs() ? await grabarConCodecs(grabacion) : await grabarConMediaRecorder(grabacion)
  } finally {
    motor.destruir()
    silencio.stop()
    silencio.disconnect()
    for (const n of nodos) n.disconnect()
    destino.disconnect()
    pool.dispose()
    void wakeLock?.release().catch(() => {})
  }
}

/** El mismo montaje para los dos grabadores; lo que cambia es cómo se escribe el archivo. */
interface Grabacion {
  canvas: HTMLCanvasElement
  /** `MediaStreamAudioTrack` es el tipo global del DOM: mediabunny exige la pista estrechada. */
  pistaAudio: MediaStreamAudioTrack
  motor: MotorVideo
  /** Duración del proyecto en segundos. */
  total: number
  proyecto: ProyectoAbierto
  formato: { mime: string; extension: 'webm' | 'mp4' }
  opciones: OpcionesExport
}

/**
 * Grabador de siempre. `captureStream(0)` + `requestFrame()`: el frame se emite
 * cuando NOSOTROS lo decimos (uno por tick del motor), lo que sobrevive a la
 * pestaña tapada — con `captureStream(fps)` los frames los produce el
 * compositor, que ahí se congela y deja el webm vacío.
 *
 * A cambio, el archivo hereda la velocidad REAL del render: si un tick tarda más
 * de 1/FPS salen menos fps de los pedidos (medido: 19 en vez de 30 con la
 * máquina cargada). Para descargar da igual; para publicar no, y por eso existe
 * `grabarConCodecs`.
 */
function grabarConMediaRecorder({ canvas, pistaAudio, motor, total, proyecto, formato, opciones }: Grabacion): Promise<ExportListo> {
  const streamCanvas = canvas.captureStream(0)
  const trackVideo = streamCanvas.getVideoTracks()[0] as CanvasCaptureMediaStreamTrack
  const recorder = new MediaRecorder(new MediaStream([trackVideo, pistaAudio]), {
    mimeType: formato.mime,
    videoBitsPerSecond: BITRATE_VIDEO,
  })
  const chunks: Blob[] = []
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data)
  }
  return new Promise<ExportListo>((resolver, rechazar) => {
    let terminado = false
    const abortar = () => {
      if (terminado) return
      terminado = true
      motor.pausa()
      try {
        recorder.stop()
      } catch {
        /* ya parado */
      }
      rechazar(new Error('cancelado'))
    }
    opciones.senal?.addEventListener('abort', abortar, { once: true })
    recorder.onerror = () => {
      if (terminado) return
      terminado = true
      motor.pausa()
      rechazar(new Error('grabacion'))
    }
    recorder.onstop = () => {
      if (terminado) return
      terminado = true
      resolver({
        blob: new Blob(chunks, { type: formato.mime }),
        extension: formato.extension,
        mime: formato.mime,
        firma: firmaExport(proyecto, formato.mime),
      })
    }
    motor.onTiempo = (t) => {
      // El frame compuesto lleva el 3D del tick anterior (~un frame): aceptable.
      opciones.onTiempo?.(t)
      trackVideo.requestFrame()
      opciones.onProgreso?.(Math.min(1, t / total))
    }
    motor.onFin = () => {
      // Cola corta para que el último frame y el audio entren al contenedor.
      window.setTimeout(() => {
        try {
          recorder.stop()
        } catch {
          /* ya parado */
        }
      }, 250)
    }
    recorder.start(1000)
    motor.play()
  })
}

/**
 * Grabador para PUBLICAR: velocidad constante. La diferencia con MediaRecorder
 * es que aquí el timestamp de cada fotograma sale de la LÍNEA DE TIEMPO, no del
 * reloj, así que un render lento no baja los fps — repite el último lienzo hasta
 * ponerse al día. Las redes lo exigen: TikTok rechaza por debajo de 23 fps con
 * `frame_rate_check_failed`.
 *
 * No se desincroniza con el audio porque el motor ya lleva su reloj por tiempo
 * real: cuando el render se retrasa no se queda atrás, se salta posiciones de la
 * línea de tiempo, y los fotogramas repetidos rellenan justo esos huecos.
 *
 * `mediabunny` entra por `import()` para que no pese en el arranque.
 */
async function grabarConCodecs({ canvas, pistaAudio, motor, total, proyecto, formato, opciones }: Grabacion): Promise<ExportListo> {
  const { Output, WebMOutputFormat, Mp4OutputFormat, BufferTarget, CanvasSource, MediaStreamAudioTrackSource } = await import('mediabunny')
  const mp4 = formato.extension === 'mp4'
  const salida = new Output({ format: mp4 ? new Mp4OutputFormat() : new WebMOutputFormat(), target: new BufferTarget() })
  const video = new CanvasSource(canvas, { codec: mp4 ? 'avc' : 'vp9', bitrate: BITRATE_VIDEO, keyFrameInterval: 2 })
  salida.addVideoTrack(video, { frameRate: FPS_EXPORT })
  salida.addAudioTrack(new MediaStreamAudioTrackSource(pistaAudio, { codec: mp4 ? 'aac' : 'opus', bitrate: BITRATE_AUDIO }))
  await salida.start()

  const paso = 1 / FPS_EXPORT
  let siguiente = 0
  // `add()` captura el lienzo AL LLAMARLO, así que no se puede diferir: se llama
  // en el acto y solo se espera la última promesa, que es la que sirve de freno.
  let ultimo: Promise<void> = Promise.resolve()
  return await new Promise<ExportListo>((resolver, rechazar) => {
    let terminado = false
    const parar = (e: Error) => {
      if (terminado) return
      terminado = true
      motor.pausa()
      void salida.cancel().catch(() => {})
      rechazar(e)
    }
    opciones.senal?.addEventListener('abort', () => parar(new Error('cancelado')), { once: true })
    motor.onTiempo = (t) => {
      if (terminado) return
      opciones.onTiempo?.(t)
      // Todos los fotogramas de la línea de tiempo hasta `t`: si el render se
      // retrasó, el mismo lienzo sale varias veces y la velocidad no baja.
      while (siguiente * paso <= t) {
        ultimo = video.add(siguiente * paso, paso)
        siguiente++
      }
      opciones.onProgreso?.(Math.min(1, t / total))
    }
    motor.onFin = () => {
      window.setTimeout(() => {
        void (async () => {
          if (terminado) return
          try {
            await ultimo
            await salida.finalize()
            const datos = salida.target.buffer
            if (!datos) throw new Error('grabacion')
            terminado = true
            resolver({
              blob: new Blob([datos], { type: formato.mime }),
              extension: formato.extension,
              mime: formato.mime,
              firma: firmaExport(proyecto, formato.mime, true),
            })
          } catch (e) {
            parar(e instanceof Error ? e : new Error('grabacion'))
          }
        })()
      }, 250)
    }
    motor.play()
  })
}
