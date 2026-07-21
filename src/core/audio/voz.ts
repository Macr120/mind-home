import { useEffect } from 'react'
import { useAjustes } from '../state/ajustesStore'
import { useMascota } from '../state/mascotaStore'
import { getAsistente } from '../state/asistentesStore'
import { VOZ_FORMA, type MascotaId } from '../chat/mascotas'
import { limpiarMarkdown, quitarEmojis } from '../chat/texto'
import { contextoAudio, gainMaestro } from './motor'

/**
 * Voz de los asistentes (speechSynthesis del navegador). Independiente del TTS
 * de la app de idiomas (rooms/idiomas/tts.ts): aquí hay tono/velocidad/volumen
 * por asistente, ducking de la música mientras hablan y sincronía con la
 * burbuja (no se cierra a media frase). El habla espontánea nunca se dispara
 * con un cuarto abierto, así que no pisa la lectura del tutor de idiomas.
 */

export function hayVoz(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
}

// Algunos navegadores devuelven getVoices() vacío hasta el evento voiceschanged.
let voces: SpeechSynthesisVoice[] = []
if (hayVoz()) {
  const cargar = () => {
    voces = window.speechSynthesis.getVoices()
  }
  cargar()
  window.speechSynthesis.addEventListener?.('voiceschanged', cargar)
}

// Android reporta lang con guion bajo ('es_MX').
const norm = (lang: string) => lang.replace('_', '-').toLowerCase()

/** Voces del sistema de la familia del idioma dado (para el selector de la ficha). */
export function vocesDisponibles(lang: string): SpeechSynthesisVoice[] {
  if (!hayVoz()) return []
  if (!voces.length) voces = window.speechSynthesis.getVoices()
  const familia = lang.slice(0, 2).toLowerCase()
  return voces.filter((v) => norm(v.lang).startsWith(familia))
}

/** Idioma BCP-47 de la voz según el ajuste de idioma de la app. */
export function langVoz(): string {
  return useAjustes.getState().idioma === 'en' ? 'en-US' : 'es-MX'
}

export interface OpcionesHabla {
  lang?: string
  rate?: number
  pitch?: number
  volumen?: number
  /** Nombre exacto de una voz del sistema (gana a la elección por idioma). */
  vozNombre?: string
  /** Se llama SIEMPRE una sola vez al terminar (fin, error o cancelación). */
  onFin?: () => void
}

// Ducking: la música baja al 25% mientras un asistente habla.
let hablaActual = 0

function duck(bajar: boolean) {
  const ctx = contextoAudio()
  const g = gainMaestro()
  if (!ctx || !g) return
  const volumen = useAjustes.getState().musicaVolumen
  g.gain.setTargetAtTime(bajar ? volumen * 0.25 : volumen, ctx.currentTime, 0.2)
}

/**
 * Lee un texto en voz alta (le quita emojis para no leerlos como "cara feliz").
 * Devuelve true si el habla arrancó; corta cualquier lectura anterior.
 */
export function hablarVoz(texto: string, opts: OpcionesHabla = {}): boolean {
  if (!hayVoz()) return false
  const limpio = quitarEmojis(texto).trim()
  if (!limpio) return false
  try {
    const synth = window.speechSynthesis
    synth.cancel() // una sola voz a la vez
    const u = new SpeechSynthesisUtterance(limpio)
    u.lang = opts.lang ?? langVoz()
    if (!voces.length) voces = synth.getVoices()
    const objetivo = u.lang.toLowerCase()
    const voz =
      (opts.vozNombre ? voces.find((v) => v.name === opts.vozNombre) : undefined) ??
      voces.find((v) => norm(v.lang) === objetivo) ??
      voces.find((v) => norm(v.lang).startsWith(objetivo.slice(0, 2)))
    if (voz) u.voice = voz
    u.rate = Math.min(2, Math.max(0.5, opts.rate ?? 1))
    u.pitch = Math.min(2, Math.max(0, opts.pitch ?? 1))
    u.volume = Math.min(1, Math.max(0, opts.volumen ?? 1))

    // El fin de un utterance viejo (cancelado) no debe restaurar la música
    // por encima del que sigue hablando: solo el más reciente hace duck(false).
    const id = ++hablaActual
    let terminado = false
    const fin = () => {
      if (terminado) return
      terminado = true
      if (id === hablaActual) duck(false)
      opts.onFin?.()
    }
    u.onend = fin
    u.onerror = fin
    duck(true)
    synth.speak(u)
    return true
  } catch {
    duck(false)
    return false
  }
}

/** Corta cualquier lectura en curso. */
export function callarVoz(): void {
  if (!hayVoz()) return
  try {
    window.speechSynthesis.cancel()
  } catch {
    // Sin soporte: silencio.
  }
}

/** Voz/rate/pitch/volumen efectivos de un asistente: sus campos o el default de su forma. */
export function vozDeAsistente(a: {
  forma: MascotaId
  vozNombre?: string
  vozPitch?: number
  vozRate?: number
  vozVolumen?: number
}): { vozNombre?: string; rate: number; pitch: number; volumen: number } {
  const base = VOZ_FORMA[a.forma] ?? { rate: 1, pitch: 1 }
  return {
    vozNombre: a.vozNombre || undefined,
    rate: a.vozRate ?? base.rate,
    pitch: a.vozPitch ?? base.pitch,
    volumen: a.vozVolumen ?? 1,
  }
}

/**
 * Hook global (montar UNA vez en App): cada vez que un asistente dice algo por
 * la burbuja, lo lee con su voz — si ESE asistente tiene encendido `vozLeer`
 * en su ficha (⚙️ del chat). Vive aquí (suscriptor) y no dentro de `decir()`
 * para no crear el ciclo mascotaStore ↔ asistentesStore.
 */
export function useVozAsistente(): void {
  useEffect(() => {
    const unsub = useMascota.subscribe((s, prev) => {
      if (!s.mensaje || s.mensaje === prev.mensaje) return
      if (!hayVoz()) return
      const a = getAsistente(s.hablanteId ?? s.mascota)
      if (!a.vozLeer) return
      const v = vozDeAsistente(a)
      const ok = hablarVoz(limpiarMarkdown(s.mensaje), {
        vozNombre: v.vozNombre,
        rate: v.rate,
        pitch: v.pitch,
        volumen: v.volumen,
        // La burbuja se despide 0.9 s después de que la voz termina.
        onFin: () => useMascota.getState().programarOcultar(900),
      })
      // decir() reprograma el ocultado justo después de este suscriptor: la red
      // de seguridad (por si onend nunca llega) se aplica en un microtask.
      if (ok) queueMicrotask(() => useMascota.getState().programarOcultar(30000))
    })
    return () => {
      unsub()
      callarVoz()
    }
  }, [])
}
