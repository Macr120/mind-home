import type { AjustesVivo, TipoAcorde, TipoEscala } from '../../core/data/db'

/** Teoría musical del sintetizador: escalas, acordes y nombres de nota (puro). */

export const ESCALAS: Record<TipoEscala, number[]> = {
  mayor: [0, 2, 4, 5, 7, 9, 11],
  menor: [0, 2, 3, 5, 7, 8, 10],
  pentaMayor: [0, 2, 4, 7, 9],
  pentaMenor: [0, 3, 5, 7, 10],
  blues: [0, 3, 5, 6, 7, 10],
}

/** Clases de tono (0..11) que pertenecen a la escala. */
export function clasesDeEscala(escala: { tonica: number; tipo: TipoEscala }): Set<number> {
  return new Set(ESCALAS[escala.tipo].map((s) => (s + escala.tonica) % 12))
}

const FORMAS: Record<Exclude<TipoAcorde, 'diatonico'>, number[]> = {
  mayor: [0, 4, 7],
  menor: [0, 3, 7],
  septima: [0, 4, 7, 10],
}

/**
 * Tecla → acorde. 'diatonico' localiza el grado en la escala y apila terceras
 * (i, i+2, i+4); fuera de la escala (o sin escala) cae a la triada mayor.
 */
export function expandirAcorde(tono: number, tipo: TipoAcorde, escala: AjustesVivo['escala']): number[] {
  if (tipo === 'diatonico' && escala) {
    const grados = ESCALAS[escala.tipo]
    const clase = (((tono - escala.tonica) % 12) + 12) % 12
    const i = grados.indexOf(clase)
    if (i >= 0) {
      const nota = (salto: number) => {
        const idx = i + salto
        return tono - clase + grados[idx % grados.length] + Math.floor(idx / grados.length) * 12
      }
      return [nota(0), nota(2), nota(4)]
    }
  }
  const forma = tipo === 'diatonico' ? FORMAS.mayor : FORMAS[tipo]
  return forma.map((s) => tono + s)
}

const NOMBRES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

/** 60 → 'C4' (convención MIDI: C-1 = 0). */
export function nombreNota(tono: number): string {
  return `${NOMBRES[((tono % 12) + 12) % 12]}${Math.floor(tono / 12) - 1}`
}

/** Nombre corto de la clase de tono (para los chips de tónica). */
export function nombreClase(clase: number): string {
  return NOMBRES[((clase % 12) + 12) % 12]
}
