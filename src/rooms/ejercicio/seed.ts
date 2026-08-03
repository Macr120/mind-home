import { db } from '../../core/data/db'
import {
  gruposCardioRepo,
  gruposFlexRepo,
  gruposFuerzaRepo,
  rutinasCardioRepo,
  rutinasFlexRepo,
  rutinasFuerzaRepo,
} from '../../core/data/repository'
import { CATALOGO_CARDIO, CATALOGO_FLEX, CATALOGO_FUERZA, slugGrupo } from './catalogo'
import { PERFIL_DEFECTO } from './constantes'
import { RUTINAS } from './rutinas'
import { claveLS } from '../../core/edicion'
import { filaSeed, filasSeed } from '../../core/data/sync/syncables'

let sembrado = false
// Se siembran una sola vez; así el usuario puede borrarlas (o editarlas) sin que reaparezcan.
const FLAG_RUTINAS = claveLS('mindhome:ejercicio:rutinasFuerzaSembradas')
const FLAG_FLEX = claveLS('mindhome:ejercicio:rutinasFlexSembradas')
const FLAG_GRUPOS_FUERZA = claveLS('mindhome:ejercicio:gruposFuerzaSembrados')
const FLAG_GRUPOS_FLEX = claveLS('mindhome:ejercicio:gruposFlexSembrados')
const FLAG_GRUPOS_CARDIO = claveLS('mindhome:ejercicio:gruposCardioSembrados')
const FLAG_RUTINAS_CARDIO = claveLS('mindhome:ejercicio:rutinasCardioSembradas')

export async function sembrarEjercicio() {
  if (sembrado) return
  sembrado = true
  const perfil = await db.perfilEjercicio.toCollection().first()
  if (!perfil) await db.perfilEjercicio.add(filaSeed('perfilEjercicio-0', PERFIL_DEFECTO))

  if (!localStorage.getItem(FLAG_RUTINAS)) {
    localStorage.setItem(FLAG_RUTINAS, '1')
    const base = Date.now()
    await rutinasFuerzaRepo.bulkAdd(
      filasSeed(
        'rutinasFuerza',
        RUTINAS.fuerza.map((r, i) => ({
          nombre: r.nombre,
          duracionMin: r.duracionMin,
          descripcion: r.descripcion,
          ejercicios: r.ejercicios ?? [],
          // Offset por índice para conservar el orden de la lista original.
          creadoEn: new Date(base + i).toISOString(),
        })),
      ),
    )
  }

  if (!localStorage.getItem(FLAG_FLEX)) {
    localStorage.setItem(FLAG_FLEX, '1')
    const base = Date.now()
    await rutinasFlexRepo.bulkAdd(
      filasSeed(
        'rutinasFlex',
        RUTINAS.flexibilidad.map((r, i) => ({
          nombre: r.nombre,
          duracionMin: r.duracionMin,
          descripcion: r.descripcion,
          enfoque: r.enfoque,
          ejercicios: r.ejercicios ?? [],
          creadoEn: new Date(base + i).toISOString(),
        })),
      ),
    )
  }

  if (!localStorage.getItem(FLAG_GRUPOS_FUERZA)) {
    localStorage.setItem(FLAG_GRUPOS_FUERZA, '1')
    await gruposFuerzaRepo.bulkAdd(
      filasSeed(
        'gruposFuerza',
        CATALOGO_FUERZA.map((g, i) => ({ grupoId: g.id, label: g.label, orden: i, ejercicios: g.ejercicios })),
        (g) => g.grupoId,
      ),
    )
  }

  if (!localStorage.getItem(FLAG_GRUPOS_FLEX)) {
    localStorage.setItem(FLAG_GRUPOS_FLEX, '1')
    await gruposFlexRepo.bulkAdd(
      filasSeed(
        'gruposFlex',
        CATALOGO_FLEX.map((g, i) => ({ grupoId: g.id, label: g.label, orden: i, ejercicios: g.ejercicios })),
        (g) => g.grupoId,
      ),
    )
  }

  if (!localStorage.getItem(FLAG_GRUPOS_CARDIO)) {
    localStorage.setItem(FLAG_GRUPOS_CARDIO, '1')
    await sembrarGruposCardio()
  }

  if (!localStorage.getItem(FLAG_RUTINAS_CARDIO)) {
    localStorage.setItem(FLAG_RUTINAS_CARDIO, '1')
    const base = Date.now()
    await rutinasCardioRepo.bulkAdd(
      filasSeed(
        'rutinasCardio',
        RUTINAS.resistencia.map((r, i) => ({
          nombre: r.nombre,
          duracionMin: r.duracionMin,
          descripcion: r.descripcion,
          ejercicios: r.ejercicios ?? [],
          creadoEn: new Date(base + i).toISOString(),
        })),
      ),
    )
  }
}

/**
 * Grupos del catálogo de resistencia. Si el usuario ya tenía `categoriasCardio`
 * (tabla previa, solo nombres) se migran conservando sus categorías y
 * actividades propias, tomando la descripción de la semilla cuando el nombre
 * coincide. Si no hay nada previo, se siembra el catálogo completo.
 */
async function sembrarGruposCardio() {
  const previas = await db.categoriasCardio.toArray()
  if (previas.length === 0) {
    await gruposCardioRepo.bulkAdd(
      filasSeed(
        'gruposCardio',
        CATALOGO_CARDIO.map((g, i) => ({ grupoId: g.id, label: g.label, orden: i, ejercicios: g.ejercicios })),
        (g) => g.grupoId,
      ),
    )
    return
  }
  const descPorNombre = new Map<string, string | undefined>()
  for (const g of CATALOGO_CARDIO) {
    for (const e of g.ejercicios) descPorNombre.set(e.nombre.toLowerCase(), e.descripcion)
  }
  // Reusa el id de la semilla si la categoría conserva su nombre, para no perder su traducción.
  const idPorLabel = new Map(CATALOGO_CARDIO.map((g) => [g.label.toLowerCase(), g.id]))
  const usados: string[] = []
  const grupos = previas.map((c, i) => {
    const grupoId = idPorLabel.get(c.nombre.toLowerCase()) ?? slugGrupo(c.nombre, usados)
    usados.push(grupoId)
    return {
      grupoId,
      label: c.nombre,
      orden: i,
      ejercicios: c.actividades.map((a) => ({ nombre: a, descripcion: descPorNombre.get(a.toLowerCase()) })),
    }
  })
  await gruposCardioRepo.bulkAdd(grupos)
}
