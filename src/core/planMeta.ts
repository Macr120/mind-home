import type { EnlaceApp, PlanMeta, NodoPlan, Rutina } from './data/db'
import { planesMetaRepo, rutinasRepo } from './data/repository'
import { DIA_MS, deIso, isoMasDias } from './fechaLocal'
import {
  crearMeta,
  descendientes,
  esMeta,
  hijasDe,
  ponerPeriodo,
  progresoDe,
  resumenAlcance,
  toggleMeta,
} from './metas'
import type { NodoPropuesto } from './planIA'

/**
 * Los planes: cronogramas ALTERNATIVOS de una meta. Viven aparte de las metas
 * reales hasta que se aceptan — mientras tanto se pintan superpuestos sobre el
 * mismo eje para poder compararlos.
 *
 * Nada de aquí lanza: son datos ya validados por `planIA.ts` o escritos por el
 * usuario.
 */

/**
 * Aplana el árbol anidado de la IA a la forma plana que se guarda (id/padre). El
 * orden del array ES el orden del plan: se conserva tal cual lo propuso el modelo y
 * es lo que luego reordena el usuario arrastrando.
 *
 * `conFechas` en false tira los días propuestos: es el modo «sin plazo», donde lo
 * que se quiere de la IA es el guion, no el calendario.
 */
export function aplanar(nodos: NodoPropuesto[], conFechas = true): NodoPlan[] {
  const salida: NodoPlan[] = []
  let siguiente = 1
  const bajar = (lista: NodoPropuesto[], padre?: number) => {
    for (const n of lista) {
      const id = siguiente++
      salida.push({
        id,
        padre,
        nombre: n.nombre,
        ini: conFechas ? n.ini : undefined,
        fin: conFechas ? n.fin : undefined,
        enlaceApp: n.enlaceApp,
      })
      bajar(n.hijos, id)
    }
  }
  bajar(nodos)
  return salida
}

/** Los nodos que ya tienen periodo, con sus días garantizados. */
const fechados = (nodos: NodoPlan[]) =>
  nodos.filter((n): n is NodoPlan & { ini: number; fin: number } => n.ini != null && n.fin != null)

/** ¿Tiene ya un periodo puesto? Los dos días van juntos o no van. */
export const nodoFechado = (n: NodoPlan): n is NodoPlan & { ini: number; fin: number } =>
  n.ini != null && n.fin != null

/** Cuántos días abarca el plan, del día 0 al último ocupado. Los sin fechar no cuentan. */
export function diasDePlan(nodos: NodoPlan[]) {
  const conFecha = fechados(nodos)
  return conFecha.length === 0 ? 0 : Math.max(...conFecha.map((n) => n.fin)) + 1
}

/**
 * El periodo que ocupa el plan en el calendario, ya anclado. Null mientras no haya
 * ni un nodo fechado: entonces el plan es una lista ordenada y nada más.
 */
export function rangoDePlan(plan: PlanMeta): { ini: string; fin: string } | null {
  const dias = diasDePlan(plan.nodos)
  if (dias === 0) return null
  return { ini: plan.inicioISO, fin: isoMasDias(plan.inicioISO, dias - 1) }
}

export interface FilaPlan {
  nodo: NodoPlan
  profundidad: number
  /** Sin valor mientras el nodo no tenga fechas: entonces su franja está para trazar. */
  rango?: { ini: string; fin: string }
}

/**
 * Los nodos del plan en el orden en que se pintan, ya con fechas de calendario.
 * Es el gemelo de `filasVisibles` para lo propuesto: un plan no se pliega ni se
 * filtra (es una propuesta entera o nada), así que no necesita `plegados`.
 *
 * El orden es el del array, no el de las fechas: el usuario lo reordena arrastrando
 * (`reordenarNodoPlan`) y un plan a medio fechar no tendría por dónde ordenarse.
 */
export function filasPlan(plan: PlanMeta): FilaPlan[] {
  const salida: FilaPlan[] = []
  const bajar = (padre: number | undefined, profundidad: number) => {
    for (const n of plan.nodos.filter((x) => x.padre === padre)) {
      salida.push({ nodo: n, profundidad, rango: rangoDeNodo(plan, n) })
      bajar(n.id, profundidad + 1)
    }
  }
  bajar(undefined, 0)
  return salida
}

/** El periodo de un nodo en fechas de calendario; null si todavía no lo tiene. */
export function rangoDeNodo(plan: PlanMeta, nodo: NodoPlan): { ini: string; fin: string } | undefined {
  if (!nodoFechado(nodo)) return undefined
  return { ini: isoMasDias(plan.inicioISO, nodo.ini), fin: isoMasDias(plan.inicioISO, nodo.fin) }
}

