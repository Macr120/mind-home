import type { MediaArchivo, TipoMedia } from '../../core/data/db'
import { añoDe } from './fecha'

export type OrdenFecha = 'reciente' | 'antiguo' | 'titulo'

export interface FiltrosArchivo {
  tipo: TipoMedia | 'todos'
  genero: string
  año: string
  estado: MediaArchivo['estado'] | 'todos'
  busqueda: string
  orden: OrdenFecha
}

export const FILTROS_VACIOS: FiltrosArchivo = {
  tipo: 'todos',
  genero: 'todos',
  año: 'todos',
  estado: 'todos',
  busqueda: '',
  orden: 'reciente',
}

export function aplicarFiltros(
  items: MediaArchivo[],
  f: FiltrosArchivo,
): MediaArchivo[] {
  let lista = [...items]

  if (f.tipo !== 'todos') lista = lista.filter((i) => i.tipo === f.tipo)
  if (f.genero !== 'todos') lista = lista.filter((i) => i.genero === f.genero)
  if (f.año !== 'todos') lista = lista.filter((i) => añoDe(i.fecha) === f.año)
  if (f.estado !== 'todos') lista = lista.filter((i) => i.estado === f.estado)

  const q = f.busqueda.trim().toLowerCase()
  if (q) {
    lista = lista.filter(
      (i) =>
        i.titulo.toLowerCase().includes(q) ||
        i.resena.toLowerCase().includes(q) ||
        (i.autor?.toLowerCase().includes(q) ?? false) ||
        i.genero.toLowerCase().includes(q),
    )
  }

  lista.sort((a, b) => {
    if (f.orden === 'titulo') return a.titulo.localeCompare(b.titulo)
    const cmp = b.fecha.localeCompare(a.fecha)
    return f.orden === 'reciente' ? cmp : -cmp
  })

  return lista
}

export function generosUnicos(items: MediaArchivo[]) {
  return [...new Set(items.map((i) => i.genero).filter(Boolean))].sort()
}

export function añosUnicos(items: MediaArchivo[]) {
  return [...new Set(items.map((i) => añoDe(i.fecha)))].sort((a, b) => b.localeCompare(a))
}
