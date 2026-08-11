import type { MomentoComida, PlanComida, Receta } from '../../core/data/db'
import { MOMENTOS } from './constantes'
import { recetaEnMomento } from './momentos'

/** Una casilla de la rejilla: el día y el momento que le toca. */
export interface Hueco {
  fecha: string
  momento: MomentoComida
}

export const claveHueco = (h: Hueco) => `${h.fecha}|${h.momento}`

/** Las casillas de esos días que aún no tienen nada planeado. */
export function huecosVacios(dias: string[], plan: PlanComida[]): Hueco[] {
  const ocupado = new Set(plan.map((p) => claveHueco(p)))
  const libres: Hueco[] = []
  for (const fecha of dias) {
    for (const m of MOMENTOS) {
      if (!ocupado.has(`${fecha}|${m.id}`)) libres.push({ fecha, momento: m.id })
    }
  }
  return libres
}

/** Copia barajada (Fisher-Yates): dos generaciones seguidas no dan la misma semana. */
function barajar<T>(xs: T[]): T[] {
  const a = [...xs]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/**
 * Propone qué poner en esos huecos, uno por casilla.
 *
 * Quien llama decide QUÉ huecos van (todos los vacíos de la ventana, o solo los
 * que el usuario marcó): aquí nunca se pisa nada, porque solo llegan casillas
 * libres. Cada momento recorre su propio mazo barajado en ciclo, así no repite
 * receta hasta agotar las que encajan.
 */
export function proponerPlan(huecos: Hueco[], recetas: Receta[]): Omit<PlanComida, 'id'>[] {
  const creadoEn = new Date().toISOString()
  const nuevas: Omit<PlanComida, 'id'>[] = []

  for (const m of MOMENTOS) {
    const delMomento = huecos.filter((h) => h.momento === m.id)
    if (delMomento.length === 0) continue
    const mazo = barajar(recetas.filter((r) => r.id != null && recetaEnMomento(r, m.id)))
    if (mazo.length === 0) continue
    delMomento.forEach((h, i) => {
      nuevas.push({ fecha: h.fecha, momento: m.id, recetaId: mazo[i % mazo.length].id!, creadoEn })
    })
  }
  return nuevas
}
