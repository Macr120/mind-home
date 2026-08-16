import { useRef, useState } from 'react'
import { useAjustes } from '../state/ajustesStore'
import { datosIdioma } from '../i18n/idiomas'
import { useT } from '../i18n/useT'
import { ErrorIA } from '../cuenta/api'
import { hayDictadoFallback, forzarDictadoIA, transcribir } from './dictado'

/** Mínimo de la Web Speech API que usamos (no viene en lib.dom). */
interface ReconocimientoVoz {
  lang: string
  interimResults: boolean
  continuous: boolean
  onresult: ((ev: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null
  onend: (() => void) | null
  onerror: ((ev: { error?: string }) => void) | null
  start(): void
  stop(): void
}

const CtorVoz = (window as unknown as {
  SpeechRecognition?: new () => ReconocimientoVoz
  webkitSpeechRecognition?: new () => ReconocimientoVoz
}).SpeechRecognition ?? (window as unknown as {
  webkitSpeechRecognition?: new () => ReconocimientoVoz
}).webkitSpeechRecognition

/**
 * Dictado por voz compartido (chat de la casa y Chat AR): Web Speech API nativa
 * o el fallback de Whisper (MediaRecorder + proxy `ia-voz`) cuando no existe —
 * o cuando se fuerza por pruebas con `window.mhDictadoIA(true)` en consola.
 * Los mensajes de error salen YA traducidos por `onError`.
 */
export function useDictado({
  onTexto,
  onError,
}: {
  /** Parciales del dictado nativo y resultado final del fallback Whisper. */
  onTexto: (texto: string) => void
  onError?: (mensaje: string) => void
}) {
  const t = useT()
  const idioma = useAjustes((s) => s.idioma)
  const [grabando, setGrabando] = useState(false)
  const [transcribiendo, setTranscribiendo] = useState(false)
  const recRef = useRef<ReconocimientoVoz | null>(null)
  const mediaRecRef = useRef<MediaRecorder | null>(null)
  // `detener()` marca descarte: lo grabado no se transcribe (cleanup al desmontar).
  const descartar = useRef(false)
  // Últimos callbacks: evita closures viejas dentro de onstop/onresult.
  const onTextoRef = useRef(onTexto)
  onTextoRef.current = onTexto
  const onErrorRef = useRef(onError)
  onErrorRef.current = onError

  /**
   * Fallback de dictado (MediaRecorder + Whisper) para cuando no hay
   * `SpeechRecognition` nativo (WebView de Android). Tope de 30s: mismo margen
   * de costo que asume el proxy `ia-voz`.
   */
  const grabarConFallback = async () => {
    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch {
      onErrorRef.current?.(t('chat.voz.permiso', 'El navegador bloqueó el micrófono. Actívalo en el candado junto a la dirección.'))
      return
    }
    const rec = new MediaRecorder(stream)
    const trozos: Blob[] = []
    const inicio = performance.now()
    rec.ondataavailable = (ev) => {
      if (ev.data.size > 0) trozos.push(ev.data)
    }
    rec.onstop = async () => {
      stream.getTracks().forEach((tr) => tr.stop())
      setGrabando(false)
      if (descartar.current) return
      const blob = new Blob(trozos, { type: rec.mimeType || 'audio/webm' })
      if (!blob.size) return
      setTranscribiendo(true)
      try {
        onTextoRef.current(await transcribir(blob, idioma, (performance.now() - inicio) / 1000))
      } catch (e) {
        // ErrorIA de cuota-agotada ya abrió su propio modal (exigirTransporteVoz).
        if (!(e instanceof ErrorIA)) {
          onErrorRef.current?.(t('chat.voz.error', 'No pude usar el dictado ({motivo}).', { motivo: e instanceof Error ? e.message : '' }))
        }
      } finally {
        setTranscribiendo(false)
      }
    }
    mediaRecRef.current = rec
    setGrabando(true)
    rec.start()
    setTimeout(() => {
      if (rec.state !== 'inactive') rec.stop()
    }, 30_000)
  }

  /** Arranca o detiene el dictado (nativo o fallback, lo que haya). */
  const toggle = () => {
    const usaNativo = CtorVoz && !forzarDictadoIA()
    if (grabando) {
      if (usaNativo) recRef.current?.stop()
      else mediaRecRef.current?.stop()
      return
    }
    descartar.current = false
    if (usaNativo) {
      const rec = new CtorVoz()
      rec.lang = datosIdioma(idioma).locale
      rec.interimResults = true
      rec.continuous = false
      rec.onresult = (ev) => {
        let s = ''
        for (let i = 0; i < ev.results.length; i++) s += ev.results[i][0].transcript
        onTextoRef.current(s)
      }
      rec.onend = () => setGrabando(false)
      // El error más común es el permiso del micrófono: dilo claro, no falles en silencio.
      rec.onerror = (ev) => {
        setGrabando(false)
        const motivo = ev.error ?? ''
        if (motivo === 'no-speech') return // terminó sin oír nada, no es un error real
        const MENSAJES: Record<string, string> = {
          'not-allowed': t('chat.voz.permiso', 'El navegador bloqueó el micrófono. Actívalo en el candado junto a la dirección.'),
          'service-not-allowed': t('chat.voz.permiso', 'El navegador bloqueó el micrófono. Actívalo en el candado junto a la dirección.'),
          'audio-capture': t('chat.voz.sinMic', 'No encontré ningún micrófono en este equipo.'),
          network: t('chat.voz.red', 'El dictado del navegador necesita internet.'),
          'language-not-supported': t('chat.voz.idioma', 'Tu navegador no soporta dictado en este idioma.'),
        }
        onErrorRef.current?.(MENSAJES[motivo] ?? t('chat.voz.error', 'No pude usar el dictado ({motivo}).', { motivo }))
      }
      recRef.current = rec
      setGrabando(true)
      try {
        rec.start()
      } catch {
        setGrabando(false)
      }
      return
    }
    if (hayDictadoFallback()) void grabarConFallback()
  }

  /** Corta lo que esté grabando SIN transcribir (cleanup al desmontar el consumidor). */
  const detener = () => {
    descartar.current = true
    recRef.current?.stop()
    const mr = mediaRecRef.current
    if (mr && mr.state !== 'inactive') mr.stop()
  }

  return { soportado: !!CtorVoz || hayDictadoFallback(), grabando, transcribiendo, toggle, detener }
}