/**
 * ¿Este nodo se sale del periodo de la fase de la que cuelga? Es un AVISO, no un
 * error: el plan se guarda igual — solo se marca para que no pase inadvertido.
 * Sin padre, o con alguno de los dos sin fechar, no hay nada que contrastar.
 */
export function nodoIncoherente(plan: PlanMeta, nodo: NodoPlan): boolean {
  const padre = plan.nodos.find((n) => n.id === nodo.padre)
  if (!padre || !nodoFechado(nodo) || !nodoFechado(padre)) return false
  return nodo.ini < padre.ini || nodo.fin > padre.fin
}

/** Corre el plan entero a otro arranque: los días son relativos, no hay que regenerar. */
export async function reanclarPlan(plan: PlanMeta, inicioISO: string): Promise<void> {
  if (plan.id == null || !inicioISO) return
  await planesMetaRepo.update(plan.id, { inicioISO })
}

/** Ids de toda la descendencia de un nodo dentro del plan. */
function descendientesPlan(nodos: NodoPlan[], id: number): Set<number> {
  const salida = new Set<number>()
  const bajar = (padre: number) => {
    for (const n of nodos)
      if (n.padre === padre && !salida.has(n.id)) {
        salida.add(n.id)
        bajar(n.id)
      }
  }
  bajar(id)
  return salida
}

// Edición de la propuesta: el plan es personalizable mientras no se acepte. Los
// días son relativos a `inicioISO`, así que tocar un nodo no descuadra a los demás.

export async function renombrarNodoPlan(plan: PlanMeta, nodoId: number, nombre: string): Promise<void> {
  if (plan.id == null || !nombre.trim()) return
  const nodos = plan.nodos.map((n) => (n.id === nodoId ? { ...n, nombre: nombre.trim() } : n))
  await planesMetaRepo.update(plan.id, { nodos })
}

/**
 * Mueve un nodo a otro periodo (días relativos al arranque). Una fase ya fechada
 * arrastra a su descendencia fechada con el mismo corrimiento de inicio, para que
 * siga dentro de ella; a un nodo que aún no tenía fechas solo se le ponen.
 */
export async function moverNodoPlan(plan: PlanMeta, nodoId: number, ini: number, fin: number): Promise<void> {
  if (plan.id == null) return
  const objetivo = plan.nodos.find((n) => n.id === nodoId)
  if (!objetivo) return
  const ini2 = Math.max(0, Math.round(ini))
  const fin2 = Math.max(ini2, Math.round(fin))
  const delta = nodoFechado(objetivo) ? ini2 - objetivo.ini : 0
  const abajo = descendientesPlan(plan.nodos, nodoId)
  const nodos = plan.nodos.map((n) => {
    if (n.id === nodoId) return { ...n, ini: ini2, fin: fin2 }
    if (delta !== 0 && abajo.has(n.id) && nodoFechado(n))
      return { ...n, ini: Math.max(0, n.ini + delta), fin: Math.max(0, n.fin + delta) }
    return n
  })
  await planesMetaRepo.update(plan.id, { nodos })
}

/**
 * Le pone fechas de calendario a un nodo: es lo que escribe el trazo sobre el eje y
 * los dos inputs de la hoja. Los días se guardan relativos al arranque del plan.
 *
 * Fechar por delante del arranque no es un error — es lo normal cuando la primera
 * fase se traza a la izquierda: el plan se reancla a ese día y los demás nodos se
 * corren con él, que para eso sus días son relativos.
 */
export async function fecharNodoPlan(
  plan: PlanMeta,
  nodoId: number,
  iniISO: string,
  finISO: string,
): Promise<void> {
  if (plan.id == null || !iniISO || !finISO) return
  const [a, b] = iniISO <= finISO ? [iniISO, finISO] : [finISO, iniISO]
  const dia = (iso: string) => Math.round((deIso(iso).getTime() - deIso(plan.inicioISO).getTime()) / DIA_MS)
  const ini = dia(a)
  const corrimiento = ini < 0 ? -ini : 0
  const nodos = plan.nodos.map((n) => {
    if (n.id === nodoId) return { ...n, ini: ini + corrimiento, fin: dia(b) + corrimiento }
    if (!nodoFechado(n)) return n
    return { ...n, ini: n.ini + corrimiento, fin: n.fin + corrimiento }
  })
  await planesMetaRepo.update(plan.id, { nodos, inicioISO: corrimiento > 0 ? a : plan.inicioISO })
}

