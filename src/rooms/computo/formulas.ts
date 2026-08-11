/**
 * Lógica del formulario: el árbol de carpetas y el alta de fórmulas.
 *
 * El árbol se arma en memoria a partir de `padreId` (ver el comentario de la
 * v112 en `db.ts`: ese campo no se indexa a propósito). Las carpetas anidan sin
 * límite; las fórmulas son SIEMPRE hoja, porque una fórmula no contiene otra.
 */
import type { CarpetaFormula, Formula, VariableFormula } from '../../core/data/db'
import { carpetasFormulaRepo, formulasRepo } from '../../core/data/repository'
import { fechaLocalISO } from '../../core/fechaLocal'
import { SIMBOLOS_RESERVADOS } from './constantes'

/** Una fila del árbol ya aplanada al orden exacto en el que se pinta. */
export interface FilaCarpeta {
  carpeta: CarpetaFormula
  profundidad: number
  /** Subcarpetas directas: decide si la fila lleva chevron. */
  hijas: number
  /**
   * Color propio o heredado del ancestro más cercano. Se calcula aquí porque
   * `filasArbol` ya baja el árbol; recalcularlo por fila sería recorrerlo N veces.
   */
  color?: string
}

const ordenar = (a: CarpetaFormula, b: CarpetaFormula) =>
  a.orden - b.orden || a.creadoEn.localeCompare(b.creadoEn)

/** Carpetas hijas directas de una (o las raíces con `padreId = null`). */
export const hijasDe = (carpetas: CarpetaFormula[], padreId: string | null): CarpetaFormula[] =>
  carpetas.filter((c) => (c.padreId ?? null) === padreId).sort(ordenar)

/**
 * Aplana el árbol al orden de pintado, saltándose lo que esté plegado. Lleva
 * guardia anti-ciclo: un `padreId` corrupto (o llegado del sync a medias) no
 * puede colgar la vista.
 */
export function filasArbol(carpetas: CarpetaFormula[], plegadas: Set<string>): FilaCarpeta[] {
  const filas: FilaCarpeta[] = []
  const vistos = new Set<string>()
  const bajar = (padreId: string | null, profundidad: number, heredado?: string) => {
    for (const carpeta of hijasDe(carpetas, padreId)) {
      if (vistos.has(carpeta.carpetaId)) continue
      vistos.add(carpeta.carpetaId)
      const hijas = carpetas.filter((c) => c.padreId === carpeta.carpetaId).length
      const color = carpeta.color ?? heredado
      filas.push({ carpeta, profundidad, hijas, color })
      if (!plegadas.has(carpeta.carpetaId)) bajar(carpeta.carpetaId, profundidad + 1, color)
    }
  }
  bajar(null, 0)
  return filas
}

/**
 * Cuántas fórmulas hay en una carpeta CONTANDO sus subcarpetas. Sin esto,
 * «Matemáticas 0» se lee como carpeta vacía cuando en realidad tiene 18
 * repartidas en sus grupos.
 */
export function totalFormulas(
  carpetas: CarpetaFormula[],
  formulas: Formula[],
  carpetaId: string,
): number {
  const dentro = descendientes(carpetas, carpetaId)
  dentro.add(carpetaId)
  return formulas.filter((f) => dentro.has(f.carpetaId)).length
}

/** Todas las carpetas que cuelgan de una (sin incluirla). */
export function descendientes(carpetas: CarpetaFormula[], carpetaId: string): Set<string> {
  const dentro = new Set<string>()
  const bajar = (id: string) => {
    for (const c of carpetas) {
      if (c.padreId === id && !dentro.has(c.carpetaId)) {
        dentro.add(c.carpetaId)
        bajar(c.carpetaId)
      }
    }
  }
  bajar(carpetaId)
  return dentro
}

/** Una carpeta no puede caer dentro de sí misma ni de su propia descendencia. */
export function puedeSoltarEn(carpetas: CarpetaFormula[], mueve: string, destino: string | null): boolean {
  if (destino == null) return true
  if (mueve === destino) return false
  return !descendientes(carpetas, mueve).has(destino)
}

const nuevoId = (prefijo: string) =>
  `${prefijo}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`

/** Crea una carpeta al final de sus hermanas. */
export async function crearCarpeta(
  carpetas: CarpetaFormula[],
  nombre: string,
  padreId: string | null,
  emoji?: string,
): Promise<string> {
  const hermanas = hijasDe(carpetas, padreId)
  const carpetaId = nuevoId('car')
  await carpetasFormulaRepo.add({
    carpetaId,
    padreId,
    nombre,
    emoji,
    orden: (hermanas.at(-1)?.orden ?? 0) + 1,
    creadoEn: new Date().toISOString(),
  })
  return carpetaId
}

/**
 * Renumera 0..n-1 la fila dada, escribiendo SOLO las que cambian: sin ese filtro
 * cada arrastre metería una entrada por hermana en `_outbox`.
 */
