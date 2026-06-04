import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../core/data/db'
import { PERFIL_DEFECTO } from './constantes'
import type { PerfilConId } from './macros'

/** Perfil nutricional reactivo (objetivos diarios). */
export function usePerfil(): PerfilConId | undefined {
  return useLiveQuery(async () => {
    const p = await db.perfilNutricion.toCollection().first()
    if (p?.id) return p as PerfilConId
    return undefined
  }, [])
}

export function perfilEfectivo(perfil: PerfilConId | undefined) {
  return perfil ?? { id: 0, ...PERFIL_DEFECTO }
}