/** Le quita el periodo a un nodo: vuelve a la lista, sin barra en el eje. */
export async function quitarFechasNodoPlan(plan: PlanMeta, nodoId: number): Promise<void> {
  if (plan.id == null) return
  const nodos = plan.nodos.map((n) =>
    n.id === nodoId
      ? { id: n.id, padre: n.padre, nombre: n.nombre, metaRealId: n.metaRealId, enlaceApp: n.enlaceApp }
      : n,
  )
  await planesMetaRepo.update(plan.id, { nodos })
}

/**
 * Recoloca un nodo arrastrándolo en la lista: `dentro` lo cuelga de la fase destino,
 * si no queda como hermano justo antes de ella. El orden del array ES el del plan.
 *
 * Se mueve solo el nodo, no su descendencia: los hijos cuelgan por `padre`, así que
 * siguen a su madre a donde vaya. Dos niveles como mucho, igual que lo que propone
 * la IA — una sub-meta no cuelga de otra sub-meta.
 */
export async function reordenarNodoPlan(
  plan: PlanMeta,
  nodoId: number,
  destinoId: number,
  dentro: boolean,
): Promise<void> {
  if (plan.id == null || nodoId === destinoId) return
  const nodo = plan.nodos.find((n) => n.id === nodoId)
  const destino = plan.nodos.find((n) => n.id === destinoId)
  if (!nodo || !destino) return
  if (descendientesPlan(plan.nodos, nodoId).has(destinoId)) return

  const padre = dentro ? destino.id : destino.padre
  if (padre != null) {
    // Una fase con sub-metas no se mete dentro de otra, y nada cuelga de una sub-meta.
    if (plan.nodos.some((n) => n.padre === nodoId)) return
    if (plan.nodos.find((n) => n.id === padre)?.padre != null) return
  }

  const resto = plan.nodos.filter((n) => n.id !== nodoId)
  const iDestino = resto.findIndex((n) => n.id === destinoId)
  let at = iDestino
  if (dentro) {
    // Al final de las que ya cuelgan de esa fase.
    at = iDestino + 1
    for (let i = resto.length - 1; i > iDestino; i--)
      if (resto[i].padre === destino.id) {
        at = i + 1
        break
      }
  }
  const nodos = [...resto]
  nodos.splice(at, 0, { ...nodo, padre })
  await planesMetaRepo.update(plan.id, { nodos })
}

/**
 * Enlaza (o desenlaza, con `undefined`) un nodo con la app donde ese paso se
 * registra. Si el plan ya se aceptó, el nodo es un espejo: lo que manda es la
 * sub-meta real, así que el enlace se escribe ahí (ver `enlazarMeta` en metas.ts).
 */
export async function enlazarNodoPlan(
  plan: PlanMeta,
  nodoId: number,
  enlace: EnlaceApp | undefined,
): Promise<void> {
  if (plan.id == null) return
  const nodos = plan.nodos.map((n) => (n.id === nodoId ? { ...n, enlaceApp: enlace } : n))
  await planesMetaRepo.update(plan.id, { nodos })
}

/** Quita un nodo de la propuesta, con toda su descendencia. */
export async function borrarNodoPlan(plan: PlanMeta, nodoId: number): Promise<void> {
  if (plan.id == null) return
  const fuera = descendientesPlan(plan.nodos, nodoId)
  fuera.add(nodoId)
  await planesMetaRepo.update(plan.id, { nodos: plan.nodos.filter((n) => !fuera.has(n.id)) })
}

/**
 * Nodo nuevo colgado de una fase (o fase nueva sin padre). Nace SIN FECHAS: heredar
 * el periodo del padre las inventaba, y lo que se quiere es escribir primero el
 * guion y repartir el calendario después, arrastrando. Se coloca al final de sus
 * hermanos, que es donde se acaba de escribir.
 */
