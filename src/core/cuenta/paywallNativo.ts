/**
 * Caja de TIENDA: compra in-app de Google Play y el App Store.
 *
 * Es obligatoria en las apps nativas —Apple 3.1.1 y Google Play Payments no
 * admiten otra caja para contenido digital—, así que aquí sí hay comisión. La
 * web y el escritorio siguen cobrando directo (`paywallWeb.ts`).
 *
 * El plugin se carga en diferido: en el navegador este módulo no se importa
 * nunca (lo decide `paywall.ts`) y así el bundle web no arrastra el SDK.
 *
 * `appUserID` = user.id de Supabase, igual que en la web: es lo que hace que
 * una compra hecha en Play aparezca en el navegador y al revés. Cuando la
 * compra se hace SIN cuenta (el «ahora no» de la puerta), RevenueCat usa un id
 * anónimo y `logIn()` la transfiere en cuanto se registra el correo.
 */
import { nombrePlataforma } from '../plataforma'
import type { Caja, OfertaCruda } from './caja'
import type { PurchasesPackage } from '@revenuecat/purchases-capacitor'

const claves: Record<string, string | undefined> = {
  android: import.meta.env.VITE_REVENUECAT_ANDROID_KEY as string | undefined,
  ios: import.meta.env.VITE_REVENUECAT_IOS_KEY as string | undefined,
}

function clave(): string | undefined {
  return claves[nombrePlataforma()]
}

type SDK = typeof import('@revenuecat/purchases-capacitor').Purchases

let sdk: SDK | null = null
let configurado = false
let usuarioActual: string | null = null

/** SDK configurado y con la sesión de Supabase atada (idempotente). */
async function rc(userId: string): Promise<SDK> {
  if (!sdk) sdk = (await import('@revenuecat/purchases-capacitor')).Purchases
  if (!configurado) {
    await sdk.configure({ apiKey: clave()!, appUserID: userId })
    configurado = true
    usuarioActual = userId
    return sdk
  }
  if (usuarioActual !== userId) {
    // Cambio de cuenta (o compra anónima que ahora se registra): RevenueCat
    // transfiere las compras del id anónimo al usuario de Supabase.
    await sdk.logIn({ appUserID: userId })
    usuarioActual = userId
  }
  return sdk
}

/** ¿El usuario cerró la hoja de pago? No es un error que haya que enseñar. */
function cancelada(e: unknown): boolean {
  const err = e as { userCancelled?: boolean; code?: unknown } | null
  return !!err && (err.userCancelled === true || String(err.code) === '1')
}

export const cajaNativa: Caja = {
  disponible: () => !!clave(),

  async ofertas(userId) {
    const { all } = await (await rc(userId)).getOfferings()
    const paquetes = Object.values(all).flatMap((o) => o.availablePackages)
    return paquetes.map((p): OfertaCruda => {
      const periodo = p.product.subscriptionPeriod
      return {
        id: p.identifier,
        producto: p.product.identifier,
        precio: p.product.priceString ?? '',
        periodo: periodo === 'P1Y' ? 'anio' : periodo === 'P1M' ? 'mes' : null,
        ref: p,
      }
    })
  },

  async comprar(userId, ref) {
    try {
      await (await rc(userId)).purchasePackage({ aPackage: ref as PurchasesPackage })
      return true
    } catch (e) {
      if (cancelada(e)) return false
      throw e
    }
  },

  async restaurar(userId) {
    await (await rc(userId)).restorePurchases()
    return true
  },

  async urlGestion(userId) {
    try {
      const { customerInfo } = await (await rc(userId)).getCustomerInfo()
      return customerInfo.managementURL ?? null
    } catch {
      return null
    }
  },
}
