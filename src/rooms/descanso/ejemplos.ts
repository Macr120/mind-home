import { suenoRepo } from '../../core/data/repository'
import { fechaLocalISO, isoMasDias } from '../../core/fechaLocal'
import { porIdioma, retraducido, yaMaterializado, type PaqueteEjemplo } from '../_shared/ejemplos/tipos'
import { TEXTOS_DESCANSO } from './ejemplos.data'

/**
 * Ejemplo de fábrica del descanso: cinco noches de la última semana.
 *
 * No son cinco noches iguales a propósito: la gráfica y la puntuación solo
 * dicen algo cuando hay una noche buena, una mala y una corta que comparar. La
 * de hoy se deja fuera —esa la registra el usuario— para que la app siga
 * pidiendo la de anoche.
 */

const ID = 'descanso.noches'

/** Días atrás, horas dormidas, calidad 1-5, horarios e interrupciones. */
const NOCHES: {
  dias: number
  horas: number
  calidad: number
  acostarse: string
  despertar: string
  interrupciones: number
  nota: keyof (typeof TEXTOS_DESCANSO)['es']
}[] = [
  { dias: -5, horas: 7.5, calidad: 4, acostarse: '23:30', despertar: '07:00', interrupciones: 0, nota: 'notaBuena' },
  { dias: -4, horas: 6.5, calidad: 3, acostarse: '00:15', despertar: '06:45', interrupciones: 1, nota: 'notaRegular' },
  { dias: -3, horas: 5, calidad: 2, acostarse: '00:45', despertar: '05:45', interrupciones: 3, nota: 'notaMala' },
  { dias: -2, horas: 4.5, calidad: 2, acostarse: '01:30', despertar: '06:00', interrupciones: 1, nota: 'notaCorta' },
  { dias: -1, horas: 8, calidad: 5, acostarse: '22:45', despertar: '06:45', interrupciones: 0, nota: 'notaSiesta' },
]

export const ejemploDescanso: PaqueteEjemplo = {
  id: ID,
  async materializar() {
    if (await yaMaterializado(ID, () => suenoRepo.list())) return
    const T = porIdioma(TEXTOS_DESCANSO)
    const hoy = fechaLocalISO()
    for (const n of NOCHES) {
      await suenoRepo.add({
        fecha: isoMasDias(hoy, n.dias),
        horas: n.horas,
        calidad: n.calidad,
        nota: T[n.nota],
        horaAcostarse: n.acostarse,
        horaDespertar: n.despertar,
        interrupciones: n.interrupciones,
        ejemploDe: ID,
      })
    }
  },

  async retraducir() {
    for (const n of await suenoRepo.list()) {
      if (n.ejemploDe !== ID || n.id == null) continue
      const nota = retraducido(TEXTOS_DESCANSO, n.nota, 'notaBuena', 'notaRegular', 'notaMala', 'notaCorta', 'notaSiesta')
      if (nota) await suenoRepo.update(n.id, { nota })
    }
  },
}