export async function agregarNodoPlan(
  plan: PlanMeta,
  padreId: number | undefined,
  nombre: string,
): Promise<void> {
  if (plan.id == null || !nombre.trim()) return
  const padre = plan.nodos.find((n) => n.id === padreId)
  const id = Math.max(0, ...plan.nodos.map((n) => n.id)) + 1
  const nuevo: NodoPlan = { id, padre: padre?.id, nombre: nombre.trim() }
  const nodos = [...plan.nodos]
  // Detrás de la última hermana; sin madre, al final del plan.
  let at = nodos.length
  if (padre) {
    at = nodos.findIndex((n) => n.id === padre.id) + 1
    for (let i = nodos.length - 1; i >= at; i--)
      if (nodos[i].padre === padre.id) {
        at = i + 1
        break
      }
  }
  nodos.splice(at, 0, nuevo)
  await planesMetaRepo.update(plan.id, { nodos })
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

// ---------- La meta origen y el amarre con lo real ----------

/**
 * La meta para la que se propuso el plan, leída de la BD y NO de la lista de quien
 * pregunta: esa viene filtrada a una app o al filtro del calendario, y el origen
 * puede no estar en ella. Devuelve además todas las metas vivas, que es lo que hay
 * que pasarle a `aceptarPlan` — con una foto incompleta, `crearMeta` renumeraría
 * hermanas que no ve y `raizDe`/`profundidadDe` mentirían sobre color y nivel.
 */
export async function origenDePlan(plan: PlanMeta): Promise<{ metas: Rutina[]; origen?: Rutina }> {
  const metas = (await rutinasRepo.list()).filter(esMeta)
  return { metas, origen: metas.find((m) => m.id === plan.metaId) }
}

/**
 * Qué sub-meta real le corresponde a cada nodo, para un plan ya aceptado. Vacío
 * mientras es propuesta: entonces no hay nada real que espejar.
 *
 * `metaRealId` es la vía rápida, pero no se cree a ciegas — puede venir de otro
 * dispositivo (el sync no traduce ids anidados) o apuntar a una meta que el usuario
 * borró. Se acepta solo si la fila existe, es meta y cuelga de la meta origen; si
 * no, se empareja por nombre entre las hijas del espejo de su padre, que es el
 * invariante que deja `aceptarPlan`. Sin coincidencia, el nodo se queda sin espejo
 * y sigue usando su propia paloma en vez de quedarse muerto.
 */
export function espejoDePlan(plan: PlanMeta, metas: Rutina[]): Map<number, Rutina> {
  const espejo = new Map<number, Rutina>()
  const origen = metas.find((m) => m.id === plan.metaId)
  if (!plan.aceptadoEn || !origen) return espejo

  const rama = new Set(descendientes(metas, plan.metaId).map((r) => r.id))
  const porId = new Map(metas.map((r) => [r.id, r]))
  // Dos nodos hermanos pueden llamarse igual: sin esto se quedarían con la misma meta.
  const usadas = new Set<number>()

  const bajar = (padreLocal: number | undefined, madre: Rutina) => {
    const hijas = hijasDe(metas, madre.id)
    for (const n of plan.nodos.filter((x) => x.padre === padreLocal)) {
      const directo = n.metaRealId != null ? porId.get(n.metaRealId) : undefined
      const real =
        directo?.id != null && esMeta(directo) && rama.has(directo.id) && !usadas.has(directo.id)
          ? directo
          : hijas.find((h) => h.nombre === n.nombre && h.id != null && !usadas.has(h.id))
      if (real?.id == null) continue
      usadas.add(real.id)
      espejo.set(n.id, real)
      bajar(n.id, real)
    }
  }
  bajar(undefined, origen)
  return espejo
}

// ---------- Progreso de la hoja ----------
//
// Misma recursión que `progresoDe` de `metas.ts`, para que la hoja y el cronograma
// se lean igual. Con espejo se delega en ella tal cual: una vez aceptado el plan la
// única verdad es el avance de las metas reales, la hoja no lleva cuenta aparte.

/** Cuánto lleva hecho un nodo, de 0 a 1. */
export function progresoNodo(
  plan: PlanMeta,
  nodo: NodoPlan,
  espejo: Map<number, Rutina>,
  metas: Rutina[],
): number {
  const real = espejo.get(nodo.id)
  if (real) return progresoDe(metas, real)
  if (plan.hechos?.includes(nodo.id)) return 1
  const hijos = plan.nodos.filter((n) => n.padre === nodo.id)
  if (hijos.length === 0) return 0
  return hijos.reduce((s, h) => s + progresoNodo(plan, h, espejo, metas), 0) / hijos.length
}

/** ¿Se pinta palomeado? Una fase lo está también si toda su descendencia lo está. */
export const nodoHecho = (plan: PlanMeta, nodo: NodoPlan, espejo: Map<number, Rutina>, metas: Rutina[]) =>
  progresoNodo(plan, nodo, espejo, metas) === 1

/** Avance del plan entero: promedio de sus fases (los nodos del primer nivel). */
export function progresoPlan(plan: PlanMeta, espejo: Map<number, Rutina>, metas: Rutina[]): number {
  const fases = plan.nodos.filter((n) => n.padre === undefined)
  if (fases.length === 0) return 0
  return fases.reduce((s, n) => s + progresoNodo(plan, n, espejo, metas), 0) / fases.length
}

/** Sub-metas directas completas de un nodo, en enteros ("2/5"). */
export function resumenNodo(
  plan: PlanMeta,
  nodo: NodoPlan,
  espejo: Map<number, Rutina>,
  metas: Rutina[],
): { hechos: number; total: number } {
  const real = espejo.get(nodo.id)
  if (real) return resumenAlcance(metas, real)
  const hijos = plan.nodos.filter((n) => n.padre === nodo.id)
  return { hechos: hijos.filter((h) => nodoHecho(plan, h, espejo, metas)).length, total: hijos.length }
}

/**
 * Nodos completos del plan entero, contando TODOS (fases y sub-metas). Una fracción
 * sobre las fases sueltas se lee mal: un plan de tres fases marcaría "0/3" con media
 * docena de tareas ya hechas.
 */
export function resumenPlan(
  plan: PlanMeta,
  espejo: Map<number, Rutina>,
  metas: Rutina[],
): { hechos: number; total: number } {
  return {
    hechos: plan.nodos.filter((n) => nodoHecho(plan, n, espejo, metas)).length,
    total: plan.nodos.length,
  }
}

/** Palomea un nodo: la sub-meta real si ya se aceptó el plan, la propuesta si no. */
export async function toggleNodoPlan(
  plan: PlanMeta,
  nodo: NodoPlan,
  espejo: Map<number, Rutina>,
): Promise<void> {
  const real = espejo.get(nodo.id)
  if (real) return toggleMeta(real)
  if (plan.id == null) return
  const hechos = new Set(plan.hechos ?? [])
  if (hechos.has(nodo.id)) hechos.delete(nodo.id)
  else hechos.add(nodo.id)
  await planesMetaRepo.update(plan.id, { hechos: [...hechos] })
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
  // Nodo → sub-meta que nació de él. Es lo que luego deja a la hoja del plan leer el
  // avance REAL en vez de llevar su propia cuenta (ver `espejoDePlan`).
  const amarres = new Map<number, number>()
  const palomeados = new Set(plan.hechos ?? [])

  const bajar = async (padreLocal: number | undefined, padre: Rutina, profundidad: number) => {
    // Del último al primero: `crearMeta` mete cada nueva al INICIO de sus hermanas
    // y empuja al resto, así que crearlas en el orden del plan las dejaría al revés
    // en la lista (la primera fase abajo del todo).
    // En el orden del plan, del último al primero (ver el porqué arriba).
    const hijos = plan.nodos.filter((n) => n.padre === padreLocal).reverse()
    for (const n of hijos) {
      const nueva = await crearMeta(vivas, n.nombre, padre, colorDeProfundidad(profundidad))
      if (!nueva) continue
      // Espejo de lo que `crearMeta` acaba de escribir: renumera igual que ella.
      const orden = new Map(hijasDe(vivas, padre.id).map((r, i) => [r.id, i + 1]))
      vivas = [...vivas.map((r) => (orden.has(r.id) ? { ...r, orden: orden.get(r.id)! } : r)), nueva]
      creadas++
      if (nueva.id != null) amarres.set(n.id, nueva.id)
      // Solo lo que se fechó: lo demás nace suelto y se fecha ya como meta real, con
      // el mismo gesto sobre el eje.
      const rango = rangoDeNodo(plan, n)
      if (rango) await ponerPeriodo(nueva, rango.ini, rango.fin)
      // Lo que ya se palomeó en la hoja no se pierde al pasar a lo real, y el chip
      // de app del nodo se hereda: la sub-meta sigue sabiendo dónde se registra.
      const heredado: Partial<Rutina> = {}
      if (palomeados.has(n.id)) heredado.completada = true
      if (n.enlaceApp) heredado.enlaceApp = n.enlaceApp
      if (nueva.id != null && Object.keys(heredado).length > 0)
        await rutinasRepo.update(nueva.id, heredado)
      await bajar(n.id, nueva, profundidad + 1)
    }
  }

  await bajar(undefined, origen, 0)
  await planesMetaRepo.update(plan.id, {
    aceptadoEn: new Date().toISOString(),
    nodos: plan.nodos.map((n) => ({ ...n, metaRealId: amarres.get(n.id) ?? n.metaRealId })),
  })
  return creadas
}
