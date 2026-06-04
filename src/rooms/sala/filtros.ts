import type { Viaje, EstadoViaje } from '../../core/data/db'
import { añoDe, hoyISO } from './fecha'

export interface FiltrosViajes {
  estado: EstadoViaje | 'todos'
  pais: string
  año: string
  busqueda: string
  orden: 'fecha' | 'titulo' | 'presupuesto'
}

export const FILTROS_VACIOS: FiltrosViajes = {
  estado: 'todos',
  pais: 'todos',
  año: 'todos',
  busqueda: '',
  orden: 'fecha',
}

export function aplicarFiltros(viajes: Viaje[], f: FiltrosViajes): Viaje[] {
  let lista = [...viajes]
  const hoy = hoyISO()

  if (f.estado !== 'todos') lista = lista.filter((v) => v.estado === f.estado)

  if (f.pais !== 'todos') lista = lista.filter((v) => v.pais === f.pais)
  if (f.año !== 'todos') {
    lista = lista.filter(
      (v) => añoDe(v.fechaInicio) === f.año || añoDe(v.fechaFin) === f.año,
    )
  }

  const q = f.busqueda.trim().toLowerCase()
  if (q) {
    lista = lista.filter(
      (v) =>
        v.titulo.toLowerCase().includes(q) ||
        v.destino.toLowerCase().includes(q) ||
        v.pais.toLowerCase().includes(q) ||
        v.resena.toLowerCase().includes(q),
    )
  }

  lista.sort((a, b) => {
    if (f.orden === 'titulo') return a.titulo.localeCompare(b.titulo)
    if (f.orden === 'presupuesto') return b.presupuesto - a.presupuesto
    const aFuturo = a.fechaInicio >= hoy ? 0 : 1
    const bFuturo = b.fechaInicio >= hoy ? 0 : 1
    if (aFuturo !== bFuturo) return aFuturo - bFuturo
    return f.estado === 'completado'
      ? b.fechaInicio.localeCompare(a.fechaInicio)
      : a.fechaInicio.localeCompare(b.fechaInicio)
  })

  return lista
}

export function paisesUnicos(viajes: Viaje[]) {
  return [...new Set(viajes.map((v) => v.pais))].sort()
}

export function añosUnicos(viajes: Viaje[]) {
  const set = new Set<string>()
  for (const v of viajes) {
    set.add(añoDe(v.fechaInicio))
    set.add(añoDe(v.fechaFin))
  }
  return [...set].sort((a, b) => b.localeCompare(a))
}
