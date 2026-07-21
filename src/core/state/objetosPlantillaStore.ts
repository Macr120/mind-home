import { create } from 'zustand'
import { db, type SiembraGuardada } from '../data/db'
import { SIEMBRA } from '../house/modelosRecursos'

/**
 * Conjunto de objetos que coloca cada app al asignarse. Por defecto es la
 * siembra de código (`SIEMBRA`); el usuario puede editarlo (agregar/quitar
 * objetos y elegir el principal) desde el catálogo de Plantillas, y el override
 * se guarda en `db.objetosPlantilla` y aplica cada vez que la app se asigna.
 */
interface ObjetosPlantillaState {
  /** Overrides por plantilla; si falta, se usa la siembra de código. */
  overrides: Record<string, SiembraGuardada[]>
  /** Agrega un objeto (recurso 3D) al final del conjunto. */
  agregar: (plantillaId: string, recurso: number) => Promise<void>
  /** Quita el objeto en la posición dada; si era el principal, pasa a serlo el primero. */
  eliminar: (plantillaId: string, index: number) => Promise<void>
  /** Marca como principal el objeto en la posición dada. */
  setPrincipal: (plantillaId: string, index: number) => Promise<void>
}

/** Conjunto actual de una app: override guardado o la siembra de código. */
export function objetosDe(plantillaId: string): SiembraGuardada[] {
  return useObjetosPlantilla.getState().overrides[plantillaId] ?? SIEMBRA[plantillaId] ?? []
}

/** Posición por defecto de un objeto nuevo (se afina luego en el editor 3D). */
function posNueva(n: number): { x: number; z: number } {
  return { x: ((n % 3) - 1) * 1.3, z: -2 + Math.floor(n / 3) * 1.3 }
}

async function guardar(plantillaId: string, objetos: SiembraGuardada[]) {
  await db.objetosPlantilla.put({ plantillaId, objetos })
}

export const useObjetosPlantilla = create<ObjetosPlantillaState>((set) => ({
  overrides: {},
  agregar: async (plantillaId, recurso) => {
    const base = objetosDe(plantillaId)
    const objetos = [...base, { recurso, ...posNueva(base.length), principal: base.length === 0 }]
    set((s) => ({ overrides: { ...s.overrides, [plantillaId]: objetos } }))
    await guardar(plantillaId, objetos)
  },
  eliminar: async (plantillaId, index) => {
    const objetos = objetosDe(plantillaId).filter((_, i) => i !== index)
    // Si se quitó el principal, el primero restante pasa a serlo.
    if (objetos.length > 0 && !objetos.some((o) => o.principal)) {
      objetos[0] = { ...objetos[0], principal: true }
    }
    set((s) => ({ overrides: { ...s.overrides, [plantillaId]: objetos } }))
    await guardar(plantillaId, objetos)
  },
  setPrincipal: async (plantillaId, index) => {
    const objetos = objetosDe(plantillaId).map((o, i) => ({ ...o, principal: i === index }))
    set((s) => ({ overrides: { ...s.overrides, [plantillaId]: objetos } }))
    await guardar(plantillaId, objetos)
  },
}))

/** Carga los conjuntos editados al arrancar. */
db.objetosPlantilla
  .toArray()
  .then((rows) => {
    if (rows.length === 0) return
    const overrides: Record<string, SiembraGuardada[]> = {}
    for (const r of rows) overrides[r.plantillaId] = r.objetos
    useObjetosPlantilla.setState({ overrides })
  })
  .catch(() => {})
