import type { TipoEntrenamiento } from '../../core/data/db'

export interface RutinaPlantilla {
  nombre: string
  duracionMin: number
  descripcion: string
  ejercicios?: string[]
  enfoque?: string
}

export const RUTINAS: Record<TipoEntrenamiento, RutinaPlantilla[]> = {
  fuerza: [
    {
      nombre: 'Push · Pecho y tríceps',
      duracionMin: 45,
      descripcion: 'Press banca, press militar, fondos, extensiones.',
      ejercicios: ['Press banca', 'Press militar', 'Fondos', 'Extensión tríceps'],
    },
    {
      nombre: 'Pull · Espalda y bíceps',
      duracionMin: 45,
      descripcion: 'Dominadas, remo, curl. Progresión de carga.',
      ejercicios: ['Dominadas', 'Remo con barra', 'Curl con barra', 'Face pull'],
    },
    {
      nombre: 'Legs · Pierna completa',
      duracionMin: 50,
      descripcion: 'Sentadilla, peso muerto rumano, zancadas.',
      ejercicios: ['Sentadilla', 'Peso muerto rumano', 'Zancadas', 'Curl femoral'],
    },
    {
      nombre: 'Full body',
      duracionMin: 40,
      descripcion: 'Circuito de fuerza para todo el cuerpo.',
      ejercicios: ['Sentadilla', 'Press banca', 'Remo', 'Press militar'],
    },
  ],
  resistencia: [
    {
      nombre: 'HIIT 20 min',
      duracionMin: 20,
      descripcion: 'Intervalos 40s trabajo / 20s descanso.',
    },
    {
      nombre: 'Carrera continua',
      duracionMin: 35,
      descripcion: 'Ritmo moderado, zona 2–3.',
    },
    {
      nombre: 'Caminata inclinada',
      duracionMin: 30,
      descripcion: 'Baja impacto, quema constante.',
    },
    {
      nombre: 'Bike tempo',
      duracionMin: 40,
      descripcion: 'Bicicleta ritmo sostenido.',
    },
  ],
  flexibilidad: [
    {
      nombre: 'Movilidad matutina',
      duracionMin: 15,
      descripcion: 'Despertar articulaciones y columna.',
      enfoque: 'Cuerpo completo',
    },
    {
      nombre: 'Yoga flow',
      duracionMin: 30,
      descripcion: 'Secuencia vinyasa suave.',
      enfoque: 'Cuerpo completo',
    },
    {
      nombre: 'Cadera y piernas',
      duracionMin: 20,
      descripcion: 'Apertura de cadera y isquios.',
      enfoque: 'Cadera y piernas',
    },
    {
      nombre: 'Estiramiento post-entreno',
      duracionMin: 12,
      descripcion: 'Enfriamiento y recuperación.',
      enfoque: 'Post-entreno',
    },
  ],
}
