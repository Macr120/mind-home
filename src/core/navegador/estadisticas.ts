import type { VisitaWeb } from '../data/db'
import { sitioDe } from './dominio'

/**
 * Cuentas puras sobre `visitasWeb` para la pestaña Tiempo del panel del
 * navegador: totales, por sitio, por categoría y por hora del día. Todo en
 * SEGUNDOS; la UI decide cómo pintarlos.
 */

export type Periodo = 'hoy' | 'semana' | 'mes'

export interface Rango {
  desde: Date
  hasta: Date
  /** El periodo anterior de la misma longitud, para comparar. */
  desdeAnterior: Date
  hastaAnterior: Date
}

function medianoche(d: Date, dias = 0): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate() + dias)
  return x
}

/** Hoy = el día de hoy; semana = los últimos 7 días (hoy incluido); mes = los últimos 30. */
export function rangoDe(periodo: Periodo, ahora = new Date()): Rango {
  const dias = periodo === 'hoy' ? 1 : periodo === 'semana' ? 7 : 30
  const hasta = medianoche(ahora, 1)
  const desde = medianoche(ahora, 1 - dias)
  return { desde, hasta, desdeAnterior: medianoche(ahora, 1 - 2 * dias), hastaAnterior: desde }
}

export function sitioDeVisita(v: VisitaWeb): string {
  return v.host || sitioDe(v.url)
}

/** La visita abierta AHORA no tiene duración en la fila: se le suman sus segundos vivos. */
export interface EnCurso {
  id: number
  seg: number
}

export function segundosDe(v: VisitaWeb, enCurso?: EnCurso | null): number {
  if (enCurso && v.id === enCurso.id) return Math.max(v.duracionSeg ?? 0, enCurso.seg)
  return v.duracionSeg ?? 0
}

export function totalSeg(visitas: VisitaWeb[], enCurso?: EnCurso | null): number {
  return visitas.reduce((s, v) => s + segundosDe(v, enCurso), 0)
}

export interface ResumenSitio {
  sitio: string
  seg: number
  visitas: number
}

export function porSitio(visitas: VisitaWeb[], enCurso?: EnCurso | null): ResumenSitio[] {
  const m = new Map<string, ResumenSitio>()
  for (const v of visitas) {
    const sitio = sitioDeVisita(v)
    const r = m.get(sitio) ?? { sitio, seg: 0, visitas: 0 }
    r.seg += segundosDe(v, enCurso)
    r.visitas++
    m.set(sitio, r)
  }
  return [...m.values()].sort((a, b) => b.seg - a.seg || a.sitio.localeCompare(b.sitio))
}

export function porCategoria(
  visitas: VisitaWeb[],
  claveDe: (sitio: string) => string,
  enCurso?: EnCurso | null,
): { clave: string; seg: number }[] {
  const m = new Map<string, number>()
  for (const v of visitas) {
    const clave = claveDe(sitioDeVisita(v))
    m.set(clave, (m.get(clave) ?? 0) + segundosDe(v, enCurso))
  }
  return [...m.entries()].map(([clave, seg]) => ({ clave, seg })).sort((a, b) => b.seg - a.seg)
}

/**
 * Segundos por [día de la semana (0 = lunes)][hora]. Una visita larga se
 * reparte entre las horas que cruza, no se apunta entera a la de inicio.
 */
export function porHoraDia(visitas: VisitaWeb[], enCurso?: EnCurso | null): number[][] {
  const rejilla = Array.from({ length: 7 }, () => Array<number>(24).fill(0))
  for (const v of visitas) {
    let resta = segundosDe(v, enCurso)
    if (resta <= 0) continue
    const t = new Date(v.inicio)
    if (Number.isNaN(t.getTime())) continue
    // Hasta el final de la hora en curso, luego horas enteras.
    let hueco = 3600 - (t.getMinutes() * 60 + t.getSeconds())
    while (resta > 0) {
      const dia = (t.getDay() + 6) % 7
      const tramo = Math.min(resta, hueco)
      rejilla[dia][t.getHours()] += tramo
      resta -= tramo
      t.setTime(t.getTime() + tramo * 1000)
      hueco = 3600
    }
  }
  return rejilla
}

/** Variación relativa (−1…∞) del periodo contra el anterior; null si no hay con qué comparar. */
export function variacion(actual: number, anterior: number): number | null {
  if (anterior <= 0) return null
  return (actual - anterior) / anterior
}
