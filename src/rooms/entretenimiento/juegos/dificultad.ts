// Dificultad compartida de los juegos: tipo, etiquetas y persistencia por juego.
import { useState } from 'react'
import { guardarTexto, leerTexto } from './almacen'

export type Dificultad = 'facil' | 'medio' | 'dificil'

export const DIFICULTADES: Dificultad[] = ['facil', 'medio', 'dificil']

export const ETIQUETAS_DIFICULTAD: Record<Dificultad, string> = {
  facil: 'Fácil',
  medio: 'Medio',
  dificil: 'Difícil',
}

/** Props que reciben los juegos con dificultad ajustable. */
export interface PropsDificultad {
  dificultad?: Dificultad
}

/**
 * Clave de récord por dificultad. El nivel medio conserva la clave histórica
 * del juego para no perder los récords de antes de que existieran los niveles.
 */
export function claveDificultad(base: string, dif: Dificultad): string {
  return dif === 'medio' ? base : `${base}-${dif}`
}

/** Dificultad elegida para un juego, recordada entre sesiones. */
export function useDificultad(juego: string): [Dificultad, (d: Dificultad) => void] {
  const [dif, setDif] = useState<Dificultad>(() => {
    const guardada = leerTexto(`dif-${juego}`)
    return DIFICULTADES.includes(guardada as Dificultad) ? (guardada as Dificultad) : 'medio'
  })
  return [
    dif,
    (d) => {
      guardarTexto(`dif-${juego}`, d)
      setDif(d)
    },
  ]
}
