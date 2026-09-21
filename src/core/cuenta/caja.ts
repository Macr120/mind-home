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

/**
 * El usuario cerró la hoja de pago sin pagar. Es un TIPO y no un `false`
 * porque un `false` se confundía con «la tienda cobró pero el perfil aún no lo
 * refleja», y la puerta lo enseñaba como error rojo: «The purchase was not
 * completed». App Review lo describió el 21-sep-2026 como «an error message
 * when we tapped the purchase button». Cancelar no es un error: quien lo
 * atrapa no debe enseñar nada.
 */
export class CompraCancelada extends Error {
  constructor() {
    super('compra: cancelada por el usuario')
    this.name = 'CompraCancelada'
  }
}

export interface Caja {
  /** ¿Está configurada esta caja en este build? (clave presente) */
  disponible(): boolean
  ofertas(userId: string): Promise<OfertaCruda[]>
  /**
   * Lanza el flujo de compra. Vuelve cuando la tienda COBRÓ; lanza
   * `CompraCancelada` si el usuario cerró la hoja, y cualquier otro fallo de la
   * tienda tal cual (con su código, que la UI enseña).
   */
  comprar(userId: string, ref: unknown): Promise<void>
  /** Recupera compras previas de esta tienda (Apple lo EXIGE en la UI). */
  restaurar(userId: string): Promise<boolean>
  /** Portal para cancelar o cambiar el pago; null si la tienda no da uno. */
  urlGestion(userId: string): Promise<string | null>
}
