import type { EjecucionRutina, Rutina } from '../../data/db'
import { fechaISO, tocaFechaHistorico } from '../../rutinas'
import { esMeta, progresoPasos } from '../../metas'
import { deIso, fechaLocalISO, inicioSemana } from '../../fechaLocal'
import { localeActual, type TFunc } from '../../i18n/useT'

/**
 * Cumplimiento de las rutinas en un rango de fechas: lo que alimenta el panel de
 * métricas del calendario (matriz de hábitos, resumen por semana/mes y gráfica).
 *
 * El histórico sale de `ejecucionesRutina`, que ya guarda una fila por (rutina,
 * día) y no se purga nunca. Aquí no se toca la BD: solo se lee lo que el
 * calendario ya cargó.
 */

/** Índice `${fecha}|${rutinaId}` → ejecución de ese día. */
export interface IndiceEjecuciones {
  por: Map<string, EjecucionRutina>
}

export function indexarEjecuciones(ejecuciones: EjecucionRutina[] | undefined): IndiceEjecuciones {
  const por = new Map<string, EjecucionRutina>()
  for (const e of ejecuciones ?? []) por.set(`${e.fecha}|${e.rutinaId}`, e)
  return { por }
}

/**
 * ¿La ocurrencia de esa fecha cuenta como cumplida? Es la ÚNICA definición: la
 * rejilla, la lista de Metas y la matriz la comparten para que no se contradigan.
 * `hecho` manda (palomeada entera); si no, hay que tener todos los pasos.
 */
export function cumplidaEn(r: Rutina, iso: string, idx: IndiceEjecuciones): boolean {
  if (esMeta(r)) {
    const p = progresoPasos(r)
    return !!r.completada || (p.total > 0 && p.hechos >= p.total)
  }
  const e = idx.por.get(`${iso}|${r.id}`)
  if (!e) return false
  if (e.hecho) return true
  return r.pasos.length > 0 && e.pasosHechos.length >= r.pasos.length
}

/**
 * Primer día en el que la rutina puede contar.
 *
 * Sin este piso una rutina 'indefinido' (sin días ni fecha de inicio) hace que
 * `tocaFecha` devuelva true para CUALQUIER fecha pasada: crear un hábito hoy
 * hundiría el porcentaje de todos los meses anteriores con días "no hechos" que
 * nunca existieron.
 */
export function naceEn(r: Rutina): string {
  const creada = r.creadoEn.slice(0, 10)
  return r.fechaInicio && r.fechaInicio > creada ? r.fechaInicio : creada
}

let cacheSemana: { locale: string; dias: string[] } | null = null

/**
 * Iniciales de la semana, L→D, en el idioma activo — las mismas que la cabecera
 * de días de la rejilla. El 1 de enero de 2024 fue lunes, así que siete días
 * seguidos desde ahí dan el orden L→D sin tablas a mano.
 *
 * `short` es lo normal, pero en árabe devuelve el nombre entero («الأربعاء») y
 * reventaría la columna: cuando alguna sigla se pasa de larga se cae a `narrow`.
 * Se memoriza por locale porque esto se llama dentro de un `map` de render.
 */
export function semanaCorta(): string[] {
  const locale = localeActual()
  if (cacheSemana?.locale === locale) return cacheSemana.dias
  const sigla = (i: number, weekday: 'short' | 'narrow') =>
    new Date(2024, 0, 1 + i).toLocaleDateString(locale, { weekday })
  let dias = Array.from({ length: 7 }, (_, i) => sigla(i, 'short'))
  if (dias.some((d) => d.length > 5)) dias = Array.from({ length: 7 }, (_, i) => sigla(i, 'narrow'))
  cacheSemana = { locale, dias }
  return dias
}

/** Día de la semana de una fecha ISO, con las mismas siglas que la rejilla de arriba. */
export const diaSemanaCorta = (iso: string): string => semanaCorta()[(deIso(iso).getDay() + 6) % 7]

/**
 * Una columna del panel. En Día/Semana es UN día (se palomea); en Mes es una
 * semana y en Año un mes (agregado, sin palomear).
 */
export interface ColumnaRango {
  clave: string
  etiqueta: string
  isos: string[]
}

/** Un día por columna (Día y Semana). */
export function columnasPorDia(dias: Date[]): ColumnaRango[] {
  return dias.map((d) => {
    const iso = fechaISO(d)
    return { clave: iso, etiqueta: String(d.getDate()), isos: [iso] }
  })
}

/** Las semanas que toca el mes (L→D), recortadas a los días del propio mes. */
export function columnasPorSemana(anio: number, mes: number, t: TFunc): ColumnaRango[] {
  const ultimo = new Date(anio, mes + 1, 0).getDate()
  // Map conserva el orden de inserción, y los días se recorren en orden.
  const semanas = new Map<string, string[]>()
  for (let i = 1; i <= ultimo; i++) {
    const d = new Date(anio, mes, i)
    const clave = fechaISO(inicioSemana(d))
    semanas.set(clave, [...(semanas.get(clave) ?? []), fechaISO(d)])
  }
  return [...semanas.values()].map((isos, i) => ({
    clave: isos[0],
    etiqueta: t('cal.met.sem', 'Sem {n}', { n: i + 1 }),
    isos,
  }))
}

