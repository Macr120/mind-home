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
  /** Precio ya formateado por RC (ej. «$4.99»); vacío si no vino. */
  precio: string
  /** Ciclo de la suscripción; null en compras sueltas (recargas). */
  periodo: 'mes' | 'anio' | null
  /** Créditos que abona, si es una recarga (0 en las suscripciones). */
  creditos: number
}

/**
 * Productos one-time de créditos extra en RC (SIN entitlement), de menor a
 * mayor. Los créditos por SKU son el espejo de `RECARGAS` en el webhook, que es
 * quien abona de verdad. Sin suscripción son el único acceso a la IA, por eso
 * hay un paquete de entrada barato.
 */
const RECARGAS: Record<string, number> = {
  recarga_150: 150,
  recarga_600: 600,
  recarga_1500: 1500,
}

function empaquetar(paquete: Package): OfertaPro {
  const producto = paquete.webBillingProduct
  const duracion = producto?.normalPeriodDuration ?? null
  return {
    paquete,
    precio: producto?.currentPrice?.formattedPrice ?? '',
    periodo: duracion === 'P1M' ? 'mes' : duracion === 'P1Y' ? 'anio' : null,
    creditos: RECARGAS[producto?.identifier ?? ''] ?? 0,
  }
}

/** Primer paquete del offering actual (`default`), listo para el botón de compra. */
export async function obtenerOferta(): Promise<OfertaPro | null> {
  const usuario = useSesion.getState().usuario
  if (!usuario || !claveWeb) return null
  const offerings = await rc(usuario.id).getOfferings()
  const paquete = offerings.current?.availablePackages[0]
  return paquete ? empaquetar(paquete) : null
}

/** Todos los paquetes del offering actual (la página /cuenta pinta tarjetas). */
export async function obtenerOfertas(): Promise<OfertaPro[]> {
  const usuario = useSesion.getState().usuario
  if (!usuario || !claveWeb) return []
  const offerings = await rc(usuario.id).getOfferings()
  return (offerings.current?.availablePackages ?? []).map(empaquetar)
}

/**
 * Paquetes de recarga disponibles, de menor a mayor, estén en el offering que
 * estén. Se busca en TODOS porque las compras sueltas no viven en el offering
 * `default` de la suscripción.
 */
export async function obtenerRecargas(): Promise<OfertaPro[]> {
  const usuario = useSesion.getState().usuario
  if (!usuario || !claveWeb) return []
  const offerings = await rc(usuario.id).getOfferings()
  const encontradas = new Map<string, OfertaPro>()
  for (const oferta of Object.values(offerings.all)) {
    for (const paquete of oferta.availablePackages) {
      const id = paquete.webBillingProduct?.identifier ?? ''
      if (id in RECARGAS && !encontradas.has(id)) encontradas.set(id, empaquetar(paquete))
    }
  }
  return [...encontradas.values()].sort((a, b) => a.creditos - b.creditos)
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
 * Compra la recarga de créditos (one-time). El abono llega por webhook a
 * `perfiles.creditos_extra`: se reintenta el refresco hasta verlo.
 */
export async function comprarRecarga(paquete: Package): Promise<boolean> {
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
  return true
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
