import type { PlanMeta, NodoPlan, Rutina } from './data/db'
import { planesMetaRepo } from './data/repository'
import { isoMasDias } from './fechaLocal'
import { crearMeta, hijasDe, ponerPeriodo } from './metas'
import type { NodoPropuesto } from './planIA'

/**
 * Los planes: cronogramas ALTERNATIVOS de una meta. Viven aparte de las metas
 * reales hasta que se aceptan — mientras tanto se pintan superpuestos sobre el
 * mismo eje para poder compararlos.
 *
 * Nada de aquí lanza: son datos ya validados por `planIA.ts` o escritos por el
 * usuario.
 */

/** Aplana el árbol anidado de la IA a la forma plana que se guarda (id/padre). */
export function aplanar(nodos: NodoPropuesto[]): NodoPlan[] {
  const salida: NodoPlan[] = []
  let siguiente = 1
  const bajar = (lista: NodoPropuesto[], padre?: number) => {
    for (const n of lista) {
      const id = siguiente++
      salida.push({ id, padre, nombre: n.nombre, ini: n.ini, fin: n.fin })
      bajar(n.hijos, id)
    }
  }
  bajar(nodos)
  return salida
}

/** Cuántos días abarca el plan, del día 0 al último ocupado. */
export const diasDePlan = (nodos: NodoPlan[]) =>
  nodos.length === 0 ? 0 : Math.max(...nodos.map((n) => n.fin)) + 1

/** El periodo que ocupa el plan en el calendario, ya anclado. Null si va vacío. */
export function rangoDePlan(plan: PlanMeta): { ini: string; fin: string } | null {
  const dias = diasDePlan(plan.nodos)
  if (dias === 0) return null
  return { ini: plan.inicioISO, fin: isoMasDias(plan.inicioISO, dias - 1) }
}

export interface FilaPlan {
  nodo: NodoPlan
  profundidad: number
  rango: { ini: string; fin: string }
}

/**
 * Los nodos del plan en el orden en que se pintan, ya con fechas de calendario.
 * Es el gemelo de `filasVisibles` para lo propuesto: un plan no se pliega ni se
 * filtra (es una propuesta entera o nada), así que no necesita `plegados`.
 */
export function filasPlan(plan: PlanMeta): FilaPlan[] {
  const salida: FilaPlan[] = []
  const bajar = (padre: number | undefined, profundidad: number) => {
    const hijos = plan.nodos
      .filter((n) => n.padre === padre)
      .sort((a, b) => a.ini - b.ini || a.id - b.id)
    for (const n of hijos) {
      salida.push({
        nodo: n,
        profundidad,
        rango: { ini: isoMasDias(plan.inicioISO, n.ini), fin: isoMasDias(plan.inicioISO, n.fin) },
      })
      bajar(n.id, profundidad + 1)
    }
  }
  bajar(undefined, 0)
  return salida
}

/** Corre el plan entero a otro arranque: los días son relativos, no hay que regenerar. */
export async function reanclarPlan(plan: PlanMeta, inicioISO: string): Promise<void> {
  if (plan.id == null || !inicioISO) return
  await planesMetaRepo.update(plan.id, { inicioISO })
}

/** Siguiente etiqueta libre de una meta: Plan A, B… y de la Z en adelante, número. */
export function siguienteNombrePlan(
  planes: PlanMeta[],
  metaId: number,
  etiqueta: (letra: string) => string,
): string {
  const n = planes.filter((p) => p.metaId === metaId).length
  return etiqueta(n < 26 ? String.fromCharCode(65 + n) : String(n + 1))
}

/**
 * Pasa el plan al cronograma real: cada nodo nace como sub-meta con su periodo
 * puesto — los del primer nivel cuelgan de la meta origen, los hijos de la sub-meta
 * que nació de su padre. Lo que la meta ya tuviera se conserva. Devuelve cuántas
 * metas creó (0 si la meta ya no existe o el plan ya se aceptó).
 *
 * Secuencial a la fuerza: cada hija necesita el id que devuelve `crearMeta` para su
 * madre. Y `vivas` no puede quedarse en la foto que llegó por props — `crearMeta`
 * renumera hermanas leyendo esa lista y `useLiveQuery` todavía no repintó, así que
 * sin ir espejando cada alta las fases saldrían todas con `orden: 0`.
 *
 * El color se pide como callback: `metas.ts` ya decidió que el núcleo no importa la
 * paleta de UI, y este módulo respeta lo mismo.
 */
export async function aceptarPlan(
  metas: Rutina[],
  plan: PlanMeta,
  origen: Rutina,
  colorDeProfundidad: (profundidad: number) => string,
): Promise<number> {
  if (plan.id == null || plan.aceptadoEn) return 0

  let vivas = metas
  let creadas = 0

  const bajar = async (padreLocal: number | undefined, padre: Rutina, profundidad: number) => {
    // Del último al primero: `crearMeta` mete cada nueva al INICIO de sus hermanas
    // y empuja al resto, así que crearlas en el orden del plan las dejaría al revés
    // en la lista (la primera fase abajo del todo).
    const hijos = plan.nodos
      .filter((n) => n.padre === padreLocal)
      .sort((a, b) => a.ini - b.ini || a.id - b.id)
      .reverse()
    for (const n of hijos) {
      const nueva = await crearMeta(vivas, n.nombre, padre, colorDeProfundidad(profundidad))
      if (!nueva) continue
      // Espejo de lo que `crearMeta` acaba de escribir: renumera igual que ella.
      const orden = new Map(hijasDe(vivas, padre.id).map((r, i) => [r.id, i + 1]))
      vivas = [...vivas.map((r) => (orden.has(r.id) ? { ...r, orden: orden.get(r.id)! } : r)), nueva]
      creadas++
      await ponerPeriodo(nueva, isoMasDias(plan.inicioISO, n.ini), isoMasDias(plan.inicioISO, n.fin))
      await bajar(n.id, nueva, profundidad + 1)
    }
  }

  await bajar(undefined, origen, 0)
  await planesMetaRepo.update(plan.id, { aceptadoEn: new Date().toISOString() })
  return creadas
}
