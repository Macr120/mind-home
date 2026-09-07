import { create } from 'zustand'

/**
 * «Así se hace»: el avatar del usuario haciendo un ejercicio del catálogo en 3D.
 * Es store global porque lo abre el chat (tool `editor_demo_ejercicio` y su
 * regla sin IA). Dos modos: en el MAPA lo hace el propio personaje donde está
 * (`Character` cambia su cuerpo por el rig, ver `AvatarEjercicioMapa`); dentro
 * de un cuarto se abre el visor en la raíz (App.tsx), como el Chat AR.
 */
type ModoDemoEjercicio = 'overlay' | 'mapa'

interface DemoEjercicioState {
  /** Nombre canónico (español) del ejercicio en curso; null = nada. */
  nombre: string | null
  descripcion?: string
  modo: ModoDemoEjercicio
  abrir: (nombre: string, descripcion?: string, modo?: ModoDemoEjercicio) => void
  cerrar: () => void
}

export const useDemoEjercicio = create<DemoEjercicioState>((set) => ({
  nombre: null,
  descripcion: undefined,
  modo: 'overlay',
  abrir: (nombre, descripcion, modo = 'overlay') => set({ nombre, descripcion, modo }),
  cerrar: () => set({ nombre: null, descripcion: undefined }),
}))
