import { create } from 'zustand'

/**
 * Previa de una app del catálogo a pantalla completa. El estado vive aquí (y no
 * en `PlantillasCatalogo`) para que el overlay se monte en la raíz de `App`:
 * dentro del `<aside>` del menú lateral, su `fixed` quedaba encajonado por el
 * stacking context / containing block del panel.
 */
interface PreviaPlantillaState {
  plantillaId: string | null
  abrir: (id: string) => void
  cerrar: () => void
}

export const usePreviaPlantilla = create<PreviaPlantillaState>((set) => ({
  plantillaId: null,
  abrir: (id) => set({ plantillaId: id }),
  cerrar: () => set({ plantillaId: null }),
}))
