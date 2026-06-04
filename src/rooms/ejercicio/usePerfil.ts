import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../core/data/db'
import { PERFIL_DEFECTO } from './constantes'
import type { PerfilEjercicio } from '../../core/data/db'

export function usePerfilEjercicio(): (PerfilEjercicio & { id: number }) | undefined {
  return useLiveQuery(async () => {
    const p = await db.perfilEjercicio.toCollection().first()
    if (p?.id) return p as PerfilEjercicio & { id: number }
    return undefined
  }, [])
}

export function perfilEfectivo(p: (PerfilEjercicio & { id: number }) | undefined) {
  return p ?? { id: 0, ...PERFIL_DEFECTO }
}
