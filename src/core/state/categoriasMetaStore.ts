import { create } from 'zustand'
import { claveLS } from '../edicion'

/**
 * Categorías PROPIAS del panel de Metas, las que el usuario inventa además de las
 * que dan las apps («Casa», «Familia»).
 *
 * La lista de categorías con metas dentro NO se guarda aquí: se deriva de
 * `Rutina.categoriaMeta`, igual que las carpetas de recetas salen de
 * `Receta.carpeta`. Este store existe solo para las **vacías** — una categoría
 * recién creada, todavía sin metas, desaparecería al repintar.
 *
 * Consecuencia asumida: una categoría vacía no viaja entre dispositivos
 * (localStorage no sincroniza). En cuanto tiene una meta viaja sola, porque
 * entonces vive en `categoriaMeta`, que sí es dato.
 */

const LS_CATEGORIAS = claveLS('mh.metas.categorias')

function leer(): string[] {
  try {
    const raw = localStorage.getItem(LS_CATEGORIAS)
    return raw ? (JSON.parse(raw) as string[]) : []
  } catch {
    return []
  }
}

const guardar = (cats: string[]) => localStorage.setItem(LS_CATEGORIAS, JSON.stringify(cats))

/** Sin acentos ni mayúsculas: «Casa» y «casa» son la misma categoría. */
export const claveCategoria = (s: string) =>
  s.trim().toLowerCase().normalize('NFD').replace(/\p{M}/gu, '')

interface CategoriasMetaState {
  /** Solo las creadas a mano; las que ya tienen metas se derivan de la BD. */
  propias: string[]
  agregar: (nombre: string) => void
  quitar: (nombre: string) => void
}

export const useCategoriasMeta = create<CategoriasMetaState>((set) => ({
  propias: leer(),
  agregar: (nombre) =>
    set((s) => {
      const n = nombre.trim()
      if (!n || s.propias.some((c) => claveCategoria(c) === claveCategoria(n))) return s
      const propias = [...s.propias, n]
      guardar(propias)
      return { propias }
    }),
  quitar: (nombre) =>
    set((s) => {
      const propias = s.propias.filter((c) => claveCategoria(c) !== claveCategoria(nombre))
      guardar(propias)
      return { propias }
    }),
}))
