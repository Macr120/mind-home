import { create } from 'zustand'
import type { ClaveApp } from '../ui/calendario/apps'

/**
 * Apps visibles en el calendario. Vive en un store y no en `CalendarioVista`
 * porque el calendario se monta en dos sitios (el modal del reloj y la app del
 * cuarto): con estado local cada uno tendría su propio filtro. Se guarda en
 * localStorage por ser una preferencia del dispositivo, como el resto de ajustes.
 */

const LS_FILTRO = 'mh.cal.filtroApps'

function leer(): Set<ClaveApp> {
  try {
    const raw = localStorage.getItem(LS_FILTRO)
    return new Set(raw ? (JSON.parse(raw) as ClaveApp[]) : [])
  } catch {
    return new Set()
  }
}

const guardar = (apps: Set<ClaveApp>) => localStorage.setItem(LS_FILTRO, JSON.stringify([...apps]))

interface CalendarioFiltroState {
  /** Vacío = todas las apps (no hay que sembrarlo con el catálogo entero). */
  apps: Set<ClaveApp>
  alternar: (id: ClaveApp) => void
  /** Marca las apps de una categoría, o las quita todas si ya estaban. */
  alternarCategoria: (ids: ClaveApp[]) => void
  limpiar: () => void
}

export const useCalendarioFiltro = create<CalendarioFiltroState>((set) => ({
  apps: leer(),
  alternar: (id) =>
    set((s) => {
      const apps = new Set(s.apps)
      if (apps.has(id)) apps.delete(id)
      else apps.add(id)
      guardar(apps)
      return { apps }
    }),
  alternarCategoria: (ids) =>
    set((s) => {
      const apps = new Set(s.apps)
      const todas = ids.every((id) => apps.has(id))
      for (const id of ids) {
        if (todas) apps.delete(id)
        else apps.add(id)
      }
      guardar(apps)
      return { apps }
    }),
  limpiar: () => {
    guardar(new Set())
    set({ apps: new Set() })
  },
}))
