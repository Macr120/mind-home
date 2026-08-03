import type { DietaGuardada } from '../../core/data/db'
import { perfilNutricionRepo, recetasRepo } from '../../core/data/repository'
import { imagenIaActiva } from '../../core/imagenIA'
import { PERFIL_DEFECTO } from './constantes'
import { crearDietaIA, crearRecetaIA } from './recetaIA'
import { fotoIA } from './fotoIA'
import { promptDieta, promptReceta } from './promptsFoto'

export type FaseDieta = 'plan' | 'fotos'

/**
 * La cadena completa de «dieta con IA», compartida por la pestaña Dieta y el
 * plan alimenticio de Metas: pide la dieta, escribe y GUARDA cada receta (con
 * su foto) en el recetario, y genera la portada. Devuelve la dieta lista para
 * guardar o revisar — no la guarda: cada caller decide.
 */
export async function generarDietaCompleta(
  peticion: string,
  onFase?: (f: FaseDieta) => void,
): Promise<Omit<DietaGuardada, 'id'>> {
  onFase?.('plan')
  const d = await crearDietaIA(peticion)
  const conFotos = imagenIaActiva()
  const creadas = await Promise.all(
    d.recetas.map(async (nombre) => {
      try {
        const r = await crearRecetaIA(nombre)
        const foto = conFotos ? await fotoIA(promptReceta(r)) : undefined
        return await recetasRepo.add({ ...r, foto, fuente: 'ia', creadaEn: new Date().toISOString() })
      } catch {
        return null
      }
    }),
  )
  if (conFotos) onFase?.('fotos')
  const foto = conFotos ? await fotoIA(promptDieta(d)) : undefined
  return {
    nombre: d.nombre,
    descripcion: d.descripcion,
    calorias: d.calorias,
    proteinas: d.proteinas,
    carbohidratos: d.carbohidratos,
    grasas: d.grasas,
    recetaIds: creadas.filter((x): x is number => typeof x === 'number'),
    creadoEn: new Date().toISOString(),
    foto,
  }
}

/** Vuelca las metas de una dieta al perfil de objetivos (creándolo si no hay). */
export async function aplicarObjetivosDieta(dieta: DietaGuardada): Promise<void> {
  const datos: Record<string, number> = {}
  if (dieta.calorias != null) datos.calorias = dieta.calorias
  if (dieta.proteinas != null) datos.proteinas = dieta.proteinas
  if (dieta.carbohidratos != null) datos.carbohidratos = dieta.carbohidratos
  if (dieta.grasas != null) datos.grasas = dieta.grasas
  if (Object.keys(datos).length === 0) return
  const perfil = (await perfilNutricionRepo.list())[0]
  if (perfil?.id) await perfilNutricionRepo.update(perfil.id, datos)
  else await perfilNutricionRepo.add({ ...PERFIL_DEFECTO, ...datos })
}
