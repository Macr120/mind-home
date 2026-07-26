import type { Alcance, PasoRutina, Rutina } from './data/db'
import { borrarPlanesDeMetas, rutinasRepo } from './data/repository'
import { DIA_MS } from './fechaLocal'

/**
 * Metas del calendario: UNA lista. Cualquier meta puede contener sub-metas, a la
 * profundidad que haga falta, y cada una lleva sus propias fechas.
 *
 * No hay peldaños ni plazos. Antes una meta tenía que declarar su granularidad
 * (año → mes → semana → día → hora) y solo admitía hijas del escalón siguiente:
 * eso obligaba a decidir la forma del árbol antes de saber qué se quería hacer, y
 * cada regla de "aquí no cabe" era una pelea con el usuario. La jerarquía que
 * queda es la única que importa — una meta cuelga de otra — y la granularidad se
 * lee de las fechas, que es donde ya estaba.
 *
 * Sincronía con el calendario: la fecha manda. Con `fechaInicio` la meta ocupa su
 * periodo en la rejilla; sin fecha vive solo en la lista. No hay que agendarla a
 * mano ni existe un estado "suelta" que contradiga a las fechas.
 */

/** Cuántos días ocupa un rango, contando los dos extremos. */
const diasDelRango = (ini: string, fin: string) =>
  Math.round((new Date(fin + 'T12:00').getTime() - new Date(ini + 'T12:00').getTime()) / DIA_MS) + 1

/** ¿Vive en la lista de Metas? */
export function esMeta(r: Rutina): boolean {
  return r.esMeta === true
}

/** ¿Ocupa un sitio en el calendario? La fecha lo decide; no hay bandera aparte. */
export function agendada(r: Rutina): boolean {
  return !!r.fechaInicio
}

/**
 * Capa con la que pinta en el calendario. En una meta se DERIVA: con hora fija es
 * un evento puntual ('hora'), y sin ella la duración manda — hasta un día pinta
 * como día, hasta una semana como semana, hasta un mes como mes, y de ahí para
 * arriba como año. Así el fondo del calendario sigue teniendo su jerarquía (lo
 * amplio atrás, lo puntual al frente) sin pedirle al usuario que la declare.
 *
 * Las rutinas normales conservan el campo de siempre.
 */
export function alcanceDe(r: Rutina): Alcance {
  if (!esMeta(r)) return r.alcance ?? 'dia'
  if (r.hora) return 'hora'
  if (!r.fechaInicio) return 'dia'
  const dias = diasDelRango(r.fechaInicio, r.fechaFin ?? r.fechaInicio)
  if (dias <= 1) return 'dia'
  if (dias <= 7) return 'semana'
  if (dias <= 31) return 'mes'
  return 'anio'
}

export const aMin = (hhmm: string) => parseInt(hhmm.slice(0, 2)) * 60 + parseInt(hhmm.slice(3, 5))

/** Envuelve en 24 h: los bloques que cruzan medianoche manejan minutos > 1440. */
export const aHHMM = (min: number) => {
  const m = ((Math.round(min) % 1440) + 1440) % 1440
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
}

/** Minutos que dura el bloque; sin `horaFin` el calendario ya asume una hora. */
export function duracionMin(r: Rutina): number {
  if (!r.hora || !r.horaFin) return 60
  const d = aMin(r.horaFin) - aMin(r.hora)
  return d > 0 ? d : d + 1440
}

/** Fija inicio y duración; `horaFin` se recalcula siempre a partir de los dos. */
export async function ponerHorario(id: number, hora: string, minutos: number): Promise<void> {
  await rutinasRepo.update(id, { hora, horaFin: aHHMM(aMin(hora) + Math.max(5, minutos)) })
}

/** Quita la hora fija: la meta vuelve a ocupar sus días completos. */
export async function quitarHorario(id: number): Promise<void> {
  await rutinasRepo.update(id, { hora: undefined, horaFin: undefined })
}

/** Sub-metas directas, en su orden. */
export function hijasDe(metas: Rutina[], padreId: number | undefined): Rutina[] {
  return metas
    .filter((r) => r.padreId === padreId)
    .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0) || a.creadoEn.localeCompare(b.creadoEn))
}

/** Las metas del primer nivel de la lista. */
export function raices(metas: Rutina[]): Rutina[] {
  return hijasDe(metas, undefined)
}

/** Cuántas madres tiene encima: 0 si es raíz. */
export function profundidadDe(metas: Rutina[], r: Rutina): number {
  let n = 0
  let actual = r
  while (actual.padreId != null) {
    const padre = metas.find((m) => m.id === actual.padreId)
    if (!padre) break
    actual = padre
    n++
  }
  return n
}

