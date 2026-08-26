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

/** Un grupo del catálogo, en lo que las tres modalidades tienen en común. */
interface GrupoCat {
  id?: number
  grupoId: string
  label: string
  orden: number
  ejercicios: { nombre: string }[]
}

/** El repo de un catálogo, visto por lo que el rescate necesita de él. */
interface RepoCat {
  list: () => Promise<GrupoCat[]>
  add: (item: Omit<GrupoCat, 'id'>) => Promise<number>
  update: (id: number, cambios: { ejercicios: { nombre: string }[] }) => Promise<number>
}

/** Un grupo de la semilla (`CATALOGO_FUERZA` y compañía). */
interface SemillaCat {
  id: string
  label: string
  ejercicios: { nombre: string }[]
}

/**
 * Repone un catálogo que se quedó SIN UN SOLO ejercicio. Rellena los grupos de
 * fábrica que existen pero están huecos y añade los que faltan; lo que el
 * usuario tenga con ejercicios dentro no se toca, y sus grupos propios tampoco.
 *
 * Escribe filas de USUARIO, no de semilla, y eso es lo que lo hace funcionar:
 * una fila `seed-…` nace con `updatedAt: 1` y el sync la mata dos veces —el
 * tombstone de la nube que vació la tabla gana el LWW por goleada, y el barrido
 * de arranque borra las `seed-… updatedAt === 1` que el servidor no conoce
 * (`motor.ts`)—. Con uid nuevo y fecha de hoy son datos normales: sobreviven al
 * pull y suben a la nube.
 */
async function rescatarCatalogo(repo: RepoCat, semilla: SemillaCat[], filas: GrupoCat[]): Promise<void> {
  const porId = new Map(filas.map((g) => [g.grupoId, g]))
  let orden = filas.reduce((m, g) => Math.max(m, g.orden), -1)
  for (const s of semilla) {
    const existente = porId.get(s.id)
    if (!existente) {
      orden += 1
      await repo.add({ grupoId: s.id, label: s.label, orden, ejercicios: s.ejercicios })
    } else if (existente.id != null) {
      await repo.update(existente.id, { ejercicios: s.ejercicios })
    }
  }
}

/**
 * Siembra un CATÁLOGO (los grupos con sus ejercicios). La bandera existe para
 * que borrar un grupo no lo reponga al recargar, pero un catálogo sin NINGÚN
 * ejercicio no es una elección: es una base que perdió sus filas, o cuyos
 * grupos se quedaron huecos. Ahí Ejercicio no tiene nada que ofrecer y al
 * elegir un enfoque lo único que se ve es «Rutina sugerida», así que se repone.
 *
 * Las RUTINAS no llevan este rescate: quedarse sin ninguna sí es un estado
 * normal (se borran a mano) y no deja la app inservible.
 */
async function sembrarCatalogo(
  flag: string,
  repo: RepoCat,
  semilla: SemillaCat[],
  sembrar: () => Promise<void>,
): Promise<void> {
  if (!localStorage.getItem(flag)) {
    localStorage.setItem(flag, '1')
    await sembrar()
    return
  }
  const filas = await repo.list()
  if (filas.some((g) => g.ejercicios.length > 0)) return
  await rescatarCatalogo(repo, semilla, filas)
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

  await sembrarCatalogo(FLAG_GRUPOS_FUERZA, gruposFuerzaRepo, CATALOGO_FUERZA, () =>
    gruposFuerzaRepo.bulkAdd(
      filasSeed(
        'gruposFuerza',
        CATALOGO_FUERZA.map((g, i) => ({ grupoId: g.id, label: g.label, orden: i, ejercicios: g.ejercicios })),
        (g) => g.grupoId,
      ),
    ),
  )

  await sembrarCatalogo(FLAG_GRUPOS_FLEX, gruposFlexRepo, CATALOGO_FLEX, () =>
    gruposFlexRepo.bulkAdd(
      filasSeed(
        'gruposFlex',
        CATALOGO_FLEX.map((g, i) => ({ grupoId: g.id, label: g.label, orden: i, ejercicios: g.ejercicios })),
        (g) => g.grupoId,
      ),
    ),
  )

  await sembrarCatalogo(FLAG_GRUPOS_CARDIO, gruposCardioRepo, CATALOGO_CARDIO, sembrarGruposCardio)

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
