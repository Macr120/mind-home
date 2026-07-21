import { create } from 'zustand'
import { objetosDe } from './objetosPlantillaStore'
import { asignarPlantillaACuarto, asignarPlantillaAObjeto } from '../gamificacion/plantillaBundle'

/**
 * Al asignar una app a un cuarto se pregunta si traer todo el mobiliario o solo
 * el objeto principal. Este store guarda la asignación pendiente mientras el
 * usuario elige en `AmueblarDialog`.
 */
interface Pendiente {
  cuartoId: string
  objetoId: number | null
  plantillaId: string
}

interface AmueblarState {
  pendiente: Pendiente | null
  cerrar: () => void
  /** Ejecuta la asignación pendiente con el modo elegido. */
  confirmar: (soloPrincipal: boolean) => Promise<void>
}

export const useAmueblar = create<AmueblarState>((set, get) => ({
  pendiente: null,
  cerrar: () => set({ pendiente: null }),
  confirmar: async (soloPrincipal) => {
    const p = get().pendiente
    if (!p) return
    set({ pendiente: null })
    if (p.objetoId != null) {
      await asignarPlantillaAObjeto(p.cuartoId, p.objetoId, p.plantillaId, soloPrincipal)
    } else {
      await asignarPlantillaACuarto(p.cuartoId, p.plantillaId, soloPrincipal)
    }
  },
}))

/** ¿Elegir "amueblado vs solo principal" cambia el resultado para esta asignación? */
function ofreceAmueblado(plantillaId: string, objetoId: number | null): boolean {
  const set = objetosDe(plantillaId)
  if (!set.length) return false
  // A un objeto: hay mobiliario que sembrar. A un cuarto: hay extras además del principal.
  return objetoId != null ? true : set.some((s) => !s.principal)
}

/**
 * Punto único de asignación: si la app trae mobiliario, pregunta cómo amueblar;
 * si no, asigna directo.
 */
export async function iniciarAsignacion(
  cuartoId: string,
  plantillaId: string,
  objetoId: number | null = null,
): Promise<void> {
  if (ofreceAmueblado(plantillaId, objetoId)) {
    useAmueblar.setState({ pendiente: { cuartoId, objetoId, plantillaId } })
  } else if (objetoId != null) {
    await asignarPlantillaAObjeto(cuartoId, objetoId, plantillaId)
  } else {
    await asignarPlantillaACuarto(cuartoId, plantillaId)
  }
}
