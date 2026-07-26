import type { PistaMusica } from '../../core/data/db'
import type { NombreIcono } from '../../core/ui/iconos/catalogo'

/**
 * Tonos del despertador: patrones cortos sintetizados con Web Audio (sin
 * assets, igual que los sonidos de acciones de `core/audio/sfx.ts`) que se
 * repiten en bucle hasta que se detiene la alarma, o una pista propia del
 * usuario (la misma biblioteca que la música: tabla `pistasMusica`).
 *
 * El campo `tono` del perfil guarda el id del catálogo, o `pista:<id>` cuando
 * es un audio subido. Contexto y volumen son propios: una alarma no debe
 * depender del volumen de la música ni callarse con él.
 */

export type IdTono = 'clasico' | 'campanas' | 'marimba' | 'radar' | 'arpa' | 'amanecer'

export const TONOS: { id: IdTono; nombre: string; icono: NombreIcono }[] = [
  { id: 'clasico', nombre: 'Clásico', icono: 'alarma' },
  { id: 'campanas', nombre: 'Campanas', icono: 'campana' },
  { id: 'marimba', nombre: 'Marimba', icono: 'musica' },
  { id: 'radar', nombre: 'Radar', icono: 'energia' },
  { id: 'arpa', nombre: 'Arpa', icono: 'brillo' },
  { id: 'amanecer', nombre: 'Amanecer', icono: 'amanecer' },
]

export const TONO_DEFAULT: IdTono = 'clasico'
export const VOLUMEN_DEFAULT = 0.8

const PREFIJO_PISTA = 'pista:'

/** Id de la pista propia elegida como tono, o null si es un tono del catálogo. */
export function idPistaDeTono(tono: string | undefined): number | null {
  if (!tono?.startsWith(PREFIJO_PISTA)) return null
  const id = Number(tono.slice(PREFIJO_PISTA.length))
  return Number.isFinite(id) ? id : null
}

export const tonoDePista = (id: number) => `${PREFIJO_PISTA}${id}`

// ---------------------------------------------------------------------------
// Patrones sintetizados
// ---------------------------------------------------------------------------

/** Una nota del patrón: frecuencia, cuándo entra y cuánto dura (en segundos). */
interface Nota {
  hz: number
  en: number
  dur: number
  onda?: OscillatorType
  vol?: number
  /** Barrido hasta esta frecuencia (sirenas y golpes). */
  a?: number
}

/** Notas del patrón y cuánto dura el ciclo completo antes de repetirse. */
const PATRONES: Record<IdTono, { ciclo: number; notas: Nota[] }> = {
  // Los dos bips de toda la vida: agudos, secos e insistentes.
  clasico: {
    ciclo: 1,
    notas: [
      { hz: 880, en: 0, dur: 0.2, vol: 0.35 },
      { hz: 880, en: 0.25, dur: 0.2, vol: 0.35 },
    ],
  },
  // Campana con su armónico y una segunda badajada que se apaga larga.
  campanas: {
    ciclo: 2.6,
    notas: [
      { hz: 660, en: 0, dur: 0.9, vol: 0.3 },
      { hz: 1320, en: 0, dur: 0.5, vol: 0.08 },
      { hz: 660, en: 0.7, dur: 1.1, vol: 0.24 },
      { hz: 1320, en: 0.7, dur: 0.6, vol: 0.06 },
    ],
  },
  // Cuatro notas percusivas de madera (do–mi–sol–do) que suben.
  marimba: {
    ciclo: 1.8,
    notas: [
      { hz: 523.25, en: 0, dur: 0.22, onda: 'triangle', vol: 0.3 },
      { hz: 659.25, en: 0.16, dur: 0.22, onda: 'triangle', vol: 0.3 },
      { hz: 783.99, en: 0.32, dur: 0.22, onda: 'triangle', vol: 0.3 },
      { hz: 1046.5, en: 0.48, dur: 0.4, onda: 'triangle', vol: 0.3 },
    ],
  },
  // Pulsos que barren hacia arriba, como el barrido de un radar.
  radar: {
    ciclo: 2,
    notas: [
      { hz: 700, a: 1000, en: 0, dur: 0.3, onda: 'triangle', vol: 0.26 },
      { hz: 700, a: 1000, en: 0.4, dur: 0.3, onda: 'triangle', vol: 0.26 },
      { hz: 700, a: 1000, en: 0.8, dur: 0.3, onda: 'triangle', vol: 0.26 },
      { hz: 700, a: 1000, en: 1.2, dur: 0.45, onda: 'triangle', vol: 0.26 },
    ],
  },
  // Arpegio descendente y suave: despierta sin sobresalto.
  arpa: {
    ciclo: 3.4,
    notas: [
      { hz: 1046.5, en: 0, dur: 0.7, vol: 0.2 },
      { hz: 880, en: 0.28, dur: 0.7, vol: 0.19 },
      { hz: 659.25, en: 0.56, dur: 0.8, vol: 0.18 },
      { hz: 523.25, en: 0.84, dur: 1.2, vol: 0.17 },
    ],
  },
  // Acorde cálido y abierto; junto al crescendo del bucle imita un amanecer.
  amanecer: {
    ciclo: 4.5,
    notas: [
      { hz: 392, en: 0, dur: 1.6, vol: 0.16 },
      { hz: 523.25, en: 0.5, dur: 1.6, vol: 0.16 },
      { hz: 659.25, en: 1, dur: 1.8, vol: 0.16 },
      { hz: 783.99, en: 1.5, dur: 2.2, vol: 0.14 },
    ],
  },
}

