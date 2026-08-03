/**
 * Categorías de Finanzas.
 *
 * La categoría es TEXTO LIBRE: el usuario escribe la suya. Estas son solo
 * sugerencias — las conocidas traen icono y color propios, y cualquier otra
 * recibe un color estable derivado de su nombre (así no cambia entre sesiones).
 */

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

/** Sin acentos ni mayúsculas: 'Inversión' y 'inversion' son la misma categoría. */
const clave = (s: string) =>
  s.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

const CONOCIDAS = new Map<string, Categoria>()
for (const c of [...CATEGORIAS_GASTO, ...CATEGORIAS_INGRESO]) {
  CONOCIDAS.set(c.id, c)
  CONOCIDAS.set(clave(c.nombre), c)
}

/** Paleta para las categorías escritas a mano (se elige por el nombre). */
const PALETA = ['#f59e0b', '#3b82f6', '#10b981', '#a855f7', '#ef4444', '#ec4899', '#14b8a6', '#84cc16']

function colorDe(nombre: string): string {
  let h = 0
  for (const ch of nombre) h = (h * 31 + ch.charCodeAt(0)) % 9973
  return PALETA[h % PALETA.length]
}

/** Busca una categoría por id o por nombre; si es del usuario, la fabrica. */
export function getCategoria(id: string): Categoria {
  const k = clave(id)
  const conocida = CONOCIDAS.get(id) ?? CONOCIDAS.get(k)
  if (conocida) return conocida
  return { id, nombre: id, icon: '🏷️', color: colorDe(k) }
}

/**
 * Sugerencias para el campo de categoría: primero las que el usuario ya usó en
 * ese tipo (las más frecuentes arriba) y luego las de fábrica que le falten.
 */
export function sugerenciasCategorias(
  tipo: 'gasto' | 'ingreso',
  usadas: { tipo: 'gasto' | 'ingreso'; categoria: string }[],
): Categoria[] {
  const veces = new Map<string, number>()
  for (const m of usadas) {
    if (m.tipo !== tipo) continue
    const k = clave(m.categoria)
    if (k) veces.set(k, (veces.get(k) ?? 0) + 1)
  }
  const propias = [...veces.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([k]) => getCategoria(usadas.find((m) => clave(m.categoria) === k)!.categoria))

  const vistas = new Set(propias.map((c) => clave(c.nombre)))
  const base = (tipo === 'gasto' ? CATEGORIAS_GASTO : CATEGORIAS_INGRESO).filter(
    (c) => !vistas.has(clave(c.nombre)),
  )
  return [...propias, ...base]
}
