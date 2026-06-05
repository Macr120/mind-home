import type { ComponentType } from 'react'
import biblioteca from '../rooms/biblioteca'
import configuraciones from '../rooms/configuraciones'
import diseno from '../rooms/diseno'
import entretenimiento from '../rooms/entretenimiento'
import garage from '../rooms/garage'
import jardin from '../rooms/jardin'
import sala from '../rooms/sala'
import cocina from '../rooms/cocina'
import ejercicio from '../rooms/ejercicio'
import despacho from '../rooms/despacho'
import diario from '../rooms/diario'
import recamara from '../rooms/recamara'
/**
 * Contrato que CADA cuarto debe cumplir para "enchufarse" a la casa.
 * Agregar un cuarto = crear su carpeta en src/rooms/ y registrarlo abajo.
 */
export interface RoomModule {
  id: string
  nombre: string
  /** Emoji que flota sobre el cuarto cuando estás lejos. */
  icon: string
  categoria: 'cuerpo' | 'mente' | 'complemento' | 'config'
  /** Posición [x, y, z] del cuarto sobre el plano de la casa (cuadrícula). */
  posicion: [number, number, number]
  color: string
  /** La mini-app 2D que se abre al entrar. */
  App: ComponentType
}

// Distribución en cuadrícula 4×3 (12 espacios). Cols x: -9 -3 3 9 · Filas z: -6 0 6
export const rooms: RoomModule[] = [
  // Fila trasera
  cocina,
  ejercicio,
  recamara, // [3, 0, -6]
  despacho, // [9, 0, -6]
  // Fila media
  biblioteca,
  entretenimiento,
  sala,
  jardin,
  // Fila frontal
  garage,
  diario,
  configuraciones,
  diseno,
]

export const getRoom = (id: string) => rooms.find((r) => r.id === id)

/** Descripción corta de cada cuarto (para el listado de "Agregar cuarto"). */
export const DESCRIPCIONES: Record<string, string> = {
  cocina: 'Nutrición: registra comidas, macros, agua y tu plan semanal.',
  ejercicio: 'Rutinas de fuerza, resistencia y flexibilidad con metas.',
  recamara: 'Controla tu descanso y escribe tu anecdotario personal.',
  despacho: 'Finanzas: presupuesto, gastos por categoría, gráficas y metas.',
  biblioteca: 'Tu enciclopedia de aprendizaje y progreso por temas.',
  entretenimiento: 'Archivo de películas, series, libros y juegos de mesa.',
  sala: 'Planifica viajes: itinerario, gastos, checklist y lista de deseos.',
  jardin: 'Mindfulness: meditación, respiración, ánimo y gratitud.',
  garage: 'Mantenimiento de tus vehículos y sus servicios.',
  diario: 'Central de noticias del día, por categorías.',
  configuraciones: 'Tu perfil, copia de seguridad y ajustes de la app.',
  diseno: 'Personaliza colores, nombres, avatar y objetos de la casa.',
}
