import type { PerfilEjercicio, SesionEjercicio, SerieFuerza, TipoEntrenamiento } from '../../core/data/db'
import { diasSemana, hoyISO, inicioSemana } from './fecha'

export function volumenSerie(s: Pick<SerieFuerza, 'series' | 'repeticiones' | 'pesoKg'>) {
  return s.series * s.repeticiones * s.pesoKg
}

export function volumenSesion(series: SerieFuerza[]) {
  return series.reduce((acc, s) => acc + volumenSerie(s), 0)
}

export function sesionesSemana(sesiones: SesionEjercicio[], ref = hoyISO()) {
  const inicio = inicioSemana(ref)
  const dias = new Set(diasSemana(inicio))
  return sesiones.filter((s) => dias.has(s.fecha))
}

export function minutosTipo(semana: SesionEjercicio[], tipo: TipoEntrenamiento) {
  return semana
    .filter((s) => s.tipo === tipo)
    .reduce((acc, s) => acc + s.duracionMin, 0)
}

export function sesionesTipo(semana: SesionEjercicio[], tipo: TipoEntrenamiento) {
  return semana.filter((s) => s.tipo === tipo).length
}

export function diasActivos(semana: SesionEjercicio[]) {
  return new Set(semana.map((s) => s.fecha)).size
}

export function rachaDias(sesiones: SesionEjercicio[]): number {
  let racha = 0
  let f = hoyISO()
  const fechas = new Set(sesiones.map((s) => s.fecha))
  while (fechas.has(f)) {
    racha++
    const d = new Date(`${f}T12:00:00`)
    d.setDate(d.getDate() - 1)
    f = d.toISOString().slice(0, 10)
  }
  return racha
}

export function pctObjetivo(actual: number, objetivo: number) {
  if (objetivo <= 0) return 0
  return Math.min(100, Math.round((actual / objetivo) * 100))
}

export function recordsFuerza(
  series: SerieFuerza[],
): { ejercicio: string; pesoKg: number; repeticiones: number }[] {
  const mapa = new Map<string, { pesoKg: number; repeticiones: number }>()
  for (const s of series) {
    const prev = mapa.get(s.ejercicio)
    if (!prev || s.pesoKg > prev.pesoKg) {
      mapa.set(s.ejercicio, { pesoKg: s.pesoKg, repeticiones: s.repeticiones })
    }
  }
  return [...mapa.entries()]
    .map(([ejercicio, v]) => ({ ejercicio, ...v }))
    .sort((a, b) => b.pesoKg - a.pesoKg)
}

export function resumenSemanal(
  sesiones: SesionEjercicio[],
  perfil: PerfilEjercicio,
  ref = hoyISO(),
) {
  const sem = sesionesSemana(sesiones, ref)
  return {
    fuerza: sesionesTipo(sem, 'fuerza'),
    minResistencia: minutosTipo(sem, 'resistencia'),
    minFlex: minutosTipo(sem, 'flexibilidad'),
    dias: diasActivos(sem),
    metaFuerza: perfil.sesionesFuerzaSemana,
    metaResistencia: perfil.minutosResistenciaSemana,
    metaFlex: perfil.minutosFlexibilidadSemana,
    metaDias: perfil.diasActivosSemana,
  }
}
