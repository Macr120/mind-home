/**
 * El contrato de una caja de cobro: lo mínimo que la fachada `paywall.ts`
 * necesita de RevenueCat, dicho igual para la web (`paywallWeb`) y para las
 * tiendas (`paywallNativo`). El resto —qué es cada paquete, qué da y cómo se
 * pinta— vive en `productos.ts` y en la fachada, no aquí.
 */

/** Un paquete tal como lo devuelve la tienda, antes de saber qué vende. */
export interface OfertaCruda {
  /** Identificador del paquete en el offering (el mismo en las tres tiendas). */
  id: string
  /** Identificador del producto en ESTA tienda (Apple lleva el bundle delante). */
  producto: string
  /** Precio ya formateado por la tienda, en su moneda; vacío si no vino. */
  precio: string
  periodo: 'mes' | 'anio' | null
  /** El objeto original de RevenueCat: solo la caja que lo creó sabe leerlo. */
  ref: unknown
}

export interface Caja {
  /** ¿Está configurada esta caja en este build? (clave presente) */
  disponible(): boolean
  ofertas(userId: string): Promise<OfertaCruda[]>
  /** Lanza el flujo de compra. Devuelve false si el usuario lo canceló. */
  comprar(userId: string, ref: unknown): Promise<boolean>
  /** Recupera compras previas de esta tienda (Apple lo EXIGE en la UI). */
  restaurar(userId: string): Promise<boolean>
  /** Portal para cancelar o cambiar el pago; null si la tienda no da uno. */
  urlGestion(userId: string): Promise<string | null>
}
