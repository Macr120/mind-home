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
import { CompraCancelada, type Caja, type OfertaCruda } from './caja'
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

/**
 * Deja el SDK cargado y con la sesión atada. **No devuelve el SDK, y eso es lo
 * importante**: el objeto que da `registerPlugin` es un Proxy que responde a
 * CUALQUIER propiedad (su `get` acaba en `default: createPluginMethodWrapper(prop)`),
 * así que también responde a `then`. Eso lo convierte en un «thenable» a ojos de
 * JavaScript: devolverlo desde una función `async` —o hacerle `await`— dispara el
 * protocolo de promesas, que llama a `sdk.then(resolve, reject)`. Capacitor no
 * encuentra ningún método nativo llamado `then`, lanza por dentro, y NUNCA llama
 * ni a `resolve` ni a `reject`. La promesa se queda colgada para siempre.
 *
 * Es el fallo por el que Apple rechazó la 1.0 DOS veces por 2.1(a): `getOfferings`
 * no llegaba a llamarse jamás, saltaba el techo de 12 s de `paywall.ts` y el
 * paywall decía «la tienda no respondió». No era la tienda, ni StoreKit, ni la
 * ficha de App Store Connect: era este `await`. Y se llevaba por delante la caja
 * entera —comprar, restaurar y el portal de gestión colgaban igual—, que es por
 * qué en RevenueCat nunca hubo ni una compra de sandbox mientras el cliente sí
 * aparecía registrado: `configure` es nativo y sí corría.
 *
 * Verificado en un iPhone 15 real (iOS 26.6) el 13-sep-2026, con trazas en el
 * puente de Capacitor.
 *
 * REGLA para quien toque esto: el SDK se usa SIEMPRE como `plugin().metodo()`.
 * Nunca se mete en un `await` ni se devuelve desde una función `async`.
 */
async function preparar(userId: string): Promise<void> {
  if (!sdk) sdk = (await import('@revenuecat/purchases-capacitor')).Purchases
  if (!configurado) {
    await sdk.configure({ apiKey: clave()!, appUserID: userId })
    configurado = true
    usuarioActual = userId
    return
  }
  if (usuarioActual !== userId) {
    // Cambio de cuenta (o compra anónima que ahora se registra): RevenueCat
    // transfiere las compras del id anónimo al usuario de Supabase.
    await sdk.logIn({ appUserID: userId })
    usuarioActual = userId
  }
}

/** El SDK ya preparado. Se llama justo después de `await preparar(...)`. */
function plugin(): SDK {
  if (!sdk) throw new Error('paywall nativo: el SDK no está preparado')
  return sdk
}

/** ¿El usuario cerró la hoja de pago? No es un error que haya que enseñar. */
function cancelada(e: unknown): boolean {
  const err = e as { userCancelled?: boolean; code?: unknown } | null
  return !!err && (err.userCancelled === true || String(err.code) === '1')
}

/** ¿`INVALID_RECEIPT` (8) o `MISSING_RECEIPT_FILE` (9)? El recibo, no la compra. */
function reciboIncompleto(e: unknown): boolean {
  const err = e as { code?: unknown; readableErrorCode?: unknown } | null
  if (!err) return false
  const codigo = String(err.code)
  const nombre = String(err.readableErrorCode ?? '')
  return codigo === '8' || codigo === '9' || /INVALID_RECEIPT|MISSING_RECEIPT/.test(nombre)
}

/** Pausas entre sincronizaciones del recibo (tres intentos en total). */
const PAUSAS_RECIBO = [0, 2_000, 4_000]

/**
 * Tras un error de recibo: pide a StoreKit que vuelva a sincronizar las
 * transacciones con RevenueCat y mira si el producto ya figura como comprado.
 * True = la compra está y se puede seguir como si `purchasePackage` hubiera
 * vuelto bien. False = no apareció: que el error original suba y se enseñe.
 */
async function recuperarCompra(productoId: string): Promise<boolean> {
  for (const pausa of PAUSAS_RECIBO) {
    if (pausa) await new Promise((r) => setTimeout(r, pausa))
    try {
      await plugin().syncPurchases()
      const { customerInfo } = await plugin().getCustomerInfo()
      if (customerInfo.allPurchasedProductIdentifiers.includes(productoId)) return true
    } catch {
      // Un fallo al sincronizar no cambia nada: se vuelve a intentar.
    }
  }
  return false
}

export const cajaNativa: Caja = {
  disponible: () => !!clave(),

  async ofertas(userId) {
    await preparar(userId)
    const { all } = await plugin().getOfferings()
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
    const paquete = ref as PurchasesPackage
    try {
      await preparar(userId)
      await plugin().purchasePackage({ aPackage: paquete })
    } catch (e) {
      if (cancelada(e)) throw new CompraCancelada()
      // Error 8, INVALID_RECEIPT («the purchased product was missing in the
      // receipt … a bug in StoreKit»): la tienda YA cobró, pero el recibo que
      // StoreKit 2 le pasó a RevenueCat aún no lleva el producto. Es un fallo
      // conocido del sandbox (y el que vio App Review el 21-sep-2026, visto por
      // fin en un iPad con iPadOS 27). Se cura pidiéndole a la tienda que
      // vuelva a sincronizar el recibo y comprobando que el producto ya está:
      // entonces la compra es buena y no hay nada que enseñar.
      if (reciboIncompleto(e) && (await recuperarCompra(paquete.product.identifier))) return
      throw e
    }
  },

  async restaurar(userId) {
    await preparar(userId)
    await plugin().restorePurchases()
    return true
  },

  async urlGestion(userId) {
    try {
      await preparar(userId)
      const { customerInfo } = await plugin().getCustomerInfo()
      return customerInfo.managementURL ?? null
    } catch {
      return null
    }
  },
}
