import type { SesionEjercicio } from '../../core/data/db'
import {
  seriesFlexRepo,
  seriesFuerzaRepo,
  sesionesEjercicioRepo,
  splitsCardioRepo,
} from '../../core/data/repository'
import { fechaLocalISO, isoMasDias } from '../../core/fechaLocal'
import { tGlobal } from '../../core/i18n/useT'
import { filaEjemplo, yaMaterializado, type PaqueteEjemplo } from '../_shared/ejemplos/tipos'
import { nombreRutina } from './nombres'

/**
 * Ejemplo de fábrica del ejercicio: tres semanas de entrenos de las tres
 * modalidades, con una sesión HOY, para que el resumen de la semana, el
 * progreso, los récords y el historial tengan de qué vivir la primera vez.
 *
 * Los ejercicios van con su nombre canónico (la app los traduce al pintarlos)
 * y el título de cada sesión es el de su rutina de fábrica en el idioma activo,
 * como cuando se registra desde la rutina.
 */

const ID = 'ejercicio.entrenos'

type Serie = [ejercicio: string, series: number, repeticiones: number, pesoKg: number]

/** El Full body sube de carga semana a semana: así la progresión y los récords se ven. */
const FUERZA: { dias: number; rutina: string; min: number; rpe: number; series: Serie[] }[] = [
  {
    dias: -21,
    rutina: 'Full body',
    min: 42,
    rpe: 7,
    series: [['Sentadilla', 3, 8, 60], ['Press banca', 3, 8, 45], ['Remo con barra', 3, 10, 40], ['Press militar', 3, 8, 30]],
  },
  {
    dias: -14,
    rutina: 'Full body',
    min: 44,
    rpe: 7,
    series: [['Sentadilla', 3, 8, 62.5], ['Press banca', 3, 8, 47.5], ['Remo con barra', 3, 10, 40], ['Press militar', 3, 8, 30]],
  },
  {
    dias: -7,
    rutina: 'Full body',
    min: 45,
    rpe: 8,
    series: [['Sentadilla', 3, 8, 65], ['Press banca', 3, 8, 47.5], ['Remo con barra', 3, 10, 42.5], ['Press militar', 3, 8, 32.5]],
  },
  {
    dias: -3,
    rutina: 'Tren superior',
    min: 50,
    rpe: 8,
    series: [
      ['Press banca', 4, 6, 50],
      ['Remo con barra', 4, 8, 45],
      ['Press militar', 3, 8, 32.5],
      ['Curl con barra', 3, 10, 25],
      ['Extensión tríceps en polea', 3, 12, 20],
    ],
  },
  {
    dias: 0,
    rutina: 'Full body',
    min: 46,
    rpe: 8,
    series: [['Sentadilla', 3, 8, 67.5], ['Press banca', 3, 8, 50], ['Remo con barra', 3, 10, 42.5], ['Press militar', 3, 8, 32.5]],
  },
]

const CARRERAS: { dias: number; min: number; km: number; ppm: number }[] = [
  { dias: -19, min: 31, km: 5, ppm: 148 },
  { dias: -12, min: 34, km: 5.8, ppm: 150 },
  { dias: -5, min: 37, km: 6.5, ppm: 151 },
]

const MOVILIDAD = ['Postura Gato-Vaca', 'Saludo al sol', 'Torsión espinal', 'Movilidad cervical']
const DIAS_MOVILIDAD = [-17, -10, -1]

export const ejemploEjercicio: PaqueteEjemplo = {
  id: ID,
  tablas: [sesionesEjercicioRepo, seriesFuerzaRepo, seriesFlexRepo, splitsCardioRepo],
  async materializar(restaurar) {
    if (await yaMaterializado(ID, () => sesionesEjercicioRepo.list())) return
    const hoy = fechaLocalISO()
    const titulo = (rutina: string) => nombreRutina(tGlobal, rutina)
    const sesion = (clave: string, fila: Omit<SesionEjercicio, 'id'>) =>
      sesionesEjercicioRepo.addSeed(filaEjemplo(ID, clave, restaurar, fila))

    for (const [i, f] of FUERZA.entries()) {
      const volumenKg = f.series.reduce((s, [, series, reps, kg]) => s + series * reps * kg, 0)
      const sesionId = await sesion(`fuerza${i}`, {
        fecha: isoMasDias(hoy, f.dias),
        tipo: 'fuerza',
        titulo: titulo(f.rutina),
        duracionMin: f.min,
        rpe: f.rpe,
        volumenKg,
      })
      for (const [j, [ejercicio, series, repeticiones, pesoKg]] of f.series.entries()) {
        await seriesFuerzaRepo.addSeed(
          filaEjemplo(ID, `fuerza${i}-${j}`, restaurar, { sesionId, ejercicio, series, repeticiones, pesoKg, orden: j }),
        )
      }
    }

    for (const [i, c] of CARRERAS.entries()) {
      const sesionId = await sesion(`carrera${i}`, {
        fecha: isoMasDias(hoy, c.dias),
        tipo: 'resistencia',
        titulo: titulo('Carrera continua'),
        duracionMin: c.min,
        distanciaKm: c.km,
        ppmProm: c.ppm,
        ppmMax: c.ppm + 17,
        rpe: 6,
      })
      await splitsCardioRepo.addSeed(
        filaEjemplo(ID, `carrera${i}-0`, restaurar, { sesionId, actividad: 'Carrera', minutos: c.min, km: c.km, orden: 0 }),
      )
    }

    for (const [i, dias] of DIAS_MOVILIDAD.entries()) {
      const sesionId = await sesion(`movilidad${i}`, {
        fecha: isoMasDias(hoy, dias),
        tipo: 'flexibilidad',
        titulo: titulo('Movilidad matutina'),
        duracionMin: 15,
        rpe: 3,
      })
      for (const [j, ejercicio] of MOVILIDAD.entries()) {
        await seriesFlexRepo.addSeed(
          filaEjemplo(ID, `movilidad${i}-${j}`, restaurar, { sesionId, ejercicio, segundos: 60, repeticiones: 1, orden: j }),
        )
      }
    }
  },
}
