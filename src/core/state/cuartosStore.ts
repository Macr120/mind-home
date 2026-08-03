import { create } from 'zustand'
import { db, type Cuarto } from '../data/db'
import type { Cell } from '../house/walls'
import { PINCELES_DEFAULT } from '../house/murosPuertas'

/**
 * Cuartos creados por el usuario (instancias genéricas). Sustituye al arreglo
 * estático `rooms` del registro: la identidad de cada cuarto vive aquí, y las apps
 * son plantillas que se asignan a los objetos del cuarto (no al cuarto en sí).
 *
 * Por defecto la casa nunca arranca vacía: en la primera carga se siembra un cuarto
 * inicial (ver el seed al final de `layoutStore.cargar`). Después el usuario crea o
 * elimina cuartos desde el menú lateral / editor de mapa. La geometría 3D (paredes,
 * piso) se reutiliza vía `layoutStore`, que itera estos cuartos en vez del registro.
 */

const COLORES_DEFAULT = ['#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#10b981', '#ec4899', '#3b82f6', '#eab308']

/** Genera un id estable para un cuarto nuevo (referido por layout/diseño/objetos). */
function nuevoId(): string {
  return `cuarto-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
}

/**
 * Todo cuarto nace de un solo color: piso y techo ya heredan `cuarto.color`, así que
 * solo hay que pintar sus muros del mismo tono (la puerta conserva el suyo).
 */
async function pintarMurosDelColor(cuarto: Cuarto): Promise<void> {
  const { useLayout } = await import('./layoutStore')
  await useLayout.getState().setPinceles(cuarto.id, {
    muro: { ...PINCELES_DEFAULT.muro, color: cuarto.color },
    puerta: { ...PINCELES_DEFAULT.puerta },
  })
}

interface CuartosState {
  cuartos: Cuarto[]
  cargado: boolean
  /** Cuarto con app asignada a la espera de que el usuario confirme su borrado (ver `EliminarCuartoDialog`). */
  eliminarPendiente: { id: string; nombre: string } | null
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
  /** Fija el ambiente musical del cuarto (undefined = volver al automático). */
  setTemaMusical: (id: string, tema: Cuarto['temaMusical']) => Promise<void>
  /**
   * Elimina el cuarto y su rastro (layout/diseño/objetos los limpia el layoutStore).
   * Si tiene una app asignada, en vez de borrar de inmediato deja el borrado pendiente
   * de confirmación en `eliminarPendiente` (lo resuelve `EliminarCuartoDialog`).
   */
  eliminar: (id: string) => Promise<void>
  /** Confirma el borrado de `eliminarPendiente` (la plantilla asignada vuelve al catálogo). */
  confirmarEliminarCuarto: () => Promise<void>
  /** Cancela el borrado pendiente sin tocar el cuarto. */
  cancelarEliminarCuarto: () => void
}

export const useCuartos = create<CuartosState>((set, get) => ({
  cuartos: [],
  cargado: false,
  eliminarPendiente: null,

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
    await pintarMurosDelColor(cuarto)
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
    await pintarMurosDelColor(cuarto)
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

  setTemaMusical: async (id, tema) => {
    set((s) => ({ cuartos: s.cuartos.map((c) => (c.id === id ? { ...c, temaMusical: tema } : c)) }))
    // `undefined` borra la propiedad en Dexie (vuelve al tema automático).
    await db.cuartos.update(id, { temaMusical: tema })
  },

  eliminar: async (id) => {
    // Cuarto con apps asignadas: pedir confirmación en un modal propio antes de borrar
    // (las plantillas vuelven al catálogo). `window.confirm` no es fiable aquí: en
    // WebView/Capacitor o en el preview embebido puede no mostrarse y devolver false
    // sin avisar, dando la impresión de que el cuarto "no se puede borrar".
    // Import dinámico: disenoStore importa este store (evitar el ciclo en la carga).
    const { useDiseño } = await import('./disenoStore')
    const conApp = useDiseño.getState().objetos.some((o) => o.roomId === id && o.plantillaId)
    if (conApp) {
      const cuarto = get().cuartos.find((c) => c.id === id)
      set({ eliminarPendiente: { id, nombre: cuarto?.nombre ?? 'Este cuarto' } })
      return
    }
    await borrarCuartoInterno(id)
  },

  confirmarEliminarCuarto: async () => {
    const pendiente = get().eliminarPendiente
    if (!pendiente) return
    set({ eliminarPendiente: null })
    await borrarCuartoInterno(pendiente.id)
  },

  cancelarEliminarCuarto: () => set({ eliminarPendiente: null }),
}))

/** Borrado efectivo del cuarto: fila en BD + limpieza de layout/diseño/objetos. */
async function borrarCuartoInterno(id: string): Promise<void> {
  useCuartos.setState((s) => ({ cuartos: s.cuartos.filter((c) => c.id !== id) }))
  await db.cuartos.delete(id)
  const { useLayout } = await import('./layoutStore')
  await useLayout.getState().quitarCuarto(id)
}

/** Lookup no-reactivo (equivalente a `getRoom` para instancias de cuarto). */
export const getCuarto = (id: string): Cuarto | undefined =>
  useCuartos.getState().cuartos.find((c) => c.id === id)

if (import.meta.env.DEV) {
  ;(window as unknown as { useCuartos: typeof useCuartos }).useCuartos = useCuartos
}

useCuartos.getState().cargar()
