import { db } from '../../core/data/db'
import { PERFIL_DEFECTO } from './constantes'

let sembrado = false

export async function sembrarEjercicio() {
  if (sembrado) return
  sembrado = true
  const perfil = await db.perfilEjercicio.toCollection().first()
  if (!perfil) await db.perfilEjercicio.add(PERFIL_DEFECTO)
}
