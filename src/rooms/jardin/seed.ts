import { db } from '../../core/data/db'
import { PERFIL_DEFECTO } from './constantes'

let sembrado = false

export async function sembrarJardin() {
  if (sembrado) return
  sembrado = true
  const p = await db.perfilMindfulness.toCollection().first()
  if (!p) await db.perfilMindfulness.add(PERFIL_DEFECTO)
}
