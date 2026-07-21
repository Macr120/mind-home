import { contextoAudio } from './motor'

/**
 * "Detección" del audio del SISTEMA: el navegador no deja leer qué canción
 * suena en otras apps (título/artista es imposible desde la web); lo que SÍ
 * permite es capturar la señal con getDisplayMedia — el usuario comparte su
 * pantalla (marcando «compartir audio del sistema») o una pestaña con audio.
 * La señal NO se re-enruta a las bocinas (ya está sonando): solo alimenta un
 * AnalyserNode para visualizarla en vivo. Solo puede iniciarse desde un clic.
 */

let stream: MediaStream | null = null
let fuente: MediaStreamAudioSourceNode | null = null
let analizador: AnalyserNode | null = null
const oyentes = new Set<() => void>()

const avisar = () => {
  for (const cb of oyentes) cb()
}

/** Suscripción para que la UI re-renderice al conectar/desconectar. */
export function alCambiarSistema(cb: () => void): () => void {
  oyentes.add(cb)
  return () => {
    oyentes.delete(cb)
  }
}

export const sistemaConectado = (): boolean => stream != null

export const analizadorSistema = (): AnalyserNode | null => analizador

export async function conectarSistema(): Promise<'ok' | 'sin-audio' | 'cancelado'> {
  if (stream) return 'ok'
  const ctx = contextoAudio()
  if (!ctx) return 'cancelado'
  let s: MediaStream
  try {
    // El selector exige pedir video aunque solo interese el audio.
    s = await navigator.mediaDevices.getDisplayMedia({
      video: true,
      audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
    })
  } catch {
    return 'cancelado' // cerró el selector o el navegador no soporta captura
  }
  if (s.getAudioTracks().length === 0) {
    // Compartió pantalla/pestaña pero sin marcar la casilla de audio.
    for (const p of s.getTracks()) p.stop()
    return 'sin-audio'
  }
  stream = s
  fuente = ctx.createMediaStreamSource(s)
  analizador = ctx.createAnalyser()
  analizador.fftSize = 128
  analizador.smoothingTimeConstant = 0.75
  fuente.connect(analizador)
  // «Dejar de compartir» desde la barra del navegador termina cualquier pista.
  for (const pista of s.getTracks()) pista.addEventListener('ended', desconectarSistema)
  avisar()
  return 'ok'
}

export function desconectarSistema(): void {
  if (!stream) return
  for (const pista of stream.getTracks()) pista.stop()
  try {
    fuente?.disconnect()
  } catch {
    /* ya desconectado */
  }
  stream = null
  fuente = null
  analizador = null
  avisar()
}
