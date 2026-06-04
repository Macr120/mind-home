import type { ComponentType } from 'react'
import despacho from '../rooms/despacho'
import recamara from '../rooms/recamara'
import { ComingSoon } from '../rooms/_shared/ComingSoon'

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

/** Atajo para cuartos todavía no desarrollados. */
const proximo = (
  id: string,
  nombre: string,
  icon: string,
  categoria: RoomModule['categoria'],
  posicion: [number, number, number],
  color: string,
): RoomModule => ({ id, nombre, icon, categoria, posicion, color, App: ComingSoon })

// Distribución en cuadrícula 4×3 (12 espacios). Cols x: -9 -3 3 9 · Filas z: -6 0 6
export const rooms: RoomModule[] = [
  // Fila trasera
  proximo('cocina', 'Cocina · Nutrición', '🍳', 'cuerpo', [-9, 0, -6], '#f59e0b'),
  proximo('ejercicio', 'Ejercicio · Rutinas', '💪', 'cuerpo', [-3, 0, -6], '#fb7185'),
  recamara, // [3, 0, -6]
  despacho, // [9, 0, -6]
  // Fila media
  proximo('biblioteca', 'Biblioteca · Aprendizaje', '📚', 'mente', [-9, 0, 0], '#818cf8'),
  proximo('entretenimiento', 'Sala de entretenimiento', '🎮', 'complemento', [-3, 0, 0], '#34d399'),
  proximo('sala', 'Sala · Viajes', '✈️', 'complemento', [3, 0, 0], '#2dd4bf'),
  proximo('jardin', 'Jardín · Mindfulness', '🧘', 'complemento', [9, 0, 0], '#4ade80'),
  // Fila frontal
  proximo('garage', 'Garage/Taller · Máquinas', '🔧', 'complemento', [-9, 0, 6], '#fbbf24'),
  proximo('diario', 'Diario · Noticias', '📰', 'complemento', [-3, 0, 6], '#f472b6'),
  proximo('configuraciones', 'Configuraciones', '⚙️', 'config', [3, 0, 6], '#94a3b8'),
  proximo('diseno', 'Diseño de casa', '🏠', 'config', [9, 0, 6], '#cbd5e1'),
]

export const getRoom = (id: string) => rooms.find((r) => r.id === id)
