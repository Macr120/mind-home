import type { PistaMusica } from '../data/db'
import { contextoAudio, gainMaestro } from './motor'

/**
 * Reproducción de las pistas del usuario: UN elemento <audio> persistente a
 * nivel de módulo conectado al gain maestro. `createMediaElementSource` solo
 * puede llamarse UNA vez por elemento, por eso nunca se recrea: solo se le
 * intercambia el `src` (revocando el objectURL anterior). Se usa streaming del
 * elemento y no decodeAudioData: un mp3 largo decodificado son decenas de MB
 * de PCM en memoria.
 */

let el: HTMLAudioElement | null = null
let conectado = false
let urlActual: string | null = null
let idActual: number | null = null
let alTerminar: (() => void) | null = null

function elemento(): HTMLAudioElement | null {
  if (el) return el
  try {
    el = new Audio()
    el.addEventListener('ended', () => alTerminar?.())
  } catch {
    el = null
  }
  return el
}

function conectar() {
  if (conectado || !el) return
  const ctx = contextoAudio()
  const maestro = gainMaestro()
  if (!ctx || !maestro) return
  try {
    ctx.createMediaElementSource(el).connect(maestro)
    conectado = true
  } catch {
    // No se pudo enrutar: el elemento suena directo (sin volumen maestro).
    conectado = true
  }
}

export async function iniciarPista(
  pista: PistaMusica,
  opciones?: { loop?: boolean },
): Promise<void> {
  const audio = elemento()
  if (!audio || pista.id == null) return
  conectar()
  // Idempotente: los efectos corren doble en StrictMode.
  if (idActual === pista.id && !audio.paused) return
  if (urlActual) URL.revokeObjectURL(urlActual)
  urlActual = URL.createObjectURL(pista.blob)
  idActual = pista.id
  audio.src = urlActual
  audio.loop = opciones?.loop ?? false
  try {
    await audio.play()
  } catch {
    // Autoplay bloqueado o formato no soportado: silencio.
  }
}

/** Encadena la lista completa (aleatorio opcional) y vuelve a empezar al agotarla. */
export function reproducirLista(pistas: PistaMusica[], aleatorio = false): void {
  if (pistas.length === 0) return
  if (pistas.length === 1) {
    void iniciarPista(pistas[0], { loop: true })
    return
  }
  const cola = aleatorio ? [...pistas].sort(() => Math.random() - 0.5) : [...pistas]
  let i = 0
  alTerminar = () => {
    i = (i + 1) % cola.length
    void iniciarPista(cola[i])
  }
  void iniciarPista(cola[0])
}

export function detenerPista(): void {
  alTerminar = null
  idActual = null
  if (!el) return
  el.pause()
  el.removeAttribute('src')
  if (urlActual) {
    URL.revokeObjectURL(urlActual)
    urlActual = null
  }
}
