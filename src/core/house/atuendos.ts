import type { Ropa } from './apariencia'
import { TEMAS, type TemaId } from './temas'

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

/**
 * Atuendo con el que el tema de la casa viste al personaje (lo aplica
 * `setTemaGlobal`; al quitar el tema vuelve la ropa que llevaba antes).
 */
export const ATUENDO_POR_TEMA: Record<TemaId, Ropa> = {
  medieval: {
    capa: { color: '#7f1d1d' },
    camisa: { color: '#d6c7a1' },
    pantalon: { color: '#4a3728' },
    botas: { color: '#3b2a14' },
    guantes: { color: '#6b4f2a' },
  },
  espacio: {
    lentes: { color: '#22d3ee' },
    camisa: { color: '#e2e8f0' },
    pantalon: { color: '#cbd5e1' },
    botas: { color: '#64748b' },
    guantes: { color: '#f1f5f9' },
    mochila: { color: '#475569' },
  },
  terror: {
    sombrero: { color: '#0b0b0f' },
    capa: { color: '#111827' },
    camisa: { color: '#1f2937' },
    pantalon: { color: '#0f172a' },
    botas: { color: '#000000' },
  },
  barbie: {
    lentes: { color: '#c084fc' },
    vestido: { color: '#ff5fa2' },
    tenis: { color: '#fde68a' },
  },
  vaquero: {
    sombrero: { color: '#7c4a1d' },
    bufanda: { color: '#b91c1c' },
    camisa: { color: '#c2853f' },
    chamarra: { color: '#5c3a1e' },
    pantalon: { color: '#1e3a8a' },
    botas: { color: '#5b3a1a' },
  },
  cyberpunk: {
    lentes: { color: '#22d3ee' },
    chamarra: { color: '#1a1030' },
    playera: { color: '#d946ef' },
    pantalon: { color: '#0f172a' },
    botas: { color: '#22d3ee' },
    guantes: { color: '#7c3aed' },
  },
  navidad: {
    gorra: { color: '#dc2626' },
    bufanda: { color: '#f8fafc' },
    chamarra: { color: '#b91c1c' },
    pantalon: { color: '#166534' },
    botas: { color: '#111827' },
    guantes: { color: '#f8fafc' },
  },
}

const firmaRopa = (r: Ropa) =>
  JSON.stringify(
    Object.keys(r)
      .sort()
      .map((k) => [k, (r as Record<string, unknown>)[k]]),
  )

/**
 * ¿Esta ropa es, tal cual, el atuendo de algún tema? Sirve para desvestir al
 * quitar el tema cuando no hay respaldo `ropaSinTema` (el tema se puso con una
 * versión anterior, o la fila llegó por sync sin esa columna).
 */
export function esAtuendoDeTema(ropa: Ropa | undefined): boolean {
  if (!ropa || !Object.keys(ropa).length) return false
  const firma = firmaRopa(ropa)
  return Object.values(ATUENDO_POR_TEMA).some((a) => firmaRopa(a) === firma)
}

/** Los mismos atuendos como lista (nombre e icono del tema) para la categoría «Atuendos». */
export const ATUENDOS_TEMA: Atuendo[] = TEMAS.map((tema) => ({
  id: tema.id,
  nombre: tema.nombre,
  emoji: tema.icon,
  ropa: ATUENDO_POR_TEMA[tema.id],
}))
