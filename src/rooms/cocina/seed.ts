import { db } from '../../core/data/db'
import { FAVORITOS_INICIALES, PERFIL_DEFECTO } from './constantes'

let sembrado = false

/** Datos iniciales de cocina (solo la primera vez). */
export async function sembrarCocina() {
  if (sembrado) return
  sembrado = true

  const perfil = await db.perfilNutricion.toCollection().first()
  if (!perfil) await db.perfilNutricion.add(PERFIL_DEFECTO)

  const favs = await db.alimentosFavoritos.count()
  if (favs === 0) {
    await db.alimentosFavoritos.bulkAdd(FAVORITOS_INICIALES)
  }
}
