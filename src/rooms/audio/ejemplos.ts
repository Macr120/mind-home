import type { NotaAudio, PistaAudio } from '../../core/data/db'
import { proyectosAudioRepo } from '../../core/data/repository'
import { porIdioma, retraducido, yaMaterializado, type PaqueteEjemplo } from '../_shared/ejemplos/tipos'
import { TEXTOS_AUDIO } from './ejemplos.data'

/**
 * Ejemplo de fábrica del Studio de audio: cuatro compases con piano, bajo y
 * batería sobre la vuelta I–V–vi–IV.
 *
 * Las canciones del banco (`canciones.ts`) son piano a dos manos: lo que no
 * enseñan —y sí este ejemplo— es un proyecto propio con VARIAS pistas, cada una
 * con su instrumento, su volumen y su reverb, que es lo que se ve al abrir el
 * mezclador. La melodía es original: nada que transcribir ni que atribuir.
 */

const ID = 'audio.proyecto'

const V = 96 // melodía
const B = 82 // bajo
const PASOS = 16 // semicorcheas por compás

/** Vuelta de cuatro compases: Do · Sol · La menor · Fa. */
const PIANO: NotaAudio[] = [
  [0, 4, 72, V], [4, 4, 71, V], [8, 4, 67, V], [12, 4, 64, V],
  [16, 4, 67, V], [20, 4, 71, V], [24, 8, 74, V],
  [32, 4, 72, V], [36, 4, 69, V], [40, 4, 72, V], [44, 4, 76, V],
  [48, 4, 74, V], [52, 4, 72, V], [56, 8, 69, V],
]

const BAJO: NotaAudio[] = [
  [0, 8, 36, B], [8, 8, 43, B],
  [16, 8, 43, B], [24, 8, 50, B],
  [32, 8, 45, B], [40, 8, 52, B],
  [48, 8, 41, B], [56, 8, 48, B],
]

/** Bombo, caja y charles del mapa fijo (`TONOS_BATERIA`), cuatro compases. */
const BATERIA: NotaAudio[] = Array.from({ length: 4 }, (_, c) => {
  const base = c * PASOS
  const golpes: NotaAudio[] = [
    [base, 2, 36, 104],
    [base + 8, 2, 36, 96],
    [base + 4, 2, 38, 100],
    [base + 12, 2, 38, 100],
  ]
  for (let i = 0; i < PASOS; i += 2) golpes.push([base + i, 1, 42, i % 4 === 0 ? 76 : 58])
  return golpes
}).flat()

export const ejemploAudio: PaqueteEjemplo = {
  id: ID,
  async materializar() {
    if (await yaMaterializado(ID, () => proyectosAudioRepo.list())) return
    const T = porIdioma(TEXTOS_AUDIO)
    const ahora = new Date().toISOString()

    const pistas: PistaAudio[] = [
      {
        pistaId: 'pa-ejemplo-0',
        nombre: T.pistaPiano,
        instrumento: 'piano',
        volumen: 0.8,
        // Un poco de reverb: al abrir el mezclador se ve para qué sirven los knobs.
        efectos: { reverb: 0.28, delay: 0, chorus: 0, dist: 0 },
        notas: PIANO,
      },
      { pistaId: 'pa-ejemplo-1', nombre: T.pistaBajo, instrumento: 'bajo', volumen: 0.7, notas: BAJO },
      { pistaId: 'pa-ejemplo-2', nombre: T.pistaBateria, instrumento: 'bateria', volumen: 0.65, notas: BATERIA },
    ]

    await proyectosAudioRepo.add({
      nombre: T.proyecto,
      bpm: 96,
      compases: 4,
      pulsos: 4,
      pistas,
      creadoEn: ahora,
      actualizadoEn: ahora,
      ejemploDe: ID,
    })
  },

  async retraducir() {
    const T = porIdioma(TEXTOS_AUDIO)
    const CLAVES = ['pistaPiano', 'pistaBajo', 'pistaBateria'] as const
    for (const p of await proyectosAudioRepo.list()) {
      if (p.ejemploDe !== ID || p.id == null) continue
      const nombre = retraducido(TEXTOS_AUDIO, p.nombre, 'proyecto')
      // Las pistas viajan dentro de la fila: se reescribe el array entero.
      const pistas = p.pistas.map((pista) => {
        const suya = CLAVES.find((c) => Object.values(TEXTOS_AUDIO).some((rama) => rama[c] === pista.nombre))
        return suya && T[suya] !== pista.nombre ? { ...pista, nombre: T[suya] } : pista
      })
      const cambianPistas = pistas.some((x, i) => x !== p.pistas[i])
      if (nombre || cambianPistas) {
        await proyectosAudioRepo.update(p.id, { ...(nombre && { nombre }), ...(cambianPistas && { pistas }) })
      }
    }
  },
}
