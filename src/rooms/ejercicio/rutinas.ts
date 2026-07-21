import type { TipoEntrenamiento } from '../../core/data/db'

export interface RutinaPlantilla {
  nombre: string
  duracionMin: number
  descripcion: string
  ejercicios?: string[]
  enfoque?: string
  /** Fuerza: enfoque de la pirámide al que pertenece (id de PIRAMIDE_FUERZA). */
  splitId?: string
}

export const RUTINAS: Record<TipoEntrenamiento, RutinaPlantilla[]> = {
  fuerza: [
    {
      nombre: 'Full body',
      splitId: 'fullbody',
      duracionMin: 40,
      descripcion: 'Circuito de fuerza para todo el cuerpo.',
      ejercicios: ['Sentadilla', 'Press banca', 'Remo con barra', 'Press militar'],
    },
    {
      nombre: 'Tren superior',
      splitId: 'trenSuperior',
      duracionMin: 50,
      descripcion: 'Pecho, espalda, hombro y brazo en una sesión.',
      ejercicios: ['Press banca', 'Remo con barra', 'Press militar', 'Curl con barra', 'Extensión tríceps en polea'],
    },
    {
      nombre: 'Tren inferior',
      splitId: 'trenInferior',
      duracionMin: 50,
      descripcion: 'Pierna y glúteo completos.',
      ejercicios: ['Sentadilla', 'Peso muerto rumano', 'Zancadas', 'Hip thrust', 'Elevación de talones'],
    },
    {
      nombre: 'Push · Pecho y tríceps',
      splitId: 'empuje',
      duracionMin: 45,
      descripcion: 'Press banca, press militar, fondos, extensiones.',
      ejercicios: ['Press banca', 'Press militar', 'Fondos en paralelas', 'Extensión tríceps en polea'],
    },
    {
      nombre: 'Pull · Espalda y bíceps',
      splitId: 'jale',
      duracionMin: 45,
      descripcion: 'Dominadas, remo, curl. Progresión de carga.',
      ejercicios: ['Dominadas', 'Remo con barra', 'Curl con barra', 'Face pull'],
    },
    {
      nombre: 'Legs · Pierna completa',
      splitId: 'pierna',
      duracionMin: 50,
      descripcion: 'Sentadilla, peso muerto rumano, zancadas.',
      ejercicios: ['Sentadilla', 'Peso muerto rumano', 'Zancadas', 'Curl femoral'],
    },
  ],
  resistencia: [
    {
      nombre: 'HIIT 20 min',
      duracionMin: 20,
      descripcion: 'Intervalos 40s trabajo / 20s descanso.',
      ejercicios: ['Saltar cuerda', 'Burpees', 'Sprints'],
    },
    {
      nombre: 'Carrera continua',
      duracionMin: 35,
      descripcion: 'Ritmo moderado, zona 2–3.',
      ejercicios: ['Carrera'],
    },
    {
      nombre: 'Caminata inclinada',
      duracionMin: 30,
      descripcion: 'Baja impacto, quema constante.',
      ejercicios: ['Caminata inclinada'],
    },
    {
      nombre: 'Bike tempo',
      duracionMin: 40,
      descripcion: 'Bicicleta ritmo sostenido.',
      ejercicios: ['Bicicleta estática'],
    },
    {
      nombre: 'Triatlón sprint',
      duracionMin: 75,
      descripcion: 'Nadar, pedalear y correr enlazados, cada tramo a su ritmo.',
      ejercicios: ['Natación', 'Ciclismo', 'Carrera'],
    },
  ],
  flexibilidad: [
    {
      nombre: 'Movilidad matutina',
      duracionMin: 15,
      descripcion: 'Despertar articulaciones y columna.',
      enfoque: 'Cuerpo completo',
      ejercicios: ['Gato-vaca', 'Saludo al sol', 'Torsión espinal', 'Movilidad cervical'],
    },
    {
      nombre: 'Yoga flow',
      duracionMin: 30,
      descripcion: 'Secuencia vinyasa suave.',
      enfoque: 'Cuerpo completo',
      ejercicios: ['Saludo al sol', 'Guerrero I', 'Guerrero II', 'Triángulo', 'Perro boca abajo'],
    },
    {
      nombre: 'Cadera y piernas',
      duracionMin: 20,
      descripcion: 'Apertura de cadera e isquios.',
      enfoque: 'Cadera y piernas',
      ejercicios: ['Apertura de cadera', 'Postura de la paloma', 'Mariposa', 'Estiramiento de isquiotibiales'],
    },
    {
      nombre: 'Estiramiento post-entreno',
      duracionMin: 12,
      descripcion: 'Enfriamiento y recuperación.',
      enfoque: 'Post-entreno',
      ejercicios: ['Estiramiento de cuádriceps', 'Estiramiento de gemelos', 'Estiramiento de hombros'],
    },
    {
      nombre: 'Espalda y hombros',
      duracionMin: 15,
      descripcion: 'Alivio para espalda y hombros.',
      enfoque: 'Espalda y hombros',
      ejercicios: ['Gato-vaca', 'Hilo y aguja', 'Apertura de pecho', 'Estiramiento de dorsales'],
    },
    {
      nombre: 'Cuello y oficina',
      duracionMin: 8,
      descripcion: 'Pausa activa para cuello y columna.',
      enfoque: 'Cuello y columna',
      ejercicios: ['Movilidad cervical', 'Inclinación lateral de cuello', 'Retracción de barbilla', 'Rotaciones de columna'],
    },
    {
      nombre: 'Antes de dormir',
      duracionMin: 15,
      descripcion: 'Relajación restaurativa para conciliar el sueño.',
      enfoque: 'Yoga restaurativo',
      ejercicios: ['Piernas en la pared', 'Mariposa reclinada', 'Torsión reclinada', 'Savasana'],
    },
  ],
}
