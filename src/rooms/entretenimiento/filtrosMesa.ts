import type { CategoriaJuegoMesa, EstadoJuegoMesa, JuegoMesa } from '../../core/data/db'

export interface FiltrosMesa {
  categoria: CategoriaJuegoMesa | 'todos'
  estado: EstadoJuegoMesa | 'todos'
  busqueda: string
  orden: 'reciente' | 'nombre' | 'jugadas'
}

export const FILTROS_MESA_VACIOS: FiltrosMesa = {
  categoria: 'todos',
  estado: 'todos',
  busqueda: '',
  orden: 'reciente',
}

export function aplicarFiltrosMesa(items: JuegoMesa[], f: FiltrosMesa): JuegoMesa[] {
  let lista = [...items]

  if (f.categoria !== 'todos') lista = lista.filter((i) => i.categoria === f.categoria)
  if (f.estado !== 'todos') lista = lista.filter((i) => i.estado === f.estado)

  const q = f.busqueda.trim().toLowerCase()
  if (q) {
    lista = lista.filter(
      (i) =>
        i.nombre.toLowerCase().includes(q) ||
        i.notas.toLowerCase().includes(q) ||
        (i.editorial?.toLowerCase().includes(q) ?? false),
    )
  }

  lista.sort((a, b) => {
    if (f.orden === 'nombre') return a.nombre.localeCompare(b.nombre)
    if (f.orden === 'jugadas') return b.vecesJugado - a.vecesJugado
    const fa = a.ultimaPartida ?? a.creadoEn
    const fb = b.ultimaPartida ?? b.creadoEn
    return fb.localeCompare(fa)
  })

  return lista
}
