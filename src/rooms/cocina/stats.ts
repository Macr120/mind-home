import type { PerfilNutricion, RegistroAgua, RegistroComida } from '../../core/data/db'
import { localeActual } from '../../core/i18n/useT'
import { deIso } from '../../core/fechaLocal'
import { adherenciaCalorias, type TotalesMacros } from './macros'
import { inicioPeriodo, type Periodo } from './periodo'
import { sumarDias } from './fecha'

/**
 * Agregadores del paso Progreso. Los dos Maps se construyen UNA vez por render
 * (useMemo en el caller) y todo lo demás se deriva de ellos en O(días).
 *
 * Filosofía de los promedios (la de `balanceSemanal`): se divide entre días
 * REGISTRADOS, no entre días calendario — un día sin apuntar no es un ayuno.
 */

/** Suma de macros por día, en un solo recorrido de las comidas. */
export function macrosPorDia(comidas: RegistroComida[]): Map<string, TotalesMacros> {
  const porDia = new Map<string, TotalesMacros>()
  for (const c of comidas) {
    const t = porDia.get(c.fecha) ?? { calorias: 0, proteinas: 0, carbohidratos: 0, grasas: 0 }
    t.calorias += c.calorias
    t.proteinas += c.proteinas
    t.carbohidratos += c.carbohidratos
    t.grasas += c.grasas
    porDia.set(c.fecha, t)
  }
  return porDia
}

/** Mililitros por día, en un solo recorrido de los registros de agua. */
export function aguaPorDia(agua: RegistroAgua[]): Map<string, number> {
  const porDia = new Map<string, number>()
  for (const a of agua) porDia.set(a.fecha, (porDia.get(a.fecha) ?? 0) + a.ml)
  return porDia
}

/** ¿La clave cae dentro del periodo que termina en `ref`? */
const enRango = (clave: string, desde: string | null, ref: string) =>
  clave <= ref && (desde === null || clave >= desde)

export interface ResumenPeriodo {
  diasRegistrados: number
  /** Promedio por día registrado. */
  promedio: TotalesMacros
  /** % de días registrados dentro de ±10% del objetivo calórico. */
  adherencia: number
}

export function resumenAlimentacion(
  porDia: Map<string, TotalesMacros>,
  perfil: PerfilNutricion,
  p: Periodo,
  ref: string,
): ResumenPeriodo {
  const desde = inicioPeriodo(p, ref)
  const suma: TotalesMacros = { calorias: 0, proteinas: 0, carbohidratos: 0, grasas: 0 }
  const dias: { consumido: number; objetivo: number }[] = []
  for (const [clave, t] of porDia) {
    if (!enRango(clave, desde, ref)) continue
    suma.calorias += t.calorias
    suma.proteinas += t.proteinas
    suma.carbohidratos += t.carbohidratos
    suma.grasas += t.grasas
    dias.push({ consumido: t.calorias, objetivo: perfil.calorias })
  }
  const n = dias.length
  const prom = (x: number) => (n > 0 ? Math.round(x / n) : 0)
  return {
    diasRegistrados: n,
    promedio: {
      calorias: prom(suma.calorias),
      proteinas: prom(suma.proteinas),
      carbohidratos: prom(suma.carbohidratos),
      grasas: prom(suma.grasas),
    },
    adherencia: adherenciaCalorias(dias),
  }
}

export function resumenAgua(
  porDia: Map<string, number>,
  objetivoMl: number,
  p: Periodo,
  ref: string,
): { diasRegistrados: number; promedioMl: number; adherencia: number } {
  const desde = inicioPeriodo(p, ref)
  let suma = 0
  let cumplidos = 0
  let n = 0
  for (const [clave, ml] of porDia) {
    if (!enRango(clave, desde, ref)) continue
    suma += ml
    if (objetivoMl > 0 && ml >= objetivoMl) cumplidos++
    n++
  }
  return {
    diasRegistrados: n,
    promedioMl: n > 0 ? Math.round(suma / n) : 0,
    adherencia: n > 0 ? Math.round((cumplidos / n) * 100) : 0,
  }
}

export interface BarraPeriodo {
  clave: string
  etiqueta: string
  valor: number
  /** ¿Es el día/mes en curso? (barra a color pleno) */
  actual: boolean
}

/**
 * Barras de la gráfica del periodo: por día en semana/mes, por mes en año/todo.
 * En meses el valor es el PROMEDIO diario (sobre días registrados), para que la
 * línea de objetivo por día siga siendo comparable entre vistas.
 */
export function barrasPeriodo(
  porDia: Map<string, number>,
  p: Exclude<Periodo, 'dia'>,
  ref: string,
): BarraPeriodo[] {
  if (p === 'semana' || p === 'mes') {
    const desde = inicioPeriodo(p, ref)!
    const barras: BarraPeriodo[] = []
    for (let f = desde; f <= ref; f = sumarDias(f, 1)) {
      barras.push({ clave: f, etiqueta: f.slice(8), valor: porDia.get(f) ?? 0, actual: f === ref })
    }
    return barras
  }

  // Año/todo: los últimos 12 meses, bucketing en UNA pasada del Map.
  const suma = new Map<string, { total: number; dias: number }>()
  for (const [clave, v] of porDia) {
    if (clave > ref) continue
    const mes = clave.slice(0, 7)
    const b = suma.get(mes) ?? { total: 0, dias: 0 }
    b.total += v
    b.dias++
    suma.set(mes, b)
  }
  const locale = localeActual()
  const barras: BarraPeriodo[] = []
  const [anio, mes] = [Number(ref.slice(0, 4)), Number(ref.slice(5, 7))]
  for (let i = 11; i >= 0; i--) {
    const d = new Date(anio, mes - 1 - i, 1)
    const clave = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const b = suma.get(clave)
    barras.push({
      clave,
      etiqueta: deIso(`${clave}-01`).toLocaleDateString(locale, { month: 'narrow' }),
      valor: b && b.dias > 0 ? Math.round(b.total / b.dias) : 0,
      actual: clave === ref.slice(0, 7),
    })
  }
  return barras
}