/**
 * El ancestro sin padre que encabeza la rama de `r` (ella misma, si ya es raíz).
 * Es "el color principal" de la familia: las sub-metas degradan a partir de este,
 * no del padre inmediato, para que toda la rama comparta un mismo tono sin ir
 * perdiendo saturación de nivel en nivel.
 */
export function raizDe(metas: Rutina[], r: Rutina): Rutina {
  let actual = r
  while (actual.padreId != null) {
    const padre = metas.find((m) => m.id === actual.padreId)
    if (!padre) break
    actual = padre
  }
  return actual
}

/** Una meta ya aplanada: a qué profundidad cuelga. */
export interface FilaArbol {
  meta: Rutina
  profundidad: number
}

/** Cómo se filtra la lista desde la barra de herramientas. */
export interface FiltroMetas {
  /** Deja fuera las completadas (y las ramas que solo contienen completadas). */
  ocultarHechas?: boolean
  /** Texto libre contra el nombre y la nota. */
  busca?: string
}

function coincide(r: Rutina, filtro: FiltroMetas): boolean {
  if (filtro.ocultarHechas && r.completada) return false
  const q = filtro.busca?.trim().toLowerCase()
  if (!q) return true
  return r.nombre.toLowerCase().includes(q) || (r.nota ?? '').toLowerCase().includes(q)
}

/**
 * Las metas visibles, en el orden exacto en que se pintan. La lista y las barras
 * del cronograma comparten esta función: es lo que mantiene sus filas alineadas.
 * `plegados` lleva los ids cerrados a mano; sin entrada, la meta va abierta.
 *
 * Una meta que no coincide con el filtro se queda si alguna de sus descendientes
 * sí coincide — si no, buscar escondería la rama entera y el resultado no se
 * podría ni ver. Por eso el recorrido devuelve si hubo acierto abajo.
 */
export function filasVisibles(
  metas: Rutina[],
  plegados: Set<number>,
  filtro: FiltroMetas = {},
): FilaArbol[] {
  const salida: FilaArbol[] = []
  const bajar = (meta: Rutina, profundidad: number): boolean => {
    const marca = salida.length
    salida.push({ meta, profundidad })
    const abierta = meta.id != null && !plegados.has(meta.id)
    let hijaVisible = false
    if (abierta) {
      for (const hija of hijasDe(metas, meta.id)) hijaVisible = bajar(hija, profundidad + 1) || hijaVisible
    }
    // Ni ella ni su descendencia pasan el filtro: se retira, y con ella lo que ya
    // hubieran empujado sus hijas.
    if (!hijaVisible && !coincide(meta, filtro)) {
      salida.length = marca
      return false
    }
    return true
  }
  for (const raiz of raices(metas)) bajar(raiz, 0)
  return salida
}

/** Toda la descendencia de una meta (para borrarla, o para saber si tiene hijas). */
export function descendientes(metas: Rutina[], id: number): Rutina[] {
  const salida: Rutina[] = []
  const pila = [id]
  while (pila.length > 0) {
    const padre = pila.pop()
    for (const hija of metas.filter((r) => r.padreId === padre)) {
      salida.push(hija)
      if (hija.id != null) pila.push(hija.id)
    }
  }
  return salida
}

/**
 * ¿Se puede meter `mueve` dentro de `destino`? Lo único imposible es el ciclo:
 * una meta no puede colgar de sí misma ni de su propia descendencia (se llevaría
 * la rama entera fuera de la lista y quedaría flotando sin raíz).
 */
export function puedeSoltarEn(metas: Rutina[], mueve: Rutina, destino: Rutina): boolean {
  if (mueve.id == null || mueve.id === destino.id) return false
  return !descendientes(metas, mueve.id).some((r) => r.id === destino.id)
}

/** Periodo que ocupa una meta, o null si todavía no tiene fechas. */
export function rangoDe(r: Rutina): { ini: string; fin: string } | null {
  if (!r.fechaInicio) return null
  return { ini: r.fechaInicio, fin: r.fechaFin ?? r.fechaInicio }
}

/**
 * Periodo que abarca una meta con todo lo que cuelga de ella. Sirve para pintar
 * la rama plegada: sin esto, cerrar una meta sin fechas propias haría desaparecer
 * del cronograma el trabajo de sus hijas.
 */
export function rangoConHijas(metas: Rutina[], r: Rutina): { ini: string; fin: string } | null {
  const rangos = [r, ...(r.id != null ? descendientes(metas, r.id) : [])]
    .map(rangoDe)
    .filter((x): x is { ini: string; fin: string } => x != null)
  if (rangos.length === 0) return null
  return {
    ini: rangos.reduce((a, b) => (a.ini < b.ini ? a : b)).ini,
    fin: rangos.reduce((a, b) => (a.fin > b.fin ? a : b)).fin,
  }
}