/** Los 12 meses del año. */
export function columnasPorMes(anio: number, locale: string): ColumnaRango[] {
  return Array.from({ length: 12 }, (_, m) => {
    const n = new Date(anio, m + 1, 0).getDate()
    return {
      clave: `${anio}-${m}`,
      etiqueta: new Date(anio, m, 1).toLocaleDateString(locale, { month: 'short' }),
      isos: Array.from({ length: n }, (_, i) => fechaISO(new Date(anio, m, i + 1))),
    }
  })
}

/** Cuántas ocurrencias tocaban en esa columna y cuántas se cumplieron. */
export interface Celda {
  tocan: number
  hechas: number
  /** Ocurrencias que aún no llegan: se dibujan, pero no puntúan. */
  futuras: number
}

export interface FilaHabito {
  rutina: Rutina
  /** Alineado 1:1 con `columnas`. */
  celdas: Celda[]
  tocan: number
  hechas: number
}

export interface ColumnaMetrica {
  columna: ColumnaRango
  total: number
  hechas: number
  /** 0–100 entero. */
  pct: number
  /** No había nada agendado: la gráfica pinta hueco, no un 0 %. */
  vacio: boolean
}

export interface MetricasRango {
  columnas: ColumnaMetrica[]
  filas: FilaHabito[]
  total: number
  hechas: number
  pct: number
}

const pctDe = (hechas: number, total: number) => (total === 0 ? 0 : Math.round((hechas / total) * 100))

/** Color de un porcentaje de cumplimiento: verde lo cumpliste, ámbar a medias, rojo casi nada. */
export function colorPct(pct: number): string {
  if (pct >= 70) return '#10b981'
  if (pct >= 40) return '#f59e0b'
  return '#ef4444'
}

/**
 * Cumplimiento del rango, columna a columna y hábito a hábito. Rutinas y metas
 * del cronograma cuentan igual: para el calendario son lo mismo — algo que toca
 * un día y se palomea. Una meta con periodo (`ponerPeriodo`) toca todos los días
 * de su rango y `cumplidaEn` da el mismo valor en todos ellos, porque su estado
 * vive en la meta, no por día (ver `cumplidaEn`).
 *
 * El numerador sale del mismo recorrido que el denominador, así que nunca puede
 * pasar de 100 %.
 *
 * Los días que aún no llegan NO cuentan: un diciembre al 0 % en julio no dice que
 * fallaras, dice que no ha pasado. Hoy sí entra — todavía se puede cumplir.
 *
 * El histórico usa `tocaFechaHistorico`, no `tocaFecha`: `activa` responde al
 * presente («¿lo sigo haciendo?») y no debe borrar el pasado. Quien recorta el
 * pasado es `fechaFin`, que la pausa fija en el día en que se apagó el hábito
 * (`cambioPausa`, en core/rutinas.ts). Antes, apagar un hábito hacía desaparecer
 * también sus días cumplidos de estas gráficas.
 *
 * Limitación asumida: los hábitos pausados ANTES de ago 2026 no tienen ese
 * `fechaFin` —el dato nunca se guardó—, así que su serie sigue contando hasta
 * hoy. Y si se reanuda una pausa, los días parados cuentan como fallados:
 * recuperarlos pediría volcarlos en `excepciones`.
 */
export function metricasRango(
  rutinas: Rutina[],
  columnas: ColumnaRango[],
  idx: IndiceEjecuciones,
  hoy: string = fechaLocalISO(),
): MetricasRango {
  const filas: FilaHabito[] = []
  const porColumna = columnas.map(() => ({ total: 0, hechas: 0 }))

  for (const r of rutinas) {
    const nace = naceEn(r)
    const celdas: Celda[] = []
    let tocan = 0
    let hechas = 0
    let futuras = 0
    for (let c = 0; c < columnas.length; c++) {
      const celda: Celda = { tocan: 0, hechas: 0, futuras: 0 }
      for (const iso of columnas[c].isos) {
        if (iso < nace) continue
        if (!tocaFechaHistorico(r, deIso(iso))) continue
        if (iso > hoy) {
          celda.futuras++
          continue
        }
        celda.tocan++
        if (cumplidaEn(r, iso, idx)) celda.hechas++
      }
      celdas.push(celda)
      tocan += celda.tocan
      hechas += celda.hechas
      futuras += celda.futuras
      porColumna[c].total += celda.tocan
      porColumna[c].hechas += celda.hechas
    }
    if (tocan > 0 || futuras > 0) filas.push({ rutina: r, celdas, tocan, hechas })
  }

  filas.sort((a, b) => b.tocan - a.tocan || a.rutina.nombre.localeCompare(b.rutina.nombre))

  const total = porColumna.reduce((n, c) => n + c.total, 0)
  const hechas = porColumna.reduce((n, c) => n + c.hechas, 0)

  return {
    columnas: columnas.map((columna, i) => ({
      columna,
      total: porColumna[i].total,
      hechas: porColumna[i].hechas,
      pct: pctDe(porColumna[i].hechas, porColumna[i].total),
      vacio: porColumna[i].total === 0,
    })),
    filas,
    total,
    hechas,
    pct: pctDe(hechas, total),
  }
}
