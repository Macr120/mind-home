import { create } from 'zustand'

/**
 * Cómo se ven los cuartos, compartido por el menú lateral y el panel de apps
 * (cambiarla en uno la cambia en el otro):
 * - `iconos`: icono, nombre y estadísticas.
 * - `apps`: solo el icono con su nombre, como la pantalla de un teléfono.
 * - `3d`: el cuarto amueblado en vez del icono, con sus estadísticas.
 */
export type VistaCuartos = 'iconos' | 'apps' | '3d'

const LS_VISTA = 'mh.cuartosVista'
/** Clave vieja (solo iconos/3D): se lee para no perder la preferencia de antes. */
const LS_VISTA_3D = 'mh.cuartos3D'

function leerVista(): VistaCuartos {
  try {
    const v = localStorage.getItem(LS_VISTA)
    if (v === 'iconos' || v === 'apps' || v === '3d') return v
    return localStorage.getItem(LS_VISTA_3D) === '1' ? '3d' : 'iconos'
  } catch {
    return 'iconos'
  }
}

export const useVistaCuartos = create<{ vista: VistaCuartos; setVista: (v: VistaCuartos) => void }>((set) => ({
  vista: leerVista(),
  setVista: (vista) => {
    try {
      localStorage.setItem(LS_VISTA, vista)
    } catch {
      /* almacenamiento bloqueado */
    }
    set({ vista })
  },
}))
