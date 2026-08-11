import type { BloqueDef, PlantillaCustom, SeccionDef } from './data/db'

/**
 * Menús (pestañas) de una plantilla personalizada. Todo es opcional: una
 * plantilla sin secciones es UNA sola pantalla con todos sus bloques, como
 * siempre. Lo usan el editor, la app genérica y el store.
 */

/** Menús de primer nivel, en orden. Vacío ⇒ la plantilla no usa menús. */
export function menusRaiz(secciones?: SeccionDef[]): SeccionDef[] {
  const ss = secciones ?? []
  // Un submenú cuyo padre ya no existe (o que colgaba de otro submenú) sube a
  // raíz: así ningún menú se queda inalcanzable si llega una fila rara del sync.
  return ss.filter((s) => !s.padreId || !ss.some((p) => p.id === s.padreId && !p.padreId))
}

/** Submenús que cuelgan de un menú, en orden. */
export function submenusDe(secciones: SeccionDef[] | undefined, padreId: string): SeccionDef[] {
  return (secciones ?? []).filter((s) => s.padreId === padreId)
}

/** Ids seleccionables (raíces + submenús): lo que se le pasa a `tabInicial`. */
export function idsSeccion(def: PlantillaCustom): string[] {
  return (def.secciones ?? []).map((s) => s.id)
}

/** Menú efectivo de un bloque: el suyo si sigue vivo, si no el primero. */
function menuDe(def: PlantillaCustom, bloque: BloqueDef, raices: SeccionDef[]): string {
  const vivas = def.secciones ?? []
  return bloque.seccionId && vivas.some((s) => s.id === bloque.seccionId) ? bloque.seccionId : raices[0].id
}

/** Menú raíz al que pertenece un id (él mismo si ya es raíz). */
export function raizDe(def: PlantillaCustom, id: string): string {
  const raices = menusRaiz(def.secciones)
  if (raices.some((r) => r.id === id)) return id
  const s = (def.secciones ?? []).find((x) => x.id === id)
  return (s?.padreId && raices.some((r) => r.id === s.padreId) ? s.padreId : raices[0]?.id) ?? ''
}

/**
 * Riel de abajo de un menú: sus submenús, precedidos por el menú mismo solo si
 * le quedaron bloques sueltos (así no hace falta inventar una pestaña «General»
 * ni se esconde nunca un bloque). `[]` si el menú no tiene submenús.
 */
export function pestanasSub(def: PlantillaCustom, raizId: string): SeccionDef[] {
  const subs = submenusDe(def.secciones, raizId)
  if (subs.length === 0) return []
  const propio = (def.secciones ?? []).find((s) => s.id === raizId)
  const raices = menusRaiz(def.secciones)
  const conBloques = def.bloques.some((b) => menuDe(def, b, raices) === raizId)
  return propio && conBloques ? [propio, ...subs] : subs
}

/** Repara la selección: id muerto ⇒ primer menú; menú sin bloques propios ⇒ su primer submenú. */
export function seccionActiva(def: PlantillaCustom, deseada: string): string {
  const raices = menusRaiz(def.secciones)
  if (raices.length === 0) return ''
  const id = (def.secciones ?? []).some((s) => s.id === deseada) ? deseada : raices[0].id
  const subs = pestanasSub(def, id)
  return subs.length > 0 && !subs.some((s) => s.id === id) ? subs[0].id : id
}

/** Bloques visibles con esa selección. Sin menús devuelve TODOS (plantillas de antes). */
export function bloquesDe(def: PlantillaCustom, activa: string): BloqueDef[] {
  const raices = menusRaiz(def.secciones)
  if (raices.length === 0) return def.bloques
  return def.bloques.filter((b) => menuDe(def, b, raices) === activa)
}

/** Id nuevo de sección/bloque. Sufijo aleatorio: dos clics en el mismo ms no deben repetirlo. */
export function nuevoId(prefijo: 's' | 'b'): string {
  return `${prefijo}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
}

/**
 * Estructura de una plantilla sin su identidad. Las dos operaciones de abajo
 * tocan menús Y bloques a la vez, así que las comparten el editor del catálogo
 * y la edición en el sitio: si divergieran, una de las dos perdería bloques.
 */
export interface DatosPlantilla {
  secciones: SeccionDef[]
  bloques: BloqueDef[]
}

/** Menú nuevo. El PRIMERO se lleva los bloques que ya había (si no, quedarían fuera). */
export function conSeccionNueva(
  d: DatosPlantilla,
  nombre: string,
  padreId?: string,
): DatosPlantilla & { id: string } {
  const id = nuevoId('s')
  const primero = !padreId && menusRaiz(d.secciones).length === 0
  return {
    id,
    secciones: [...d.secciones, { id, nombre, padreId }],
    bloques: primero ? d.bloques.map((b) => ({ ...b, seccionId: id })) : d.bloques,
  }
}

/** Quita un menú con sus submenús. NO borra bloques: se mudan al padre o al primer menú. */
export function sinSeccion(d: DatosPlantilla, id: string): DatosPlantilla {
  const s = d.secciones.find((x) => x.id === id)
  const fuera = new Set([id, ...submenusDe(d.secciones, id).map((x) => x.id)])
  const secciones = d.secciones.filter((x) => !fuera.has(x.id))
  const destino = s?.padreId ?? menusRaiz(secciones)[0]?.id
  return {
    secciones,
    bloques: d.bloques.map((b) => (b.seccionId && fuera.has(b.seccionId) ? { ...b, seccionId: destino } : b)),
  }
}
