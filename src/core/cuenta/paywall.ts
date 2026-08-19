/**
 * Paywall con RevenueCat Web Billing.
 *
 * `appUserId` = user.id de Supabase: el webhook (revenuecat-webhook) traduce
 * los eventos de compra a `perfiles.plan`, que es la fuente de verdad. Aquí
 * solo se abre el checkout y se espera a que el webhook aterrice.
 */
import { Purchases, type Package } from '@revenuecat/purchases-js'
import { useSesion } from './sesionStore'

const claveWeb = import.meta.env.VITE_REVENUECAT_WEB_KEY as string | undefined

/** ¿El build trae pagos configurados? (public key `rcb_...` presente) */
export function hayPagos(): boolean {
  return !!claveWeb
}

let configuradoPara: string | null = null

/** Instancia de RC ligada al usuario de Supabase (idempotente por usuario). */
function rc(userId: string): Purchases {
  if (configuradoPara === userId) return Purchases.getSharedInstance()
  const inst = Purchases.configure(claveWeb!, userId)
  configuradoPara = userId
  return inst
}

export interface OfertaPro {
  paquete: Package
  /** Precio ya formateado por RC (ej. «$5.00»); vacío si no vino. */
  precio: string
  /** Ciclo de la suscripción; null en el pago único del unlock. */
  periodo: 'mes' | 'anio' | null
  /** Nivel de la suscripción (1, 2 o 3); 0 si no es un nivel. */
  nivel: number
  /** Créditos mensuales que da el nivel; 0 si no es un nivel. */
  creditos: number
}

/**
 * Niveles de la suscripción: el mismo plan multiplicado. Espejo de
 * `NIVEL_PRODUCTOS` en el webhook, que es quien escribe `perfiles.nivel`; aquí
 * solo se pintan y se compran. Cambiar de nivel es comprar otro paquete
 * —RevenueCat lo resuelve como cambio de suscripción, no como alta nueva—, y
 * bajar o cancelar se hace desde `urlGestion()`.
 *
 * Una LISTA por nivel, con el precio VIGENTE primero, por el mismo motivo que
 * el unlock: en RevenueCat el precio es inmutable, así que subir de $5/$10/$15
 * a $6/$12/$18 obligó a crear productos nuevos. Los viejos se conservan para
 * reconocer al suscriptor que sigue en ellos, pero ya no se ofrecen.
 */
const NIVEL_PRODUCTOS: string[][] = [
  ['pro_x1_v2', 'pro_x1'],
  ['pro_x2_v2', 'pro_x2'],
  ['pro_x3_v2', 'pro_x3'],
]

/**
 * Anualidad: el nivel ×1 pagado de una vez, $60/año (dos meses de regalo
 * frente a $6 × 12). Da los MISMOS 700 créditos cada mes —el pool es mensual,
 * lo calcula `pool_mensual()` con `nivel`—, así que cuenta como nivel 1.
 * Va aparte de `NIVEL_PRODUCTOS` porque no es un escalón más de la escalera:
 * es otra forma de pagar el mismo escalón.
 */
const ANUAL_PRODUCTOS = ['pro_x1_anual']

const NIVELES: Record<string, number> = {
  ...Object.fromEntries(NIVEL_PRODUCTOS.flatMap((ids, i) => ids.map((id) => [id, i + 1] as const))),
  ...Object.fromEntries(ANUAL_PRODUCTOS.map((id) => [id, 1] as const)),
}

/** Créditos mensuales del nivel base; los demás son múltiplos exactos. */
const CREDITOS_BASE = 700

/**
 * Recarga de créditos: consumible, NO es suscripción. $6 = 700 créditos que se
 * abonan a `perfiles.creditos_extra`, no caducan y funcionan sin plan (el pool
 * mensual se agota antes que ellos). Mismo precio por crédito que un nivel:
 * $6 → 700, tanto aquí como en la suscripción.
 *
 * Lista por el mismo motivo que las demás: el precio en RC es inmutable.
 */
const CREDITOS_PRODUCTOS: Record<string, number> = {
  creditos_x1: 700,
}

/**
 * El pago único de la app (`unlock_casa*`) YA NO SE VENDE aquí: desde ago 2026
 * la app se compra en Google Play y el App Store, y esta web solo cobra la
 * suscripción y las recargas (ver `edicion.ts`). El webhook conserva la lista
 * `UNLOCK_PRODUCTOS` para seguir honrando las compras hechas cuando sí se
 * vendía; en el cliente no queda nada que ofrecer.
 */

function empaquetar(paquete: Package): OfertaPro {
  const producto = paquete.webBillingProduct
  const duracion = producto?.normalPeriodDuration ?? null
  const id = producto?.identifier ?? ''
  const nivel = NIVELES[id] ?? 0
  return {
    paquete,
    precio: producto?.currentPrice?.formattedPrice ?? '',
    periodo: duracion === 'P1M' ? 'mes' : duracion === 'P1Y' ? 'anio' : null,
    nivel,
    creditos: nivel ? nivel * CREDITOS_BASE : (CREDITOS_PRODUCTOS[id] ?? 0),
  }
}

