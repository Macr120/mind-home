/**
 * Catálogo de lo que se vende, en un solo sitio y para las tres cajas.
 *
 * Desde ago 2026 la suscripción se compra DENTRO de la app en todas las
 * plataformas, pero no por la misma caja (ver `plataforma.ts`):
 *
 * - Navegador y escritorio → RevenueCat Web Billing (directo, sin comisión).
 * - Android e iOS → compra in-app de la tienda (obligatorio por normativa:
 *   Apple 3.1.1 y Google Play Payments).
 *
 * Lo que hace que las tres cajas acaben en el mismo sitio es el `appUserId` de
 * RevenueCat = `user.id` de Supabase: compre donde compre, el webhook escribe
 * `perfiles` y cualquier otra sesión lo ve al refrescar el perfil.
 *
 * En RevenueCat, el **paquete** (`identifier` del package dentro del offering)
 * es lo único que se llama igual en las tres tiendas; el **producto** cambia
 * de nombre en cada una (en Apple el id es global, así que lleva el bundle
 * delante). Por eso se busca primero por paquete y solo se cae al producto
 * para no romper los offerings de la web, que se configuraron antes de que
 * existieran las tiendas.
 *
 * Espejo de las tablas del webhook (`supabase/functions/revenuecat-webhook`),
 * que es quien de verdad concede el plan; aquí solo se pinta y se compra.
 */

export type Clase = 'nivel'

export interface Producto {
  /** Identificador del PAQUETE en RevenueCat: el mismo en web, Play y App Store. */
  paquete: string
  /**
   * Ids del PRODUCTO, en orden de preferencia. En RevenueCat el precio es
   * inmutable, así que cada subida obliga a crear un producto nuevo: el
   * vigente va primero y los viejos se conservan para reconocer al que ya
   * compró. La variante de Apple (con bundle delante) se añade sola.
   */
  productos: string[]
  clase: Clase
  /** Nivel de la suscripción (1, 2 o 3). */
  nivel: number
  /** Créditos que da cada mes. */
  creditos: number
  periodo: 'mes'
}

/** En Apple el id de producto es único en TODO el App Store: lleva el bundle. */
const BUNDLE = 'com.macr120.mindhome.'

/** Créditos mensuales del nivel base; los demás son múltiplos exactos. */
const CREDITOS_BASE = 700

/**
 * Lo único que se vende desde el 5-oct-2026: los tres niveles de la
 * suscripción, el mismo plan multiplicado (7/14/20 USD al mes). `_v3` es el de
 * la web (en RevenueCat el precio es INMUTABLE); en Play y en Apple el precio se
 * cambió sobre el `_v2`. La casa, el anual y la recarga ya no se venden: el
 * webhook los sigue honrando para quien los compró.
 */
const NIVELES: Producto[] = [1, 2, 3].map((n) => ({
  paquete: `nivel_${n}`,
  productos: [`pro_x${n}_v3`, `pro_x${n}_v2`, `pro_x${n}`],
  clase: 'nivel' as const,
  nivel: n,
  creditos: n * CREDITOS_BASE,
  periodo: 'mes' as const,
}))

export const CATALOGO: Producto[] = NIVELES

/**
 * Normaliza un id de producto tal como lo devuelve la tienda:
 * - Apple antepone el bundle (`com.macr120.mindhome.pro_x1_v2`).
 * - Google Play cuelga el plan base de la suscripción (`pro_x1_v2:mensual`).
 */
export function idBase(id: string): string {
  const sinPlan = id.split(':')[0]
  return sinPlan.startsWith(BUNDLE) ? sinPlan.slice(BUNDLE.length) : sinPlan
}

/** Qué se compró, a partir del paquete y del producto que devuelve RevenueCat. */
export function productoDe(paquete: string, producto: string): Producto | null {
  const base = idBase(producto)
  return (
    CATALOGO.find((p) => p.paquete === paquete) ?? CATALOGO.find((p) => p.productos.includes(base)) ?? null
  )
}
