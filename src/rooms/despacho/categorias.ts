/** Categorías predefinidas con icono y color (estilo apps premium de finanzas). */

export interface Categoria {
  id: string
  nombre: string
  icon: string
  color: string
}

export const CATEGORIAS_GASTO: Categoria[] = [
  { id: 'comida', nombre: 'Comida', icon: '🍔', color: '#f59e0b' },
  { id: 'transporte', nombre: 'Transporte', icon: '🚗', color: '#3b82f6' },
  { id: 'hogar', nombre: 'Hogar', icon: '🏠', color: '#10b981' },
  { id: 'ocio', nombre: 'Ocio', icon: '🎉', color: '#a855f7' },
  { id: 'salud', nombre: 'Salud', icon: '💊', color: '#ef4444' },
  { id: 'compras', nombre: 'Compras', icon: '🛍️', color: '#ec4899' },
  { id: 'servicios', nombre: 'Servicios', icon: '💡', color: '#14b8a6' },
  { id: 'otros_gasto', nombre: 'Otros', icon: '📦', color: '#6b7280' },
]

export const CATEGORIAS_INGRESO: Categoria[] = [
  { id: 'salario', nombre: 'Salario', icon: '💼', color: '#22c55e' },
  { id: 'freelance', nombre: 'Freelance', icon: '💻', color: '#06b6d4' },
  { id: 'regalo', nombre: 'Regalo', icon: '🎁', color: '#f472b6' },
  { id: 'inversion', nombre: 'Inversión', icon: '📈', color: '#84cc16' },
  { id: 'otros_ingreso', nombre: 'Otros', icon: '📦', color: '#6b7280' },
]

const PORID = new Map<string, Categoria>(
  [...CATEGORIAS_GASTO, ...CATEGORIAS_INGRESO].map((c) => [c.id, c]),
)

/** Busca una categoría por id; si no existe (datos viejos) devuelve un genérico. */
export function getCategoria(id: string): Categoria {
  return (
    PORID.get(id) ?? { id, nombre: id, icon: '🏷️', color: '#6b7280' }
  )
}
