import { create } from 'zustand'
import { db, type Cuarto } from '../data/db'
import type { Cell } from '../house/walls'

/**
 * Cuartos creados por el usuario (instancias genéricas). Sustituye al arreglo
 * estático `rooms` del registro: la identidad de cada cuarto vive aquí, y las apps
 * son plantillas que se asignan a los objetos del cuarto (no al cuarto en sí).
 *
 * La casa arranca VACÍA: no se siembra ningún cuarto. El usuario los crea desde el
 * menú lateral / editor de mapa. La geometría 3D (paredes, piso) se reutiliza vía
 * `layoutStore`, que ahora itera estos cuartos en vez del registro.
 */

const COLORES_DEFAULT = ['#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#10b981', '#ec4899', '#3b82f6', '#eab308']

/** Genera un id estable para un cuarto nuevo (referido por layout/diseño/objetos). */
function nuevoId(): string {
  return `cuarto-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
}

interface CuartosState {
  cuartos: Cuarto[]
  cargado: boolean
  cargar: () => Promise<void>
  /** Crea un cuarto vacío y lo coloca en una celda libre. Devuelve su id. */
  crear: (parcial?: Partial<Pick<Cuarto, 'nombre' | 'icon' | 'color' | 'categoria'>>) => Promise<string>
  /** Crea un cuarto con la forma dibujada (celdas absolutas) en un nivel. Devuelve su id. */
  crearEnCeldas: (
    parcial: Partial<Pick<Cuarto, 'nombre' | 'icon' | 'color' | 'categoria'>> | undefined,
    celdas: Cell[],
    nivel: number,
  ) => Promise<string>
  renombrar: (id: string, nombre: string) => Promise<void>
  setColor: (id: string, color: string) => Promise<void>
  setIcon: (id: string, icon: string) => Promise<void>
  setCategoria: (id: string, categoria: Cuarto['categoria']) => Promise<void>
  /** Elimina el cuarto y su rastro (layout/diseño/objetos los limpia el layoutStore). */
  eliminar: (id: string) => Promise<void>
}

export const useCuartos = create<CuartosState>((set, get) => ({
  cuartos: [],
  cargado: false,

  cargar: async () => {
    if (get().cargado) return
    const filas = await db.cuartos.toArray()
    filas.sort((a, b) => a.orden - b.orden)
    set({ cuartos: filas, cargado: true })
  },

  crear: async (parcial) => {
    const cuartos = get().cuartos
    const orden = cuartos.length
    const cuarto: Cuarto = {
      id: nuevoId(),
      nombre: parcial?.nombre ?? 'Cuarto nuevo',
      icon: parcial?.icon ?? '🚪',
      color: parcial?.color ?? COLORES_DEFAULT[orden % COLORES_DEFAULT.length],
      categoria: parcial?.categoria ?? 'complemento',
      creado: new Date().toISOString(),
      orden,
    }
    await db.cuartos.add(cuarto)
    set({ cuartos: [...cuartos, cuarto] })
    // Coloca el cuarto en una celda libre y recalcula la geometría 3D.
    // Import dinámico para evitar el ciclo layoutStore ↔ cuartosStore en la carga.
    const { useLayout } = await import('./layoutStore')
    await useLayout.getState().colocarCuartoNuevo(cuarto.id)
    return cuarto.id
  },

  crearEnCeldas: async (parcial, celdas, nivel) => {
    const cuartos = get().cuartos
    const orden = cuartos.length
    const cuarto: Cuarto = {
      id: nuevoId(),
      nombre: parcial?.nombre ?? 'Cuarto nuevo',
      icon: parcial?.icon ?? '🚪',
      color: parcial?.color ?? COLORES_DEFAULT[orden % COLORES_DEFAULT.length],
      categoria: parcial?.categoria ?? 'complemento',
      creado: new Date().toISOString(),
      orden,
    }
    await db.cuartos.add(cuarto)
    set({ cuartos: [...cuartos, cuarto] })
    const { useLayout } = await import('./layoutStore')
    await useLayout.getState().colocarCuartoEnCeldas(cuarto.id, celdas, nivel)
    return cuarto.id
  },

  renombrar: async (id, nombre) => {
    set((s) => ({ cuartos: s.cuartos.map((c) => (c.id === id ? { ...c, nombre } : c)) }))
    await db.cuartos.update(id, { nombre })
  },

  setColor: async (id, color) => {
    set((s) => ({ cuartos: s.cuartos.map((c) => (c.id === id ? { ...c, color } : c)) }))
    await db.cuartos.update(id, { color })
  },

  setIcon: async (id, icon) => {
    set((s) => ({ cuartos: s.cuartos.map((c) => (c.id === id ? { ...c, icon } : c)) }))
    await db.cuartos.update(id, { icon })
  },

  setCategoria: async (id, categoria) => {
    set((s) => ({ cuartos: s.cuartos.map((c) => (c.id === id ? { ...c, categoria } : c)) }))
    await db.cuartos.update(id, { categoria })
  },

  eliminar: async (id) => {
    set((s) => ({ cuartos: s.cuartos.filter((c) => c.id !== id) }))
    await db.cuartos.delete(id)
    const { useLayout } = await import('./layoutStore')
    await useLayout.getState().quitarCuarto(id)
  },
}))

/** Lookup no-reactivo (equivalente a `getRoom` para instancias de cuarto). */
export const getCuarto = (id: string): Cuarto | undefined =>
  useCuartos.getState().cuartos.find((c) => c.id === id)

if (import.meta.env.DEV) {
  ;(window as unknown as { useCuartos: typeof useCuartos }).useCuartos = useCuartos
}

useCuartos.getState().cargar()
