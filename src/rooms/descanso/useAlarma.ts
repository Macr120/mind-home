import { useEffect, useRef, useState } from 'react'
import type { PistaMusica } from '../../core/data/db'
import { iniciarTono, TONO_DEFAULT, VOLUMEN_DEFAULT } from './tonos'

/** Dos notas suaves y descendentes, una sola vez: un recordatorio avisa, no despierta. */
function tonoSuave(): void {
  const Ctor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Ctor) return
  const ctx = new Ctor()
  const t0 = ctx.currentTime
  for (const [i, frec] of [523.25, 392].entries()) {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.value = frec
    gain.gain.setValueAtTime(0.0001, t0 + i * 0.4)
    gain.gain.exponentialRampToValueAtTime(0.18, t0 + i * 0.4 + 0.05)
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + i * 0.4 + 0.38)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(t0 + i * 0.4)
    osc.stop(t0 + i * 0.4 + 0.4)
  }
  window.setTimeout(() => void ctx.close(), 1200)
}

/** Milisegundos hasta la próxima ocurrencia de 'HH:mm' (hoy o mañana). */
function msHasta(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number)
  const ahora = new Date()
  const objetivo = new Date(ahora)
  objetivo.setHours(h, m, 0, 0)
  if (objetivo <= ahora) objetivo.setDate(objetivo.getDate() + 1)
  return objetivo.getTime() - ahora.getTime()
}

/**
 * Despertador en vivo: con la app abierta, al llegar `hora` suena el tono
 * elegido en bucle y (si hay permiso) se muestra una notificación del
 * navegador. `detener` apaga el tono y re-programa para el día siguiente.
 *
 * El tono y su volumen viajan en un ref y NO en las dependencias del efecto:
 * si entraran, cambiar el volumen mientras suena re-programaría la alarma y
 * cortaría el sonido a media nota.
 */
export function useAlarma(
  activa: boolean,
  hora: string,
  textoNotif: string,
  sonido: { tono?: string; volumen?: number; pista?: PistaMusica } = {},
) {
  const [sonando, setSonando] = useState(false)
  const [ciclo, setCiclo] = useState(0) // fuerza re-programar tras detener
  const pararTono = useRef<() => void>(() => {})
  const sonidoRef = useRef(sonido)
  useEffect(() => {
    sonidoRef.current = sonido
  })

  useEffect(() => {
    if (!activa || !/^\d{1,2}:\d{2}$/.test(hora)) return
    const timeout = window.setTimeout(() => {
      const { tono, volumen, pista } = sonidoRef.current
      setSonando(true)
      pararTono.current = iniciarTono(tono ?? TONO_DEFAULT, volumen ?? VOLUMEN_DEFAULT, pista)
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(`⏰ ${hora}`, { body: textoNotif })
      }
    }, msHasta(hora))
    // El cleanup cubre también desactivar mientras suena y el desmontaje:
    // apaga el tono (noop si no sonaba) y regresa el estado a apagado.
    return () => {
      window.clearTimeout(timeout)
      pararTono.current()
      pararTono.current = () => {}
      setSonando(false)
    }
  }, [activa, hora, ciclo, textoNotif])

  const detener = () => {
    pararTono.current()
    setSonando(false)
    setCiclo((c) => c + 1)
  }

  return { sonando, detener }
}

/**
 * Recordatorio en vivo: con la app abierta, al llegar `hora` avisa UNA vez
 * (tono suave + notificación) y deja el aviso en pantalla hasta cerrarlo.
 * `cerrar` lo descarta y re-programa para el día siguiente.
 */
export function useRecordatorio(activo: boolean, hora: string, titulo: string, cuerpo: string) {
  const [avisando, setAvisando] = useState(false)
  const [ciclo, setCiclo] = useState(0) // fuerza re-programar tras cerrar

  useEffect(() => {
    if (!activo || !/^\d{1,2}:\d{2}$/.test(hora)) return
    const timeout = window.setTimeout(() => {
      setAvisando(true)
      tonoSuave()
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(titulo, { body: cuerpo })
      }
    }, msHasta(hora))
    // Cubre también desactivar el aviso mientras se muestra y el desmontaje.
    return () => {
      window.clearTimeout(timeout)
      setAvisando(false)
    }
  }, [activo, hora, ciclo, titulo, cuerpo])

  return { avisando, cerrar: () => setCiclo((c) => c + 1) }
}
