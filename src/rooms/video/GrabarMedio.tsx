import { useEffect, useRef, useState } from 'react'
import type { FiltroVoz } from '../../core/data/db'
import { mediosVideoRepo } from '../../core/data/repository'
import { formatoGrabacion, MAX_SEG_GRABACION } from '../../core/grabacionPantalla'
import { useT } from '../../core/i18n/useT'
import { confirmar } from '../../core/state/confirmarStore'
import { Icono } from '../../core/ui/iconos/Icono'
import { BotonPrimario, BotonSecundario, Modal } from '../_shared/ui'
import type { MedioConId } from './clipsNuevos'
import { COLOR } from './constantes'
import { completarGrabacion } from './importar'
import { SeccionFiltroVoz } from './Secciones'

/**
 * Grabar un medio nuevo desde el dispositivo, para la biblioteca de Medios:
 * la cámara (video con su audio) o el micrófono (solo audio). El permiso se
 * pide al abrir; la toma se guarda en `mediosVideo` con la duración medida
 * (los webm de MediaRecorder no la traen) y el modal se cierra solo.
 */

export type TipoGrabacion = 'camara' | 'microfono'

/** Primer contenedor de solo audio que MediaRecorder sabe escribir, o null. */
function formatoAudio(): string | null {
  if (typeof MediaRecorder === 'undefined' || typeof MediaRecorder.isTypeSupported !== 'function') return null
  const candidatos = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus']
  return candidatos.find((m) => MediaRecorder.isTypeSupported(m)) ?? null
}