/** Primer paquete disponible de la lista, por orden de la lista (no del offering). */
async function buscarPaquete(ids: string[]): Promise<OfertaPro | null> {
  const usuario = useSesion.getState().usuario
  if (!usuario || !claveWeb) return null
  const offerings = await rc(usuario.id).getOfferings()
  const paquetes = Object.values(offerings.all).flatMap((o) => o.availablePackages)
  for (const id of ids) {
    const paquete = paquetes.find((p) => p.webBillingProduct?.identifier === id)
    if (paquete) return empaquetar(paquete)
  }
  return null
}

/** Nivel base (×1), para el botón único de «hazte Pro». */
export async function obtenerOferta(): Promise<OfertaPro | null> {
  const niveles = await obtenerNiveles()
  return niveles[0] ?? null
}

/**
 * Los tres niveles, de menor a mayor. Se buscan en TODOS los offerings y por
 * identificador: así el orden en que estén configurados en RevenueCat no
 * decide cuál es el ×1. De cada nivel se ofrece el producto VIGENTE; si el
 * viejo sigue en el offering, no se pinta dos veces el mismo nivel.
 */
export async function obtenerNiveles(): Promise<OfertaPro[]> {
  const usuario = useSesion.getState().usuario
  if (!usuario || !claveWeb) return []
  const offerings = await rc(usuario.id).getOfferings()
  const paquetes = Object.values(offerings.all).flatMap((o) => o.availablePackages)
  const ofertas: OfertaPro[] = []
  for (const ids of NIVEL_PRODUCTOS) {
    for (const id of ids) {
      const paquete = paquetes.find((p) => p.webBillingProduct?.identifier === id)
      if (paquete) {
        ofertas.push(empaquetar(paquete))
        break
      }
    }
  }
  return ofertas
}

/** Paquete de recarga de créditos (consumible, sin suscripción). */
export async function obtenerCreditos(): Promise<OfertaPro | null> {
  return buscarPaquete(Object.keys(CREDITOS_PRODUCTOS))
}

/** Paquete anual del nivel ×1 ($60/año); null si no está en ningún offering. */
export async function obtenerAnual(): Promise<OfertaPro | null> {
  return buscarPaquete(ANUAL_PRODUCTOS)
}

/**
 * Abre el checkout de RC y espera el entitlement. Devuelve true si quedó
 * activo; el plan del perfil llega vía webhook (se reintenta el refresco).
 */
export async function comprar(paquete: Package): Promise<boolean> {
  const usuario = useSesion.getState().usuario
  if (!usuario) return false
  const { customerInfo } = await rc(usuario.id).purchase({ rcPackage: paquete })
  const activo = 'pro' in customerInfo.entitlements.active
  if (activo) {
    // El webhook tarda unos segundos: reintentar hasta ver el plan en el perfil.
    for (let i = 0; i < 5; i++) {
      await useSesion.getState().refrescarPerfil()
      if (useSesion.getState().plan === 'pro') break
      await new Promise((r) => setTimeout(r, 3000))
    }
    void useSesion.getState().refrescarUso()
  }
  return activo
}

/**
 * Cambia de nivel (subir o bajar). RevenueCat lo resuelve como cambio de la
 * misma suscripción; el webhook lo recibe como PRODUCT_CHANGE y reescribe
 * `perfiles.nivel`, así que aquí se espera a ver el nivel nuevo.
 */
export async function cambiarNivel(paquete: Package, nivel: number): Promise<boolean> {
  const usuario = useSesion.getState().usuario
  if (!usuario) return false
  await rc(usuario.id).purchase({ rcPackage: paquete })
  for (let i = 0; i < 5; i++) {
    await useSesion.getState().refrescarPerfil()
    if (useSesion.getState().nivel === nivel) break
    await new Promise((r) => setTimeout(r, 3000))
  }
  void useSesion.getState().refrescarUso()
  return useSesion.getState().nivel === nivel
}

/**
 * Compra una recarga de créditos (one-time). El abono a `creditos_extra` lo
 * hace el webhook: se reintenta el refresco hasta ver subir el saldo.
 */
export async function comprarCreditos(paquete: Package): Promise<boolean> {
  const usuario = useSesion.getState().usuario
  if (!usuario) return false
  const antes = useSesion.getState().creditosExtra
  await rc(usuario.id).purchase({ rcPackage: paquete })
  for (let i = 0; i < 5; i++) {
    await useSesion.getState().refrescarPerfil()
    if (useSesion.getState().creditosExtra > antes) break
    await new Promise((r) => setTimeout(r, 3000))
  }
  void useSesion.getState().refrescarUso()
  return useSesion.getState().creditosExtra > antes
}

/** URL del portal de gestión de la suscripción (cancelar, cambiar pago). */
export async function urlGestion(): Promise<string | null> {
  const usuario = useSesion.getState().usuario
  if (!usuario || !claveWeb) return null
  try {
    const info = await rc(usuario.id).getCustomerInfo()
    return info.managementURL ?? null
  } catch {
    return null
  }
}
