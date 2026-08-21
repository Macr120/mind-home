/**
 * Caja WEB: RevenueCat Web Billing (navegador y escritorio).
 *
 * Es la caja directa —sin comisión de tienda— y por eso es la única en web,
 * Windows y macOS. La fachada (`paywall.ts`) decide cuándo se usa; aquí solo
 * se habla con `@revenuecat/purchases-js`.
 *
 * `appUserId` = user.id de Supabase: el webhook traduce los eventos de compra
 * a `perfiles`, que es la fuente de verdad. Aquí solo se abre el checkout.
 */
import { Purchases, type Package } from '@revenuecat/purchases-js'
import type { Caja, OfertaCruda } from './caja'

const claveWeb = import.meta.env.VITE_REVENUECAT_WEB_KEY as string | undefined

let configuradoPara: string | null = null

/** Instancia de RC ligada al usuario de Supabase (idempotente por usuario). */
function rc(userId: string): Purchases {
  if (configuradoPara === userId) return Purchases.getSharedInstance()
  const inst = Purchases.configure(claveWeb!, userId)
  configuradoPara = userId
  return inst
}

export const cajaWeb: Caja = {
  disponible: () => !!claveWeb,

  async ofertas(userId) {
    const offerings = await rc(userId).getOfferings()
    const paquetes = Object.values(offerings.all).flatMap((o) => o.availablePackages)
    return paquetes.map((p): OfertaCruda => {
      const producto = p.webBillingProduct
      return {
        id: p.identifier,
        producto: producto?.identifier ?? '',
        precio: producto?.currentPrice?.formattedPrice ?? '',
        periodo: producto?.normalPeriodDuration === 'P1Y' ? 'anio' : producto?.normalPeriodDuration === 'P1M' ? 'mes' : null,
        ref: p,
      }
    })
  },

  async comprar(userId, ref) {
    await rc(userId).purchase({ rcPackage: ref as Package })
    return true
  },

  /** En la web no hay nada que restaurar: el `appUserId` ya trae las compras. */
  async restaurar(userId) {
    await rc(userId).getCustomerInfo()
    return true
  },

  async urlGestion(userId) {
    try {
      const info = await rc(userId).getCustomerInfo()
      return info.managementURL ?? null
    } catch {
      return null
    }
  },
}