/** Asigna el periodo (ordena los extremos si vienen al revés). */
export async function ponerPeriodo(r: Rutina, ini: string, fin: string): Promise<void> {
  if (r.id == null || !ini) return
  const [a, b] = ini <= fin ? [ini, fin] : [fin, ini]
  await rutinasRepo.update(r.id, { fechaInicio: a, fechaFin: a === b ? undefined : b })
}

/** Devuelve la meta a la lista: sin fechas deja de ocupar sitio en el calendario. */
export async function quitarPeriodo(r: Rutina): Promise<void> {
  if (r.id == null) return
  await rutinasRepo.update(r.id, { fechaInicio: undefined, fechaFin: undefined, hora: undefined, horaFin: undefined })
}

// ---------- Progreso ----------

/**
 * Cuánto lleva hecho una meta, de 0 a 1. Cuenta lo que tenga: sus sub-metas y sus
 * pasos van al mismo saco, porque para quien mira la barra son lo mismo — trozos
 * de la meta que ya están o no. Sin nada dentro, es su propia palomita.
 *
 * El avance de una sub-meta cuenta parcial (una rama a medias no es cero), así que
 * el progreso sube conforme se trabaja abajo y no solo al cerrar ramas enteras.
 */
export function progresoDe(metas: Rutina[], r: Rutina): number {
  if (r.completada) return 1
  const hijas = hijasDe(metas, r.id)
  const pasos = r.pasos.length
  const total = hijas.length + pasos
  if (total === 0) return 0
  const hechosPasos = (r.pasosHechos ?? []).filter((i) => i < pasos).length
  const suma = hijas.reduce((n, h) => n + progresoDe(metas, h), 0) + hechosPasos
  return suma / total
}

/** Cuántos pasos lleva hechos la meta, de los que tiene. */
export function progresoPasos(r: Rutina): { hechos: number; total: number } {
  const hechos = (r.pasosHechos ?? []).filter((i) => i < r.pasos.length)
  return { hechos: hechos.length, total: r.pasos.length }
}

/**
 * El alcance completo de una meta, en conteo entero: sus propios pasos MÁS sus
 * sub-metas, contando una sub-meta como hecha solo si está completa de punta a
 * punta (no a medias) — mismo denominador que `progresoDe`, pero como fracción
 * de enteros ("2/5") en vez de porcentaje, que es lo que se lee junto al nombre.
 */
export function resumenAlcance(metas: Rutina[], r: Rutina): { hechos: number; total: number } {
  const hijas = hijasDe(metas, r.id)
  const pasos = progresoPasos(r)
  const hijasHechas = hijas.filter((h) => progresoDe(metas, h) === 1).length
  return { hechos: pasos.hechos + hijasHechas, total: pasos.total + hijas.length }
}

/** Palomea/despalomea una meta. */
export async function toggleMeta(r: Rutina): Promise<void> {
  if (r.id == null) return
  await rutinasRepo.update(r.id, { completada: !r.completada })
}

/** Ya pasó su fecha de fin y sigue sin completarse. */
export function vencida(r: Rutina, hoyIso: string): boolean {
  const rango = rangoDe(r)
  return !!rango && !r.completada && rango.fin < hoyIso
}

// ---------- Pasos de una meta ----------
//
// Cualquier meta puede llevar su propia lista de pasos (`Rutina.pasos`, el mismo
// checklist que usa el calendario). Lo hecho se guarda en la propia meta
// (`pasosHechos`), no por fecha: una meta se cumple una vez, no cada día. Los
// pasos de la lista no cuelgan de ningún cuarto: `roomId` va vacío y quien lo
// pinta ya lo da por opcional.

export async function agregarPaso(r: Rutina, titulo: string): Promise<void> {
  const t = titulo.trim()
  if (r.id == null || !t) return
  const paso: PasoRutina = { titulo: t, roomId: '' }
  await rutinasRepo.update(r.id, { pasos: [...r.pasos, paso] })
}

export async function renombrarPaso(r: Rutina, idx: number, titulo: string): Promise<void> {
  const t = titulo.trim()
  if (r.id == null || !t) return
  await rutinasRepo.update(r.id, {
    pasos: r.pasos.map((p, i) => (i === idx ? { ...p, titulo: t } : p)),
  })
}

/** Quita un paso y recorre los índices de `pasosHechos`: son posiciones, no ids. */
export async function borrarPaso(r: Rutina, idx: number): Promise<void> {
  if (r.id == null) return
  const hechos = (r.pasosHechos ?? [])
    .filter((i) => i !== idx)
    .map((i) => (i > idx ? i - 1 : i))
  await rutinasRepo.update(r.id, {
    pasos: r.pasos.filter((_, i) => i !== idx),
    pasosHechos: hechos,
  })
}

