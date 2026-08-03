import { create } from 'zustand'
import { claveLS } from '../edicion'

/**
 * Interruptor de los ejemplos de fábrica.
 *
 * Cada fila de ejemplo lleva `ejemploDe: '<sección>'` (p. ej. `'hobbies.hobbies'`).
 * Encender el ejemplo la primera vez CREA esas filas; apagarlo NO las borra, solo
 * las esconde: volver a encenderlo es instantáneo y siempre sale lo mismo.
 *
 * El filtro vive en un solo sitio —`useAll()` de `repository.ts`—, que es por
 * donde pasan todas las pantallas (la regla dura del proyecto es que los cuartos
 * nunca importan `db`). Los pocos lectores directos de `db` (la escena 3D del
 * huerto y la granja) llaman a `visibles()` a mano.
 */

/** Lo mínimo que necesita saber el filtro de cualquier fila. */
export interface FilaEjemplo {
  /** Sección a la que pertenece la fila de ejemplo; ausente = dato del usuario. */
  ejemploDe?: string
  /** Marca vieja (agenda, despacho, ideas): esas secciones sí borran de verdad. */
  ejemplo?: boolean
}

const LS_ENCENDIDOS = claveLS('mh.ejemplos')

function leer(): string[] {
  try {
    const crudo = localStorage.getItem(LS_ENCENDIDOS)
    const filas: unknown = crudo ? JSON.parse(crudo) : []
    return Array.isArray(filas) ? filas.filter((x): x is string => typeof x === 'string') : []
  } catch {
    return []
  }
}

interface EjemplosState {
  /** Secciones con el ejemplo encendido. */
  encendidos: string[]
  encender(seccion: string): void
  apagar(seccion: string): void
}

export const useEjemplos = create<EjemplosState>((set) => ({
  encendidos: leer(),
  encender: (seccion) =>
    set((s) => {
      if (s.encendidos.includes(seccion)) return s
      const encendidos = [...s.encendidos, seccion]
      localStorage.setItem(LS_ENCENDIDOS, JSON.stringify(encendidos))
      return { encendidos }
    }),
  apagar: (seccion) =>
    set((s) => {
      const encendidos = s.encendidos.filter((x) => x !== seccion)
      localStorage.setItem(LS_ENCENDIDOS, JSON.stringify(encendidos))
      return { encendidos }
    }),
}))

/** ¿El ejemplo de esta sección está encendido? (fuera de React). */
export const ejemploEncendido = (seccion: string): boolean =>
  useEjemplos.getState().encendidos.includes(seccion)

/** Hook: ¿el ejemplo de esta sección está encendido? */
export const useEjemploEncendido = (seccion: string): boolean =>
  useEjemplos((s) => s.encendidos.includes(seccion))

/**
 * Clave estable de las secciones encendidas, para usar como dependencia de
 * `useMemo` sin recalcular en cada render.
 */
export const useClaveEncendidos = (): string => useEjemplos((s) => s.encendidos.join('|'))

// Las marcas van en filas de tablas muy distintas y `ejemploDe` es un campo sin
// índice: se leen con un molde en vez de atar el genérico a cada interfaz.
const marca = (fila: unknown) => fila as FilaEjemplo

/** Quita las filas de ejemplo cuya sección esté apagada. */
export function visibles<T>(filas: T[]): T[] {
  // Camino rápido: casi ninguna tabla tiene filas de ejemplo dentro.
  if (!filas.some((f) => marca(f).ejemploDe)) return filas
  const encendidos = useEjemplos.getState().encendidos
  return filas.filter((f) => {
    const de = marca(f).ejemploDe
    return !de || encendidos.includes(de)
  })
}

/**
 * Quita TODA fila de ejemplo, esté encendida o no. Lo usa la gamificación: un
 * ejemplo no debe subir XP, racha ni la Montaña de Sísifo.
 */
export const sinEjemplos = <T>(filas: T[]): T[] =>
  filas.filter((f) => !marca(f).ejemploDe && !marca(f).ejemplo)
