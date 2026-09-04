import { contextoAudio } from '../../core/audio/motor'
import { grabacionesAudioRepo } from '../../core/data/repository'
import { MAX_SEG_CLIP } from './constantes'
import * as motor from './motor'
import type { AnclaGrabacion } from './motor'

/**
 * Toma de micrófono anclada al transporte: el editor pide el stream (gesto del
 * usuario) y arranca `motor.reproducir({grabar:true})`; aquí solo se captura,
 * se recorta la cuenta de pre-roll y se guarda la grabación.
 *
 * El cierre NO depende de quién paró el transporte: cualquier transición a
 * `'parado'` (stop, pausa, fin natural, pestaña oculta, `liberar`) detiene el
 * recorder — `alFin` no basta porque `detener()` no lo invoca.
 */

export interface ResultadoToma {
  grabacionId: number
  /** `creadoEn` de la fila: el sello que valida el id local tras un sync. */
  sello: string
  nombre: string
  /** Paso donde entra el clip (0, salvo que el recorder arrancara tarde). */
  inicio: number
  duracionSeg: number
  recorteSeg: number
  picos: number[]
}

export interface TomaAudio {
  /** Descarta la toma (detiene el recorder sin guardar nada). */
  cancelar(): void
}

export function iniciarTomaAudio(
  stream: MediaStream,
  ancla: AnclaGrabacion,
  opts: { nombre: string; alTerminar: (res: ResultadoToma | null) => void },
): TomaAudio {
  const rec = new MediaRecorder(stream)
  const trozos: Blob[] = []
  let tPerfStart = performance.now()
  let cancelada = false

  const pararRec = () => {
    if (rec.state !== 'inactive') rec.stop()
  }
  const desuscribir = motor.transporteStore.subscribe(() => {
    if (motor.transporteStore.getSnapshot() === 'parado') pararRec()
  })
  // Tope duro de memoria: corta el recorder sin tocar el transporte.
  const topeTimer = window.setTimeout(pararRec, MAX_SEG_CLIP * 1000)

  rec.onstart = () => {
    tPerfStart = performance.now()
  }
  rec.ondataavailable = (ev) => {
    if (ev.data.size > 0) trozos.push(ev.data)
  }
  rec.onstop = () => {
    desuscribir()
    window.clearTimeout(topeTimer)
    stream.getTracks().forEach((tr) => tr.stop())
    if (cancelada) return opts.alTerminar(null)
    void procesar()
  }

  const procesar = async () => {
    const ctx = contextoAudio()
    const blob = new Blob(trozos, { type: rec.mimeType || 'audio/webm' })
    if (!ctx || blob.size === 0) return opts.alTerminar(null)
    let buffer: AudioBuffer
    try {
      // La duración REAL sale de aquí: los webm de MediaRecorder mienten en <audio>.
      buffer = await ctx.decodeAudioData(await blob.arrayBuffer())
    } catch {
      return opts.alTerminar(null)
    }
    // Instante (reloj perf) del paso 0: el compás 1 tras la cuenta del pre-roll.
    const tPerf0 = ancla.perfRef + (0 - ancla.anclaPaso) * ancla.spb * 1000
    let recorteSeg = (tPerf0 - tPerfStart) / 1000
    let inicio = 0
    if (recorteSeg < 0) {
      // El recorder arrancó DESPUÉS del compás 1: el clip entra a media canción.
      inicio = -recorteSeg / ancla.spb
      recorteSeg = 0
    }
    recorteSeg = Math.min(recorteSeg, buffer.duration)
    const duracionSeg = buffer.duration - recorteSeg
    if (duracionSeg < 0.2) return opts.alTerminar(null) // toma vacía (solo la cuenta)
    const picos = calcularPicos(buffer, recorteSeg)
    const creadoEn = new Date().toISOString()
    const grabacionId = await grabacionesAudioRepo.add({ nombre: opts.nombre, blob, duracionSeg, picos, creadoEn })
    motor.registrarBufferClip(grabacionId, buffer) // ya decodificado: al caché directo
    opts.alTerminar({ grabacionId, sello: creadoEn, nombre: opts.nombre, inicio, duracionSeg, recorteSeg, picos })
  }

  rec.start()
  return {
    cancelar() {
      cancelada = true
      pararRec()
    },
  }
}

/** ~200 cubetas de pico absoluto 0..1 (canal 0) para pintar la onda sin re-decodificar. */
export function calcularPicos(buffer: AudioBuffer, desdeSeg: number): number[] {
  const datos = buffer.getChannelData(0)
  const desde = Math.min(datos.length, Math.floor(desdeSeg * buffer.sampleRate))
  const n = datos.length - desde
  if (n <= 0) return []
  const cubetas = Math.min(200, n)
  const porCubeta = Math.floor(n / cubetas)
  const picos: number[] = []
  for (let c = 0; c < cubetas; c++) {
    let max = 0
    const fin = c === cubetas - 1 ? datos.length : desde + (c + 1) * porCubeta
    for (let i = desde + c * porCubeta; i < fin; i++) {
      const v = Math.abs(datos[i])
      if (v > max) max = v
    }
    picos.push(Math.round(max * 100) / 100)
  }
  return picos
}
