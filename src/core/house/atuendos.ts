import type { Ropa } from './apariencia'

/**
 * Atuendos sugeridos para el personaje principal: combinaciones de prendas
 * (con sus colores) inspiradas en los cuartos/apps de la casa, listas para
 * aplicarse de un toque desde la categoría «Atuendos» de la pestaña Ropa.
 * Se guardan como `avatar.ropa` completo (reemplaza lo puesto).
 */

export interface Atuendo {
  id: string
  nombre: string
  emoji: string
  ropa: Ropa
}

export const ATUENDOS_PRESET: Atuendo[] = [
  {
    // Cocina · Nutrición
    id: 'chef',
    nombre: 'Chef',
    emoji: '👨‍🍳',
    ropa: {
      gorroChef: { color: '#f5f5f0' },
      camisa: { color: '#ffffff' },
      pantalon: { color: '#1f2937' },
    },
  },
  {
    // Ejercicio · Rutinas
    id: 'deportista',
    nombre: 'Deportista',
    emoji: '🏃',
    ropa: {
      gorra: { color: '#ef4444' },
      playera: { color: '#3b82f6' },
      shorts: { color: '#1f2937' },
      tenis: { color: '#f8fafc' },
    },
  },
  {
    // Recámara · Descanso
    id: 'pijama',
    nombre: 'Pijama',
    emoji: '🌙',
    ropa: {
      playera: { color: '#c7d2fe' },
      pantalon: { color: '#a5b4fc' },
    },
  },
  {
    // Despacho · Finanzas
    id: 'oficinista',
    nombre: 'Oficinista',
    emoji: '💼',
    ropa: {
      camisa: { color: '#f8fafc' },
      corbata: { color: '#1e3a8a' },
      pantalon: { color: '#334155' },
      botas: { color: '#2b2016' },
    },
  },
  {
    // Biblioteca · Aprendizaje
    id: 'academico',
    nombre: 'Académico',
    emoji: '📚',
    ropa: {
      camisa: { color: '#f1f0e6' },
      chamarra: { color: '#6b4423' },
      lentes: { color: '#3a2a1a' },
      pantalon: { color: '#3f3f46' },
    },
  },
  {
    // Sala · Viajes
    id: 'explorador',
    nombre: 'Explorador',
    emoji: '🧭',
    ropa: {
      sombrero: { color: '#c8a878' },
      chamarra: { color: '#8a7355' },
      pantalon: { color: '#7a6a4f' },
      botas: { color: '#4a3826' },
      mochila: { color: '#556b2f' },
    },
  },
  {
    // Jardín · Mindfulness
    id: 'zen',
    nombre: 'Zen',
    emoji: '🧘',
    ropa: {
      playera: { color: '#86a789' },
      pantalon: { color: '#d8cfc0' },
    },
  },
  {
    // Garage/Taller · Vehículos
    id: 'mecanico',
    nombre: 'Mecánico',
    emoji: '🔧',
    ropa: {
      camisa: { color: '#3b5998' },
      pantalon: { color: '#334155' },
      gorra: { color: '#1f2937' },
      guantes: { color: '#78350f' },
      botas: { color: '#111827' },
    },
  },
  {
    // Diario · Noticias
    id: 'reportero',
    nombre: 'Reportero',
    emoji: '📰',
    ropa: {
      camisa: { color: '#eef2f7' },
      corbata: { color: '#7f1d1d' },
      chamarra: { color: '#8a7355' },
      sombrero: { color: '#4b3b2a' },
    },
  },
  {
    // Hobbies
    id: 'artista',
    nombre: 'Artista',
    emoji: '🎨',
    ropa: {
      playera: { color: '#f59e0b' },
      gorra: { color: '#ec4899' },
      pantalon: { color: '#57534e' },
    },
  },
]
