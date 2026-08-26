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

/**
 * Siembra un CATÁLOGO (los grupos con sus ejercicios). La bandera existe para
 * que borrar un grupo no lo reponga al recargar, pero un catálogo VACÍO no es
 * una elección: es una base que perdió sus filas. Ahí Ejercicio se queda sin un
 * solo ejercicio que ofrecer y sin sitio donde añadirlo —al elegir un enfoque
 * solo se ve «Rutina sugerida»—, así que con la tabla vacía se vuelve a sembrar.
 *
 * Las RUTINAS no llevan este rescate: quedarse sin ninguna sí es un estado
 * normal (se borran a mano) y no deja la app inservible.
 */
async function sembrarCatalogo(
  flag: string,
  repo: { list: () => Promise<unknown[]> },
  sembrar: () => Promise<void>,
): Promise<void> {
  if (localStorage.getItem(flag) && (await repo.list()).length > 0) return
  localStorage.setItem(flag, '1')
  await sembrar()
}

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

  await sembrarCatalogo(FLAG_GRUPOS_FUERZA, gruposFuerzaRepo, () =>
    gruposFuerzaRepo.bulkAdd(
      filasSeed(
        'gruposFuerza',
        CATALOGO_FUERZA.map((g, i) => ({ grupoId: g.id, label: g.label, orden: i, ejercicios: g.ejercicios })),
        (g) => g.grupoId,
      ),
    ),
  )

  await sembrarCatalogo(FLAG_GRUPOS_FLEX, gruposFlexRepo, () =>
    gruposFlexRepo.bulkAdd(
      filasSeed(
        'gruposFlex',
        CATALOGO_FLEX.map((g, i) => ({ grupoId: g.id, label: g.label, orden: i, ejercicios: g.ejercicios })),
        (g) => g.grupoId,
      ),
    ),
  )

  await sembrarCatalogo(FLAG_GRUPOS_CARDIO, gruposCardioRepo, sembrarGruposCardio)

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
  // `categoriasCardio` está retirada (fuera del sync desde ago 2026) pero la tabla
  // NO se puede borrar todavía: esta es la única migración de sus datos a
  // `gruposCardio` y solo corre al sembrar el cuarto de Ejercicio. Quien nunca lo
  // haya abierto conserva ahí sus categorías. Se lee de forma defensiva para que
  // el día que se retire del esquema esto no reviente (Dexie no crea propiedad
  // para las tablas borradas, y `undefined.toArray()` tumbaría la siembra).
  const existeTablaVieja = db.tables.some((t) => t.name === 'categoriasCardio')
  const previas = existeTablaVieja ? await db.categoriasCardio.toArray() : []
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