const reloj = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`

export function GrabarMedioModal({
  tipo,
  onCerrar,
  onGuardado,
}: {
  tipo: TipoGrabacion
  onCerrar: () => void
  /** La toma ya está en Medios (el menú «Añadir» la mete en la timeline), con el filtro de voz elegido al grabar con el micrófono. */
  onGuardado?: (medio: MedioConId, filtroVoz?: FiltroVoz) => void
}) {
  const t = useT()
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [frontal, setFrontal] = useState(true)
  const [estado, setEstado] = useState<'listo' | 'grabando' | 'guardando'>('listo')
  const [seg, setSeg] = useState(0)
  const [filtroVoz, setFiltroVoz] = useState<FiltroVoz | undefined>()
  const videoRef = useRef<HTMLVideoElement>(null)
  const nivelRef = useRef<HTMLDivElement>(null)
  const recRef = useRef<MediaRecorder | null>(null)
  const onCerrarRef = useRef(onCerrar)
  useEffect(() => {
    onCerrarRef.current = onCerrar
  })
  const camara = tipo === 'camara'

  // El dispositivo se pide al abrir (y de nuevo al cambiar de cámara).
  useEffect(() => {
    let vivo = true
    let s: MediaStream | null = null
    const pedir = async () => {
      try {
        s = await navigator.mediaDevices.getUserMedia(
          camara ? { video: { facingMode: frontal ? 'user' : 'environment' }, audio: true } : { audio: true },
        )
      } catch {
        if (!vivo) return
        await confirmar({
          titulo: camara
            ? t('video.medios.sinCamara', 'No se pudo usar la cámara')
            : t('audio.grab.sinMicTitulo', 'No se pudo usar el micrófono'),
          mensaje: camara
            ? t('video.medios.sinCamaraMsg', 'El navegador bloqueó la cámara. Actívala en el candado junto a la dirección.')
            : t('chat.voz.permiso', 'El navegador bloqueó el micrófono. Actívalo en el candado junto a la dirección.'),
        })
        onCerrarRef.current()
        return
      }
      if (!vivo) {
        s.getTracks().forEach((p) => p.stop())
        return
      }
      setStream(s)
    }
    void pedir()
    return () => {
      vivo = false
      s?.getTracks().forEach((p) => p.stop())
    }
  }, [camara, frontal, t])

  // Previsualización de la cámara.
  useEffect(() => {
    const v = videoRef.current
    if (!v || !camara) return
    v.srcObject = stream
    return () => {
      v.srcObject = null
    }
  }, [stream, camara])

  // Medidor de nivel del micrófono (sin estado: pinta por ref cada frame).
  useEffect(() => {
    if (!stream || camara) return
    const ctx = new AudioContext()
    const analizador = ctx.createAnalyser()
    analizador.fftSize = 256
    ctx.createMediaStreamSource(stream).connect(analizador)
    const datos = new Uint8Array(analizador.frequencyBinCount)
    let raf = 0
    const pintar = () => {
      analizador.getByteTimeDomainData(datos)
      let pico = 0
      for (const d of datos) pico = Math.max(pico, Math.abs(d - 128) / 128)
      if (nivelRef.current) nivelRef.current.style.transform = `scaleX(${Math.min(1, pico * 1.5)})`
      raf = requestAnimationFrame(pintar)
    }
    raf = requestAnimationFrame(pintar)
    return () => {
      cancelAnimationFrame(raf)
      void ctx.close().catch(() => {})
    }
  }, [stream, camara])

  // Reloj de la toma y tope de duración.
  useEffect(() => {
    if (estado !== 'grabando') return
    const inicio = performance.now()
    const id = window.setInterval(() => {
      const s = (performance.now() - inicio) / 1000
      setSeg(s)
      const rec = recRef.current
      if (s >= MAX_SEG_GRABACION && rec && rec.state !== 'inactive') {
        setEstado('guardando')
        rec.stop() // → onstop → guardar
      }
    }, 250)
    return () => window.clearInterval(id)
  }, [estado])

  const sinSoporte = () =>
    confirmar({
      titulo: t('video.export.sinSoporte', 'Este navegador no puede grabar video'),
      mensaje: t('video.export.sinSoporteMsg', 'Prueba en Chrome o en la app de escritorio.'),
    })

  const guardar = async (blob: Blob, dur: number) => {
    const duracion = Math.round(dur * 100) / 100
    if (blob.size === 0 || duracion < 0.5) {
      setEstado('listo')
      setSeg(0)
      return
    }
    const ahora = new Date()
    const h = ahora.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    const fila = camara
      ? {
          tipo: 'video' as const,
          nombre: t('video.medios.nombreCamara', 'Cámara · {h}', { h }),
          blob,
          duracion,
          origen: 'grabacion' as const,
          creadoEn: ahora.toISOString(),
        }
      : {
          tipo: 'audio' as const,
          nombre: t('video.medios.nombreMicrofono', 'Micrófono · {h}', { h }),
          blob,
          duracion,
          origen: 'grabacion' as const,
          creadoEn: ahora.toISOString(),
        }
    try {
      const id = await mediosVideoRepo.add(fila)
      if (fila.tipo === 'video') void completarGrabacion({ ...fila, id }) // miniatura y dimensiones en segundo plano
      onGuardado?.({ ...fila, id }, camara ? undefined : filtroVoz)
    } catch {
      await confirmar({
        titulo: t('video.medios.sinEspacio', 'No se pudo guardar la toma'),
        mensaje: t('video.medios.sinEspacioMsg', 'No queda espacio en este dispositivo.'),
      })
    }
    onCerrarRef.current()
  }

  const grabar = () => {
    if (!stream || estado !== 'listo') return
    const mime = camara ? formatoGrabacion()?.mime : formatoAudio()
    if (!mime) {
      void sinSoporte()
      return
    }
    let rec: MediaRecorder
    try {
      rec = new MediaRecorder(stream, camara ? { mimeType: mime, videoBitsPerSecond: 4_000_000 } : { mimeType: mime })
    } catch {
      void sinSoporte()
      return
    }
    const trozos: Blob[] = []
    let inicio = performance.now()
    rec.onstart = () => {
      inicio = performance.now()
    }
    rec.ondataavailable = (e) => {
      if (e.data.size > 0) trozos.push(e.data)
    }
    rec.onstop = () => void guardar(new Blob(trozos, { type: rec.mimeType || mime }), (performance.now() - inicio) / 1000)
    recRef.current = rec
    rec.start(1000)
    setSeg(0)
    setEstado('grabando')
  }

  const detener = () => {
    const rec = recRef.current
    if (!rec || rec.state === 'inactive') return
    setEstado('guardando')
    rec.stop() // → onstop → guardar
  }

  // Cerrar con una toma andando la guarda (no se pierde por un Escape).
  const cerrar = () => {
    if (estado === 'grabando') detener()
    else if (estado === 'listo') onCerrar()
  }

  const grabando = estado === 'grabando'
  return (
    <Modal
      titulo={camara ? t('video.medios.camara', 'Grabar con la cámara') : t('video.medios.microfono', 'Grabar con el micrófono')}
      onCerrar={cerrar}
    >
      {camara ? (
        <div className="relative overflow-hidden rounded-xl bg-black">
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className={`aspect-video w-full object-cover${frontal ? ' [transform:scaleX(-1)]' : ''}`}
          />
          {!stream && (
            <p className="absolute inset-0 grid place-items-center text-xs text-white/60">
              {t('video.medios.pidiendo', 'Pidiendo permiso…')}
            </p>
          )}
          {grabando && (
            <span className="absolute left-2 top-2 flex items-center gap-1.5 rounded-full bg-black/60 px-2 py-0.5 text-xs font-semibold text-white">
              <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" /> {reloj(seg)}
            </span>
          )}
        </div>
      ) : (
        <div className="space-y-2 rounded-xl bg-black/30 p-4 text-center">
          <p className="text-4xl">
            <Icono nombre="microfono" />
          </p>
          <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
            <div
              ref={nivelRef}
              className="h-full origin-left rounded-full bg-emerald-400 transition-transform duration-75"
              style={{ transform: 'scaleX(0)' }}
            />
          </div>
          <p className="text-sm font-semibold tabular-nums">{stream ? reloj(seg) : t('video.medios.pidiendo', 'Pidiendo permiso…')}</p>
        </div>
      )}
      {!camara && onGuardado && <SeccionFiltroVoz filtro={filtroVoz} onCambiar={setFiltroVoz} />}
      <div className="flex items-center justify-between gap-2">
        {camara ? (
          <BotonSecundario pequeno disabled={grabando || !stream} onClick={() => setFrontal((v) => !v)}>
            <Icono nombre="rotar-der" /> {t('video.medios.cambiarCamara', 'Cambiar cámara')}
          </BotonSecundario>
        ) : (
          <span />
        )}
        {grabando ? (
          <BotonPrimario type="button" pequeno color="#dc2626" onClick={detener}>
            <Icono nombre="detener" /> {t('video.grabar.detener', 'Detener')}
          </BotonPrimario>
        ) : (
          <BotonPrimario type="button" pequeno app={COLOR} disabled={!stream || estado !== 'listo'} onClick={grabar}>
            <Icono nombre="grabar" />{' '}
            {estado === 'guardando' ? t('video.grabar.guardando', 'Guardando…') : t('video.medios.grabar', 'Grabar')}
          </BotonPrimario>
        )}
      </div>
    </Modal>
  )
}