export async function togglePasoMeta(r: Rutina, idx: number): Promise<void> {
  if (r.id == null) return
  const hechos = new Set(r.pasosHechos ?? [])
  if (hechos.has(idx)) hechos.delete(idx)
  else hechos.add(idx)
  await rutinasRepo.update(r.id, { pasosHechos: [...hechos] })
}

// ---------- Alta, baja y orden ----------

/**
 * Crea una meta. Sin `padre` va al INICIO del primer nivel; con padre, al inicio
 * de sus hermanas — la recién creada se ve sin bajar hasta el final de la lista.
 * Nace sin fechas: la lista primero, el cronograma cuando se sepa cuándo. `suelta`
 * se queda en false — el campo ya no significa nada para una meta, pero las
 * rutinas espejo del calendario aún lo leen.
 *
 * `color` es cosa de quien llama (cicla la paleta de `coloresRutina.ts` para que
 * cada meta nazca distinta): este módulo es núcleo y no importa la paleta de UI.
 *
 * Devuelve la meta ya con su id: quien arma un árbol de un tirón necesita pasarla
 * como `padre` de la siguiente sin esperar a que `useLiveQuery` repinte.
 */
export async function crearMeta(
  metas: Rutina[],
  nombre: string,
  padre?: Rutina,
  color?: string,
  /** App a la que pertenece: la estampa el cronograma embebido en una app. */
  plantillaId?: string,
  /** Sub-ámbito dentro de esa app (`hobby:3`, `proyecto:7`). */
  ambitoId?: string,
): Promise<Rutina | undefined> {
  const n = nombre.trim()
  if (!n) return
  // Las hermanas de siempre se corren un lugar para hacerle sitio a la primera.
  const hermanas = hijasDe(metas, padre?.id)
  await Promise.all(hermanas.map((r, i) => rutinasRepo.update(r.id!, { orden: i + 1 })))
  const nueva: Omit<Rutina, 'id'> = {
    nombre: n,
    emoji: '🎯',
    dias: [],
    pasos: [],
    activa: true,
    creadoEn: new Date().toISOString(),
    esMeta: true,
    repeticion: 'una_vez',
    color,
    padreId: padre?.id,
    orden: 0,
    plantillaId: plantillaId ?? padre?.plantillaId,
    ambitoId: ambitoId ?? padre?.ambitoId,
  }
  const id = await rutinasRepo.add(nueva)
  return typeof id === 'number' ? { ...nueva, id } : undefined
}

/**
 * Borra las metas de un sub-ámbito y sus planes. Se llama al borrar aquello a lo
 * que pertenecen (un proyecto, un hobby): las hijas heredan el `ambitoId`, así
 * que basta con barrer por él para llevarse las ramas completas.
 */
export async function borrarMetasDeAmbito(ambitoId: string): Promise<void> {
  const ids = (await rutinasRepo.list())
    .filter((r) => esMeta(r) && r.ambitoId === ambitoId)
    .map((r) => r.id)
    .filter((i): i is number => i != null)
  if (ids.length === 0) return
  await borrarPlanesDeMetas(ids)
  await Promise.all(ids.map((i) => rutinasRepo.remove(i)))
}

/** Borra una meta, todo lo que cuelga de ella y los planes que se le propusieron. */
export async function borrarMetaConDescendencia(metas: Rutina[], id: number): Promise<void> {
  const ids = [id, ...descendientes(metas, id).map((r) => r.id)].filter((i): i is number => i != null)
  await borrarPlanesDeMetas(ids)
  await Promise.all(ids.map((i) => rutinasRepo.remove(i)))
}

/**
 * Mueve una meta dentro de `padreId`, justo antes de `antesDeId` (o al final).
 * Renumera el `orden` de sus nuevas hermanas y, si cambió de madre, el de las que
 * deja.
 */
export async function moverMeta(
  metas: Rutina[],
  mueve: Rutina,
  padreId: number | undefined,
  antesDeId?: number,
): Promise<void> {
  if (mueve.id == null) return
  const resto = hijasDe(metas, padreId).filter((r) => r.id !== mueve.id)
  const i = antesDeId == null ? -1 : resto.findIndex((r) => r.id === antesDeId)
  const at = i === -1 ? resto.length : i
  const fila = [...resto.slice(0, at), mueve, ...resto.slice(at)]

  const escrituras = fila.map((r, orden) =>
    rutinasRepo.update(r.id!, r.id === mueve.id ? { padreId, orden } : { orden }),
  )
  if (mueve.padreId !== padreId) {
    escrituras.push(
      ...hijasDe(metas, mueve.padreId)
        .filter((r) => r.id !== mueve.id)
        .map((r, orden) => rutinasRepo.update(r.id!, { orden })),
    )
  }
  await Promise.all(escrituras)
}
