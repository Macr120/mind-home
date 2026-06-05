import type { ObjetoCuarto } from '../data/db'

/** Prefijo de tipo para el mueble temático de cada cuarto. */
export const MUEBLE_TIPO = (roomId: string) => `mueble:${roomId}`

export function esMueblePrincipal(o: ObjetoCuarto): boolean {
  return o.permanente === true || o.tipo.startsWith('mueble:')
}

/** Posición y color por defecto del mueble de cada cuarto (local al centro). */
export const MUEBLES_DEFAULT: Record<
  string,
  { x: number; z: number; color: string; nombre: string; icon: string }
> = {
  cocina: { x: 0, z: -1.4, color: '#7a5230', nombre: 'Cocina', icon: '🍳' },
  ejercicio: { x: 0, z: 0, color: '#4b5563', nombre: 'Gimnasio', icon: '💪' },
  recamara: { x: 0, z: -0.6, color: '#7a5230', nombre: 'Cama', icon: '🛏️' },
  despacho: { x: 0, z: -1.3, color: '#7a5230', nombre: 'Escritorio', icon: '💼' },
  biblioteca: { x: 0, z: -1.5, color: '#7a5230', nombre: 'Librero', icon: '📚' },
  entretenimiento: { x: 0, z: -1.5, color: '#1f2937', nombre: 'TV y sofá', icon: '📺' },
  sala: { x: 0, z: 0, color: '#7a5230', nombre: 'Viajes', icon: '✈️' },
  jardin: { x: -0.5, z: 0, color: '#7c3aed', nombre: 'Meditación', icon: '🧘' },
  garage: { x: 0, z: -1.4, color: '#6b7280', nombre: 'Taller', icon: '🔧' },
  diario: { x: 0, z: -1.4, color: '#b91c1c', nombre: 'Kiosco', icon: '📰' },
  configuraciones: { x: 0, z: -1, color: '#6b7280', nombre: 'Engranaje', icon: '⚙️' },
  diseno: { x: 0, z: -0.5, color: '#fcd34d', nombre: 'Maqueta', icon: '🏠' },
}
