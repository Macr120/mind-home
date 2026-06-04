import type { CategoriaNoticia, Noticia } from '../../core/data/db'

export interface FiltrosNoticias {
  categoria: CategoriaNoticia | 'todos'
  fechaDesde: string
  fechaHasta: string
  soloNoLeidas: boolean
  soloDestacadas: boolean
  busqueda: string
}

export const FILTROS_VACIOS: FiltrosNoticias = {
  categoria: 'todos',
  fechaDesde: '',
  fechaHasta: '',
  soloNoLeidas: false,
  soloDestacadas: false,
  busqueda: '',
}

export function aplicarFiltros(items: Noticia[], f: FiltrosNoticias): Noticia[] {
  let lista = [...items]

  if (f.categoria !== 'todos') lista = lista.filter((n) => n.categoria === f.categoria)
  if (f.fechaDesde) lista = lista.filter((n) => n.fecha >= f.fechaDesde)
  if (f.fechaHasta) lista = lista.filter((n) => n.fecha <= f.fechaHasta)
  if (f.soloNoLeidas) lista = lista.filter((n) => !n.leido)
  if (f.soloDestacadas) lista = lista.filter((n) => n.destacada)

  const q = f.busqueda.trim().toLowerCase()
  if (q) {
    lista = lista.filter(
      (n) =>
        n.titulo.toLowerCase().includes(q) ||
        n.resumen.toLowerCase().includes(q) ||
        (n.fuente?.toLowerCase().includes(q) ?? false),
    )
  }

  return lista.sort((a, b) => b.fecha.localeCompare(a.fecha) || b.creadoEn.localeCompare(a.creadoEn))
}

export function agruparPorFecha(items: Noticia[]): { fecha: string; noticias: Noticia[] }[] {
  const mapa = new Map<string, Noticia[]>()
  for (const n of items) {
    const arr = mapa.get(n.fecha) ?? []
    arr.push(n)
    mapa.set(n.fecha, arr)
  }
  return [...mapa.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([fecha, noticias]) => ({ fecha, noticias }))
}

export function fechasUnicas(items: Noticia[]) {
  return [...new Set(items.map((n) => n.fecha))].sort((a, b) => b.localeCompare(a))
}
