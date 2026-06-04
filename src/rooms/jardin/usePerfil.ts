import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../core/data/db'
import { PERFIL_DEFECTO } from './constantes'

export function usePerfilMindfulness() {
  return useLiveQuery(async () => {
    const p = await db.perfilMindfulness.toCollection().first()
    return p ?? { id: 0, ...PERFIL_DEFECTO }
  }, [])
}