/** El tono 'amanecer' entra bajito y tarda esto en llegar al volumen elegido. */
const SEG_CRESCENDO = 45

function tocarNotas(ctx: AudioContext, bus: GainNode, notas: Nota[]): void {
  const t0 = ctx.currentTime
  for (const n of notas) {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    const t = t0 + n.en
    osc.type = n.onda ?? 'sine'
    osc.frequency.setValueAtTime(n.hz, t)
    if (n.a) osc.frequency.exponentialRampToValueAtTime(n.a, t + n.dur)
    const vol = n.vol ?? 0.25
    gain.gain.setValueAtTime(0.0001, t)
    gain.gain.exponentialRampToValueAtTime(vol, t + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, t + n.dur)
    osc.connect(gain)
    gain.connect(bus)
    osc.start(t)
    osc.stop(t + n.dur + 0.05)
  }
}

/** Contexto + bus propios de la alarma; null si el navegador no puede. */
function abrir(volumen: number): { ctx: AudioContext; bus: GainNode } | null {
  const Ctor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Ctor) return null
  try {
    const ctx = new Ctor()
    const bus = ctx.createGain()
    bus.gain.value = volumen
    bus.connect(ctx.destination)
    return { ctx, bus }
  } catch {
    return null
  }
}

/** Reproduce un blob en bucle con su propio elemento; devuelve cómo detenerlo. */
function iniciarPistaPropia(pista: PistaMusica, volumen: number, loop: boolean): () => void {
  const url = URL.createObjectURL(pista.blob)
  const audio = new Audio(url)
  audio.loop = loop
  audio.volume = volumen
  void audio.play().catch(() => {
    // Autoplay bloqueado o formato no soportado: la alarma se ve, no se oye.
  })
  return () => {
    audio.pause()
    audio.removeAttribute('src')
    URL.revokeObjectURL(url)
  }
}

/**
 * Arranca el tono elegido en bucle y devuelve cómo detenerlo. Si el tono era
 * una pista que ya se borró, cae al tono del catálogo por defecto.
 */
export function iniciarTono(
  tono: string | undefined,
  volumen: number,
  pista: PistaMusica | undefined,
): () => void {
  if (idPistaDeTono(tono) != null && pista) return iniciarPistaPropia(pista, volumen, true)

  const id = (tono && tono in PATRONES ? tono : TONO_DEFAULT) as IdTono
  const patron = PATRONES[id]
  const audio = abrir(id === 'amanecer' ? volumen * 0.25 : volumen)
  if (!audio) return () => {}
  const { ctx, bus } = audio
  if (id === 'amanecer') {
    bus.gain.linearRampToValueAtTime(volumen, ctx.currentTime + SEG_CRESCENDO)
  }
  tocarNotas(ctx, bus, patron.notas)
  const intervalo = window.setInterval(() => tocarNotas(ctx, bus, patron.notas), patron.ciclo * 1000)
  return () => {
    window.clearInterval(intervalo)
    void ctx.close()
  }
}

/**
 * Prueba del tono: una sola pasada del patrón (o unos segundos de la pista).
 * Devuelve cómo cortarla antes de tiempo, para no encimar dos pruebas.
 */
export function probarTono(
  tono: string | undefined,
  volumen: number,
  pista: PistaMusica | undefined,
): () => void {
  if (idPistaDeTono(tono) != null && pista) {
    const parar = iniciarPistaPropia(pista, volumen, false)
    const corte = window.setTimeout(parar, 8000)
    return () => {
      window.clearTimeout(corte)
      parar()
    }
  }

  const id = (tono && tono in PATRONES ? tono : TONO_DEFAULT) as IdTono
  const patron = PATRONES[id]
  const audio = abrir(volumen)
  if (!audio) return () => {}
  const { ctx, bus } = audio
  tocarNotas(ctx, bus, patron.notas)
  const cerrar = window.setTimeout(() => void ctx.close(), patron.ciclo * 1000 + 300)
  return () => {
    window.clearTimeout(cerrar)
    void ctx.close()
  }
}
