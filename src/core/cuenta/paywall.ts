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
}

/** Primer paquete del offering actual (`default`), listo para el botón de compra. */
export async function obtenerOferta(): Promise<OfertaPro | null> {
  const usuario = useSesion.getState().usuario
  if (!usuario || !claveWeb) return null
  const offerings = await rc(usuario.id).getOfferings()
  const paquete = offerings.current?.availablePackages[0]
  if (!paquete) return null
  const precio = paquete.webBillingProduct?.currentPrice?.formattedPrice ?? ''
  return { paquete, precio }
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
