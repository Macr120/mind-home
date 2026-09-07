import { contextoAudio, desbloquearAudio } from '../../core/audio/motor'
import type { AjustesVivo } from '../../core/data/db'
import { segPorPaso } from './constantes'
import { anclaGrabacion } from './motor'

/**
 * Arpegiador en vivo (singleton de módulo, como el motor): recorre los tonos
 * retenidos al ritmo del BPM con su propio reloj «two clocks» — el del
 * transporte solo corre al reproducir y aquí se arpegia también en silencio.
 * Si el transporte corre, la fase se alinea a su rejilla (la toma grabada cae
 * limpia en los pasos).
 */

const TICK_MS = 50
const LOOKAHEAD_S = 0.1
/** Fracción del intervalo que suena cada nota. */
const GATE = 0.75

export interface SalidaArp {
  /** Audio agendado con precisión por la cadena de la pista activa. */
  tocar(tono: number, vel: number, tAudio: number, durSeg: number): void
  /** Eventos hacia la grabación (mismo camino que una tecla real). */
  grabar(tipo: 'on' | 'off', tono: number, vel: number, tMs: number): void
}

let ajustes: NonNullable<AjustesVivo['arp']> | null = null
let bpm = 100
let salida: SalidaArp | null = null
let retenidos: { tono: number; vel: number }[] = []
let intervalo: number | null = null
let proximaT = 0
let idx = 0

export function configurar(arp: AjustesVivo['arp'] | undefined, bpmNuevo: number, salidaNueva: SalidaArp): void {
  ajustes = arp ?? null
  bpm = bpmNuevo
  salida = salidaNueva
  if (!ajustes) limpiar()
}

/** El acorde ya expandido entra aquí (una tecla puede retener 3-4 tonos). */
export function bajarTonos(tonos: number[], vel: number): void {
  if (!ajustes) return
  desbloquearAudio()
  for (const tono of tonos) {
    if (!retenidos.some((r) => r.tono === tono)) retenidos.push({ tono, vel })
  }
  if (intervalo == null && retenidos.length > 0) arrancar()
}

export function subirTonos(tonos: number[]): void {
  retenidos = retenidos.filter((r) => !tonos.includes(r.tono))
  if (retenidos.length === 0) parar()
}

/** Cambio de pista/instrumento o cierre del editor: suelta y detiene todo. */
export function limpiar(): void {
  retenidos = []
  parar()
}

function parar() {
  if (intervalo != null) {
    window.clearInterval(intervalo)
    intervalo = null
  }
  idx = 0
}

function arrancar() {
  const ctx = contextoAudio()
  if (!ctx || !ajustes) return
  proximaT = ctx.currentTime + 0.02
  // Con el transporte corriendo, la primera nota cae en la próxima división.
  const ancla = anclaGrabacion()
  if (ancla) {
    const pasoAhora = ancla.anclaPaso + (ctx.currentTime - ancla.anclaT) / ancla.spb
    const proximoPaso = Math.ceil(pasoAhora / ajustes.velocidad) * ajustes.velocidad
    proximaT = Math.max(proximaT, ancla.anclaT + (proximoPaso - ancla.anclaPaso) * ancla.spb)
  }
  idx = 0
  intervalo = window.setInterval(tick, TICK_MS)
  tick()
}

function elegirTono(): { tono: number; vel: number } | null {
  const n = retenidos.length
  if (n === 0 || !ajustes) return null
  const orden = [...retenidos].sort((a, b) => a.tono - b.tono)
  switch (ajustes.patron) {
    case 'sube':
      return orden[idx % n]
    case 'baja':
      return orden[n - 1 - (idx % n)]
    case 'subeBaja': {
      // Ping-pong sin repetir los extremos: 0 1 2 1 | 0 1 2 1 …
      const ciclo = Math.max(1, 2 * n - 2)
      const i = idx % ciclo
      return orden[i < n ? i : ciclo - i]
    }
    case 'azar':
      return orden[Math.floor(Math.random() * n)]
  }
}

function tick() {
  const ctx = contextoAudio()
  if (!ctx || !ajustes || !salida || retenidos.length === 0) return
  const intervaloSeg = ajustes.velocidad * segPorPaso(bpm)
  // Tras una pausa larga (pestaña oculta) re-sincroniza en vez de "alcanzar".
  if (proximaT < ctx.currentTime - 0.3) proximaT = ctx.currentTime + 0.02
  while (proximaT < ctx.currentTime + LOOKAHEAD_S) {
    const nota = elegirTono()
    if (nota) {
      const durSeg = intervaloSeg * GATE
      salida.tocar(nota.tono, nota.vel, proximaT, durSeg)
      const tMs = performance.now() + (proximaT - ctx.currentTime) * 1000
      salida.grabar('on', nota.tono, nota.vel, tMs)
      salida.grabar('off', nota.tono, nota.vel, tMs + durSeg * 1000)
    }
    proximaT += intervaloSeg
    idx++
  }
}
