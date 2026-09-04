import type { NotaAudio } from '../../core/data/db'
import type { AnclaGrabacion } from './motor'

/**
 * Captura de una toma (MIDI o teclado en pantalla) → `NotaAudio[]`.
 *
 * Los timestamps llegan en el reloj de `performance.now()` y se convierten al
 * reloj de audio con el ancla capturada al arrancar el transporte; sin ella las
 * notas grabadas derivarían. Cuantizar redondea a la semicorchea; sin cuantizar
 * la resolución es 1/64 (múltiplos de 0.25 pasos).
 */

export interface Grabacion {
  alNoteOn(tono: number, vel: number, tMs: number): void
  alNoteOff(tono: number, tMs: number): void
  /** Cierra las notas colgadas en ese paso y devuelve la toma ordenada. */
  terminar(pasoFinal: number): NotaAudio[]
}

export function crearGrabacion(
  ancla: AnclaGrabacion,
  opts: { cuantizar: boolean; totalPasos: number },
): Grabacion {
  const notas: NotaAudio[] = []
  const abiertas = new Map<number, { vel: number; pasoOn: number }>()

  const pasoDe = (tMs: number): number => {
    const tCtx = ancla.ctxRef + (tMs - ancla.perfRef) / 1000
    return ancla.anclaPaso + (tCtx - ancla.anclaT) / ancla.spb
  }

  const redondear = (v: number) => (opts.cuantizar ? Math.round(v) : Math.round(v * 4) / 4)

  const cerrar = (tono: number, pasoOff: number) => {
    const abierta = abiertas.get(tono)
    if (!abierta) return
    abiertas.delete(tono)
    let inicio = redondear(abierta.pasoOn)
    inicio = Math.max(0, Math.min(inicio, opts.totalPasos - 0.25))
    const durMin = opts.cuantizar ? 1 : 0.25
    let dur = Math.max(durMin, redondear(pasoOff - abierta.pasoOn))
    dur = Math.min(dur, opts.totalPasos - inicio)
    notas.push([inicio, dur, tono, abierta.vel])
  }

  return {
    alNoteOn(tono, vel, tMs) {
      abiertas.set(tono, { vel: Math.max(1, Math.min(127, vel)), pasoOn: pasoDe(tMs) })
    },
    alNoteOff(tono, tMs) {
      cerrar(tono, pasoDe(tMs))
    },
    terminar(pasoFinal) {
      for (const tono of [...abiertas.keys()]) cerrar(tono, pasoFinal)
      return notas.sort((a, b) => a[0] - b[0] || a[2] - b[2])
    },
  }
}

/** Fusiona una toma en las notas de la pista (dedupe por inicio+tono). */
export function fusionarNotas(existentes: NotaAudio[], toma: NotaAudio[], tope: number): NotaAudio[] {
  const vistas = new Set(existentes.map((n) => `${n[0]}:${n[2]}`))
  const salida = [...existentes]
  for (const nota of toma) {
    const clave = `${nota[0]}:${nota[2]}`
    if (vistas.has(clave)) continue
    vistas.add(clave)
    salida.push(nota)
    if (salida.length >= tope) break
  }
  return salida.sort((a, b) => a[0] - b[0] || a[2] - b[2])
}