async function renumerar<T extends { id?: number; orden: number }>(
  fila: T[],
  guardar: (id: number, orden: number) => Promise<unknown>,
): Promise<void> {
  await Promise.all(
    fila.map((x, i) => (x.id != null && x.orden !== i ? guardar(x.id, i) : Promise.resolve())),
  )
}

/**
 * Suelta una carpeta bajo `padreId`, justo antes de `antesDe` (o al final si se
 * soltó sobre el hueco). Cambia de madre y reordena en una sola operación, y la
 * renumeración se acota al destino — mismo criterio que `soltarMeta` de
 * `core/ui/metas/carpetas.ts`.
 */
export async function soltarCarpeta(
  carpetas: CarpetaFormula[],
  mueve: CarpetaFormula,
  padreId: string | null,
  antesDe?: CarpetaFormula,
): Promise<void> {
  if (mueve.id == null || mueve.carpetaId === antesDe?.carpetaId) return
  if (!puedeSoltarEn(carpetas, mueve.carpetaId, padreId)) return

  const hermanas = hijasDe(carpetas, padreId).filter((c) => c.carpetaId !== mueve.carpetaId)
  const at = antesDe ? hermanas.findIndex((c) => c.carpetaId === antesDe.carpetaId) : -1
  const pos = at === -1 ? hermanas.length : at
  const fila = [...hermanas.slice(0, pos), mueve, ...hermanas.slice(pos)]

  if ((mueve.padreId ?? null) !== padreId) {
    await carpetasFormulaRepo.update(mueve.id, { padreId })
    mueve.padreId = padreId
  }
  await renumerar(fila, (id, orden) => carpetasFormulaRepo.update(id, { orden }))
}

/**
 * Suelta una fórmula en `carpetaId`, justo antes de `antesDe` (o al final). Las
 * fórmulas son siempre hoja, así que no hay ciclo posible que validar.
 */
export async function moverFormula(
  formulas: Formula[],
  mueve: Formula,
  carpetaId: string,
  antesDe?: Formula,
): Promise<void> {
  if (mueve.id == null || mueve.id === antesDe?.id) return

  const hermanas = formulasDe(formulas, carpetaId).filter((f) => f.id !== mueve.id)
  const at = antesDe ? hermanas.findIndex((f) => f.id === antesDe.id) : -1
  const pos = at === -1 ? hermanas.length : at
  const fila = [...hermanas.slice(0, pos), mueve, ...hermanas.slice(pos)]

  if (mueve.carpetaId !== carpetaId) {
    await formulasRepo.update(mueve.id, { carpetaId })
    mueve.carpetaId = carpetaId
  }
  await renumerar(fila, (id, orden) => formulasRepo.update(id, { orden }))
}

/** Fórmulas de una carpeta, en su orden. */
export const formulasDe = (formulas: Formula[], carpetaId: string): Formula[] =>
  formulas
    .filter((f) => f.carpetaId === carpetaId)
    .sort((a, b) => a.orden - b.orden || a.creadoEn.localeCompare(b.creadoEn))

/** Alta de una fórmula propia. */
export async function crearFormula(
  hermanas: Formula[],
  datos: Pick<Formula, 'carpetaId' | 'nombre' | 'expresion' | 'resultado' | 'variables'> &
    Partial<Pick<Formula, 'tex' | 'descripcion' | 'formulaId' | 'ejemploDe'>>,
): Promise<void> {
  const ahora = new Date().toISOString()
  await formulasRepo.add({
    formulaId: datos.formulaId ?? nuevoId('for'),
    carpetaId: datos.carpetaId,
    nombre: datos.nombre,
    expresion: datos.expresion,
    resultado: datos.resultado,
    tex: datos.tex,
    descripcion: datos.descripcion,
    variables: datos.variables,
    ejemploDe: datos.ejemploDe,
    orden: (hermanas.at(-1)?.orden ?? 0) + 1,
    fecha: fechaLocalISO(),
    creadoEn: ahora,
  })
}

/** Ámbito de evaluación de una fórmula con los valores que tenga cada variable. */
export function alcanceDe(variables: VariableFormula[], valores?: Record<string, string>): Record<string, number> {
  const scope: Record<string, number> = {}
  for (const v of variables) {
    const crudo = valores?.[v.simbolo]
    const n = crudo != null && crudo !== '' ? Number(crudo.replace(',', '.')) : v.valor
    scope[v.simbolo] = Number.isFinite(n) ? (n as number) : 0
  }
  return scope
}

/** Motivo por el que un símbolo no vale, o null si vale. */
export function validarSimbolo(simbolo: string): 'vacio' | 'reservado' | 'forma' | null {
  if (!simbolo.trim()) return 'vacio'
  if (SIMBOLOS_RESERVADOS.has(simbolo)) return 'reservado'
  if (!/^[A-Za-zÀ-ÿ][A-Za-z0-9À-ÿ]*$/.test(simbolo)) return 'forma'
  return null
}
