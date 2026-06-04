import type { SesionMindfulness } from '../../core/data/db'
import { hoyISO, sumarDias } from './fecha'

export function minutosDelDia(sesiones: SesionMindfulness[], fecha: string) {
  return sesiones
    .filter((s) => s.fecha === fecha)
    .reduce((acc, s) => acc + s.duracionMin, 0)
}

export function rachaDias(sesiones: SesionMindfulness[]): number {
  const fechas = new Set(sesiones.map((s) => s.fecha))
  let racha = 0
  let f = hoyISO()
  while (fechas.has(f)) {
    racha++
    f = sumarDias(f, -1)
  }
  return racha
}

export function minutosPorTipo(sesiones: SesionMindfulness[]) {
  const mapa = new Map<string, number>()
  for (const s of sesiones) {
    mapa.set(s.tipo, (mapa.get(s.tipo) ?? 0) + s.duracionMin)
  }
  return mapa
}

export function tendencia7Dias(sesiones: SesionMindfulness[]) {
  return Array.from({ length: 7 }, (_, i) => {
    const f = sumarDias(hoyISO(), -(6 - i))
    return { fecha: f, min: minutosDelDia(sesiones, f) }
  })
}
